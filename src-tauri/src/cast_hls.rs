use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Weak};
use std::time::{Duration, Instant};
use tokio::process::Child;
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;

use crate::cast_transcode::{CastJob, SharedStats};

const SEGMENT_WAIT_MAX: Duration = Duration::from_secs(25);
const SEGMENT_POLL_INTERVAL: Duration = Duration::from_millis(150);
/// Segments this far behind the newest one a receiver asked for are deleted.
const SEGMENTS_KEPT_BEHIND: u32 = 30;
/// Length FFmpeg aims for. Segments end on a keyframe at or after it.
const SEGMENT_SEC: u32 = 4;
/// Starting EXT-X-TARGETDURATION of a converted stream: it has a keyframe every 2 s, so its
/// segments are 4 s; the rest is margin for timestamp rounding.
const CONVERTED_TARGET_SEC: u32 = 6;
/// Starting EXT-X-TARGETDURATION of a stream whose video is copied: the source's keyframes decide
/// where its segments end. x264, x265 and NVENC place one at least every 250 frames (10.4 s at
/// 23.976 fps); this is three times that, so the value holds for nearly every source. A source
/// with keyframes further apart raises it (see [`settle_target_duration`]).
const COPIED_TARGET_SEC: u32 = 30;
/// How far (in segments, 5 minutes) the conversion may run ahead of the newest segment a receiver
/// asked for before FFmpeg is suspended, and where it resumes. Together with the
/// [`SEGMENTS_KEPT_BEHIND`] kept behind, a session holds about 7 minutes of video on disk whatever
/// the film's length or how long the receiver stays paused: some 0.7 GB at the 14 Mbit/s of
/// 1080p HQ, 1.6 GB at 4K's 30 Mbit/s, and up to about 5 GB for an untouched 4K remux.
const LEAD_MAX_SEGMENTS: u32 = 75;
const LEAD_RESUME_SEGMENTS: u32 = 60;
/// How often the lead is checked.
const LEAD_CHECK: Duration = Duration::from_secs(2);

#[derive(Clone, Debug)]
struct Variant {
    width: u32,
    height: u32,
    fps: f64,
    bandwidth: u64,
    codecs: String,
}

struct HlsSession {
    variant: Variant,
    temp_dir: PathBuf,
    last_access: std::sync::Mutex<Instant>,
    process: Mutex<Option<Child>>,
    newest_requested: AtomicU32,
    /// Segments below this number were deleted; the playlist stops listing them.
    pruned_below: AtomicU32,
    /// EXT-X-TARGETDURATION: the starting value for the kind of stream, raised only when a segment
    /// longer than it is listed, and never lowered.
    target_duration: AtomicU32,
    /// FFmpeg is suspended because it ran too far ahead of the receiver.
    held: AtomicBool,
}

fn touch(session: &HlsSession) {
    if let Ok(mut t) = session.last_access.lock() {
        *t = Instant::now();
    }
}

async fn stop_session_resources(session: Arc<HlsSession>) {
    let child = { session.process.lock().await.take() };
    if let Some(mut child) = child {
        if let Err(error) = child.start_kill() {
            eprintln!("[cast-hls] ffmpeg termination request failed: {error}");
        }
        if let Err(error) = child.wait().await {
            eprintln!("[cast-hls] ffmpeg reap failed: {error}");
        }
    }
    // On Windows a segment still being sent keeps the folder busy for a moment; try again briefly.
    for attempt in 0..3 {
        match tokio::fs::remove_dir_all(&session.temp_dir).await {
            Ok(()) => return,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return,
            Err(error) if attempt == 2 => eprintln!("[cast-hls] temporary session cleanup failed: {error}"),
            Err(_) => tokio::time::sleep(Duration::from_millis(500)).await,
        }
    }
}

#[derive(Clone)]
pub struct HlsState {
    sessions: Arc<RwLock<HashMap<String, Arc<HlsSession>>>>,
}

impl HlsState {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Starts converting `job` into an HLS event playlist and returns the session id.
    pub async fn register_job(&self, job: CastJob) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        let temp_dir = std::env::temp_dir().join(format!("argus-hls-{}", id));
        std::fs::create_dir_all(&temp_dir).map_err(|e| format!("mkdir: {}", e))?;
        let child = match spawn_continuous_ffmpeg(&job, &temp_dir).await {
            Ok(child) => child,
            Err(error) => {
                let _ = tokio::fs::remove_dir_all(&temp_dir).await;
                return Err(error);
            }
        };
        let session = Arc::new(HlsSession {
            variant: Variant {
                width: job.plan.width,
                height: job.plan.height,
                fps: job.plan.fps,
                bandwidth: job.plan.bandwidth,
                codecs: job.plan.hls_codecs.clone(),
            },
            temp_dir,
            last_access: std::sync::Mutex::new(Instant::now()),
            process: Mutex::new(Some(child)),
            newest_requested: AtomicU32::new(0),
            pruned_below: AtomicU32::new(0),
            target_duration: AtomicU32::new(if job.plan.summary.video == "copy" {
                COPIED_TARGET_SEC
            } else {
                CONVERTED_TARGET_SEC
            }),
            held: AtomicBool::new(false),
        });
        spawn_lead_guard(Arc::downgrade(&session));
        self.sessions.write().await.insert(id.clone(), session);
        eprintln!("[cast-hls] session {} registered, seek={:.1}s", id, job.seek_sec);
        Ok(id)
    }

    /// Marks a session as in use, so [`Self::evict_idle`] keeps it while its receiver is paused.
    pub async fn touch_session(&self, id: &str) -> bool {
        match self.sessions.read().await.get(id) {
            Some(session) => {
                touch(session);
                true
            }
            None => false,
        }
    }

    pub async fn stop_session(&self, id: &str) -> bool {
        let session = { self.sessions.write().await.remove(id) };
        let Some(session) = session else {
            return false;
        };
        stop_session_resources(session).await;
        true
    }

    pub async fn stop_all(&self) -> usize {
        let sessions: Vec<Arc<HlsSession>> = {
            let mut map = self.sessions.write().await;
            map.drain().map(|(_, session)| session).collect()
        };
        for session in &sessions {
            stop_session_resources(session.clone()).await;
        }
        sessions.len()
    }

    pub async fn evict_idle(&self, idle: Duration) -> usize {
        let now = Instant::now();
        let stale: Vec<Arc<HlsSession>> = {
            let mut map = self.sessions.write().await;
            let stale_ids: Vec<String> = map
                .iter()
                .filter(|(_, s)| {
                    s.last_access
                        .lock()
                        .map(|t| now.duration_since(*t) > idle)
                        .unwrap_or(false)
                })
                .map(|(k, _)| k.clone())
                .collect();
            stale_ids
                .into_iter()
                .filter_map(|id| map.remove(&id))
                .collect()
        };
        for session in &stale {
            stop_session_resources(session.clone()).await;
        }
        stale.len()
    }
}

pub fn router(state: HlsState) -> axum::Router {
    use axum::routing::get;
    axum::Router::new()
        .route(
            "/cast/hls/{id}/master.m3u8",
            get(handle_master).options(handle_preflight),
        )
        .route(
            "/cast/hls/{id}/variant.m3u8",
            get(handle_variant).options(handle_preflight),
        )
        .route(
            "/cast/hls/{id}/{filename}",
            get(handle_segment).options(handle_preflight),
        )
        .with_state(state)
}

async fn handle_preflight() -> Response {
    let mut resp = Response::builder().status(StatusCode::NO_CONTENT);
    if let Some(h) = resp.headers_mut() {
        h.insert(
            HeaderName::from_static("access-control-allow-origin"),
            HeaderValue::from_static("*"),
        );
        h.insert(
            HeaderName::from_static("access-control-allow-methods"),
            HeaderValue::from_static("GET, HEAD, OPTIONS"),
        );
        h.insert(
            HeaderName::from_static("access-control-allow-headers"),
            HeaderValue::from_static("Content-Type, Accept-Encoding, Range, Origin"),
        );
        h.insert(
            HeaderName::from_static("access-control-max-age"),
            HeaderValue::from_static("86400"),
        );
    }
    resp.body(Body::empty())
        .unwrap_or_else(|_| (StatusCode::INTERNAL_SERVER_ERROR, "preflight").into_response())
}

fn master_playlist(variant: &Variant) -> String {
    // An audio-only stream has no picture to describe.
    let picture = if variant.width > 0 && variant.height > 0 {
        format!(",RESOLUTION={}x{},FRAME-RATE={:.3}", variant.width, variant.height, variant.fps)
    } else {
        String::new()
    };
    format!(
        "#EXTM3U\n\
         #EXT-X-VERSION:3\n\
         #EXT-X-INDEPENDENT-SEGMENTS\n\
         #EXT-X-STREAM-INF:BANDWIDTH={bw},AVERAGE-BANDWIDTH={bw},CODECS=\"{codecs}\"{picture}\n\
         variant.m3u8\n",
        bw = variant.bandwidth,
        codecs = variant.codecs,
    )
}

async fn handle_master(
    State(state): State<HlsState>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> Response {
    let origin = headers
        .get("origin")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("(no-origin)");
    eprintln!("[cast-hls] MASTER hit id={} origin={}", id, origin);
    let session = match state.sessions.read().await.get(&id).cloned() {
        Some(s) => s,
        None => return (StatusCode::NOT_FOUND, "session not found").into_response(),
    };
    touch(&session);
    playlist_response(master_playlist(&session.variant))
}

/// Tags that describe the media segment after them, so they belong to its block.
fn is_segment_tag(line: &str) -> bool {
    [
        "#EXTINF",
        "#EXT-X-BYTERANGE",
        "#EXT-X-DISCONTINUITY",
        "#EXT-X-PROGRAM-DATE-TIME",
        "#EXT-X-GAP",
        "#EXT-X-BITRATE",
        "#EXT-X-DATERANGE",
    ]
    .iter()
    .any(|tag| line.starts_with(tag))
}

/// Tags that hold for every later segment until replaced: they outlive the segment they precede.
fn is_carried_tag(line: &str) -> bool {
    line.starts_with("#EXT-X-MAP") || line.starts_with("#EXT-X-KEY")
}

/// The longest segment the playlist lists, in whole seconds rounded to the nearest one, as RFC 8216
/// 4.3.3.1 compares it with the target duration. 0 when it lists none.
fn longest_segment(playlist: &str) -> u32 {
    playlist
        .lines()
        .filter_map(|line| line.trim().strip_prefix("#EXTINF:"))
        .filter_map(|value| value.split(',').next()?.trim().parse::<f64>().ok())
        .filter(|seconds| seconds.is_finite() && *seconds > 0.0)
        .map(|seconds| seconds.round() as u32)
        .max()
        .unwrap_or(0)
}

/// The variant playlist exactly as receivers get it, on every request of the session.
///
/// FFmpeg writes an EVENT playlist, but segments well behind the receiver are deleted (see
/// [`prune_behind`]) and an EVENT playlist may never drop one. Switching the type once pruning
/// starts would change the playlist under a playing receiver, which strict players answer with an
/// error or a reset, so the playlist is always served the same way:
/// - as a live playlist with no EXT-X-PLAYLIST-TYPE, from the first response on;
/// - with EXT-X-MEDIA-SEQUENCE naming the first segment still listed;
/// - with the session's EXT-X-TARGETDURATION (see [`settle_target_duration`]);
/// - with EXT-X-START at offset 0, so receivers begin at the oldest listed segment instead of
///   joining near the live edge, which skips the film's start and, with a conversion running
///   faster than real time, keeps skipping ahead;
/// - keeping EXT-X-MAP and EXT-X-KEY even when the segment they preceded is gone, since every
///   later segment still depends on them.
fn served_playlist(playlist: &str, oldest_kept: u32, target_duration: u32) -> String {
    let mut header: Vec<String> = Vec::new();
    let mut body = String::with_capacity(playlist.len());
    let mut block: Vec<&str> = Vec::new();
    let mut carried: Vec<&str> = Vec::new();
    let mut first_kept: Option<u32> = None;
    let mut listed_any = false;
    let mut ended = false;
    let mut in_segments = false;
    for raw in playlist.lines() {
        let line = raw.trim();
        if line.is_empty() {
            continue;
        }
        if !in_segments && !is_segment_tag(line) && line.starts_with('#') {
            if line.starts_with("#EXT-X-PLAYLIST-TYPE")
                || line.starts_with("#EXT-X-MEDIA-SEQUENCE")
                || line.starts_with("#EXT-X-START")
            {
                continue;
            }
            if line.starts_with("#EXT-X-TARGETDURATION") {
                header.push(format!("#EXT-X-TARGETDURATION:{target_duration}"));
            } else {
                header.push(line.to_string());
            }
            continue;
        }
        in_segments = true;
        if line.starts_with("#EXT-X-ENDLIST") {
            ended = true;
            continue;
        }
        if line.starts_with('#') {
            block.push(line);
            continue;
        }
        // A URI line closes the segment its tags described.
        let number = segment_number(line);
        if number.is_none_or(|n| n >= oldest_kept) {
            if !listed_any {
                listed_any = true;
                first_kept = number;
            }
            for tag in carried.drain(..).chain(block.drain(..)) {
                body.push_str(tag);
                body.push('\n');
            }
            body.push_str(line);
            body.push('\n');
        } else {
            for tag in block.drain(..) {
                if is_carried_tag(tag) {
                    // Only the latest of each kind still applies.
                    carried.retain(|kept| kept.split(':').next() != tag.split(':').next());
                    carried.push(tag);
                }
            }
        }
    }
    let sequence = format!("#EXT-X-MEDIA-SEQUENCE:{}", first_kept.unwrap_or(oldest_kept));
    let target_at = header.iter().position(|line| line.starts_with("#EXT-X-TARGETDURATION"));
    // The media sequence must precede the first segment and every tag of it, EXT-X-MAP included,
    // so it goes right after the target duration.
    match target_at {
        Some(at) => {
            header.insert(at + 1, sequence);
            header.insert(at, "#EXT-X-START:TIME-OFFSET=0,PRECISE=YES".into());
        }
        None => {
            let at = header.len().min(1);
            header.insert(at, sequence);
            header.insert(at, format!("#EXT-X-TARGETDURATION:{target_duration}"));
            header.insert(at, "#EXT-X-START:TIME-OFFSET=0,PRECISE=YES".into());
        }
    }
    let mut out = header.join("\n");
    out.push('\n');
    out.push_str(&body);
    if ended {
        out.push_str("#EXT-X-ENDLIST\n");
    }
    out
}

async fn handle_variant(State(state): State<HlsState>, Path(id): Path<String>) -> Response {
    let session = match state.sessions.read().await.get(&id).cloned() {
        Some(s) => s,
        None => return (StatusCode::NOT_FOUND, "session not found").into_response(),
    };
    touch(&session);
    let playlist_path = session.temp_dir.join("playlist.m3u8");
    let deadline = std::time::Instant::now() + SEGMENT_WAIT_MAX;
    loop {
        if let Ok(content) = tokio::fs::read_to_string(&playlist_path).await {
            if content.contains("#EXTINF") {
                let pruned = session.pruned_below.load(Ordering::SeqCst);
                let target = settle_target_duration(&session, &content);
                return playlist_response(served_playlist(&content, pruned, target));
            }
        }
        if std::time::Instant::now() >= deadline {
            return (StatusCode::SERVICE_UNAVAILABLE, "playlist not ready").into_response();
        }
        if transcode_failed(&session).await {
            return (StatusCode::BAD_GATEWAY, "conversion failed").into_response();
        }
        tokio::time::sleep(SEGMENT_POLL_INTERVAL).await;
    }
}

/// The target duration to serve with `playlist`: never below any segment it lists.
///
/// RFC 8216 asks for both a target no segment exceeds (4.3.3.1) and a target that never changes
/// (6.2.1). A copied picture can only be cut at the source's keyframes, which are not known before
/// FFmpeg reaches them, so the session starts from a value that holds for nearly every source and
/// raises it only when a longer segment appears: in the same response that first lists it, so no
/// playlist ever announces less than one of its own segments. The target is never lowered.
fn settle_target_duration(session: &HlsSession, playlist: &str) -> u32 {
    let longest = longest_segment(playlist);
    let before = session.target_duration.fetch_max(longest, Ordering::SeqCst);
    if longest > before {
        eprintln!("[cast-hls] a {longest}s segment raises the target duration from {before}s");
    }
    before.max(longest)
}

/// The last segment FFmpeg finished, from its playlist.
fn newest_written(playlist: &str) -> Option<u32> {
    playlist.lines().rev().find_map(|line| segment_number(line.trim()))
}

/// Whether FFmpeg should be suspended, from how far its newest segment is ahead of the newest one
/// the receiver asked for. Two thresholds keep it from flapping around one.
fn hold_conversion(written: u32, requested: u32, held: bool) -> bool {
    let lead = written.saturating_sub(requested);
    if held {
        lead > LEAD_RESUME_SEGMENTS
    } else {
        lead > LEAD_MAX_SEGMENTS
    }
}

/// Suspends or resumes a running FFmpeg.
#[cfg(windows)]
fn set_process_held(child: &Child, hold: bool) -> std::io::Result<()> {
    #[link(name = "ntdll")]
    extern "system" {
        fn NtSuspendProcess(process: *mut std::ffi::c_void) -> i32;
        fn NtResumeProcess(process: *mut std::ffi::c_void) -> i32;
    }
    let handle = child
        .raw_handle()
        .ok_or_else(|| std::io::Error::other("FFmpeg has already exited"))?;
    // SAFETY: the handle belongs to a child this session still owns (the caller holds its lock).
    let status = unsafe {
        if hold {
            NtSuspendProcess(handle)
        } else {
            NtResumeProcess(handle)
        }
    };
    if status >= 0 {
        Ok(())
    } else {
        Err(std::io::Error::other(format!("NTSTATUS {status:#x}")))
    }
}

/// Suspends or resumes a running FFmpeg.
#[cfg(unix)]
fn set_process_held(child: &Child, hold: bool) -> std::io::Result<()> {
    let pid = child.id().ok_or_else(|| std::io::Error::other("FFmpeg has already exited"))?;
    let pid = libc::pid_t::try_from(pid).map_err(std::io::Error::other)?;
    // SAFETY: plain signal delivery to a child this session still owns.
    let rc = unsafe { libc::kill(pid, if hold { libc::SIGSTOP } else { libc::SIGCONT }) };
    if rc == 0 {
        Ok(())
    } else {
        Err(std::io::Error::last_os_error())
    }
}

#[cfg(not(any(windows, unix)))]
fn set_process_held(_child: &Child, _hold: bool) -> std::io::Result<()> {
    Err(std::io::Error::other("suspending FFmpeg is not supported here"))
}

/// Keeps the conversion within [`LEAD_MAX_SEGMENTS`] of the receiver, so a long film or a paused
/// receiver never fills the disk: FFmpeg is suspended when it gets that far ahead and resumed when
/// the receiver catches up. The guard ends with the session or when FFmpeg is done.
fn spawn_lead_guard(session: Weak<HlsSession>) {
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(LEAD_CHECK);
        tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        loop {
            tick.tick().await;
            let Some(session) = session.upgrade() else { return };
            let Ok(playlist) = tokio::fs::read_to_string(session.temp_dir.join("playlist.m3u8")).await else {
                continue;
            };
            if playlist.contains("#EXT-X-ENDLIST") {
                return;
            }
            let Some(written) = newest_written(&playlist) else { continue };
            let held = session.held.load(Ordering::SeqCst);
            let hold = hold_conversion(written, session.newest_requested.load(Ordering::SeqCst), held);
            if hold == held {
                continue;
            }
            let guard = session.process.lock().await;
            let Some(child) = guard.as_ref() else { return };
            match set_process_held(child, hold) {
                Ok(()) => {
                    session.held.store(hold, Ordering::SeqCst);
                    eprintln!(
                        "[cast-hls] conversion {} at segment {written}",
                        if hold { "paused, far enough ahead of the receiver," } else { "resumed" }
                    );
                }
                Err(error) => eprintln!("[cast-hls] could not {} FFmpeg: {error}", if hold { "pause" } else { "resume" }),
            }
        }
    });
}

/// True once FFmpeg has exited without producing what a receiver is waiting for.
async fn transcode_failed(session: &HlsSession) -> bool {
    let mut guard = session.process.lock().await;
    match guard.as_mut().map(|child| child.try_wait()) {
        Some(Ok(Some(status))) => !status.success(),
        _ => false,
    }
}

fn segment_number(filename: &str) -> Option<u32> {
    let stem = filename.strip_prefix("seg")?;
    stem.strip_suffix(".ts").or_else(|| stem.strip_suffix(".m4s"))?.parse().ok()
}

/// The fragmented-MP4 header every `.m4s` segment of an H.265 stream starts from.
const FMP4_INIT: &str = "init.mp4";

/// The content type of a finished segment, or None while FFmpeg is still writing it.
fn finished_segment_type(filename: &str, bytes: &[u8]) -> Option<&'static str> {
    if filename.ends_with(".ts") {
        return (bytes.first() == Some(&0x47)).then_some("video/mp2t");
    }
    // An MP4 file starts with a box: a 4-byte size, then a 4-letter type (ftyp, styp, moof).
    let boxed = bytes.len() >= 8 && bytes[4..8].iter().all(u8::is_ascii_alphanumeric);
    boxed.then_some("video/mp4")
}

/// Deletes segments well behind what the receiver plays so a long film does not fill the disk.
async fn prune_behind(session: &HlsSession, requested: u32) {
    let newest = session.newest_requested.fetch_max(requested, Ordering::SeqCst).max(requested);
    if newest <= SEGMENTS_KEPT_BEHIND || newest % 5 != 0 {
        return;
    }
    // Announced before the files go, so no playlist served from now on lists a deleted segment.
    session.pruned_below.fetch_max(newest - SEGMENTS_KEPT_BEHIND, Ordering::SeqCst);
    let Ok(mut entries) = tokio::fs::read_dir(&session.temp_dir).await else {
        return;
    };
    while let Ok(Some(entry)) = entries.next_entry().await {
        let name = entry.file_name();
        if let Some(n) = segment_number(&name.to_string_lossy()) {
            if n + SEGMENTS_KEPT_BEHIND < newest {
                let _ = tokio::fs::remove_file(entry.path()).await;
            }
        }
    }
}

/// Only a segment FFmpeg has finished and listed moves the pruning boundary, so a request for a
/// missing or future segment never deletes ones the receiver can still play.
async fn prune_after_serving(session: &HlsSession, filename: &str) {
    let Some(n) = segment_number(filename) else {
        return;
    };
    let Ok(playlist) = tokio::fs::read_to_string(session.temp_dir.join("playlist.m3u8")).await else {
        return;
    };
    if playlist.lines().any(|line| line.trim() == filename) {
        prune_behind(session, n).await;
    }
}

async fn handle_segment(
    State(state): State<HlsState>,
    Path((id, filename)): Path<(String, String)>,
    headers: axum::http::HeaderMap,
) -> Response {
    if segment_number(&filename).is_none() && filename != FMP4_INIT {
        return (StatusCode::NOT_FOUND, "not a segment").into_response();
    }
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return (StatusCode::BAD_REQUEST, "bad name").into_response();
    }
    let session = match state.sessions.read().await.get(&id).cloned() {
        Some(s) => s,
        None => return (StatusCode::NOT_FOUND, "session not found").into_response(),
    };
    touch(&session);
    if let Some(n) = segment_number(&filename) {
        if n < session.pruned_below.load(Ordering::SeqCst) {
            return (StatusCode::GONE, "segment pruned").into_response();
        }
    }
    let path = session.temp_dir.join(&filename);
    let deadline = std::time::Instant::now() + SEGMENT_WAIT_MAX;
    let range = headers.get(axum::http::header::RANGE).and_then(|v| v.to_str().ok()).map(str::to_string);
    loop {
        if path.is_file() {
            tokio::time::sleep(Duration::from_millis(80)).await;
            if let Some(content_type) = ready_segment_type(&path, &filename).await {
                prune_after_serving(&session, &filename).await;
                if let Some(response) = file_response(&path, content_type, range.as_deref()).await {
                    return response;
                }
            }
        }
        if std::time::Instant::now() >= deadline || transcode_failed(&session).await {
            eprintln!("[cast-hls] SEGMENT unavailable id={} filename={}", id, filename);
            return (StatusCode::SERVICE_UNAVAILABLE, "segment not ready").into_response();
        }
        tokio::time::sleep(SEGMENT_POLL_INTERVAL).await;
    }
}

fn playlist_response(body: String) -> Response {
    let bytes = body.into_bytes();
    let mut resp = Response::builder().status(StatusCode::OK);
    if let Some(h) = resp.headers_mut() {
        h.insert(
            HeaderName::from_static("content-type"),
            HeaderValue::from_static("application/vnd.apple.mpegurl"),
        );
        h.insert(
            HeaderName::from_static("cache-control"),
            HeaderValue::from_static("no-cache"),
        );
        h.insert(
            HeaderName::from_static("access-control-allow-origin"),
            HeaderValue::from_static("*"),
        );
        h.insert(
            HeaderName::from_static("access-control-expose-headers"),
            HeaderValue::from_static("Content-Length, Content-Range"),
        );
        h.insert(
            HeaderName::from_static("content-length"),
            HeaderValue::from_str(&bytes.len().to_string()).unwrap(),
        );
    }
    resp.body(Body::from(bytes))
        .unwrap_or_else(|_| (StatusCode::INTERNAL_SERVER_ERROR, "build").into_response())
}

/// The content type of a segment once FFmpeg has finished it, from its first bytes only.
async fn ready_segment_type(path: &std::path::Path, filename: &str) -> Option<&'static str> {
    use tokio::io::AsyncReadExt;
    let mut file = tokio::fs::File::open(path).await.ok()?;
    let mut head = [0u8; 8];
    let mut read = 0;
    while read < head.len() {
        match file.read(&mut head[read..]).await {
            Ok(0) => break,
            Ok(n) => read += n,
            Err(_) => return None,
        }
    }
    finished_segment_type(filename, &head[..read])
}

/// A single `Range: bytes=` request against a file of `len` bytes: `Some(Ok((first, last)))` to
/// serve, `Some(Err(()))` when it starts past the end (416), `None` to send the whole file (no
/// header, a multi-range request, or one this server does not parse, as RFC 9110 14.2 allows).
fn byte_range(header: Option<&str>, len: u64) -> Option<Result<(u64, u64), ()>> {
    let spec = header?.trim().strip_prefix("bytes=")?;
    if spec.contains(',') || len == 0 {
        return None;
    }
    let (first, last) = spec.split_once('-')?;
    let (first, last) = (first.trim(), last.trim());
    if first.is_empty() {
        let suffix: u64 = last.parse().ok()?;
        if suffix == 0 {
            return Some(Err(()));
        }
        return Some(Ok((len - suffix.min(len), len - 1)));
    }
    let first: u64 = first.parse().ok()?;
    let last = if last.is_empty() { len - 1 } else { last.parse::<u64>().ok()?.min(len - 1) };
    if first >= len {
        return Some(Err(()));
    }
    (first <= last).then_some(Ok((first, last)))
}

/// Streams a finished segment from disk (a copied 4K segment can be 100 MB, so it is not read into
/// memory), honouring the byte ranges the response says it accepts.
async fn file_response(path: &std::path::Path, content_type: &'static str, range: Option<&str>) -> Option<Response> {
    use tokio::io::{AsyncReadExt, AsyncSeekExt};
    let mut file = tokio::fs::File::open(path).await.ok()?;
    let len = file.metadata().await.ok()?.len();
    let (status, first, last) = match byte_range(range, len) {
        None => (StatusCode::OK, 0, len.saturating_sub(1)),
        Some(Ok((first, last))) => (StatusCode::PARTIAL_CONTENT, first, last),
        Some(Err(())) => {
            let mut resp = Response::builder().status(StatusCode::RANGE_NOT_SATISFIABLE);
            if let Some(h) = resp.headers_mut() {
                h.insert(HeaderName::from_static("content-range"), HeaderValue::from_str(&format!("bytes */{len}")).ok()?);
                h.insert(HeaderName::from_static("access-control-allow-origin"), HeaderValue::from_static("*"));
            }
            return resp.body(Body::empty()).ok();
        }
    };
    if first > 0 {
        file.seek(std::io::SeekFrom::Start(first)).await.ok()?;
    }
    let length = if len == 0 { 0 } else { last - first + 1 };
    let mut resp = Response::builder().status(status);
    if let Some(h) = resp.headers_mut() {
        h.insert(HeaderName::from_static("content-type"), HeaderValue::from_static(content_type));
        h.insert(HeaderName::from_static("access-control-allow-origin"), HeaderValue::from_static("*"));
        h.insert(
            HeaderName::from_static("access-control-expose-headers"),
            HeaderValue::from_static("Content-Length, Content-Range"),
        );
        h.insert(HeaderName::from_static("accept-ranges"), HeaderValue::from_static("bytes"));
        h.insert(HeaderName::from_static("content-length"), HeaderValue::from(length));
        if status == StatusCode::PARTIAL_CONTENT {
            h.insert(
                HeaderName::from_static("content-range"),
                HeaderValue::from_str(&format!("bytes {first}-{last}/{len}")).ok()?,
            );
        }
    }
    let body = Body::from_stream(tokio_util::io::ReaderStream::new(file.take(length)));
    resp.body(body).ok()
}

/// Drains FFmpeg's stderr into the session statistics and the log.
pub(crate) fn watch_stderr(stderr: tokio::process::ChildStderr, stats: SharedStats, tag: &'static str) {
    tokio::spawn(async move {
        use tokio::io::AsyncBufReadExt;
        let mut reader = tokio::io::BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            if !crate::cast_transcode::note_progress_line(&stats, &line) {
                eprintln!("[{tag}][ffmpeg] {}", line);
            }
        }
        if let Ok(mut s) = stats.lock() {
            s.running = false;
        }
    });
}

async fn spawn_continuous_ffmpeg(job: &CastJob, temp_dir: &std::path::Path) -> Result<Child, String> {
    let ffmpeg = crate::transcode::locate_ffmpeg().ok_or_else(|| "ffmpeg not found".to_string())?;
    let caps = crate::cast_transcode::caps().await;
    let fmp4 = job.plan.hls_fmp4;
    let segment_pattern = temp_dir.join(if fmp4 { "seg%05d.m4s" } else { "seg%05d.ts" });
    let playlist_path = temp_dir.join("playlist.m3u8");
    let mut cmd = tokio::process::Command::new(&ffmpeg);
    cmd.args(job.input_args(true, &caps)).args(&job.plan.output);
    if fmp4 {
        // `hvc1` is the sample entry Apple's players require for H.265.
        cmd.args(["-tag:v", "hvc1", "-hls_segment_type", "fmp4", "-hls_fmp4_init_filename", FMP4_INIT]);
    } else {
        cmd.args(["-hls_segment_type", "mpegts"]);
    }
    cmd.arg("-hls_time").arg(SEGMENT_SEC.to_string());
    cmd.args([
            "-f",
            "hls",
            "-hls_playlist_type",
            "event",
            "-hls_list_size",
            "0",
            "-hls_flags",
            "independent_segments+temp_file",
            "-hls_segment_filename",
        ])
        .arg(&segment_pattern)
        .arg(&playlist_path);

    #[cfg(windows)]
    {
        cmd.creation_flags(0x0800_0000);
    }
    // FFmpeg places the fMP4 init file next to the playlist only when it finds a '/' in the
    // playlist's path; a Windows path has backslashes, so it went to the working directory instead
    // (shared by every session, possibly not writable) and receivers never got it. Run in the
    // session folder, where a bare init file name lands either way.
    cmd.current_dir(temp_dir);
    cmd.kill_on_drop(true)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped());

    crate::proc_guard::configure_command(&mut cmd);
    let mut child = cmd.spawn().map_err(|e| format!("ffmpeg spawn: {}", e))?;
    crate::proc_guard::adopt(&child);
    eprintln!(
        "[cast-hls] ffmpeg spawned for seek={:.1} video={} audio={}",
        job.seek_sec, job.plan.summary.video, job.plan.summary.audio
    );
    if let Some(stderr) = child.stderr.take() {
        watch_stderr(stderr, job.stats.clone(), "cast-hls");
    }
    Ok(child)
}

/// End to end through FFmpeg and the HLS server: films made on the spot are probed, planned and
/// served the way a receiver gets them, and what is served is checked against what it announces.
/// Needs FFmpeg with libx264 and libx265; run with `cargo test --lib live_hls -- --ignored
/// --nocapture`.
#[cfg(test)]
mod live_hls_tests {
    use super::*;
    use crate::cast_transcode::{build_plan, CastOptions, DeviceLimits, PlanInput};

    fn make(ffmpeg: &std::path::Path, out: &std::path::Path, args: &[&str]) {
        let status = std::process::Command::new(ffmpeg)
            .args(["-hide_banner", "-loglevel", "error", "-y"])
            .args(args)
            .arg(out)
            .status()
            .expect("ffmpeg");
        assert!(status.success(), "could not make {}", out.display());
    }

    fn ffprobe_json(target: &str, entries: &str) -> serde_json::Value {
        let ffprobe = crate::transcode::locate_ffprobe().expect("ffprobe");
        let out = std::process::Command::new(ffprobe)
            .args(["-v", "error", "-show_entries", entries, "-of", "json", "-i", target])
            .output()
            .expect("ffprobe");
        serde_json::from_slice(&out.stdout).unwrap_or_default()
    }

    async fn get(client: &reqwest::Client, url: &str) -> String {
        client.get(url).send().await.expect("request").text().await.expect("body")
    }

    #[tokio::test(flavor = "multi_thread")]
    #[ignore]
    async fn live_hls_serves_what_it_announces() {
        let ffmpeg = crate::transcode::locate_ffmpeg().expect("ffmpeg");
        let dir = std::env::temp_dir().join(format!("argus-live-hls-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let tone = ["-f", "lavfi", "-i", "sine=f=440:d=85"];
        // Constrained Baseline in MPEG-TS, a keyframe every 40 s (segments longer than 30 s).
        let baseline = dir.join("baseline_gop40.ts");
        let mut args = vec!["-f", "lavfi", "-i", "testsrc2=s=640x360:r=24:d=85"];
        args.extend(tone);
        args.extend([
            "-c:v", "libx264", "-profile:v", "baseline", "-level", "3.0", "-g", "960", "-keyint_min", "960",
            "-sc_threshold", "0", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
        ]);
        make(&ffmpeg, &baseline, &args);
        // Main in Matroska without any sound.
        let silent = dir.join("silent_main.mkv");
        make(&ffmpeg, &silent, &["-f", "lavfi", "-i", "testsrc2=s=640x360:r=24:d=12", "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p"]);
        // H.265 Main 10, High tier, in MP4.
        let hevc = dir.join("main10_high.mp4");
        let mut args = vec!["-f", "lavfi", "-i", "testsrc2=s=640x360:r=24:d=12"];
        args.extend(["-f", "lavfi", "-i", "sine=f=440:d=12"]);
        args.extend([
            "-c:v", "libx265", "-pix_fmt", "yuv420p10le", "-x265-params", "log-level=error:high-tier=1:level-idc=51",
            "-c:a", "aac", "-shortest",
        ]);
        make(&ffmpeg, &hevc, &args);

        let state = HlsState::new();
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        let app = router(state.clone());
        tokio::spawn(async move { axum::serve(listener, app).await.ok() });
        let client = reqwest::Client::new();
        let caps = crate::cast_transcode::caps().await;

        let cases = [
            (&baseline, CastOptions::default(), "avc1.42C01E,mp4a.40.2", "Constrained Baseline", true),
            (&silent, CastOptions::default(), "avc1.4D401E", "Main", false),
            (&hevc, CastOptions { hevc_native: true, ..Default::default() }, "hvc1.2.4.H153.90,mp4a.40.2", "Main 10", true),
        ];
        for (film, options, codecs, profile, has_audio) in cases {
            let name = film.file_name().unwrap().to_string_lossy().to_string();
            let source = film.to_string_lossy().to_string();
            let probe = crate::cast_transcode::probe(&source, &HashMap::new()).await.expect("probe");
            let plan = build_plan(
                &PlanInput { probe: Some(&probe), options: &options, audio_ordinal: 0, burn_sub: None, burn_bitmap: None, force_video_encode: false, limits: DeviceLimits::default() },
                &caps,
            );
            assert_eq!(plan.summary.video, "copy", "{name}: {:?}", plan.summary.reasons);
            let job = CastJob { url: source, headers: HashMap::new(), seek_sec: 0.0, fast_seek: false, plan, stats: Default::default() };
            let id = state.register_job(job).await.expect("register");
            let base = format!("http://127.0.0.1:{port}/cast/hls/{id}");
            let master = get(&client, &format!("{base}/master.m3u8")).await;
            eprintln!("[live-hls] {name}\n{master}");
            assert!(master.contains(&format!("CODECS=\"{codecs}\"")), "{name}: {master}");

            // Wait for the whole film, then check every playlist rule against what was served.
            let deadline = Instant::now() + Duration::from_secs(120);
            let variant = loop {
                let variant = get(&client, &format!("{base}/variant.m3u8")).await;
                if variant.contains("#EXT-X-ENDLIST") || Instant::now() > deadline {
                    break variant;
                }
                tokio::time::sleep(Duration::from_millis(500)).await;
            };
            eprintln!("[live-hls] {name}\n{variant}");
            assert!(variant.contains("#EXT-X-ENDLIST"), "{name}: the conversion did not finish");
            let target: u32 = variant
                .lines()
                .find_map(|l| l.strip_prefix("#EXT-X-TARGETDURATION:"))
                .and_then(|v| v.trim().parse().ok())
                .expect("target duration");
            assert!(longest_segment(&variant) <= target, "{name}: a segment is longer than {target}s\n{variant}");

            // What the receiver decodes is what was announced.
            let served = ffprobe_json(&format!("{base}/variant.m3u8"), "stream=codec_type,profile");
            let streams = served["streams"].as_array().cloned().unwrap_or_default();
            let video = streams.iter().find(|s| s["codec_type"] == "video").expect("video");
            assert_eq!(video["profile"], profile, "{name}");
            assert_eq!(streams.iter().any(|s| s["codec_type"] == "audio"), has_audio, "{name}: {streams:?}");
            state.stop_session(&id).await;
        }
        // The fMP4 init file lands in the session folder, never in the working directory.
        assert!(!std::env::current_dir().unwrap().join(FMP4_INIT).exists());
        let _ = std::fs::remove_dir_all(dir);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn variant() -> Variant {
        Variant { width: 1920, height: 1080, fps: 23.976, bandwidth: 2_500_000, codecs: "avc1.640029,mp4a.40.2".into() }
    }

    fn session(temp_dir: PathBuf) -> Arc<HlsSession> {
        Arc::new(HlsSession {
            variant: variant(),
            temp_dir,
            last_access: std::sync::Mutex::new(Instant::now()),
            process: tokio::sync::Mutex::new(None),
            newest_requested: AtomicU32::new(0),
            pruned_below: AtomicU32::new(0),
            target_duration: AtomicU32::new(CONVERTED_TARGET_SEC),
            held: AtomicBool::new(false),
        })
    }

    /// The target duration a served playlist announces, or 0 when it has none.
    fn playlist_target_duration(playlist: &str) -> u32 {
        playlist
            .lines()
            .find_map(|line| line.trim().strip_prefix("#EXT-X-TARGETDURATION:"))
            .and_then(|value| value.trim().parse().ok())
            .unwrap_or(0)
    }

    fn first_segment(playlist: &str) -> &str {
        playlist.lines().find(|line| !line.starts_with('#')).unwrap_or("")
    }

    /// FFmpeg's EVENT playlist with segments `0..count` of `extension`.
    fn ffmpeg_playlist(count: u32, extension: &str, header: &str) -> String {
        let mut p = format!(
            "#EXTM3U\n#EXT-X-VERSION:{}\n#EXT-X-TARGETDURATION:4\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:EVENT\n#EXT-X-INDEPENDENT-SEGMENTS\n{header}",
            if extension == "m4s" { 7 } else { 3 }
        );
        for n in 0..count {
            p.push_str(&format!("#EXTINF:4.004000,\nseg{n:05}.{extension}\n"));
        }
        p
    }

    #[test]
    fn master_playlist_names_the_planned_codecs() {
        let body = master_playlist(&Variant { codecs: "avc1.640029,ac-3".into(), ..variant() });
        assert!(body.contains("CODECS=\"avc1.640029,ac-3\",RESOLUTION=1920x1080,FRAME-RATE=23.976"));
        assert!(body.ends_with("variant.m3u8\n"));
        let audio = master_playlist(&Variant { codecs: "mp4a.40.2".into(), width: 0, height: 0, ..variant() });
        assert!(audio.contains("CODECS=\"mp4a.40.2\"\nvariant.m3u8"), "{audio}");
        assert!(!audio.contains("RESOLUTION") && !audio.contains("FRAME-RATE"), "{audio}");
    }

    #[test]
    fn mp4_segments_are_served_once_finished() {
        assert_eq!(segment_number("seg00042.m4s"), Some(42));
        assert_eq!(segment_number("init.mp4"), None);
        let moof = [0u8, 0, 0, 24, b'm', b'o', b'o', b'f'];
        assert_eq!(finished_segment_type("seg00001.m4s", &moof), Some("video/mp4"));
        assert_eq!(finished_segment_type(FMP4_INIT, &[0, 0, 0, 32, b'f', b't', b'y', b'p']), Some("video/mp4"));
        assert_eq!(finished_segment_type("seg00001.m4s", &[0, 0]), None);
        assert_eq!(finished_segment_type("seg00001.ts", &[0x47, 0x40]), Some("video/mp2t"));
        assert_eq!(finished_segment_type("seg00001.ts", &[0, 0]), None);
        // FFmpeg's fMP4 playlist: pruning keeps the header map every segment depends on.
        let p = ffmpeg_playlist(14, "m4s", "#EXT-X-MAP:URI=\"init.mp4\"\n");
        let out = served_playlist(&p, 10, 4);
        assert!(out.contains("#EXT-X-MAP:URI=\"init.mp4\"\n#EXTINF:4.004000,\nseg00010.m4s\n"), "{out}");
        assert!(out.contains("#EXT-X-TARGETDURATION:4\n#EXT-X-MEDIA-SEQUENCE:10\n"), "{out}");
        assert!(out.find("MEDIA-SEQUENCE") < out.find("#EXT-X-MAP"), "the sequence precedes the map: {out}");
        assert!(!out.contains("seg00009.m4s"), "{out}");
    }

    #[test]
    fn byte_ranges_are_honoured_as_advertised() {
        assert_eq!(byte_range(None, 1000), None);
        assert_eq!(byte_range(Some("bytes=0-"), 1000), Some(Ok((0, 999))));
        assert_eq!(byte_range(Some("bytes=100-199"), 1000), Some(Ok((100, 199))));
        assert_eq!(byte_range(Some("bytes=900-5000"), 1000), Some(Ok((900, 999))), "clamped to the end");
        assert_eq!(byte_range(Some("bytes=-100"), 1000), Some(Ok((900, 999))), "the last 100 bytes");
        assert_eq!(byte_range(Some("bytes=-5000"), 1000), Some(Ok((0, 999))));
        assert_eq!(byte_range(Some("bytes=1000-"), 1000), Some(Err(())), "past the end");
        assert_eq!(byte_range(Some("bytes=-0"), 1000), Some(Err(())));
        assert_eq!(byte_range(Some("bytes=0-1,5-9"), 1000), None, "several ranges: the whole file");
        assert_eq!(byte_range(Some("items=0-9"), 1000), None);
        assert_eq!(byte_range(Some("bytes=9-3"), 1000), None, "an inverted range is ignored");
    }

    #[tokio::test]
    async fn segments_stream_from_disk_whole_or_by_range() {
        let dir = std::env::temp_dir().join(format!("argus-hls-range-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("seg00003.ts");
        let mut data = vec![0x47u8; 4096];
        data[1000] = 7;
        std::fs::write(&path, &data).unwrap();
        assert_eq!(ready_segment_type(&path, "seg00003.ts").await, Some("video/mp2t"));
        let whole = file_response(&path, "video/mp2t", None).await.unwrap();
        assert_eq!(whole.status(), StatusCode::OK);
        assert_eq!(whole.headers()["content-length"], "4096");
        let body = axum::body::to_bytes(whole.into_body(), usize::MAX).await.unwrap();
        assert_eq!(body.as_ref(), &data[..]);
        let part = file_response(&path, "video/mp2t", Some("bytes=1000-1009")).await.unwrap();
        assert_eq!(part.status(), StatusCode::PARTIAL_CONTENT);
        assert_eq!(part.headers()["content-range"], "bytes 1000-1009/4096");
        assert_eq!(part.headers()["content-length"], "10");
        let body = axum::body::to_bytes(part.into_body(), usize::MAX).await.unwrap();
        assert_eq!(body.as_ref(), &data[1000..1010]);
        let past = file_response(&path, "video/mp2t", Some("bytes=5000-")).await.unwrap();
        assert_eq!(past.status(), StatusCode::RANGE_NOT_SATISFIABLE);
        assert_eq!(past.headers()["content-range"], "bytes */4096");
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn playlists_start_at_the_first_listed_segment() {
        let out = served_playlist(&ffmpeg_playlist(1, "ts", ""), 0, 4);
        assert!(
            out.starts_with(
                "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-START:TIME-OFFSET=0,PRECISE=YES\n#EXT-X-TARGETDURATION:4\n#EXT-X-MEDIA-SEQUENCE:0\n"
            ),
            "{out}"
        );
        // Serving a served playlist again changes nothing: one EXT-X-START, one media sequence.
        assert_eq!(served_playlist(&out, 0, 4), out);
        assert_eq!(segment_number("seg00042.ts"), Some(42));
        assert_eq!(segment_number("playlist.m3u8"), None);
    }

    #[test]
    fn the_playlist_type_never_changes_during_a_session() {
        // Strict receivers (AVPlayer, the Chromecast receiver) reset when a reloaded playlist
        // changes type, so the first response must already look like the pruned ones.
        let before = served_playlist(&ffmpeg_playlist(12, "ts", ""), 0, 4);
        let after = served_playlist(&ffmpeg_playlist(80, "ts", ""), 45, 4);
        for out in [&before, &after] {
            assert!(!out.contains("PLAYLIST-TYPE"), "{out}");
            assert_eq!(out.matches("#EXT-X-MEDIA-SEQUENCE").count(), 1, "{out}");
            assert_eq!(out.matches("#EXT-X-TARGETDURATION:4\n").count(), 1, "{out}");
            assert_eq!(out.matches("#EXT-X-START").count(), 1, "{out}");
        }
        assert!(before.contains("#EXT-X-MEDIA-SEQUENCE:0\n") && first_segment(&before) == "seg00000.ts", "{before}");
        assert!(after.contains("#EXT-X-MEDIA-SEQUENCE:45\n") && first_segment(&after) == "seg00045.ts", "{after}");
        assert_eq!(before.matches("#EXTINF").count(), 12);
        assert_eq!(after.matches("#EXTINF").count(), 35);
        // The finished film keeps its end marker after the last segment.
        let ended = served_playlist(&format!("{}#EXT-X-ENDLIST\n", ffmpeg_playlist(80, "ts", "")), 45, 4);
        assert!(ended.ends_with("seg00079.ts\n#EXT-X-ENDLIST\n"), "{ended}");
    }

    #[test]
    fn the_media_sequence_names_the_first_segment_actually_listed() {
        // FFmpeg's playlist can lag the pruning boundary by a segment or two.
        let mut p = ffmpeg_playlist(0, "ts", "");
        for n in 12..20u32 {
            p.push_str(&format!("#EXTINF:4.004000,\r\nseg{n:05}.ts\r\n"));
        }
        let out = served_playlist(&p, 10, 4);
        assert!(out.contains("#EXT-X-MEDIA-SEQUENCE:12\n"), "{out}");
        assert!(!out.contains('\r'), "{out}");
    }

    #[test]
    fn header_tags_of_a_dropped_segment_carry_over() {
        // A map or key in front of a deleted segment still applies to the ones after it.
        let mut p = ffmpeg_playlist(0, "m4s", "#EXT-X-MAP:URI=\"init.mp4\"\n");
        p.push_str("#EXTINF:4.0,\nseg00000.m4s\n");
        p.push_str("#EXT-X-MAP:URI=\"init1.mp4\"\n#EXTINF:4.0,\nseg00001.m4s\n");
        p.push_str("#EXT-X-MAP:URI=\"init2.mp4\"\n#EXTINF:4.0,\nseg00002.m4s\n#EXTINF:4.0,\nseg00003.m4s\n");
        let out = served_playlist(&p, 3, 4);
        assert!(out.contains("#EXT-X-MAP:URI=\"init2.mp4\"\n#EXTINF:4.0,\nseg00003.m4s\n"), "{out}");
        assert!(!out.contains("init1.mp4"), "only the latest map of the dropped ones still applies: {out}");
        // The header's own map is never dropped.
        assert!(out.contains("#EXT-X-MAP:URI=\"init.mp4\"\n"), "{out}");
    }

    #[test]
    fn the_target_duration_covers_every_listed_segment() {
        // Converted segments stay within the starting value: every response carries it unchanged.
        let s = session(std::env::temp_dir());
        for playlist in [ffmpeg_playlist(3, "ts", ""), ffmpeg_playlist(40, "ts", "")] {
            let out = served_playlist(&playlist, 0, settle_target_duration(&s, &playlist));
            assert_eq!(playlist_target_duration(&out), CONVERTED_TARGET_SEC, "{out}");
            assert_eq!(out.matches("#EXT-X-TARGETDURATION").count(), 1, "{out}");
        }
        // The bounds cover what each kind of stream produces: 4 s converted segments, and copied
        // segments up to x264/x265's default 250-frame keyframe interval at 23.976 fps.
        assert!(CONVERTED_TARGET_SEC >= SEGMENT_SEC + 1);
        assert!(f64::from(COPIED_TARGET_SEC) >= (250.0 / 23.976_f64).round() * 2.0);
    }

    #[test]
    fn a_copied_stream_with_keyframes_40_seconds_apart_announces_40_seconds() {
        // FFmpeg's own playlist for a copied 24 fps H.264 MPEG-TS source with a 40 s GOP: it can only
        // cut at keyframes, so the segments are 40 s whatever -hls_time asks for.
        let ffmpeg = "#EXTM3U\n#EXT-X-VERSION:6\n#EXT-X-TARGETDURATION:40\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:EVENT\n#EXT-X-INDEPENDENT-SEGMENTS\n";
        let first = format!("{ffmpeg}#EXTINF:40.000000,\nseg00000.ts\n");
        let later = format!("{first}#EXTINF:40.000000,\nseg00001.ts\n#EXTINF:10.000000,\nseg00002.ts\n#EXT-X-ENDLIST\n");
        let s = session(std::env::temp_dir());
        s.target_duration.store(COPIED_TARGET_SEC, Ordering::SeqCst);
        // Until a longer segment appears, the copied stream's starting value is served.
        let short = ffmpeg.to_string() + "#EXTINF:10.427083,\nseg00000.ts\n";
        assert_eq!(settle_target_duration(&s, &short), COPIED_TARGET_SEC);
        for playlist in [&first, &later] {
            let out = served_playlist(playlist, 0, settle_target_duration(&s, playlist));
            assert_eq!(playlist_target_duration(&out), 40, "{out}");
            assert_eq!(out.matches("#EXT-X-TARGETDURATION").count(), 1, "{out}");
            // RFC 8216 4.3.3.1: no listed segment, rounded, exceeds the target.
            assert!(longest_segment(&out) <= playlist_target_duration(&out), "{out}");
        }
        // Once raised it is never lowered, even after the long segments are pruned.
        let pruned = served_playlist(&later, 2, settle_target_duration(&s, &short));
        assert_eq!(playlist_target_duration(&pruned), 40, "{pruned}");
        // Durations round to the nearest second, as the RFC compares them.
        assert_eq!(longest_segment("#EXTINF:30.4,\na.ts\n#EXTINF:12,\nb.ts\n"), 30);
        assert_eq!(longest_segment("#EXTINF:30.5,title\na.ts\n"), 31);
        assert_eq!(longest_segment("#EXTM3U\n#EXTINF:nan,\na.ts\n"), 0);
    }

    #[test]
    fn the_conversion_pauses_far_ahead_of_the_receiver_and_resumes_as_it_catches_up() {
        assert!(!hold_conversion(LEAD_MAX_SEGMENTS, 0, false));
        assert!(hold_conversion(LEAD_MAX_SEGMENTS + 1, 0, false));
        // Held, it waits until the receiver is well within the limit, not one segment closer.
        assert!(hold_conversion(LEAD_MAX_SEGMENTS + 1, 2, true));
        assert!(!hold_conversion(500 + LEAD_RESUME_SEGMENTS, 500, true));
        assert!(!hold_conversion(3, 10, false), "a receiver past the written segments is no lead");
        let p = format!("{}#EXT-X-ENDLIST\n", ffmpeg_playlist(12, "m4s", "#EXT-X-MAP:URI=\"init.mp4\"\n"));
        assert_eq!(newest_written(&p), Some(11));
        assert_eq!(newest_written("#EXTM3U\n"), None);
    }

    #[tokio::test]
    async fn a_running_process_can_be_paused_and_resumed() {
        let mut command = if cfg!(windows) {
            let mut c = tokio::process::Command::new("ping");
            c.args(["-n", "30", "127.0.0.1"]);
            c
        } else {
            let mut c = tokio::process::Command::new("sleep");
            c.arg("30");
            c
        };
        let mut child = command
            .kill_on_drop(true)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .expect("start a long-running process");
        set_process_held(&child, true).expect("suspend");
        set_process_held(&child, false).expect("resume");
        assert!(child.try_wait().expect("status").is_none(), "still running after resume");
        set_process_held(&child, true).expect("suspend again");
        // A suspended process can still be stopped, as stopping a session does.
        child.start_kill().expect("kill while suspended");
        child.wait().await.expect("reap");
    }

    #[tokio::test]
    async fn a_session_kept_alive_is_not_evicted_as_idle() {
        let state = HlsState::new();
        let id = Uuid::new_v4().to_string();
        let temp_dir = std::env::temp_dir().join(format!("argus-hls-test-{id}"));
        std::fs::create_dir_all(&temp_dir).expect("create test HLS directory");
        let s = session(temp_dir.clone());
        state.sessions.write().await.insert(id.clone(), s.clone());
        // Last access is moved back instead of sleeping, so a busy test machine cannot make a
        // session look idle between two lines (a 40 ms window used to).
        let idle = Duration::from_secs(5);
        let long_ago = Instant::now().checked_sub(Duration::from_secs(10)).expect("the machine has run for 10 s");
        *s.last_access.lock().unwrap() = long_ago;
        assert!(state.touch_session(&id).await);
        assert_eq!(state.evict_idle(idle).await, 0, "touched just now");
        *s.last_access.lock().unwrap() = long_ago;
        drop(s);
        assert_eq!(state.evict_idle(idle).await, 1, "idle once nobody follows it");
        assert!(!temp_dir.exists());
        assert!(!state.touch_session(&id).await);
    }

    #[test]
    fn the_playlist_never_lists_a_pruned_segment() {
        let out = served_playlist(&ffmpeg_playlist(14, "ts", ""), 10, 4);
        assert!(!out.contains("PLAYLIST-TYPE"), "an EVENT playlist cannot drop segments: {out}");
        assert!(out.contains("#EXT-X-MEDIA-SEQUENCE:10\n") && first_segment(&out) == "seg00010.ts", "{out}");
        assert!(!out.contains("seg00009.ts"), "{out}");
        assert!(out.contains("seg00013.ts") && out.contains("#EXT-X-START:TIME-OFFSET=0"), "{out}");
        assert_eq!(out.matches("#EXTINF").count(), 4);
    }

    #[tokio::test]
    async fn stop_session_removes_the_session_and_its_temp_dir() {
        let state = HlsState::new();
        let id = Uuid::new_v4().to_string();
        let temp_dir = std::env::temp_dir().join(format!("argus-hls-test-{id}"));
        std::fs::create_dir_all(&temp_dir).expect("create test HLS directory");
        std::fs::write(temp_dir.join("segment.ts"), b"segment").expect("write test segment");
        state.sessions.write().await.insert(id.clone(), session(temp_dir.clone()));

        assert!(state.stop_session(&id).await);
        assert!(!temp_dir.exists());
        assert!(!state.stop_session(&id).await);
    }

    #[tokio::test]
    async fn stop_all_removes_every_session_and_is_idempotent() {
        let state = HlsState::new();
        let mut temp_dirs = Vec::new();
        for _ in 0..2 {
            let id = Uuid::new_v4().to_string();
            let temp_dir = std::env::temp_dir().join(format!("argus-hls-test-{id}"));
            std::fs::create_dir_all(&temp_dir).expect("create test HLS directory");
            state.sessions.write().await.insert(id, session(temp_dir.clone()));
            temp_dirs.push(temp_dir);
        }

        assert_eq!(state.stop_all().await, 2);
        assert!(temp_dirs.iter().all(|path| !path.exists()));
        assert_eq!(state.stop_all().await, 0);
    }
}
