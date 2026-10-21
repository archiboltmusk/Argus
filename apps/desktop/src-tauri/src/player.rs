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
    choose_tracks, set_sub_offset_ms, sub_offset_ms, Throttle, Track, TrackPrefs,
    SUB_OFFSET_STEP_MS,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::mpv::{Event, Mpv, Value};
use crate::AppState;

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
    fn mpv(&self, app: &AppHandle) -> Result<Arc<Mpv>, String> {
        if let Some(m) = self.mpv.get() {
            return Ok(m.clone());
        }
        let wid = lock(&self.wid).map(|w| w.to_string());
        let log = app.path().app_log_dir().ok().map(|d| {
            let _ = std::fs::create_dir_all(&d);
            d.join("mpv.log").to_string_lossy().into_owned()
        });
        let mut opts: Vec<(&str, &str)> = vec![
            ("vo", "gpu-next"),
            ("hwdec", "auto-safe"),
            ("idle", "yes"),
            ("force-window", "yes"),
            ("keep-open", "no"),
            ("terminal", "no"),
            ("input-default-bindings", "no"),
            ("input-vo-keyboard", "no"),
            ("osc", "no"),
            ("ytdl", "no"),
            // HDR: let mpv tell macOS the content's colorspace (EDR passthrough).
            ("target-colorspace-hint", "yes"),
            ("sub-auto", "fuzzy"),
            ("cache", "yes"),
            ("demuxer-max-bytes", "200MiB"),
            ("demuxer-readahead-secs", "60"),
            ("network-timeout", "15"),
            ("user-agent", argus_core::USER_AGENT),
        ];
        if let Some(w) = wid.as_deref() {
            opts.push(("wid", w));
        }
        if let Some(l) = log.as_deref() {
            opts.push(("log-file", l));
        }
        let mpv = Arc::new(Mpv::new(&opts)?);
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
        let mpv = self.mpv(app)?;
        self.save_progress(app); // previous item, if any
        *lock(&self.session) = Some(session);
        *lock(&self.clock) = Clock {
            speed: 1.0,
            ..Clock::default()
        };
        let opts = format!("start={start:.1}");
        mpv.command_async(&["loadfile", url, "replace", "-1", &opts])?;
        set_video_visible(app, true);
        Ok(())
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
            Command::Stop => {
                self.save_progress(app);
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

fn save_progress(app: &AppHandle, s: &Session, c: &Clock) {
    // Live channels have no resume point.
    if c.duration <= 0.0 || s.kind == "tv" {
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
    loop {
        let event = mpv.wait_event(0.5);
        let now = Instant::now();
        match event {
            Event::Shutdown => return,
            Event::FileLoaded => {
                let tracks = read_tracks(mpv);
                if let Some(s) = lock(session).clone() {
                    let st = app.state::<AppState>();
                    let prefs =
                        TrackPrefs::load(&st.lib, s.profile, &s.video_id).unwrap_or_default();
                    let (aid, sid) = choose_tracks(&tracks, &prefs);
                    if let Some(a) = aid {
                        let _ = mpv.set("aid", &a.to_string());
                    }
                    let _ = mpv.set("sid", &sid.map_or("no".into(), |i| i.to_string()));
                    if let Some(sp) = prefs.speed {
                        let _ = mpv.set("speed", &sp.to_string());
                    }
                    let ms = sub_offset_ms(&st.lib, s.profile, &s.file_key).unwrap_or(0);
                    let _ = mpv.set("sub-delay", &format!("{:.3}", ms as f64 / 1000.0));
                }
                let _ = app.emit("player://tracks", &tracks);
            }
            Event::EndFile { eof, error } => {
                if let Some(s) = lock(session).clone() {
                    let mut c = lock(clock).clone();
                    if eof {
                        c.position = c.duration;
                    }
                    save_progress(app, &s, &c);
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
                    ("pause", Value::Flag(v)) => c.paused = v,
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
