//! Built-in libmpv player (spec features 4, 5, 6, 7).
//!
//! The UI never receives per-frame updates: the event thread keeps the
//! playback clock here and emits `player://clock` at most 4x per second.
//! Progress is saved every 10 s and on stop, so resume is always fresh.

use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use argus_core::fallback::StallDetector;
use argus_core::library::Progress;
use argus_core::player::{
    choose_subs, choose_tracks, set_sub_offset_ms, sub_offset_ms, PlayerPrefs, Throttle, Track,
    TrackPrefs, SUB_OFFSET_STEP_MS,
};
use argus_core::skip::{self, Chapter};
use argus_core::sources::tracker::{scrobble_action, ScrobbleAction, WatchKey};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::mpv::{Event, Mpv, Value};
use crate::{signin, AppState};

/// What is playing, set by the UI on load. Used for progress and memory.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub profile: i64,
    pub item_id: String,
    pub kind: String,
    pub name: String,
    pub poster: Option<String>,
    pub video_id: String,
    /// Stable per-file key for subtitle offsets (info hash or URL).
    pub file_key: String,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Clock {
    pub position: f64,
    pub duration: f64,
    pub paused: bool,
    pub buffering: bool,
    pub buffer_percent: i64,
    pub speed: f64,
    pub sub_delay_ms: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Command {
    TogglePause,
    SetPause {
        paused: bool,
    },
    Seek {
        seconds: f64,
    },
    SeekRelative {
        seconds: f64,
    },
    SetAudio {
        id: i64,
    },
    SetSub {
        id: Option<i64>,
    },
    SetSecondarySub {
        id: Option<i64>,
    },
    /// ±1 step of 50 ms; saved per file.
    SubDelayStep {
        steps: i64,
    },
    AddSub {
        url: String,
        lang: Option<String>,
    },
    SetSpeed {
        speed: f64,
    },
    SetVolume {
        volume: f64,
    },
    /// Stereo downmix for laptop speakers/headphones (spec feature 7).
    SetDownmix {
        enabled: bool,
    },
    /// Loop between two points; `None` clears the loop.
    AbLoop {
        a: Option<f64>,
        b: Option<f64>,
    },
    /// Saves the current frame (without subtitles) to the Pictures folder.
    Screenshot,
    Stop,
}

pub struct Player {
    mpv: OnceLock<Arc<Mpv>>,
    /// Native view mpv draws into (macOS); `None` means mpv's own window.
    wid: Mutex<Option<usize>>,
    session: Arc<Mutex<Option<Session>>>,
    clock: Arc<Mutex<Clock>>,
}

impl Default for Player {
    fn default() -> Self {
        Self {
            mpv: OnceLock::new(),
            wid: Mutex::new(None),
            session: Arc::default(),
            clock: Arc::default(),
        }
    }
}

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

impl Player {
    #[cfg_attr(not(target_os = "macos"), allow(dead_code))]
    pub fn set_wid(&self, wid: usize) {
        *lock(&self.wid) = Some(wid);
    }

    pub fn clock(&self) -> Clock {
        lock(&self.clock).clone()
    }

    /// Creates mpv on first use (keeps app start fast) and starts the event thread.
    fn mpv(&self, app: &AppHandle, profile: i64) -> Result<Arc<Mpv>, String> {
        if let Some(m) = self.mpv.get() {
            return Ok(m.clone());
        }
        // A marker left from a previous run means the app died while mpv was
        // starting or drawing its first frame. Don't take the app down again:
        // callers fall back to an external player until the user retries.
        let marker = app.path().app_data_dir().ok().map(|d| {
            let _ = std::fs::create_dir_all(&d);
            d.join(CRASH_MARKER)
        });
        if marker.as_ref().is_some_and(|m| m.exists()) {
            return Err(CRASHED.into());
        }
        if let Some(m) = &marker {
            let _ = std::fs::write(m, b"starting");
        }
        // mpv aborts or misparses numbers unless LC_NUMERIC is "C", and
        // AppKit/WebKit may have switched the process to the user's locale.
        set_c_numeric_locale();
        // The video view must be visible while mpv creates its GL surface.
        set_video_visible(app, true);
        let wid = lock(&self.wid).map(|w| w.to_string());
        let log = app.path().app_log_dir().ok().map(|d| {
            let _ = std::fs::create_dir_all(&d);
            d.join("mpv.log").to_string_lossy().into_owned()
        });
        // Page URLs (YouTube etc.) play through the user's own yt-dlp, if
        // they turned it on and have it installed. GUI apps don't inherit
        // the shell PATH, so look in the usual places.
        let ytdl_path = {
            let st = app.state::<AppState>();
            let on = st
                .lib
                .setting(profile, PlayerPrefs::KEY)
                .ok()
                .flatten()
                .and_then(|j| serde_json::from_str::<PlayerPrefs>(&j).ok())
                .is_some_and(|p| p.ytdl);
            on.then(find_ytdlp).flatten()
        };
        let ytdl_opt = ytdl_path
            .as_ref()
            .map(|p| format!("ytdl_hook-ytdl_path={}", p.display()));
        let vo = {
            let st = app.state::<AppState>();
            match PlayerPrefs::load(&st.lib, profile)
                .unwrap_or_default()
                .renderer
                .as_str()
            {
                "gpu-next" => "gpu-next",
                _ => "gpu",
            }
        };
        let mut opts: Vec<(&str, &str)> = vec![
            // `gpu` is the stable path for embedding into a view via `wid`;
            // `gpu-next` is opt-in under Settings > Playback > Renderer.
            ("vo", vo),
            ("hwdec", "auto-safe"),
            ("idle", "yes"),
            ("force-window", "yes"),
            ("keep-open", "no"),
            ("terminal", "no"),
            ("input-default-bindings", "no"),
            ("input-vo-keyboard", "no"),
            ("osc", "no"),
            ("ytdl", if ytdl_path.is_some() { "yes" } else { "no" }),
            // HDR: let mpv tell macOS the content's colorspace (EDR passthrough).
            ("target-colorspace-hint", "no"),
            ("sub-auto", "fuzzy"),
            ("cache", "yes"),
            ("demuxer-max-bytes", "200MiB"),
            ("demuxer-readahead-secs", "60"),
            ("network-timeout", "15"),
            ("user-agent", argus_core::USER_AGENT),
        ];
        if let Some(o) = ytdl_opt.as_deref() {
            opts.push(("script-opts", o));
        }
        if let Some(w) = wid.as_deref() {
            opts.push(("wid", w));
        }
        if let Some(l) = log.as_deref() {
            opts.push(("log-file", l));
        }
        let mpv = match Mpv::new(&opts) {
            Ok(m) => Arc::new(m),
            Err(e) => {
                if let Some(m) = &marker {
                    let _ = std::fs::remove_file(m);
                }
                return Err(e);
            }
        };
        for p in ["time-pos", "duration", "speed", "sub-delay"] {
            mpv.observe_double(p);
        }
        for p in ["pause", "paused-for-cache"] {
            mpv.observe_flag(p);
        }
        mpv.observe_int("cache-buffering-state");

        let _ = self.mpv.set(mpv.clone());
        let (m, app, session, clock) = (
            mpv.clone(),
            app.clone(),
            self.session.clone(),
            self.clock.clone(),
        );
        std::thread::Builder::new()
            .name("mpv-events".into())
            .spawn(move || event_loop(&m, &app, &session, &clock))
            .map_err(|e| e.to_string())?;
        Ok(mpv)
    }

    pub fn load(
        &self,
        app: &AppHandle,
        url: &str,
        start: f64,
        session: Session,
    ) -> Result<(), String> {
        let session_profile = session.profile;
        let mpv = self.mpv(app, session_profile)?;
        self.save_progress(app); // previous item, if any
        *lock(&self.session) = Some(session);
        *lock(&self.clock) = Clock {
            speed: 1.0,
            ..Clock::default()
        };
        // Stremio-style settings, applied before each file so changes take
        // effect on the next play without restarting.
        let st = app.state::<AppState>();
        let prefs = PlayerPrefs::load(&st.lib, session_profile).unwrap_or_default();
        for (name, value) in prefs.mpv_properties() {
            let _ = mpv.set(name, &value);
        }
        // The user's own mpv.conf lines win over everything above.
        for (name, value) in prefs.extra_properties() {
            let _ = mpv.set(&name, &value);
        }
        let opts = format!("start={start:.1}");
        mpv.command_async(&["loadfile", url, "replace", "-1", &opts])?;
        set_video_visible(app, true);
        Ok(())
    }

    /// Output devices as `(mpv name, description)`; empty until mpv has started.
    pub fn audio_devices(&self) -> Vec<(String, String)> {
        let Some(json) = self
            .mpv
            .get()
            .and_then(|m| m.get_string("audio-device-list"))
        else {
            return Vec::new();
        };
        serde_json::from_str::<Vec<serde_json::Value>>(&json)
            .unwrap_or_default()
            .iter()
            .filter_map(|d| {
                Some((
                    d.get("name")?.as_str()?.to_string(),
                    d.get("description")?.as_str()?.to_string(),
                ))
            })
            .collect()
    }

    pub fn command(&self, app: &AppHandle, cmd: Command) -> Result<(), String> {
        let mpv = self.mpv.get().ok_or("Nothing is playing")?;
        match cmd {
            Command::TogglePause => mpv.command(&["cycle", "pause"]),
            Command::SetPause { paused } => mpv.set("pause", if paused { "yes" } else { "no" }),
            Command::Seek { seconds } => {
                mpv.command(&["seek", &seconds.to_string(), "absolute+keyframes"])
            }
            Command::SeekRelative { seconds } => {
                mpv.command(&["seek", &seconds.to_string(), "relative"])
            }
            Command::SetAudio { id } => {
                mpv.set("aid", &id.to_string())?;
                self.remember(app, |p, t| p.audio_lang = lang_of(t, "audio", id))
            }
            Command::SetSub { id } => {
                mpv.set("sid", &id.map_or("no".into(), |i| i.to_string()))?;
                self.remember(app, |p, t| {
                    p.subs_chosen = true;
                    p.sub_lang = id.and_then(|i| lang_of(t, "sub", i))
                })
            }
            Command::SetSecondarySub { id } => {
                mpv.set("secondary-sid", &id.map_or("no".into(), |i| i.to_string()))?;
                self.remember(app, |p, t| {
                    p.secondary_sub_lang = id.and_then(|i| lang_of(t, "sub", i))
                })
            }
            Command::SubDelayStep { steps } => {
                let ms = lock(&self.clock).sub_delay_ms + steps * SUB_OFFSET_STEP_MS;
                mpv.set("sub-delay", &format!("{:.3}", ms as f64 / 1000.0))?;
                if let Some(s) = lock(&self.session).clone() {
                    let st = app.state::<AppState>();
                    set_sub_offset_ms(&st.lib, s.profile, &s.file_key, ms)
                        .map_err(|e| e.to_string())?;
                }
                Ok(())
            }
            Command::AddSub { url, lang } => {
                mpv.command(&["sub-add", &url, "auto", "", lang.as_deref().unwrap_or("")])
            }
            Command::SetSpeed { speed } => {
                mpv.set("speed", &speed.clamp(0.25, 4.0).to_string())?;
                self.remember(app, |p, _| p.speed = Some(speed))
            }
            Command::SetVolume { volume } => {
                mpv.set("volume", &volume.clamp(0.0, 130.0).to_string())
            }
            Command::SetDownmix { enabled } => mpv.set(
                "audio-channels",
                if enabled { "stereo" } else { "auto-safe" },
            ),
            Command::AbLoop { a, b } => {
                let fmt = |v: Option<f64>| v.map_or("no".to_string(), |s| format!("{s:.3}"));
                mpv.set("ab-loop-a", &fmt(a))?;
                mpv.set("ab-loop-b", &fmt(b))
            }
            Command::Screenshot => {
                let dir = std::env::var("HOME")
                    .map(|h| format!("{h}/Pictures"))
                    .unwrap_or_else(|_| "/tmp".into());
                mpv.set("screenshot-directory", &dir)?;
                mpv.set("screenshot-template", "Argus %F %P")?;
                mpv.command(&["screenshot", "video"])
            }
            Command::Stop => {
                self.save_progress(app);
                if let Some(s) = lock(&self.session).clone() {
                    let c = self.clock();
                    scrobble(
                        app,
                        &s,
                        &c,
                        scrobble_action(false, c.position / c.duration.max(1.0)),
                    );
                }
                *lock(&self.session) = None;
                set_video_visible(app, false);
                mpv.command(&["stop"])
            }
        }
    }

    pub fn tracks(&self) -> Vec<Track> {
        self.mpv.get().map(|m| read_tracks(m)).unwrap_or_default()
    }

    /// Updates per-show track memory from the current track list.
    fn remember(
        &self,
        app: &AppHandle,
        f: impl FnOnce(&mut TrackPrefs, &[Track]),
    ) -> Result<(), String> {
        let Some(s) = lock(&self.session).clone() else {
            return Ok(());
        };
        let st = app.state::<AppState>();
        let mut prefs =
            TrackPrefs::load(&st.lib, s.profile, &s.video_id).map_err(|e| e.to_string())?;
        f(&mut prefs, &self.tracks());
        prefs
            .save(&st.lib, s.profile, &s.video_id)
            .map_err(|e| e.to_string())
    }

    fn save_progress(&self, app: &AppHandle) {
        let (Some(s), c) = (lock(&self.session).clone(), self.clock()) else {
            return;
        };
        save_progress(app, &s, &c);
    }
}

fn lang_of(tracks: &[Track], kind: &str, id: i64) -> Option<String> {
    tracks
        .iter()
        .find(|t| t.kind == kind && t.id == id)
        .and_then(|t| t.lang.clone())
}

/// Tells Trakt/Simkl what is playing. Fire-and-forget so the mpv thread
/// never waits on the network; does nothing when signed out.
fn scrobble(app: &AppHandle, s: &Session, c: &Clock, action: ScrobbleAction) {
    if c.duration <= 0.0 || !(s.kind == "movie" || s.kind == "series") {
        return;
    }
    let Some(key) = WatchKey::parse(&s.video_id) else {
        return;
    };
    let fraction = c.position / c.duration;
    let (app, profile) = (app.clone(), s.profile);
    tauri::async_runtime::spawn(async move {
        let st = app.state::<AppState>();
        for svc in [signin::Service::Trakt, signin::Service::Simkl] {
            if let Some(t) = signin::tracker(&st, profile, svc).await {
                let _ = t.scrobble(action, &key, fraction).await;
            }
        }
    });
}

fn save_progress(app: &AppHandle, s: &Session, c: &Clock) {
    // Live channels have no resume point.
    if c.duration <= 0.0 || s.kind == "tv" || s.kind == "other" {
        return;
    }
    let st = app.state::<AppState>();
    let _ = st.lib.save_progress(
        s.profile,
        &Progress {
            item_id: s.item_id.clone(),
            video_id: s.video_id.clone(),
            kind: s.kind.clone(),
            name: s.name.clone(),
            poster: s.poster.clone(),
            position_s: c.position,
            duration_s: c.duration,
            updated_at: 0,
        },
    );
}

/// mpv `track-list` JSON → core tracks.
fn read_tracks(mpv: &Mpv) -> Vec<Track> {
    #[derive(Deserialize)]
    #[serde(rename_all = "kebab-case")]
    struct Raw {
        id: i64,
        #[serde(rename = "type")]
        kind: String,
        lang: Option<String>,
        title: Option<String>,
        codec: Option<String>,
        #[serde(rename = "demux-channel-count")]
        channels: Option<u32>,
        #[serde(default)]
        forced: bool,
        #[serde(default)]
        default: bool,
        #[serde(default)]
        external: bool,
    }
    let raw: Vec<Raw> = mpv
        .get_string("track-list")
        .and_then(|j| serde_json::from_str(&j).ok())
        .unwrap_or_default();
    raw.into_iter()
        .map(|r| Track {
            id: r.id,
            kind: r.kind,
            lang: r.lang,
            title: r.title,
            codec: r.codec,
            channels: r.channels,
            forced: r.forced,
            default: r.default,
            external: r.external,
        })
        .collect()
}

const CRASH_MARKER: &str = "player-init.marker";
/// Error text the UI recognises to switch to an external player.
pub const CRASHED: &str = "BUILTIN_PLAYER_CRASHED";

extern "C" {
    fn setlocale(category: i32, locale: *const std::ffi::c_char) -> *mut std::ffi::c_char;
}

fn set_c_numeric_locale() {
    // LC_NUMERIC is 4 on macOS and Linux libc.
    // SAFETY: valid NUL-terminated string; called before mpv starts its threads.
    unsafe { setlocale(4, c"C".as_ptr()) };
}

/// Clears the crash marker so the built-in player is tried again.
pub fn reset_crash(app: &AppHandle) {
    if let Ok(d) = app.path().app_data_dir() {
        let _ = std::fs::remove_file(d.join(CRASH_MARKER));
    }
}

fn set_video_visible(app: &AppHandle, visible: bool) {
    #[cfg(target_os = "macos")]
    {
        let wid = *lock(&app.state::<AppState>().player.wid);
        if let Some(w) = wid {
            let _ = app.run_on_main_thread(move || unsafe {
                argus_mac_video::set_video_visible(w as *mut _, visible)
            });
        }
    }
    let _ = app.emit("player://visible", visible);
}

fn event_loop(mpv: &Mpv, app: &AppHandle, session: &Mutex<Option<Session>>, clock: &Mutex<Clock>) {
    let mut ui = Throttle::new(Duration::from_millis(250));
    let mut saver = Throttle::new(Duration::from_secs(10));
    let mut stall = StallDetector::default();
    let mut last_paused = true;
    loop {
        let event = mpv.wait_event(0.5);
        let now = Instant::now();
        match event {
            Event::Shutdown => return,
            Event::PlaybackRestart => {
                // First frame shown: native playback works on this Mac.
                if let Ok(d) = app.path().app_data_dir() {
                    let _ = std::fs::remove_file(d.join(CRASH_MARKER));
                }
            }
            Event::FileLoaded => {
                let tracks = read_tracks(mpv);
                if let Some(s) = lock(session).clone() {
                    let st = app.state::<AppState>();
                    let prefs =
                        TrackPrefs::load(&st.lib, s.profile, &s.video_id).unwrap_or_default();
                    let (aid, _) = choose_tracks(&tracks, &prefs);
                    if let Some(a) = aid {
                        let _ = mpv.set("aid", &a.to_string());
                    }
                    let player_prefs = PlayerPrefs::load(&st.lib, s.profile).unwrap_or_default();
                    let remembered = TrackPrefs::load_remembered(&st.lib, s.profile, &s.video_id);
                    let audio =
                        aid.and_then(|a| tracks.iter().find(|t| t.kind == "audio" && t.id == a));
                    let (sid, secondary) =
                        choose_subs(&tracks, remembered.as_ref(), &player_prefs, audio);
                    let _ = mpv.set("sid", &sid.map_or("no".into(), |i| i.to_string()));
                    let _ = mpv.set(
                        "secondary-sid",
                        &secondary.map_or("no".into(), |i| i.to_string()),
                    );
                    if let Some(sp) = prefs.speed {
                        let _ = mpv.set("speed", &sp.to_string());
                    }
                    let ms = sub_offset_ms(&st.lib, s.profile, &s.file_key).unwrap_or(0);
                    let _ = mpv.set("sub-delay", &format!("{:.3}", ms as f64 / 1000.0));
                }
                let _ = app.emit("player://tracks", &tracks);
                let chapters: Vec<Chapter> = mpv
                    .get_string("chapter-list")
                    .and_then(|j| serde_json::from_str(&j).ok())
                    .unwrap_or_default();
                let _ = app.emit("player://segments", skip::segments(&chapters));
                if let Some(s) = lock(session).clone() {
                    last_paused = false;
                    scrobble(app, &s, &lock(clock).clone(), ScrobbleAction::Start);
                }
            }
            Event::EndFile { eof, error } => {
                if let Some(s) = lock(session).clone() {
                    let mut c = lock(clock).clone();
                    if eof {
                        c.position = c.duration;
                    }
                    save_progress(app, &s, &c);
                    let action = if eof {
                        ScrobbleAction::Stop
                    } else {
                        scrobble_action(false, c.position / c.duration.max(1.0))
                    };
                    scrobble(app, &s, &c, action);
                }
                let _ = app.emit(
                    "player://ended",
                    serde_json::json!({ "eof": eof, "error": error }),
                );
                if eof {
                    set_video_visible(app, false);
                }
            }
            Event::Property { name, value } => {
                let mut c = lock(clock);
                match (name.as_str(), value) {
                    ("time-pos", Value::Double(v)) => c.position = v,
                    ("duration", Value::Double(v)) => c.duration = v,
                    ("speed", Value::Double(v)) => c.speed = v,
                    ("sub-delay", Value::Double(v)) => c.sub_delay_ms = (v * 1000.0).round() as i64,
                    ("pause", Value::Flag(v)) => {
                        c.paused = v;
                        if v != last_paused {
                            last_paused = v;
                            if let Some(s) = lock(session).clone() {
                                scrobble(
                                    app,
                                    &s,
                                    &c,
                                    scrobble_action(!v, c.position / c.duration.max(1.0)),
                                );
                            }
                        }
                    }
                    ("paused-for-cache", Value::Flag(v)) => {
                        c.buffering = v;
                        if v {
                            stall.on_buffering(now)
                        } else {
                            stall.on_playing()
                        }
                    }
                    ("cache-buffering-state", Value::Int(v)) => c.buffer_percent = v,
                    _ => {}
                }
            }
            _ => {}
        }

        if stall.should_offer_fallback(now) {
            let _ = app.emit("player://stall", lock(clock).position);
        }
        if ui.ready(now) {
            let _ = app.emit("player://clock", lock(clock).clone());
        }
        if saver.ready(now) {
            if let Some(s) = lock(session).clone() {
                let c = lock(clock).clone();
                if !c.paused {
                    save_progress(app, &s, &c);
                }
            }
        }
    }
}

/// yt-dlp from the usual install locations (a GUI app has no shell PATH).
fn find_ytdlp() -> Option<std::path::PathBuf> {
    [
        "/opt/homebrew/bin/yt-dlp",
        "/usr/local/bin/yt-dlp",
        "/usr/bin/yt-dlp",
    ]
    .iter()
    .map(std::path::PathBuf::from)
    .find(|p| p.exists())
}

/// Whether the user's yt-dlp is installed, for the settings screen.
#[tauri::command]
pub fn ytdlp_available() -> bool {
    find_ytdlp().is_some()
}
