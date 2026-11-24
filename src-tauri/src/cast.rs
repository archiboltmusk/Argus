use mdns_sd::{ServiceDaemon, ServiceEvent};
use rust_cast::{
    channels::{
        media::{Media, Metadata, MovieMediaMetadata, MusicTrackMediaMetadata, StreamType},
        receiver::CastDeviceApp,
    },
    CastDevice, ChannelMessage,
};
use serde::Serialize;
use std::collections::HashMap;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use crate::airplay;
use crate::cast_subs::{self, CastSub, CastSubStyle};
use crate::cast_transcode::{self, CastJob, CastOptions, DeviceLimits, MediaProbe, PlanInput, PlanSummary, SharedStats, TranscodeStats};
use crate::dlna;
use crate::roku;
use crate::stream_proxy::{AudioCastFormat, AudioCastInput, ProxyState, RegisterArgs};
use crate::transcode::TranscodeProfile;
use std::sync::Arc;

const CAST_SERVICE_TYPE: &str = "_googlecast._tcp.local.";
const ARGUS_RECEIVER_APP_ID: &str = "120F754D";
const DISCOVERY_TIMEOUT_MS: u64 = 5000;

#[derive(Debug, Clone, Serialize)]
pub struct CastDeviceInfo {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub model: Option<String>,
    pub kind: String,
    pub control_url: Option<String>,
    pub audio_only: bool,
}

fn is_audio_content_type(content_type: Option<&str>) -> bool {
    content_type.is_some_and(|mime| mime.trim().to_ascii_lowercase().starts_with("audio/"))
}

fn needs_auto_remux(kind: &str, url: &str, content_type: Option<&str>) -> bool {
    // Music streams keep their actual codec/container; the video HLS emitter is not an audio converter.
    if is_audio_content_type(content_type) {
        return false;
    }
    if kind != "chromecast" && kind != "dlna" && kind != "roku" {
        return false;
    }
    let path = url.split('?').next().unwrap_or(url).to_lowercase();
    // Streaming-friendly playlists pass through. Everything else (MP4 included,
    // because non-faststart MP4 with moov-at-end stalls the chromecast) gets
    // segmented through our HLS emitter. The HLS path uses fast transmux for
    // h264+aac sources so there's no CPU cost.
    if path.ends_with(".m3u8") || path.ends_with(".mpd") || path.ends_with(".ts") {
        return false;
    }
    true
}

fn chromecast_content_type(url: &str, supplied: Option<&str>) -> String {
    if is_audio_content_type(supplied) {
        return supplied.unwrap_or_default().trim().to_string();
    }
    let lower = url.to_lowercase();
    if lower.contains(".m3u8") {
        "application/x-mpegURL".into()
    } else if lower.contains(".ts") {
        "video/mp2t".into()
    } else {
        "video/mp4".into()
    }
}

fn cast_media_metadata(
    title: Option<String>,
    poster: Option<String>,
    content_type: Option<&str>,
) -> Metadata {
    let images = poster
        .map(|url| vec![rust_cast::channels::media::Image::new(url)])
        .unwrap_or_default();
    if is_audio_content_type(content_type) {
        Metadata::MusicTrack(MusicTrackMediaMetadata {
            title,
            images,
            ..Default::default()
        })
    } else {
        Metadata::Movie(MovieMediaMetadata {
            title,
            images,
            ..Default::default()
        })
    }
}

fn required_control_url(kind: &str, control_url: Option<String>) -> Result<Option<String>, String> {
    match (kind, control_url) {
        ("dlna", None) => Err("DLNA device missing control_url".to_string()),
        ("roku", None) => Err("Roku device missing ecp_base".to_string()),
        (_, control_url) => Ok(control_url),
    }
}

fn detect_audio_only(name: &str, model: &Option<String>, kind: &str) -> bool {
    let n = name.to_lowercase();
    let m = model.as_deref().unwrap_or("").to_lowercase();
    let blob = format!("{n} {m}");
    let screen_hints = ["nest hub", "echo show", "tv ", " tv", "display"];
    if screen_hints.iter().any(|h| blob.contains(h)) {
        return false;
    }
    let speaker_hints = [
        "sonos",
        "echo dot",
        "echo studio",
        "homepod",
        "home pod",
        "google home mini",
        "google nest mini",
        "nest audio",
        "speaker",
        "soundbar",
        "playbar",
        "play:1",
        "play:3",
        "play:5",
        "era 100",
        "era 300",
        "five ",
    ];
    if speaker_hints.iter().any(|h| blob.contains(h)) {
        return true;
    }
    if kind == "chromecast" {
        let audio_models = [
            "chromecast audio",
            "nest audio",
            "google home mini",
            "nest mini",
        ];
        return audio_models.iter().any(|h| m.contains(h));
    }
    false
}

/// Everything needed to start a converted cast again at another position or with other settings.
#[derive(Clone)]
struct Reload {
    url: String,
    headers: HashMap<String, String>,
    title: Option<String>,
    poster: Option<String>,
    kind: String,
    host: String,
    port: u16,
    options: CastOptions,
    probe: Option<MediaProbe>,
    audio_ordinal: u32,
    subtitle: Option<CastSub>,
    sub_style: Option<CastSubStyle>,
    /// The prepared subtitle on the film's clock, reused by every restart.
    sub_base: Option<std::path::PathBuf>,
    burn_bitmap: Option<u32>,
    force_video_encode: bool,
    /// What the receiver's device profile rules out (resolution, bit rate, surround, codecs).
    limits: DeviceLimits,
    hls: bool,
}

/// Session state that every receiver kind shares.
#[derive(Clone, Default)]
struct SessionExtra {
    /// Film time at which the receiver's own clock reads zero: a converted stream starts at the
    /// position the cast (or the last seek) started from.
    seek_base: f64,
    reload: Option<Arc<Reload>>,
    stats: Option<SharedStats>,
    summary: Option<PlanSummary>,
    /// UPnP UUID, to find a DLNA renderer that restarted on a new port.
    uuid: Option<String>,
    /// The receiver plays a stream Argus converts, so seeking restarts the conversion.
    converted: bool,
}

enum ActiveSession {
    Chromecast {
        host: String,
        port: u16,
        transport_id: String,
        session_id: String,
        media_session_id: Option<i32>,
        seek_start_sec: f64,
        hls_session_id: Option<String>,
        extra: SessionExtra,
    },
    Dlna {
        control_url: String,
        hls_session_id: Option<String>,
        extra: SessionExtra,
    },
    Roku {
        ecp_base: String,
        hls_session_id: Option<String>,
        extra: SessionExtra,
    },
    AirPlay {
        host: String,
        port: u16,
        hls_session_id: Option<String>,
        extra: SessionExtra,
    },
}

static ACTIVE: Mutex<Option<ActiveSession>> = Mutex::new(None);
// Keep asynchronous receiver mutations in order; status polling never holds this lock.
static TRANSPORT_OPS: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());
static ACTIVE_EPOCH: AtomicU64 = AtomicU64::new(0);

impl ActiveSession {
    fn hls_session_id(&self) -> Option<String> {
        match self {
            Self::Chromecast { hls_session_id, .. }
            | Self::Dlna { hls_session_id, .. }
            | Self::Roku { hls_session_id, .. }
            | Self::AirPlay { hls_session_id, .. } => hls_session_id.clone(),
        }
    }

    fn extra(&self) -> &SessionExtra {
        match self {
            Self::Chromecast { extra, .. }
            | Self::Dlna { extra, .. }
            | Self::Roku { extra, .. }
            | Self::AirPlay { extra, .. } => extra,
        }
    }
}

fn snapshot_extra() -> Option<SessionExtra> {
    ACTIVE.lock().ok()?.as_ref().map(|s| s.extra().clone())
}

/// The proxy stream (HLS or MPEG-TS) the active cast plays from, if any.
fn active_stream_id() -> Option<String> {
    ACTIVE.lock().ok()?.as_ref().and_then(|s| s.hls_session_id())
}

async fn replace_active_session<Stop, StopFuture>(
    next: ActiveSession,
    stop_hls: Stop,
) -> Result<(), String>
where
    Stop: FnOnce(String) -> StopFuture,
    StopFuture: std::future::Future<Output = ()>,
{
    let previous_hls = {
        let mut active = ACTIVE.lock().map_err(|e| format!("lock: {e}"))?;
        ACTIVE_EPOCH.fetch_add(1, Ordering::Relaxed);
        active
            .replace(next)
            .and_then(|session| session.hls_session_id())
    };
    if let Some(id) = previous_hls {
        stop_hls(id).await;
    }
    Ok(())
}

fn restore_failed_stop(session: Option<ActiveSession>, epoch: u64) -> Result<(), String> {
    let mut active = ACTIVE.lock().map_err(|e| format!("lock: {e}"))?;
    restore_failed_stop_if_current(&mut active, session, epoch, ACTIVE_EPOCH.load(Ordering::Relaxed));
    Ok(())
}

fn restore_failed_stop_if_current(
    active: &mut Option<ActiveSession>,
    session: Option<ActiveSession>,
    epoch: u64,
    current_epoch: u64,
) {
    // A new LOAD may have replaced (and subsequently stopped) the session while STOP awaited the network.
    if active.is_none() && current_epoch == epoch {
        *active = session;
    }
}

fn parse_friendly_name(properties: &HashMap<String, String>) -> Option<String> {
    properties
        .get("fn")
        .or_else(|| properties.get("n"))
        .map(|s| s.to_string())
}

fn parse_model(properties: &HashMap<String, String>) -> Option<String> {
    properties.get("md").map(|s| s.to_string())
}

fn pick_address(addrs: &std::collections::HashSet<mdns_sd::ScopedIp>) -> Option<IpAddr> {
    addrs.iter().map(|s| s.to_ip_addr()).find(|a| a.is_ipv4()).or_else(|| {
        addrs.iter().map(|s| s.to_ip_addr()).find(|a| match a {
            IpAddr::V6(v6) => {
                let o = v6.octets();
                !(o[0] == 0xfe && (o[1] & 0xc0) == 0x80)
            }
            _ => false,
        })
    })
}

async fn discover_chromecasts() -> Vec<CastDeviceInfo> {
    tokio::task::spawn_blocking(|| -> Vec<CastDeviceInfo> {
        let Ok(daemon) = ServiceDaemon::new() else {
            return Vec::new();
        };
        let Ok(receiver) = daemon.browse(CAST_SERVICE_TYPE) else {
            return Vec::new();
        };
        let deadline = std::time::Instant::now() + Duration::from_millis(DISCOVERY_TIMEOUT_MS);
        let mut devices: HashMap<String, CastDeviceInfo> = HashMap::new();
        while std::time::Instant::now() < deadline {
            match receiver.recv_timeout(Duration::from_millis(120)) {
                Ok(ServiceEvent::ServiceResolved(info)) => {
                    let addrs = info.get_addresses();
                    let Some(addr) = pick_address(addrs) else {
                        continue;
                    };
                    let port = info.get_port();
                    let host = addr.to_string();
                    let props_map: HashMap<String, String> = info
                        .get_properties()
                        .iter()
                        .map(|p| (p.key().to_string(), p.val_str().to_string()))
                        .collect();
                    let name = parse_friendly_name(&props_map)
                        .unwrap_or_else(|| info.get_fullname().to_string());
                    let model = parse_model(&props_map);
                    let id = format!("cc-{}-{}", host, port);
                    let audio_only = detect_audio_only(&name, &model, "chromecast");
                    devices.insert(
                        id.clone(),
                        CastDeviceInfo {
                            id,
                            name,
                            host,
                            port,
                            model,
                            kind: "chromecast".into(),
                            control_url: None,
                            audio_only,
                        },
                    );
                }
                Ok(_) => {}
                Err(_) => {}
            }
        }
        let _ = daemon.shutdown();
        devices.into_values().collect()
    })
    .await
    .unwrap_or_default()
}

async fn discover_dlna() -> Vec<CastDeviceInfo> {
    dlna::discover(DISCOVERY_TIMEOUT_MS)
        .await
        .into_iter()
        .map(|d| {
            let audio_only = detect_audio_only(&d.name, &d.model, "dlna");
            CastDeviceInfo {
                id: format!("dlna-{}", d.id),
                name: d.name,
                host: d.host,
                port: 0,
                model: d.model,
                kind: "dlna".into(),
                control_url: Some(d.control_url),
                audio_only,
            }
        })
        .collect()
}

async fn discover_roku() -> Vec<CastDeviceInfo> {
    roku::discover(DISCOVERY_TIMEOUT_MS)
        .await
        .into_iter()
        .map(|d| {
            let audio_only = detect_audio_only(&d.name, &d.model, "roku");
            let (host, port) = split_host_port(&d.host).unwrap_or_else(|| (d.host.clone(), 8060));
            CastDeviceInfo {
                id: format!("roku-{}", d.id),
                name: d.name,
                host,
                port,
                model: d.model,
                kind: "roku".into(),
                control_url: Some(d.ecp_base),
                audio_only,
            }
        })
        .collect()
}

fn split_host_port(host_str: &str) -> Option<(String, u16)> {
    let (h, p) = host_str.rsplit_once(':')?;
    let port = p.parse::<u16>().ok()?;
    Some((h.to_string(), port))
}

async fn discover_airplay() -> Vec<CastDeviceInfo> {
    airplay::discover(DISCOVERY_TIMEOUT_MS)
        .await
        .into_iter()
        .map(|d| {
            let audio_only = detect_audio_only(&d.name, &d.model, "airplay");
            CastDeviceInfo {
                id: d.id,
                name: d.name,
                host: d.host,
                port: d.port,
                model: d.model,
                kind: "airplay".into(),
                control_url: None,
                audio_only,
            }
        })
        .collect()
}

fn kind_priority(kind: &str) -> u8 {
    match kind {
        "chromecast" => 0,
        "airplay" => 1,
        "roku" => 2,
        "dlna" => 3,
        _ => 9,
    }
}

fn looks_like_apple(name: &str, model: &Option<String>) -> bool {
    let n = name.to_lowercase();
    let m = model.as_deref().unwrap_or("").to_lowercase();
    (n.contains("apple tv") || m.contains("appletv") || m.contains("apple")) && !emulates_old_apple_tv(model)
}

/// TV boxes and projectors with built-in AirPlay (EShare and the like) announce an Apple TV 2 or 3.
/// Those Apple TVs never had a DLNA renderer, so next to one the DLNA renderer is the real player.
fn emulates_old_apple_tv(model: &Option<String>) -> bool {
    let m = model.as_deref().unwrap_or("").to_ascii_lowercase();
    m.starts_with("appletv2,") || m.starts_with("appletv3,")
}

fn dedupe_by_host(devices: Vec<CastDeviceInfo>) -> Vec<CastDeviceInfo> {
    use std::collections::hash_map::Entry;
    let mut by_host: HashMap<String, CastDeviceInfo> = HashMap::new();
    for d in devices {
        let host_key = d.host.split(':').next().unwrap_or(&d.host).to_string();
        match by_host.entry(host_key) {
            Entry::Vacant(slot) => {
                slot.insert(d);
            }
            Entry::Occupied(mut slot) => {
                let existing = slot.get();
                let pair = (existing.kind.as_str(), d.kind.as_str());
                let apple = looks_like_apple(&d.name, &d.model)
                    || looks_like_apple(&existing.name, &existing.model);
                let dlna_wins_airplay =
                    matches!(pair, ("airplay", "dlna") | ("dlna", "airplay")) && !apple;
                if dlna_wins_airplay {
                    if d.kind == "dlna" {
                        slot.insert(d);
                    }
                } else if kind_priority(&d.kind) < kind_priority(&existing.kind) {
                    slot.insert(d);
                }
            }
        }
    }
    by_host.into_values().collect()
}

#[tauri::command]
pub async fn cast_discover() -> Result<Vec<CastDeviceInfo>, String> {
    let (cc, dl, rk, ap) = tokio::join!(
        discover_chromecasts(),
        discover_dlna(),
        discover_roku(),
        discover_airplay(),
    );
    let merged: Vec<CastDeviceInfo> = cc.into_iter().chain(dl).chain(rk).chain(ap).collect();
    let mut out = dedupe_by_host(merged);
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

fn connect_device_once<'a>(host: &str, port: u16) -> Result<CastDevice<'a>, String> {
    let device = CastDevice::connect_without_host_verification(host.to_string(), port)
        .map_err(|e| format!("connect: {e}"))?;
    device
        .connection
        .connect("receiver-0".to_string())
        .map_err(|e| format!("connect ns: {e}"))?;
    device
        .heartbeat
        .ping()
        .map_err(|e| format!("heartbeat: {e}"))?;
    Ok(device)
}

fn humanize_cast_error(err: &str) -> String {
    let lower = err.to_lowercase();
    if lower.contains("unexpected end of file") || lower.contains("connection reset") {
        return "Device dropped the connection. It may be busy with another app, asleep, or another phone is already casting to it. Wake the screen, stop other casts, and try again.".to_string();
    }
    if lower.contains("timed out") || lower.contains("os error 10060") {
        return "Couldn't reach the device. Check it's on the same Wi-Fi as your computer."
            .to_string();
    }
    if lower.contains("connection refused") {
        return "Device refused the connection. Try restarting it.".to_string();
    }
    if lower.contains("certificate") || lower.contains("tls") {
        return "Secure handshake failed. Make sure the TV is on the same network, and update its firmware if this keeps happening.".to_string();
    }
    err.to_string()
}

fn connect_device<'a>(host: &str, port: u16) -> Result<CastDevice<'a>, String> {
    match connect_device_once(host, port) {
        Ok(d) => Ok(d),
        Err(e1) => {
            eprintln!(
                "[argus::cast] connect attempt 1 failed: {} (retrying once)",
                e1
            );
            std::thread::sleep(Duration::from_millis(500));
            match connect_device_once(host, port) {
                Ok(d) => Ok(d),
                Err(e2) => Err(humanize_cast_error(&e2)),
            }
        }
    }
}

fn launch_argus_receiver<'a>(device: &CastDevice<'a>) -> Result<(String, String), String> {
    launch_receiver_app(device, ARGUS_RECEIVER_APP_ID)
}

fn launch_receiver_app<'a>(
    device: &CastDevice<'a>,
    app_id: &str,
) -> Result<(String, String), String> {
    let app = CastDeviceApp::from_str(app_id).map_err(|_| "invalid receiver app id".to_string())?;
    let session = device
        .receiver
        .launch_app(&app)
        .map_err(|e| format!("launch: {e}"))?;
    let transport_id = session.transport_id.clone();
    let session_id = session.session_id.clone();
    if transport_id.is_empty() || session_id.is_empty() {
        return Err("Receiver did not return session info".into());
    }
    device
        .connection
        .connect(transport_id.clone())
        .map_err(|e| format!("connect transport: {e}"))?;
    Ok((transport_id, session_id))
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CastLoadInfo {
    /// "hls", "ts", "direct" or "audio".
    pub stream: String,
    pub summary: Option<PlanSummary>,
}

/// DLNA takes one continuous MPEG-TS response unless the viewer picked HLS; every other receiver
/// plays the HLS event playlist.
fn wants_hls(kind: &str, options: &CastOptions) -> bool {
    kind != "dlna" || options.stream_format == "hls"
}

#[tauri::command]
pub async fn cast_load(
    proxy_state: tauri::State<'_, ProxyState>,
    host: String,
    port: u16,
    url: String,
    title: Option<String>,
    poster: Option<String>,
    content_type: Option<String>,
    start_time_sec: Option<f64>,
    kind: Option<String>,
    control_url: Option<String>,
    headers: Option<std::collections::HashMap<String, String>>,
    transcode: Option<bool>,
    profile: Option<TranscodeProfile>,
    subtitle: Option<CastSub>,
    sub_style: Option<CastSubStyle>,
    audio_only: Option<bool>,
    audio_track_ordinal: Option<u32>,
    audio_start_paused: Option<bool>,
    options: Option<CastOptions>,
    device_id: Option<String>,
    source_width: Option<u32>,
    source_height: Option<u32>,
) -> Result<CastLoadInfo, String> {
    let kind_str = kind.unwrap_or_else(|| "chromecast".into());
    let _operation = TRANSPORT_OPS.lock().await;
    let control_url = required_control_url(&kind_str, control_url)?;
    let req_headers = headers.unwrap_or_default();
    let direct_audio = kind_str == "dlna" && !audio_start_paused.unwrap_or(false)
        && audio_track_ordinal.unwrap_or(0) == 0
        && dlna::supports_direct_audio(control_url.as_deref().unwrap_or(""), content_type.as_deref()).await;
    if kind_str == "dlna" && !direct_audio && (audio_only.unwrap_or(false) || is_audio_content_type(content_type.as_deref())) {
        let cu = control_url.ok_or("DLNA device missing control_url")?;
        let input = AudioCastInput {
            url, headers: req_headers, audio_ordinal: audio_track_ordinal.unwrap_or(0),
            start_seconds: start_time_sec.unwrap_or(0.0),
            // Live FLAC decoded on Sonos but failed real pause/resume tests. MP3 passed all controls.
            format: AudioCastFormat::Mp3,
            title, target_host: host,
        };
        load_dlna_audio(&proxy_state, cu, input, audio_start_paused.unwrap_or(false), None).await?;
        return Ok(CastLoadInfo { stream: "audio".into(), summary: None });
    }
    if audio_only.unwrap_or(false) && !is_audio_content_type(content_type.as_deref()) {
        return Err("Audio-only routing is currently supported by DLNA speakers".into());
    }
    let options = options.unwrap_or_default();
    let start = start_time_sec.unwrap_or(0.0).max(0.0);
    let uuid = device_id
        .as_deref()
        .and_then(|id| id.strip_prefix("dlna-"))
        .map(str::to_string);
    let wants_sub = subtitle.as_ref().is_some_and(|s| !s.off);
    let audio_type = is_audio_content_type(content_type.as_deref());
    // Files go through the converter, which only copies what the receiver can take as it is; an
    // adaptive playlist or an audio stream is handed over directly unless something must change.
    // A copied stream plays its first audio track untouched, so another track or any audio
    // processing needs the converter too. A file on this computer always goes through it: the
    // direct path relays HTTP and cannot open a filesystem path.
    let local_source = !cast_transcode::is_http(&url);
    let mut convert = load_converts(
        local_source,
        audio_type,
        transcode.unwrap_or(false) || wants_sub || audio_track_ordinal.unwrap_or(0) > 0,
        &options,
        needs_auto_remux(&kind_str, &url, content_type.as_deref()),
    );
    let mut probed = None;
    if !convert && !audio_type {
        (convert, probed) =
            quality_converts(&url, &req_headers, &options, known_picture(source_width, source_height)).await;
    }
    eprintln!(
        "[argus::cast] load kind={} host={} convert={} subtitle={} start={:.1}",
        kind_str, host, convert, wants_sub, start
    );
    let mut reload = Reload {
        url: url.clone(),
        headers: req_headers.clone(),
        title: title.clone(),
        poster: poster.clone(),
        kind: kind_str.clone(),
        host: host.clone(),
        port,
        options: options.clone(),
        // A source probed for its size is not probed again by the conversion.
        probe: probed,
        audio_ordinal: audio_track_ordinal.unwrap_or(0),
        subtitle: subtitle.clone().filter(|s| !s.off),
        sub_style: sub_style.clone(),
        sub_base: None,
        burn_bitmap: None,
        force_video_encode: forces_video_encode(transcode.unwrap_or(false), profile.as_ref()),
        limits: device_limits(profile.as_ref()),
        hls: wants_hls(&kind_str, &options),
    };
    if convert {
        if !crate::transcode::ffmpeg_present() {
            return Err("ffmpeg not found. Install ffmpeg to convert this video for the TV.".into());
        }
        prepare_reload(&mut reload).await;
        let reload = Arc::new(reload);
        let (session, info) = start_converted(&proxy_state, reload, start, false, control_url, uuid).await?;
        replace_active_session(session, |id| async move {
            proxy_state.stop_hls_session(&id).await;
        })
        .await?;
        return Ok(info);
    }
    let proxied = proxy_state
        .register_cast(RegisterArgs {
            url: url.clone(),
            audio_url: None,
            headers: req_headers,
            transcode: false,
            prebuffer_bytes: None,
            profile: None,
            target_host: Some(host.clone()),
            burn_sub_path: None,
            burn_sub_style: None,
        })
        .await;
    let hls_session_id = proxied
        .url
        .contains("/cast/hls/")
        .then(|| proxied.session_id.clone());
    let cast_url = proxied.url;
    let uuid_for_retry = uuid.clone();
    let extra = SessionExtra { seek_base: 0.0, reload: Some(Arc::new(reload)), stats: None, summary: None, uuid, converted: false };
    let info = CastLoadInfo { stream: "direct".into(), summary: None };
    if kind_str == "dlna" {
        let cu = control_url.ok_or_else(|| "DLNA device missing control_url".to_string())?;
        let cu = match load_dlna_rediscovering(cu, uuid_for_retry.as_deref(), &cast_url, title, start_time_sec, content_type.clone()).await {
            Ok(cu) => cu,
            Err(error) => {
                if let Some(id) = hls_session_id.as_deref() {
                    proxy_state.stop_hls_session(id).await;
                }
                return Err(error);
            }
        };
        replace_active_session(
            ActiveSession::Dlna { control_url: cu, hls_session_id, extra },
            |id| async move {
                proxy_state.stop_hls_session(&id).await;
            },
        )
        .await?;
        return Ok(info);
    }
    if kind_str == "roku" {
        let ecp = control_url.ok_or_else(|| "Roku device missing ecp_base".to_string())?;
        if let Err(error) = roku::load(ecp.clone(), cast_url, title, content_type.clone(), start_time_sec).await {
            if let Some(id) = hls_session_id.as_deref() {
                proxy_state.stop_hls_session(id).await;
            }
            return Err(error);
        }
        replace_active_session(
            ActiveSession::Roku { ecp_base: ecp, hls_session_id, extra },
            |id| async move {
                proxy_state.stop_hls_session(&id).await;
            },
        )
        .await?;
        return Ok(info);
    }
    if kind_str == "airplay" {
        if let Err(error) = airplay::load(host.clone(), port, cast_url, start_time_sec).await {
            if let Some(id) = hls_session_id.as_deref() {
                proxy_state.stop_hls_session(id).await;
            }
            return Err(error);
        }
        replace_active_session(
            ActiveSession::AirPlay { host, port, hls_session_id, extra },
            |id| async move {
                proxy_state.stop_hls_session(&id).await;
            },
        )
        .await?;
        return Ok(info);
    }
    let result = cast_load_chromecast(
        host,
        port,
        cast_url,
        title,
        poster,
        content_type,
        start_time_sec,
        hls_session_id.clone(),
        extra,
    )
    .await;
    match result {
        Ok(session) => {
            replace_active_session(session, |id| async move {
                proxy_state.stop_hls_session(&id).await;
            })
            .await?;
            Ok(info)
        }
        Err(error) => {
            if let Some(id) = hls_session_id.as_deref() {
                proxy_state.stop_hls_session(id).await;
            }
            Err(error)
        }
    }
}

/// Whether a load goes through the converter rather than handing the receiver the source as it is.
/// `requested` covers what the caller decided (a conversion, a subtitle to burn in, another audio
/// track); the settings that change the audio or the picture need the converter too, or a stream
/// sent as it is would silently ignore them.
fn load_converts(
    local_source: bool,
    audio_type: bool,
    requested: bool,
    options: &CastOptions,
    auto_remux: bool,
) -> bool {
    local_source
        || !audio_type
            && (requested
                || options.force_conversion
                || options.audio_filters_requested()
                || options.picture_changes_requested()
                || auto_remux)
}

/// Only a complete picture size can bypass probing. A release name may provide "1080p" without
/// the actual width (a 2560x1080 film, for example), so a height alone cannot prove it fits.
fn known_picture(width: Option<u32>, height: Option<u32>) -> Option<(u32, u32)> {
    match (width, height) {
        (Some(w), Some(h)) if w > 0 && h > 0 => Some((w, h)),
        _ => None,
    }
}

/// The size a direct load is judged by: what the player knows of the source, else what probing it
/// found. None when neither says (a probe that failed, or a source with no picture).
fn source_picture(known: Option<(u32, u32)>, probe: Option<&MediaProbe>) -> Option<(u32, u32)> {
    known.or_else(|| {
        probe
            .and_then(|p| p.video.as_ref())
            .map(|v| (v.width, v.height))
            .filter(|(_, height)| *height > 0)
    })
}

/// Whether the quality setting needs the converter for a source the receiver could otherwise play
/// as it is, and the probe made to find out, for the conversion to reuse.
///
/// A size the player knows decides at once, so a source confirmed to fit stays direct without a
/// probe. An unknown size is probed: the receiver would otherwise get a picture beyond the limit
/// with nothing to stop it. A source the probe cannot read is handed over as before, since FFmpeg
/// could not convert it either. "Original" has no limit to keep, so nothing is probed for it.
async fn quality_converts(
    url: &str,
    headers: &HashMap<String, String>,
    options: &CastOptions,
    known: Option<(u32, u32)>,
) -> (bool, Option<MediaProbe>) {
    if options.quality == "original" {
        return (false, None);
    }
    let probed = match known {
        Some(_) => None,
        None => match cast_transcode::probe(url, headers).await {
            Ok(probe) => Some(probe),
            Err(error) => {
                eprintln!("[argus::cast] could not read the source's size ({error}); sending it as it is");
                None
            }
        },
    };
    let beyond = source_picture(known, probed.as_ref()).is_some_and(|(w, h)| options.picture_beyond_quality(w, h));
    if beyond {
        eprintln!("[argus::cast] the source is beyond the {} quality setting; converting it", options.quality);
    }
    (beyond, probed)
}

/// The caller asked for a conversion whose profile rules out the source's video codec.
fn forces_video_encode(transcode: bool, profile: Option<&TranscodeProfile>) -> bool {
    transcode && profile.is_some_and(|p| p.force_h264)
}

/// The receiver's limits from its device profile. They hold for every conversion, including one
/// Argus starts by itself (a file whose URL names no format is remuxed), and only constrain what
/// is converted: the caller's `transcode` decides whether the picture must change.
fn device_limits(profile: Option<&TranscodeProfile>) -> DeviceLimits {
    match profile {
        Some(p) => DeviceLimits {
            max_height: Some(p.max_height),
            max_video_kbps: p.max_video_kbps,
            force_aac: p.force_aac,
            force_stereo: p.force_stereo,
        },
        None => DeviceLimits::default(),
    }
}

/// Loads `url` on a DLNA renderer; one that restarted on a new port is found again by its UUID and
/// loaded there. Returns the control URL that took it.
async fn load_dlna_rediscovering(
    control_url: String,
    uuid: Option<&str>,
    url: &str,
    title: Option<String>,
    start: Option<f64>,
    mime: Option<String>,
) -> Result<String, String> {
    let first = dlna::load(control_url.clone(), url.to_string(), title.clone(), start, mime.clone(), false).await;
    let error = match first {
        Ok(()) => return Ok(control_url),
        Err(error) => error,
    };
    let Some(fresh) = (match uuid {
        Some(id) => dlna::rediscover(id).await,
        None => None,
    }) else {
        return Err(error);
    };
    dlna::load(fresh.clone(), url.to_string(), title, start, mime, false).await.map(|_| fresh)
}

/// Probes the source and prepares the subtitle once; every restart of this cast reuses both.
async fn prepare_reload(reload: &mut Reload) {
    if reload.probe.is_none() {
        match cast_transcode::probe(&reload.url, &reload.headers).await {
            Ok(probe) => reload.probe = Some(probe),
            Err(error) => eprintln!("[argus::cast] probe failed ({error}); converting without stream details"),
        }
    }
    reload.sub_base = None;
    reload.burn_bitmap = None;
    let Some(sub) = reload.subtitle.clone() else { return };
    let bitmap = (sub.kind == "embedded")
        .then_some(sub.src_index)
        .flatten()
        .and_then(|ordinal| reload.probe.as_ref()?.subtitles.get(ordinal as usize).cloned())
        .filter(|s| s.is_bitmap())
        .map(|s| s.index);
    if bitmap.is_some() {
        reload.burn_bitmap = bitmap;
        return;
    }
    reload.sub_base = cast_subs::prepare_base(&sub, &reload.url, &reload.headers, &reload.options.sub_encoding).await;
    if reload.sub_base.is_none() {
        eprintln!("[argus::cast] subtitle could not be prepared; casting without it");
    }
}

/// Starts (or restarts) a converted cast at `start` and loads it on the receiver.
async fn start_converted(
    proxy: &ProxyState,
    reload: Arc<Reload>,
    start: f64,
    fast_seek: bool,
    control_url: Option<String>,
    uuid: Option<String>,
) -> Result<(ActiveSession, CastLoadInfo), String> {
    let caps = cast_transcode::caps().await;
    let burn = match reload.sub_base.as_ref() {
        Some(base) => Some(
            cast_subs::place(
                base,
                &reload.sub_style.clone().unwrap_or_default(),
                start,
                reload.options.sub_delay_ms as f64 / 1000.0,
            )
            .await,
        ),
        None => None,
    };
    let burn_pair = burn.as_ref().map(|p| (p.path.to_string_lossy().to_string(), p.force_style.clone()));
    let plan = cast_transcode::build_plan(
        &PlanInput {
            probe: reload.probe.as_ref(),
            options: &reload.options,
            audio_ordinal: reload.audio_ordinal,
            burn_sub: burn_pair.as_ref(),
            burn_bitmap: reload.burn_bitmap,
            force_video_encode: reload.force_video_encode,
            limits: reload.limits,
        },
        &caps,
    );
    let summary = plan.summary.clone();
    eprintln!(
        "[argus::cast] plan video={} audio={} tonemap={:?} hardware={:?} reasons={:?}",
        summary.video, summary.audio, summary.tonemap, summary.hardware, summary.reasons
    );
    let stats = SharedStats::default();
    let job = CastJob {
        url: reload.url.clone(),
        headers: reload.headers.clone(),
        seek_sec: start,
        fast_seek,
        plan,
        stats: stats.clone(),
    };
    let registered = proxy.register_cast_job(job, &reload.host, reload.hls).await?;
    let stream_id = registered.session_id.clone();
    let extra = SessionExtra {
        seek_base: start,
        reload: Some(reload.clone()),
        stats: Some(stats),
        summary: Some(summary.clone()),
        uuid: uuid.clone(),
        converted: true,
    };
    let info = CastLoadInfo { stream: if reload.hls { "hls".into() } else { "ts".into() }, summary: Some(summary) };
    let loaded: Result<ActiveSession, String> = match (reload.kind.as_str(), control_url) {
        // Errors past this point stop the conversion just registered (below), so none returns early.
        ("dlna" | "roku", None) => Err(format!("{} device missing its control URL", reload.kind)),
        ("dlna", Some(cu)) => {
            let mime = reload.hls.then(|| "application/vnd.apple.mpegurl".to_string());
            let mut result = dlna::load(cu.clone(), registered.url.clone(), reload.title.clone(), Some(start), mime.clone(), true)
                .await
                .map(|_| cu.clone());
            if result.is_err() {
                // A renderer that restarted on a new port is found again by its UUID.
                if let Some(fresh) = match uuid.as_deref() {
                    Some(id) => dlna::rediscover(id).await,
                    None => None,
                } {
                    result = dlna::load(fresh.clone(), registered.url.clone(), reload.title.clone(), Some(start), mime, true)
                        .await
                        .map(|_| fresh);
                }
            }
            result.map(|cu| ActiveSession::Dlna { control_url: cu, hls_session_id: Some(stream_id.clone()), extra })
        }
        ("roku", Some(ecp)) => {
            roku::load(ecp.clone(), registered.url.clone(), reload.title.clone(), Some("application/x-mpegURL".into()), None)
                .await
                .map(|_| ActiveSession::Roku { ecp_base: ecp, hls_session_id: Some(stream_id.clone()), extra })
        }
        ("airplay", _) => airplay::load(reload.host.clone(), reload.port, registered.url.clone(), None)
            .await
            .map(|_| ActiveSession::AirPlay {
                host: reload.host.clone(),
                port: reload.port,
                hls_session_id: Some(stream_id.clone()),
                extra,
            }),
        _ => {
            cast_load_chromecast(
                reload.host.clone(),
                reload.port,
                registered.url.clone(),
                reload.title.clone(),
                reload.poster.clone(),
                None,
                Some(start),
                Some(stream_id.clone()),
                extra,
            )
            .await
        }
    };
    match loaded {
        Ok(session) => Ok((session, info)),
        Err(error) => {
            proxy.stop_hls_session(&stream_id).await;
            Err(error)
        }
    }
}

fn current_control() -> Option<String> {
    let active = ACTIVE.lock().ok()?;
    match active.as_ref()? {
        ActiveSession::Dlna { control_url, .. } => Some(control_url.clone()),
        ActiveSession::Roku { ecp_base, .. } => Some(ecp_base.clone()),
        _ => None,
    }
}

/// Restarts the current cast at `position` with `change` applied to its settings.
async fn restart_active(
    proxy: &ProxyState,
    position: f64,
    fast_seek: bool,
    change: impl FnOnce(&mut Reload) -> bool,
) -> Result<CastLoadInfo, String> {
    let extra = snapshot_extra().ok_or("Nothing is casting")?;
    let mut reload = (*extra.reload.clone().ok_or("This cast cannot be changed; start it again")?).clone();
    let reprepare = change(&mut reload);
    if reprepare {
        prepare_reload(&mut reload).await;
    }
    if !crate::transcode::ffmpeg_present() {
        return Err("ffmpeg not found. Install ffmpeg to convert this video for the TV.".into());
    }
    // Loading the new stream sends Play; a seek or a settings change must not resume a pause.
    let was_paused = receiver_paused().await;
    let (session, info) =
        start_converted(proxy, Arc::new(reload), position.max(0.0), fast_seek, current_control(), extra.uuid.clone()).await?;
    replace_active_session(session, |id| async move {
        proxy.stop_hls_session(&id).await;
    })
    .await?;
    if was_paused {
        if let Err(error) = pause_active().await {
            eprintln!("[argus::cast] could not pause again after the restart: {error}");
        }
    }
    Ok(info)
}

/// Applies cast settings to the running cast by restarting it at `position_sec`.
#[tauri::command]
pub async fn cast_reload(
    proxy_state: tauri::State<'_, ProxyState>,
    position_sec: f64,
    options: Option<CastOptions>,
    subtitle: Option<CastSub>,
    sub_style: Option<CastSubStyle>,
    audio_track_ordinal: Option<u32>,
) -> Result<CastLoadInfo, String> {
    let _operation = TRANSPORT_OPS.lock().await;
    restart_active(&proxy_state, position_sec, false, move |reload| {
        let mut reprepare = false;
        if let Some(options) = options {
            reprepare |= options.sub_encoding != reload.options.sub_encoding;
            reload.hls = wants_hls(&reload.kind, &options);
            reload.options = options;
        }
        if let Some(sub) = subtitle {
            // Every settings change sends the subtitle along; downloading, extracting and
            // re-encoding it again is only needed when it is another one.
            let next = (!sub.off).then_some(sub);
            reprepare |= next != reload.subtitle;
            reload.subtitle = next;
        }
        // A subtitle that could not be prepared last time (say, a download that timed out) is tried again.
        reprepare |= reload.subtitle.is_some() && reload.sub_base.is_none() && reload.burn_bitmap.is_none();
        if let Some(style) = sub_style {
            reload.sub_style = Some(style);
        }
        if let Some(ordinal) = audio_track_ordinal {
            reload.audio_ordinal = ordinal;
        }
        reprepare || reload.probe.is_none()
    })
    .await
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CastPreview {
    pub duration_sec: f64,
    pub summary: PlanSummary,
    pub caps: cast_transcode::FfmpegCaps,
    pub hardware: Option<String>,
    pub subtitle_codecs: Vec<String>,
}

fn preview_cache() -> &'static Mutex<HashMap<String, (std::time::Instant, MediaProbe)>> {
    static CACHE: std::sync::OnceLock<Mutex<HashMap<String, (std::time::Instant, MediaProbe)>>> = std::sync::OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// What casting this source with these settings would do, for the settings panel.
#[tauri::command]
pub async fn cast_preview(
    url: String,
    headers: Option<HashMap<String, String>>,
    options: Option<CastOptions>,
    audio_track_ordinal: Option<u32>,
    burn_subtitles: Option<bool>,
    subtitle_ordinal: Option<u32>,
    transcode: Option<bool>,
    profile: Option<TranscodeProfile>,
) -> Result<CastPreview, String> {
    let headers = headers.unwrap_or_default();
    let cached = preview_cache()
        .lock()
        .ok()
        .and_then(|c| c.get(&url).filter(|(at, _)| at.elapsed() < Duration::from_secs(600)).map(|(_, p)| p.clone()));
    let probe = match cached {
        Some(p) => p,
        None => {
            let p = cast_transcode::probe(&url, &headers).await?;
            if let Ok(mut c) = preview_cache().lock() {
                if c.len() > 16 {
                    c.clear();
                }
                c.insert(url.clone(), (std::time::Instant::now(), p.clone()));
            }
            p
        }
    };
    let caps = cast_transcode::caps().await;
    let options = options.unwrap_or_default();
    let bitmap = subtitle_ordinal
        .and_then(|o| probe.subtitles.get(o as usize))
        .filter(|s| s.is_bitmap())
        .map(|s| s.index);
    let text_burn = ("preview".to_string(), String::new());
    let burning = burn_subtitles.unwrap_or(false);
    let plan = cast_transcode::build_plan(
        &PlanInput {
            probe: Some(&probe),
            options: &options,
            audio_ordinal: audio_track_ordinal.unwrap_or(0),
            burn_sub: (burning && bitmap.is_none()).then_some(&text_burn),
            burn_bitmap: if burning { bitmap } else { None },
            // The same receiver limits and forced encode cast_load applies, so the panel shows the
            // conversion the TV will actually get.
            force_video_encode: forces_video_encode(transcode.unwrap_or(false), profile.as_ref()),
            limits: device_limits(profile.as_ref()),
        },
        &caps,
    );
    Ok(CastPreview {
        duration_sec: probe.duration,
        summary: plan.summary,
        hardware: caps.hardware_label().map(str::to_string),
        caps,
        subtitle_codecs: probe.subtitles.iter().map(|s| s.codec.clone()).collect(),
    })
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CastVolume {
    pub supported: bool,
    /// 0..=100
    pub level: u32,
    pub muted: bool,
}

/// Reads, and optionally changes, the receiver's own volume.
#[tauri::command]
pub async fn cast_volume(level: Option<u32>, muted: Option<bool>) -> Result<CastVolume, String> {
    if let Some(cu) = snapshot_dlna() {
        if level.is_some() || muted.is_some() {
            dlna::set_volume(&cu, level, muted).await?;
        }
        return match dlna::get_volume(&cu).await {
            Ok((level, muted)) => Ok(CastVolume { supported: true, level, muted }),
            Err(_) => Ok(CastVolume { supported: false, level: 0, muted: false }),
        };
    }
    if let Ok((host, port, ..)) = snapshot_chromecast() {
        return tokio::task::spawn_blocking(move || -> Result<CastVolume, String> {
            let device = connect_device(&host, port)?;
            if level.is_some() || muted.is_some() {
                device
                    .receiver
                    .set_volume(rust_cast::channels::receiver::Volume {
                        level: level.map(|l| l.min(100) as f32 / 100.0),
                        muted,
                    })
                    .map_err(|e| format!("volume: {e}"))?;
            }
            let status = device.receiver.get_status().map_err(|e| format!("volume: {e}"))?;
            Ok(CastVolume {
                supported: true,
                level: (status.volume.level.unwrap_or(0.0) * 100.0).round() as u32,
                muted: status.volume.muted.unwrap_or(false),
            })
        })
        .await
        .map_err(|e| format!("join: {e}"))?;
    }
    Ok(CastVolume { supported: false, level: 0, muted: false })
}

#[tauri::command]
pub async fn cast_capabilities() -> cast_transcode::FfmpegCaps {
    cast_transcode::caps().await
}

async fn load_dlna_audio(proxy: &ProxyState, control_url: String, input: AudioCastInput, paused: bool, expected_previous: Option<&str>) -> Result<(), String> {
    let title = input.title.clone();
    let mime = input.format.mime().to_string();
    let route = proxy.register_audio_cast(input).await?;
    if let Some(previous) = expected_previous {
        let still_owned = dlna::current_uri(&control_url).await.map(|uri| dlna::uri_has_audio_session(&uri, previous));
        if !matches!(still_owned, Ok(true)) {
            proxy.stop_hls_session(&route.session_id).await;
            return Err("The speaker source changed during seeking".into());
        }
    }
    let result = dlna::load_audio_route(&control_url, route.url, &route.session_id, title, mime, paused).await;
    if let Err(error) = result {
        let cleanup = dlna::stop_audio_if_owned(&control_url, &route.session_id).await;
        if let Err(uncertain) = cleanup {
            // Retain an addressable session so a subsequent Stop can be acknowledged.
            replace_active_session(ActiveSession::Dlna { control_url, hls_session_id: Some(route.session_id), extra: SessionExtra::default() }, |id| async move { proxy.stop_hls_session(&id).await; }).await?;
            return Err(uncertain);
        }
        proxy.stop_hls_session(&route.session_id).await;
        return Err(error);
    }
    replace_active_session(ActiveSession::Dlna { control_url, hls_session_id: Some(route.session_id), extra: SessionExtra::default() }, |id| async move { proxy.stop_hls_session(&id).await; }).await
}

fn snapshot_dlna_audio() -> Option<(String, String)> {
    let active = ACTIVE.lock().ok()?;
    match active.as_ref()? {
        ActiveSession::Dlna { control_url, hls_session_id: Some(id), .. } if id.starts_with("audio-") => Some((control_url.clone(), id.clone())),
        _ => None,
    }
}

async fn cast_load_chromecast(
    host: String,
    port: u16,
    stream_url: String,
    title: Option<String>,
    poster: Option<String>,
    content_type: Option<String>,
    start_time_sec: Option<f64>,
    hls_session_id: Option<String>,
    extra: SessionExtra,
) -> Result<ActiveSession, String> {
    // Tear down any prior session's receiver app before starting a new one.
    {
        let prior = {
            let active = ACTIVE.lock().map_err(|e| format!("lock: {e}"))?;
            match active.as_ref() {
                Some(ActiveSession::Chromecast {
                    host,
                    port,
                    session_id,
                    ..
                }) => Some((host.clone(), *port, session_id.clone())),
                _ => None,
            }
        };
        if let Some((h, p, sid)) = prior {
            let _ = tokio::task::spawn_blocking(move || {
                if let Ok(d) = connect_device(&h, p) {
                    let _ = d.receiver.stop_app(&sid);
                }
            })
            .await;
        }
    }

    let host_clone = host.clone();
    let stream_url_clone = stream_url.clone();
    let title_clone = title.clone();
    let poster_clone = poster.clone();
    let start = start_time_sec.unwrap_or(0.0);
    let offset = receiver_clock_offset(&stream_url, start);
    let (result_tx, result_rx) =
        tokio::sync::oneshot::channel::<Result<(String, String, Option<i32>), String>>();

    std::thread::spawn(move || {
        let device = match connect_device(&host_clone, port) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("[argus::cast] connect err: {}", e);
                let _ = result_tx.send(Err(e));
                return;
            }
        };
        eprintln!("[argus::cast] connected to {}:{}", host_clone, port);
        // Google's default receiver supports audio without requiring the video receiver's registration.
        let launched = if is_audio_content_type(content_type.as_deref()) {
            launch_receiver_app(&device, "default")
        } else {
            launch_argus_receiver(&device)
        };
        let (transport_id, session_id) = match launched {
            Ok(t) => t,
            Err(e) => {
                let _ = result_tx.send(Err(e));
                return;
            }
        };
        eprintln!(
            "[argus::cast] receiver launched (transport={}, session={})",
            transport_id, session_id,
        );
        let metadata = cast_media_metadata(title_clone, poster_clone, content_type.as_deref());
        let content_type = chromecast_content_type(&stream_url_clone, content_type.as_deref());
        eprintln!(
            "[argus::cast] sending LOAD: ct={} time={:.1}",
            content_type, start,
        );
        let media = Media {
            content_id: stream_url_clone.clone(),
            content_type,
            stream_type: StreamType::Buffered,
            duration: None,
            metadata: Some(metadata),
        };
        let is_hls = stream_url_clone.to_lowercase().contains("/cast/hls/")
            || stream_url_clone.to_lowercase().contains(".m3u8");
        let load_opts = rust_cast::channels::media::LoadOptions {
            current_time: if is_hls {
                0.0
            } else if start > 0.5 {
                start
            } else {
                0.0
            },
            autoplay: true,
        };
        let status =
            match device
                .media
                .load_with_opts(&transport_id, &session_id, &media, load_opts)
            {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("[argus::cast] LOAD failed: {}", e);
                    let _ = result_tx.send(Err(format!("load: {e}")));
                    return;
                }
            };
        let media_session_id = status.entries.first().map(|e| e.media_session_id);
        eprintln!("[argus::cast] LOAD ok msid={:?}", media_session_id);
        let _ = result_tx.send(Ok((
            transport_id.clone(),
            session_id.clone(),
            media_session_id,
        )));

        eprintln!(
            "[argus::cast] receive loop entering for {}:{}",
            host_clone, port
        );
        loop {
            match device.receive() {
                Ok(rust_cast::ChannelMessage::Heartbeat(_)) => {
                    if let Err(e) = device.heartbeat.pong() {
                        eprintln!(
                            "[argus::cast] pong failed for {}:{}: {e}",
                            host_clone, port
                        );
                        return;
                    }
                }
                Ok(rust_cast::ChannelMessage::Connection(msg)) => {
                    eprintln!("[argus::cast] connection msg: {:?}", msg);
                }
                Ok(_) => {}
                Err(e) => {
                    eprintln!(
                        "[argus::cast] receive loop ended for {}:{}: {e}",
                        host_clone, port
                    );
                    return;
                }
            }
        }
    });

    let (transport_id, session_id, msid) = result_rx
        .await
        .map_err(|e| format!("cast result channel: {e}"))??;

    Ok(ActiveSession::Chromecast {
        host,
        port,
        transport_id,
        session_id,
        media_session_id: msid,
        seek_start_sec: offset,
        hls_session_id,
        extra,
    })
}

/// Film time at which a Chromecast's own clock reads zero. Argus's converted HLS stream begins at
/// the start position, so its clock is offset by it. A stream loaded with `currentTime` (a direct
/// file) already reports film time, and adding the start again doubled the position (a resume at
/// 10:00 showed 20:00). Other playlists are loaded from their beginning.
fn receiver_clock_offset(stream_url: &str, start: f64) -> f64 {
    if stream_url.to_ascii_lowercase().contains("/cast/hls/") {
        start
    } else {
        0.0
    }
}

fn snapshot_chromecast() -> Result<(String, u16, String, Option<i32>, f64), String> {
    let active = ACTIVE.lock().map_err(|e| format!("lock: {e}"))?;
    match active.as_ref() {
        Some(ActiveSession::Chromecast {
            host,
            port,
            transport_id,
            media_session_id,
            seek_start_sec,
            ..
        }) => Ok((
            host.clone(),
            *port,
            transport_id.clone(),
            *media_session_id,
            *seek_start_sec,
        )),
        _ => Err("No active Chromecast session".into()),
    }
}

fn snapshot_dlna() -> Option<String> {
    let active = ACTIVE.lock().ok()?;
    if let Some(ActiveSession::Dlna { control_url, .. }) = active.as_ref() {
        Some(control_url.clone())
    } else {
        None
    }
}

fn snapshot_roku() -> Option<String> {
    let active = ACTIVE.lock().ok()?;
    if let Some(ActiveSession::Roku { ecp_base, .. }) = active.as_ref() {
        Some(ecp_base.clone())
    } else {
        None
    }
}

fn snapshot_airplay() -> Option<(String, u16)> {
    let active = ACTIVE.lock().ok()?;
    if let Some(ActiveSession::AirPlay { host, port, .. }) = active.as_ref() {
        Some((host.clone(), *port))
    } else {
        None
    }
}

#[tauri::command]
pub async fn cast_play() -> Result<(), String> {
    let _operation = TRANSPORT_OPS.lock().await;
    if let Some((cu, id)) = snapshot_dlna_audio() {
        if !dlna::uri_has_audio_session(&dlna::current_uri(&cu).await?, &id) { return Err("The speaker source changed".into()); }
        dlna::play(cu.clone()).await?;
        return dlna::wait_audio_state(&cu, &id, false, false).await.map(|_| ());
    }
    if let Some(cu) = snapshot_dlna() {
        return dlna::play(cu).await;
    }
    if let Some(ecp) = snapshot_roku() {
        return roku::play(ecp).await;
    }
    if let Some((h, p)) = snapshot_airplay() {
        return airplay::play(h, p).await;
    }
    let (host, port, transport_id, msid, _seek_start) = snapshot_chromecast()?;
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let device = connect_device(&host, port)?;
        device
            .connection
            .connect(transport_id.clone())
            .map_err(|e| format!("{e}"))?;
        let msid = msid.ok_or("no media session")?;
        device
            .media
            .play(&transport_id, msid)
            .map_err(|e| format!("play: {e}"))?;
        Ok(())
    })
    .await
    .map_err(|e| format!("join: {e}"))?
}

#[tauri::command]
pub async fn cast_pause() -> Result<(), String> {
    let _operation = TRANSPORT_OPS.lock().await;
    pause_active().await
}

/// Whether the receiver reports itself paused, asked of whichever kind is casting (a Chromecast
/// through a connection of its own), so a restart can pause it again.
async fn receiver_paused() -> bool {
    let state = if let Some(cu) = snapshot_dlna() {
        dlna::status(cu).await.ok().map(|s| s.player_state)
    } else if let Some(ecp) = snapshot_roku() {
        roku::status(&ecp).await.ok().map(|s| s.player_state)
    } else if let Some((h, p)) = snapshot_airplay() {
        airplay::status(h, p).await.ok().map(|(_, state)| state)
    } else {
        chromecast_player_state().await
    };
    state_is_paused(state.as_deref())
}

fn state_is_paused(raw: Option<&str>) -> bool {
    raw.is_some_and(|s| normalize_player_state(s) == "PAUSED")
}

/// The Chromecast media session's raw player state, e.g. `Paused`.
async fn chromecast_player_state() -> Option<String> {
    let (host, port, transport_id, msid, _) = snapshot_chromecast().ok()?;
    let msid = msid?;
    tokio::task::spawn_blocking(move || -> Option<String> {
        let device = connect_device(&host, port).ok()?;
        device.connection.connect(transport_id.clone()).ok()?;
        let status = device.media.get_status(&transport_id, Some(msid)).ok()?;
        status.entries.first().map(|entry| format!("{:?}", entry.player_state))
    })
    .await
    .ok()
    .flatten()
}

async fn pause_active() -> Result<(), String> {
    if let Some((cu, id)) = snapshot_dlna_audio() {
        if !dlna::uri_has_audio_session(&dlna::current_uri(&cu).await?, &id) { return Err("The speaker source changed".into()); }
        dlna::pause(cu.clone()).await?;
        return dlna::wait_audio_state(&cu, &id, true, false).await.map(|_| ());
    }
    if let Some(cu) = snapshot_dlna() {
        return dlna::pause(cu).await;
    }
    if let Some(ecp) = snapshot_roku() {
        return roku::pause(ecp).await;
    }
    if let Some((h, p)) = snapshot_airplay() {
        return airplay::pause(h, p).await;
    }
    let (host, port, transport_id, msid, _seek_start) = snapshot_chromecast()?;
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let device = connect_device(&host, port)?;
        device
            .connection
            .connect(transport_id.clone())
            .map_err(|e| format!("{e}"))?;
        let msid = msid.ok_or("no media session")?;
        device
            .media
            .pause(&transport_id, msid)
            .map_err(|e| format!("pause: {e}"))?;
        Ok(())
    })
    .await
    .map_err(|e| format!("join: {e}"))?
}

#[tauri::command]
pub async fn cast_seek(proxy_state: tauri::State<'_, ProxyState>, sec: f64) -> Result<(), String> {
    let _operation = TRANSPORT_OPS.lock().await;
    // A converted stream only exists from where its conversion started: start a new one there.
    if let Some(extra) = snapshot_extra().filter(|e| e.converted) {
        let fast = extra.reload.as_ref().is_some_and(|r| r.options.fast_seek);
        return restart_active(&proxy_state, sec, fast, |_| false).await.map(|_| ());
    }
    if let Some((cu, id)) = snapshot_dlna_audio() {
        if !dlna::uri_has_audio_session(&dlna::current_uri(&cu).await?, &id) { return Err("The speaker source changed".into()); }
        let paused = normalize_player_state(&dlna::status(cu.clone()).await?.player_state) == "PAUSED";
        let mut input = proxy_state.audio_cast_input(&id).await.ok_or("Speaker audio route ended")?;
        input.start_seconds = sec;
        return load_dlna_audio(&proxy_state, cu, input, paused, Some(&id)).await;
    }
    if let Some(cu) = snapshot_dlna() {
        return dlna::seek(cu, sec).await;
    }
    if let Some(ecp) = snapshot_roku() {
        return roku::seek(ecp, sec).await;
    }
    if let Some((h, p)) = snapshot_airplay() {
        return airplay::seek(h, p, sec).await;
    }
    let (host, port, transport_id, msid, seek_start) = snapshot_chromecast()?;
    let cast_relative = (sec - seek_start).max(0.0);
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let device = connect_device(&host, port)?;
        device
            .connection
            .connect(transport_id.clone())
            .map_err(|e| format!("{e}"))?;
        let msid = msid.ok_or("no media session")?;
        device
            .media
            .seek(&transport_id, msid, Some(cast_relative as f32), None)
            .map_err(|e| format!("seek: {e}"))?;
        Ok(())
    })
    .await
    .map_err(|e| format!("join: {e}"))?
}

#[tauri::command]
pub async fn cast_stop(proxy_state: tauri::State<'_, ProxyState>) -> Result<(), String> {
    let _operation = TRANSPORT_OPS.lock().await;
    let (session, epoch) = {
        let mut active = ACTIVE.lock().map_err(|e| format!("lock: {e}"))?;
        (active.take(), ACTIVE_EPOCH.load(Ordering::Relaxed))
    };
    let hls_session_id = match session.as_ref() {
        Some(ActiveSession::Chromecast { hls_session_id, .. })
        | Some(ActiveSession::Dlna { hls_session_id, .. })
        | Some(ActiveSession::Roku { hls_session_id, .. })
        | Some(ActiveSession::AirPlay { hls_session_id, .. }) => hls_session_id.clone(),
        None => None,
    };
    let result = match session.as_ref() {
        Some(ActiveSession::Dlna { control_url, hls_session_id: Some(id), .. }) if id.starts_with("audio-") => dlna::stop_audio_if_owned(control_url, id).await,
        Some(ActiveSession::Dlna { control_url, .. }) => dlna::stop(control_url.clone()).await,
        Some(ActiveSession::Roku { ecp_base, .. }) => roku::stop(ecp_base.clone()).await,
        Some(ActiveSession::AirPlay { host, port, .. }) => airplay::stop(host.clone(), *port).await,
        Some(ActiveSession::Chromecast {
            host,
            port,
            session_id,
            ..
        }) => {
            let (host, port, session_id) = (host.clone(), *port, session_id.clone());
            tokio::task::spawn_blocking(move || -> Result<(), String> {
                let device = connect_device(&host, port)?;
                device.receiver.stop_app(&session_id).map_err(|error| format!("stop: {error}"))?;
                Ok(())
            })
            .await
            .map_err(|e| format!("join: {e}"))
            .and_then(|result| result)
        }
        None => Ok(()),
    };
    if let Err(error) = result {
        restore_failed_stop(session, epoch)?;
        return Err(error);
    }
    cast_subs::cleanup();
    if let Some(id) = hls_session_id {
        proxy_state.stop_hls_session(&id).await;
    }
    Ok(())
}

/// Replaces the control URL of the active DLNA session after the renderer moved.
fn update_dlna_control(previous: &str, fresh: String) {
    if let Ok(mut active) = ACTIVE.lock() {
        if let Some(ActiveSession::Dlna { control_url, .. }) = active.as_mut() {
            if control_url == previous {
                *control_url = fresh;
            }
        }
    }
}

static LAST_REDISCOVERY: Mutex<Option<std::time::Instant>> = Mutex::new(None);

async fn rediscover_throttled(uuid: &str) -> Option<String> {
    {
        let mut last = LAST_REDISCOVERY.lock().ok()?;
        if last.is_some_and(|t| t.elapsed() < Duration::from_secs(8)) {
            return None;
        }
        *last = Some(std::time::Instant::now());
    }
    dlna::rediscover(uuid).await
}

fn stats_of(extra: &SessionExtra) -> Option<TranscodeStats> {
    extra.stats.as_ref().and_then(|s| s.lock().ok().map(|v| v.clone()))
}

#[tauri::command]
pub async fn cast_status(proxy_state: tauri::State<'_, ProxyState>) -> Result<Option<CastStatus>, String> {
    if let Some((cu, id)) = snapshot_dlna_audio() {
        if !dlna::uri_has_audio_session(&dlna::current_uri(&cu).await?, &id) { return Ok(None); }
        let input = proxy_state.audio_cast_input(&id).await.ok_or("Speaker audio route ended")?;
        let state = dlna::status(cu).await?;
        return Ok(Some(CastStatus { position_sec: input.start_seconds + state.position_sec, player_state: normalize_player_state(&state.player_state), connected: true, transport_codec: Some("mp3".into()), transcode: None, summary: None }));
    }
    // A paused receiver requests nothing, and the proxy ends streams nobody requests; while
    // Argus follows the cast, the stream stays.
    if let Some(id) = active_stream_id() {
        proxy_state.keep_alive(&id).await;
    }
    let extra = snapshot_extra().unwrap_or_default();
    let base = extra.seek_base;
    let transcode = stats_of(&extra);
    let summary = extra.summary.clone();
    if let Some(cu) = snapshot_dlna() {
        let mut state = dlna::status(cu.clone()).await;
        if state.is_err() {
            if let Some(fresh) = match extra.uuid.as_deref() {
                Some(uuid) => rediscover_throttled(uuid).await,
                None => None,
            } {
                update_dlna_control(&cu, fresh.clone());
                state = dlna::status(fresh).await;
            }
        }
        return Ok(Some(match state {
            Ok(x) => CastStatus {
                position_sec: base + x.position_sec,
                player_state: normalize_player_state(&x.player_state),
                connected: true,
                transport_codec: None,
                transcode,
                summary,
            },
            Err(_) => CastStatus {
                position_sec: base,
                player_state: "UNREACHABLE".into(),
                connected: false,
                transport_codec: None,
                transcode,
                summary,
            },
        }));
    }
    if let Some(ecp) = snapshot_roku() {
        return Ok(roku::status(&ecp).await.ok().map(|s| CastStatus {
            position_sec: base + s.position_sec,
            player_state: normalize_player_state(&s.player_state),
            connected: !s.error,
            transport_codec: None,
            transcode: transcode.clone(),
            summary: summary.clone(),
        }));
    }
    if let Some((h, p)) = snapshot_airplay() {
        let s = airplay::status(h, p).await.ok();
        return Ok(s.map(|(pos, state)| CastStatus {
            position_sec: base + pos,
            player_state: normalize_player_state(&state),
            connected: true,
            transport_codec: None,
            transcode: transcode.clone(),
            summary: summary.clone(),
        }));
    }
    let snap = match snapshot_chromecast() {
        Ok(s) => s,
        Err(_) => return Ok(None),
    };
    let (host, port, transport_id, msid, seek_start) = snap;
    tokio::task::spawn_blocking(move || -> Result<Option<CastStatus>, String> {
        let device = connect_device(&host, port)?;
        device
            .connection
            .connect(transport_id.clone())
            .map_err(|e| format!("{e}"))?;
        if let Some(msid) = msid {
            let status = device.media.get_status(&transport_id, Some(msid))
                .map_err(|error| format!("status: {error}"))?;
            if let Some(entry) = status.entries.first() {
                let raw_state = format!("{:?}", entry.player_state);
                let cast_pos = entry.current_time.map(|v| v as f64).unwrap_or(0.0);
                return Ok(Some(CastStatus {
                    position_sec: cast_pos + seek_start,
                    player_state: normalize_player_state(&raw_state),
                    connected: true,
                    transport_codec: None,
                    transcode,
                    summary,
                }));
            }
            return Ok(None);
        }
        Ok(Some(CastStatus {
            position_sec: 0.0,
            player_state: "UNKNOWN".to_string(),
            connected: true,
            transport_codec: None,
            transcode,
            summary,
        }))
    })
    .await
    .map_err(|e| format!("join: {e}"))?
}

#[derive(Debug, Clone, Serialize)]
pub struct CastStatus {
    pub position_sec: f64,
    pub player_state: String,
    pub connected: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transport_codec: Option<String>,
    /// Live conversion speed and errors while Argus converts the stream.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcode: Option<TranscodeStats>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<PlanSummary>,
}

fn normalize_player_state(raw: &str) -> String {
    let up = raw.trim().to_uppercase();
    match up.as_str() {
        "PLAY" | "PLAYING" => "PLAYING",
        "PAUSE" | "PAUSED" | "PAUSED_PLAYBACK" | "PAUSED_RECORDING" => "PAUSED",
        "BUFFER" | "BUFFERING" | "TRANSITIONING" | "STARTUP" => "BUFFERING",
        "STOP" | "STOPPED" | "IDLE" | "NO_MEDIA_PRESENT" => "IDLE",
        _ => return up,
    }
    .to_string()
}

#[allow(dead_code)]
fn drain_briefly(device: &CastDevice<'_>, ms: u64) {
    let deadline = std::time::Instant::now() + Duration::from_millis(ms);
    while std::time::Instant::now() < deadline {
        match device.receive() {
            Ok(ChannelMessage::Heartbeat(_)) => {}
            Ok(ChannelMessage::Receiver(_)) => {}
            Ok(ChannelMessage::Connection(_)) => {}
            Ok(ChannelMessage::Media(_)) => {}
            Ok(_) => {}
            Err(_) => break,
        }
    }
}

#[cfg(test)]
mod pause_state_tests {
    use super::*;

    #[test]
    fn the_receivers_limits_hold_for_conversions_argus_starts_itself() {
        let profile = TranscodeProfile {
            fragmented_mp4: false,
            max_height: 720,
            force_h264: false,
            force_aac: false,
            force_stereo: false,
            max_video_kbps: Some(3_500),
        };
        let limits = device_limits(Some(&profile));
        assert_eq!(limits.max_height, Some(720));
        assert_eq!(limits.max_video_kbps, Some(3_500));
        assert_eq!(device_limits(None), DeviceLimits::default());
    }

    #[test]
    fn only_a_requested_conversion_whose_profile_rules_out_the_codec_forces_an_encode() {
        let h264_only = TranscodeProfile {
            fragmented_mp4: false,
            max_height: 1080,
            force_h264: true,
            force_aac: false,
            force_stereo: false,
            max_video_kbps: None,
        };
        let keep_codecs = TranscodeProfile { force_h264: false, ..h264_only.clone() };
        assert!(forces_video_encode(true, Some(&h264_only)));
        // A remux or subtitle burn-in on codecs the receiver plays keeps them.
        assert!(!forces_video_encode(true, Some(&keep_codecs)));
        // A profile sent along with a cast that asked for no conversion changes nothing.
        assert!(!forces_video_encode(false, Some(&h264_only)));
        assert!(!forces_video_encode(true, None));
    }

    #[test]
    fn picture_settings_never_let_a_compatible_stream_play_directly() {
        let direct = CastOptions::default();
        // A stream the receiver plays as it is, with nothing asked of the converter.
        assert!(!load_converts(false, false, false, &direct, false));
        for options in [
            CastOptions { aspect: "4:3".into(), ..Default::default() },
            CastOptions { aspect: "fill".into(), ..Default::default() },
            CastOptions { deinterlace: "always".into(), ..Default::default() },
            CastOptions { tonemap: "on".into(), ..Default::default() },
        ] {
            assert!(load_converts(false, false, false, &options, false), "{options:?}");
        }
        // Settings the converter applies only when it runs anyway do not start it.
        for options in [
            CastOptions { deinterlace: "auto".into(), ..Default::default() },
            CastOptions { tonemap: "auto".into(), ..Default::default() },
            CastOptions { tonemap: "off".into(), ..Default::default() },
            CastOptions { quality: "720p".into(), ..Default::default() },
        ] {
            assert!(!load_converts(false, false, false, &options, false), "{options:?}");
        }
        // The frontend asks for a conversion when it knows the source is taller than the quality.
        let smaller = CastOptions { quality: "720p".into(), ..Default::default() };
        assert!(load_converts(false, false, true, &smaller, false));
        // An audio stream has no picture to change; a local file always converts.
        let square = CastOptions { aspect: "4:3".into(), ..Default::default() };
        assert!(!load_converts(false, true, false, &square, false));
        assert!(load_converts(true, false, false, &direct, false));
    }

    #[test]
    fn a_quality_limit_holds_whether_the_size_is_known_or_probed() {
        let at = |quality: &str| CastOptions { quality: quality.into(), ..Default::default() };
        let full_hd = crate::cast_transcode::parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"h264","width":1920,"height":1080},
               {"index":1,"codec_type":"audio","codec_name":"aac","channels":2}],"format":{}}"#,
        )
        .unwrap();
        // The player reports no size: the probe's decides.
        assert_eq!(known_picture(None, None), None);
        assert_eq!(known_picture(Some(1920), Some(0)), None, "a height of 0 is not a size");
        assert_eq!(known_picture(None, Some(1080)), None, "a named height cannot establish the width");
        assert_eq!(known_picture(Some(0), Some(1080)), None, "zero width is still unknown");
        assert_eq!(known_picture(Some(1920), None), None, "a width without height is incomplete");
        assert_eq!(known_picture(Some(1920), Some(1080)), Some((1920, 1080)));
        let probed = source_picture(None, Some(&full_hd));
        assert_eq!(probed, Some((1920, 1080)));
        assert!(probed.is_some_and(|(w, h)| at("720p").picture_beyond_quality(w, h)), "1080p is beyond 720p");
        assert!(!probed.is_some_and(|(w, h)| at("1080p-hq").picture_beyond_quality(w, h)), "it fits 1080p");
        // What the player knows comes first, so a source confirmed to fit is never probed.
        assert_eq!(source_picture(Some((1280, 720)), Some(&full_hd)), Some((1280, 720)));
        assert_eq!(known_picture(None, Some(720)), None, "a release name gives a height, not a full size");
        // Wider than a receiver of that height decodes counts too.
        assert!(at("1080p").picture_beyond_quality(2560, 1080));
        assert!(!at("4k").picture_beyond_quality(4096, 2160));
        // A source with no picture, or one the probe could not read, has no size to limit.
        let music = crate::cast_transcode::parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"audio","codec_name":"flac","channels":2}],"format":{}}"#,
        )
        .unwrap();
        assert_eq!(source_picture(None, Some(&music)), None);
        assert_eq!(source_picture(None, None), None);
    }

    /// The whole decision against real files: FFmpeg makes a 1080p and a 720p clip, and an unsized
    /// load of each is probed against the quality setting. Skipped where FFmpeg is not installed.
    #[tokio::test]
    async fn an_unsized_source_is_probed_against_the_quality_setting() {
        let (Some(ffmpeg), Some(_)) = (crate::transcode::locate_ffmpeg(), crate::transcode::locate_ffprobe()) else {
            eprintln!("FFmpeg not installed; skipped");
            return;
        };
        let dir = std::env::temp_dir().join(format!("argus-quality-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let make = |name: &str, size: &str| {
            let path = dir.join(name);
            let made = crate::cast_transcode::quiet_command(&ffmpeg)
                .args(["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i"])
                .arg(format!("testsrc2=s={size}:d=1"))
                .args(["-pix_fmt", "yuv420p", "-y"])
                .arg(&path)
                .status()
                .is_ok_and(|s| s.success());
            made.then(|| path.to_string_lossy().into_owned())
        };
        let (Some(full_hd), Some(hd), Some(wide)) = (make("1080.mp4", "1920x1080"), make("720.mp4", "1280x720"), make("wide.mp4", "2560x1080")) else {
            eprintln!("FFmpeg could not make the clips; skipped");
            let _ = std::fs::remove_dir_all(&dir);
            return;
        };
        let headers = HashMap::new();
        let at = |quality: &str| CastOptions { quality: quality.into(), ..Default::default() };
        // Unknown size, 720p chosen: the 1080p clip is probed and converted, its probe kept.
        let (convert, probe) = quality_converts(&full_hd, &headers, &at("720p"), None).await;
        assert!(convert, "a 1080p source must not reach the TV past a 720p limit");
        assert_eq!(probe.and_then(|p| p.video).map(|v| v.height), Some(1080));
        // A source that fits stays direct.
        assert!(!quality_converts(&hd, &headers, &at("720p"), None).await.0);
        assert!(!quality_converts(&full_hd, &headers, &at("1080p"), None).await.0);
        // Knowing only "1080p" from the release name must not hide an ultrawide source:
        // at 2560x1080 it exceeds a 1080p receiver's 1920-pixel width limit.
        let (convert, probe) = quality_converts(&wide, &headers, &at("1080p"), known_picture(None, Some(1080))).await;
        assert!(convert, "a height-only 1080p label must not bypass the width limit");
        assert_eq!(probe.and_then(|p| p.video).map(|v| (v.width, v.height)), Some((2560, 1080)));
        // A height-only label is probed even when the actual source fits the limit.
        let (convert, probe) = quality_converts(&hd, &headers, &at("720p"), known_picture(None, Some(720))).await;
        assert!(!convert && probe.is_some(), "probing must preserve direct playback for a fitting source");
        // A complete size the player knows still decides without a probe.
        let (convert, probe) = quality_converts(&full_hd, &headers, &at("720p"), known_picture(Some(1280), Some(720))).await;
        assert!(!convert && probe.is_none());
        // A source nothing can read is handed over as before; "original" never probes.
        let missing = dir.join("missing.mp4").to_string_lossy().into_owned();
        assert_eq!(quality_converts(&missing, &headers, &at("720p"), None).await.0, false);
        let (convert, probe) = quality_converts(&full_hd, &headers, &at("original"), None).await;
        assert!(!convert && probe.is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_paused_receiver_of_any_kind_is_paused_again_after_a_restart() {
        // Chromecast reports its state in the cast library's spelling.
        let chromecast_paused = format!("{:?}", rust_cast::channels::media::PlayerState::Paused);
        assert!(state_is_paused(Some(&chromecast_paused)));
        assert!(!state_is_paused(Some(&format!("{:?}", rust_cast::channels::media::PlayerState::Playing))));
        assert!(state_is_paused(Some("PAUSED_PLAYBACK")));
        assert!(state_is_paused(Some("paused")));
        assert!(!state_is_paused(Some("PLAYING")));
        assert!(!state_is_paused(None));
    }

    #[test]
    fn a_chromecast_position_counts_the_start_once() {
        // Argus's converted stream begins at the start position: the receiver's clock is offset.
        assert_eq!(receiver_clock_offset("http://192.168.1.7:5000/cast/hls/abc/master.m3u8", 600.0), 600.0);
        // A direct file is loaded at currentTime=600 and reports film time itself.
        assert_eq!(receiver_clock_offset("http://192.168.1.7:5000/s/abc", 600.0), 0.0);
        assert_eq!(receiver_clock_offset("https://cdn.example/film.mp4", 600.0), 0.0);
    }
}

#[cfg(test)]
mod dedupe_tests {
    use super::{dedupe_by_host, CastDeviceInfo};

    fn device(kind: &str, name: &str, model: Option<&str>) -> CastDeviceInfo {
        CastDeviceInfo {
            id: format!("{kind}-1"),
            name: name.into(),
            host: "192.0.2.15".into(),
            port: 0,
            model: model.map(String::from),
            kind: kind.into(),
            control_url: None,
            audio_only: false,
        }
    }

    #[test]
    fn a_tv_box_that_imitates_an_apple_tv_casts_over_its_dlna_renderer() {
        for order in [["dlna", "airplay"], ["airplay", "dlna"]] {
            let devices = order
                .iter()
                .map(|kind| match *kind {
                    "dlna" => device("dlna", "EShare-1234", Some("AV Renderer Device")),
                    _ => device("airplay", "EShare-1234", Some("AppleTV3,2")),
                })
                .collect();
            let out = dedupe_by_host(devices);
            assert_eq!(out.len(), 1);
            assert_eq!(out[0].kind, "dlna", "order {order:?}");
        }
    }

    #[test]
    fn a_real_apple_tv_keeps_airplay() {
        let out = dedupe_by_host(vec![
            device("dlna", "Living Room", None),
            device("airplay", "Living Room", Some("AppleTV14,1")),
        ]);
        assert_eq!(out[0].kind, "airplay");
    }

    #[test]
    fn a_tv_with_airplay_2_still_prefers_dlna() {
        let out = dedupe_by_host(vec![
            device("airplay", "[TV] Samsung", Some("UE55TU7000")),
            device("dlna", "[TV] Samsung", Some("UE55TU7000")),
        ]);
        assert_eq!(out[0].kind, "dlna");
    }
}

#[cfg(test)]
mod cast_validation_tests {
    use super::{replace_active_session, required_control_url, ActiveSession, ACTIVE};
    use std::sync::{Arc, Mutex};

    #[test]
    fn failed_stop_restores_only_same_session_epoch() {
        let old = || Some(ActiveSession::Dlna { control_url: "old".into(), hls_session_id: None, extra: super::SessionExtra::default() });
        let mut active = None;
        super::restore_failed_stop_if_current(&mut active, old(), 7, 7);
        assert!(matches!(&active, Some(ActiveSession::Dlna { control_url, .. }) if control_url == "old"));
        active = None;
        super::restore_failed_stop_if_current(&mut active, old(), 7, 8);
        assert!(active.is_none(), "do not revive a session after a newer LOAD/STOP");
        active = Some(ActiveSession::Dlna { control_url: "new".into(), hls_session_id: None, extra: super::SessionExtra::default() });
        super::restore_failed_stop_if_current(&mut active, old(), 7, 8);
        assert!(matches!(&active, Some(ActiveSession::Dlna { control_url, .. }) if control_url == "new"));
    }

    #[test]
    fn audio_cast_preserves_mime_metadata_and_skips_video_remux() {
        for kind in ["chromecast", "dlna"] {
            for mime in ["audio/mpeg", "audio/flac", "audio/mp4", "audio/webm; codecs=opus"] {
                assert!(!super::needs_auto_remux(kind, "https://example.test/song", Some(mime)));
                assert_eq!(super::chromecast_content_type("http://192.0.2.1/s/id", Some(mime)), mime);
                assert!(matches!(super::cast_media_metadata(Some("Song".into()), None, Some(mime)), super::Metadata::MusicTrack(_)));
            }
        }
        assert!(super::needs_auto_remux("chromecast", "https://example.test/movie.mp4", Some("video/mp4")));
        assert!(!super::needs_auto_remux("dlna", "https://example.test/live.m3u8", None));
        assert_eq!(super::chromecast_content_type("http://192.0.2.1/s/id", Some("video/mkv")), "video/mp4");
        assert!(matches!(super::cast_media_metadata(None, None, Some("video/mp4")), super::Metadata::Movie(_)));
    }

    #[test]
    fn control_url_is_required_before_starting_dlna_or_roku() {
        assert_eq!(
            required_control_url("dlna", None),
            Err("DLNA device missing control_url".to_string())
        );
        assert_eq!(
            required_control_url("roku", None),
            Err("Roku device missing ecp_base".to_string())
        );
        assert_eq!(required_control_url("chromecast", None), Ok(None));
    }

    #[tokio::test]
    async fn replacing_an_active_cast_stops_its_hls_session() {
        ACTIVE.lock().expect("lock active session").take();
        let stopped = Arc::new(Mutex::new(Vec::new()));

        replace_active_session(
            ActiveSession::Dlna {
                control_url: "first".to_string(),
                hls_session_id: Some("first-hls".to_string()),
                extra: super::SessionExtra::default(),
            },
            |_| async {},
        )
        .await
        .expect("activate first cast");

        let recorded = stopped.clone();
        replace_active_session(
            ActiveSession::Dlna {
                control_url: "second".to_string(),
                hls_session_id: Some("second-hls".to_string()),
                extra: super::SessionExtra::default(),
            },
            move |id| async move {
                assert!(
                    ACTIVE.try_lock().is_ok(),
                    "ACTIVE must be unlocked before HLS cleanup"
                );
                recorded.lock().expect("lock stopped sessions").push(id);
            },
        )
        .await
        .expect("activate second cast");

        assert_eq!(
            stopped.lock().expect("lock stopped sessions").as_slice(),
            ["first-hls"]
        );
        ACTIVE.lock().expect("lock active session").take();
    }
}

/// Casts real films to a real DLNA renderer through the same conversion and transport code the
/// app uses. Run with `ARGUS_TEST_TV_UUID=<renderer uuid> ARGUS_TEST_MEDIA=<film> cargo test --lib
/// live_tv -- --ignored --nocapture`; `ARGUS_TEST_MEDIA2` and `ARGUS_TEST_EXTERNAL_AUDIO` add a
/// cast of a second film with an added, synced audio track.
#[cfg(test)]
mod live_tv_tests {
    use super::*;

    fn host_of(url: &str) -> String {
        url.split("://").nth(1).and_then(|r| r.split(['/', ':']).next()).unwrap_or("").to_string()
    }

    /// Waits until the renderer reports PLAYING and its clock moved `need` seconds.
    async fn wait_playing(control: &str, need: f64, timeout_secs: u64, stats: Option<&SharedStats>) -> Result<f64, String> {
        let deadline = std::time::Instant::now() + Duration::from_secs(timeout_secs);
        let started = std::time::Instant::now();
        let mut first: Option<f64> = None;
        let mut last_line = String::new();
        while std::time::Instant::now() < deadline {
            let state = dlna::status(control.to_string()).await;
            let speed = stats.and_then(|s| s.lock().ok().map(|v| (v.speed, v.error.clone())));
            let line = match &state {
                Ok(s) => format!("state={} rel={:.0}s ffmpeg={speed:?}", s.player_state, s.position_sec),
                Err(e) => format!("status error: {e}"),
            };
            if line != last_line {
                eprintln!("[live-tv]   {:5.1}s {line}", started.elapsed().as_secs_f64());
                last_line = line;
            }
            if let Ok(s) = state {
                if s.player_state == "PLAYING" {
                    let base = *first.get_or_insert(s.position_sec);
                    if s.position_sec - base >= need {
                        return Ok(started.elapsed().as_secs_f64());
                    }
                }
            }
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
        Err(format!("renderer did not play {need}s within {timeout_secs}s ({last_line})"))
    }

    fn reload_for(url: &str, host: &str, options: CastOptions, audio_ordinal: u32, subtitle: Option<CastSub>) -> Reload {
        Reload {
            url: url.to_string(),
            headers: HashMap::new(),
            title: Some("Argus live test".into()),
            poster: None,
            kind: "dlna".into(),
            host: host.to_string(),
            port: 0,
            hls: wants_hls("dlna", &options),
            options,
            probe: None,
            audio_ordinal,
            subtitle,
            sub_style: Some(CastSubStyle::default()),
            sub_base: None,
            burn_bitmap: None,
            force_video_encode: false,
            limits: DeviceLimits::default(),
        }
    }

    struct Scenario {
        name: &'static str,
        reload: Reload,
        start: f64,
    }

    async fn ffprobe_bytes(bytes: &[u8]) -> String {
        let path = std::env::temp_dir().join(format!("argus-live-{}.ts", uuid::Uuid::new_v4()));
        std::fs::write(&path, bytes).expect("write sample");
        let ffprobe = crate::transcode::locate_ffprobe().expect("ffprobe");
        let out = tokio::process::Command::new(ffprobe)
            .args(["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,channels,color_transfer", "-of", "compact"])
            .arg(&path)
            .output()
            .await
            .expect("ffprobe");
        let _ = std::fs::remove_file(&path);
        String::from_utf8_lossy(&out.stdout).into_owned()
    }

    /// Fetches the converted stream the way a receiver does, without a receiver: the continuous
    /// MPEG-TS response, then the HLS master, variant and first segments.
    #[tokio::test(flavor = "multi_thread")]
    #[ignore]
    async fn live_stream_served_like_a_tv_fetches_it() {
        let Ok(media) = std::env::var("ARGUS_TEST_MEDIA") else { return };
        let proxy = ProxyState::start().await.expect("cast server");
        let client = reqwest::Client::new();
        let embedded_sub = CastSub { kind: "embedded".into(), url: None, src_index: Some(0), format: None, off: false };
        for (name, options, subtitle) in [
            ("MPEG-TS, GPU + tone mapping", CastOptions::default(), None),
            ("MPEG-TS, burned-in subtitles, 720p, 5.1", CastOptions { quality: "720p".into(), audio_mode: "surround".into(), ..CastOptions::default() }, Some(embedded_sub.clone())),
            ("HLS, CPU only", CastOptions { stream_format: "hls".into(), hardware_decoding: false, hardware_encoding: false, ..CastOptions::default() }, None),
        ] {
            eprintln!("[live-stream] == {name}");
            let mut reload = reload_for(&media, "127.0.0.1", options, 0, subtitle);
            prepare_reload(&mut reload).await;
            let caps = cast_transcode::caps().await;
            let burn = match reload.sub_base.as_ref() {
                Some(base) => Some(cast_subs::place(base, &CastSubStyle::default(), 600.0, 0.0).await),
                None => None,
            };
            let pair = burn.as_ref().map(|p| (p.path.to_string_lossy().to_string(), p.force_style.clone()));
            let plan = cast_transcode::build_plan(
                &PlanInput {
                    probe: reload.probe.as_ref(),
                    options: &reload.options,
                    audio_ordinal: 0,
                    burn_sub: pair.as_ref(),
                    burn_bitmap: reload.burn_bitmap,
                    force_video_encode: false,
                    limits: DeviceLimits::default(),
                },
                &caps,
            );
            eprintln!("[live-stream]   plan {:?}", plan.summary);
            let stats = SharedStats::default();
            let job = CastJob { url: media.clone(), headers: HashMap::new(), seek_sec: 600.0, fast_seek: false, plan, stats: stats.clone() };
            let started = std::time::Instant::now();
            let registered = proxy.register_cast_job(job, "127.0.0.1", reload.hls).await.expect("register");
            let sample = if reload.hls {
                let master = client.get(&registered.url).send().await.expect("master").text().await.expect("master body");
                assert!(master.contains("variant.m3u8"), "{master}");
                let variant_url = registered.url.replace("master.m3u8", "variant.m3u8");
                let variant = client.get(&variant_url).send().await.expect("variant").text().await.expect("variant body");
                assert!(variant.contains("#EXT-X-START:TIME-OFFSET=0"), "{variant}");
                let first = variant.lines().find(|l| l.ends_with(".ts")).expect("a segment").to_string();
                let seg_url = registered.url.replace("master.m3u8", &first);
                client.get(&seg_url).send().await.expect("segment").bytes().await.expect("segment body").to_vec()
            } else {
                let mut response = client.get(&registered.url).send().await.expect("stream");
                assert_eq!(response.headers().get("content-type").and_then(|v| v.to_str().ok()), Some("video/mp2t"));
                let mut bytes = Vec::new();
                while bytes.len() < 6 * 1024 * 1024 {
                    match tokio::time::timeout(Duration::from_secs(30), response.chunk()).await {
                        Ok(Ok(Some(chunk))) => bytes.extend_from_slice(&chunk),
                        _ => break,
                    }
                }
                bytes
            };
            let first_bytes = started.elapsed().as_secs_f64();
            assert!(sample.len() > 100_000 && sample[0] == 0x47, "{name}: no MPEG-TS arrived ({} bytes)", sample.len());
            let streams = ffprobe_bytes(&sample).await;
            eprintln!("[live-stream]   {} KB in {first_bytes:.1}s, speed {:?}\n[live-stream]   {}", sample.len() / 1024, stats.lock().map(|s| s.speed).ok(), streams.trim().replace('\n', "\n[live-stream]   "));
            assert!(streams.contains("codec_name=h264"), "{name}: {streams}");
            assert!(streams.contains("codec_type=audio"), "{name}: {streams}");
            proxy.stop_hls_session(&registered.session_id).await;
        }
        proxy.stop_all_hls().await;
    }

    #[tokio::test(flavor = "multi_thread")]
    #[ignore]
    async fn live_tv_round_trip() {
        let (Ok(uuid), Ok(media)) = (std::env::var("ARGUS_TEST_TV_UUID"), std::env::var("ARGUS_TEST_MEDIA")) else {
            return;
        };
        let proxy = ProxyState::start().await.expect("cast server");
        let mut control = dlna::rediscover(&uuid).await.expect("renderer on the network");
        let host = host_of(&control);
        eprintln!("[live-tv] renderer {control}");
        let caps = cast_transcode::caps().await;
        eprintln!("[live-tv] {caps:?}");
        let embedded_sub = CastSub { kind: "embedded".into(), url: None, src_index: Some(0), format: None, off: false };
        let scenarios = vec![
            Scenario { name: "4K DV film as MPEG-TS, GPU + HDR tone mapping", reload: reload_for(&media, &host, CastOptions::default(), 0, None), start: 600.0 },
            Scenario {
                name: "burned-in subtitles, 720p, Dolby Digital 5.1",
                reload: reload_for(
                    &media,
                    &host,
                    CastOptions { quality: "720p".into(), audio_mode: "surround".into(), ..CastOptions::default() },
                    0,
                    Some(embedded_sub.clone()),
                ),
                start: 1200.0,
            },
            Scenario {
                name: "HLS, louder, night mode, clear dialogue, second audio track",
                reload: reload_for(
                    &media,
                    &host,
                    CastOptions {
                        stream_format: "hls".into(),
                        volume_boost: 50,
                        night_mode: true,
                        dialogue_boost: true,
                        ..CastOptions::default()
                    },
                    1,
                    None,
                ),
                start: 2400.0,
            },
        ];
        let mut failures = Vec::new();
        for (index, scenario) in scenarios.into_iter().enumerate() {
            eprintln!("[live-tv] == {} (start {:.0}s)", scenario.name, scenario.start);
            let mut reload = scenario.reload;
            prepare_reload(&mut reload).await;
            let reload = Arc::new(reload);
            let started = std::time::Instant::now();
            let (session, info) = match start_converted(&proxy, reload.clone(), scenario.start, false, Some(control.clone()), Some(uuid.clone())).await {
                Ok(v) => v,
                Err(e) => {
                    failures.push(format!("{}: load failed: {e}", scenario.name));
                    continue;
                }
            };
            if let ActiveSession::Dlna { control_url, .. } = &session {
                control = control_url.clone();
            }
            eprintln!("[live-tv]   loaded in {:.1}s stream={} plan={:?}", started.elapsed().as_secs_f64(), info.stream, info.summary);
            let stats = session.extra().stats.clone();
            match wait_playing(&control, 10.0, 90, stats.as_ref()).await {
                Ok(t) => eprintln!("[live-tv]   PLAYING and advancing after {t:.1}s"),
                Err(e) => failures.push(format!("{}: {e}", scenario.name)),
            }
            if index == 0 {
                // Pause must hold the picture, Play continue it, and the TV volume follow.
                let _ = dlna::pause(control.clone()).await;
                tokio::time::sleep(Duration::from_secs(1)).await;
                let before = dlna::status(control.clone()).await;
                tokio::time::sleep(Duration::from_secs(4)).await;
                let after = dlna::status(control.clone()).await;
                match (before, after) {
                    (Ok(a), Ok(b)) if b.player_state.starts_with("PAUSED") && (b.position_sec - a.position_sec).abs() < 1.0 => {
                        eprintln!("[live-tv]   paused at {:.0}s and held", b.position_sec)
                    }
                    (a, b) => failures.push(format!("pause did not hold: {a:?} -> {b:?}")),
                }
                let _ = dlna::play(control.clone()).await;
                match wait_playing(&control, 3.0, 40, stats.as_ref()).await {
                    Ok(t) => eprintln!("[live-tv]   resumed after {t:.1}s"),
                    Err(e) => failures.push(format!("resume: {e}")),
                }
                let _ = dlna::set_volume(&control, Some(35), None).await;
                match dlna::get_volume(&control).await {
                    Ok((35, _)) => eprintln!("[live-tv]   TV volume set to 35"),
                    other => failures.push(format!("volume: {other:?}")),
                }
            }
            // A seek on a converted cast restarts the conversion at the new position.
            let seek_to = scenario.start + 900.0;
            let restarted = start_converted(&proxy, reload.clone(), seek_to, false, Some(control.clone()), Some(uuid.clone())).await;
            if let Some(id) = session.hls_session_id() {
                proxy.stop_hls_session(&id).await;
            }
            match restarted {
                Ok((next, _)) => {
                    if let ActiveSession::Dlna { control_url, .. } = &next {
                        control = control_url.clone();
                    }
                    eprintln!("[live-tv]   seek to {seek_to:.0}s");
                    match wait_playing(&control, 8.0, 90, next.extra().stats.as_ref()).await {
                        Ok(t) => eprintln!("[live-tv]   PLAYING after seek in {t:.1}s"),
                        Err(e) => failures.push(format!("{} (after seek): {e}", scenario.name)),
                    }
                    let _ = dlna::stop(control.clone()).await;
                    if let Some(id) = next.hls_session_id() {
                        proxy.stop_hls_session(&id).await;
                    }
                }
                Err(e) => failures.push(format!("{}: seek failed: {e}", scenario.name)),
            }
            // EShare restarts its renderer on a new port after a stop; find it again.
            tokio::time::sleep(Duration::from_secs(3)).await;
            if let Some(fresh) = dlna::rediscover(&uuid).await {
                if fresh != control {
                    eprintln!("[live-tv]   renderer moved to {fresh}");
                }
                control = fresh;
            }
        }
        proxy.stop_all_hls().await;
        assert!(failures.is_empty(), "{failures:#?}");
    }
}
