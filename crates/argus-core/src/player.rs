//! Player-independent playback logic shared by every platform's player
//! (spec features 4, 6, 7): per-show track memory, per-file subtitle offset,
//! and a throttled playback clock so UIs never re-render on every frame.

use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

use crate::library::Library;
use crate::Result;

/// Remembered per show (or per movie) and profile.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TrackPrefs {
    /// ISO 639 language code, e.g. "jpn".
    pub audio_lang: Option<String>,
    /// `None` = subtitles off.
    pub sub_lang: Option<String>,
    pub secondary_sub_lang: Option<String>,
    pub speed: Option<f64>,
}

/// Show id from a video id: `tt0903747:1:2` → `tt0903747`.
pub fn show_key(video_id: &str) -> &str {
    video_id.split(':').next().unwrap_or(video_id)
}

impl TrackPrefs {
    fn key(video_id: &str) -> String {
        format!("tracks:{}", show_key(video_id))
    }

    pub fn load(lib: &Library, profile: i64, video_id: &str) -> Result<Self> {
        Ok(lib
            .setting(profile, &Self::key(video_id))?
            .and_then(|j| serde_json::from_str(&j).ok())
            .unwrap_or_default())
    }

    pub fn save(&self, lib: &Library, profile: i64, video_id: &str) -> Result<()> {
        lib.set_setting(profile, &Self::key(video_id), &serde_json::to_string(self)?)
    }
}

/// Subtitle sync offset, saved per file (spec: "±50 ms hotkeys saved per file").
pub const SUB_OFFSET_STEP_MS: i64 = 50;

fn offset_key(file_key: &str) -> String {
    format!("suboffset:{file_key}")
}

pub fn sub_offset_ms(lib: &Library, profile: i64, file_key: &str) -> Result<i64> {
    Ok(lib
        .setting(profile, &offset_key(file_key))?
        .and_then(|v| v.parse().ok())
        .unwrap_or(0))
}

pub fn set_sub_offset_ms(lib: &Library, profile: i64, file_key: &str, ms: i64) -> Result<()> {
    lib.set_setting(profile, &offset_key(file_key), &ms.to_string())
}

/// A track as the player reports it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: i64,
    /// "audio" | "sub" | "video"
    pub kind: String,
    pub lang: Option<String>,
    pub title: Option<String>,
    pub codec: Option<String>,
    pub channels: Option<u32>,
    #[serde(default)]
    pub forced: bool,
    #[serde(default)]
    pub default: bool,
    #[serde(default)]
    pub external: bool,
}

/// Normalise 2-letter and 3-letter codes so "en" matches "eng".
pub fn same_lang(a: &str, b: &str) -> bool {
    const PAIRS: &[(&str, &str)] = &[
        ("en", "eng"),
        ("ja", "jpn"),
        ("es", "spa"),
        ("fr", "fre"),
        ("fr", "fra"),
        ("de", "ger"),
        ("de", "deu"),
        ("it", "ita"),
        ("pt", "por"),
        ("ru", "rus"),
        ("zh", "chi"),
        ("zh", "zho"),
        ("ko", "kor"),
        ("hi", "hin"),
        ("ar", "ara"),
        ("nl", "dut"),
        ("nl", "nld"),
        ("sv", "swe"),
        ("pl", "pol"),
        ("tr", "tur"),
    ];
    let (a, b) = (a.to_ascii_lowercase(), b.to_ascii_lowercase());
    a == b
        || PAIRS
            .iter()
            .any(|(x, y)| (a == *x && b == *y) || (a == *y && b == *x))
}

/// Which audio and subtitle tracks to select on load.
///
/// Audio: remembered language, else the file's default. Subtitles: the
/// remembered language (non-forced first); with subtitles off or no match,
/// a *forced* track in the audio language is still shown (signs, foreign
/// dialogue), which is the "forced track honored" rule.
pub fn choose_tracks(tracks: &[Track], prefs: &TrackPrefs) -> (Option<i64>, Option<i64>) {
    let of = |kind: &'static str| tracks.iter().filter(move |t| t.kind == kind);
    let lang_is = |t: &Track, l: &str| t.lang.as_deref().is_some_and(|tl| same_lang(tl, l));

    let audio = prefs
        .audio_lang
        .as_deref()
        .and_then(|l| of("audio").find(|t| lang_is(t, l)))
        .or_else(|| of("audio").find(|t| t.default))
        .or_else(|| of("audio").next());

    let audio_lang = audio.and_then(|a| a.lang.clone());
    let wanted = prefs.sub_lang.as_deref().and_then(|l| {
        of("sub")
            .filter(|t| lang_is(t, l))
            .min_by_key(|t| (t.forced, !t.default, t.external))
    });
    let forced =
        || of("sub").find(|t| t.forced && audio_lang.as_deref().is_none_or(|al| lang_is(t, al)));
    (audio.map(|t| t.id), wanted.or_else(forced).map(|t| t.id))
}

/// Playback clock: the player pushes every position update here, and
/// subscribers (UI, scrobbler, progress saver) pull at their own rate.
/// This keeps per-frame updates out of React state (Harbor's freeze bug).
#[derive(Debug)]
pub struct Throttle {
    every: Duration,
    last: Option<Instant>,
}

impl Throttle {
    pub fn new(every: Duration) -> Self {
        Self { every, last: None }
    }

    /// True at most once per interval.
    pub fn ready(&mut self, now: Instant) -> bool {
        match self.last {
            Some(t) if now.duration_since(t) < self.every => false,
            _ => {
                self.last = Some(now);
                true
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn t(id: i64, kind: &str, lang: &str, forced: bool, default: bool) -> Track {
        Track {
            id,
            kind: kind.into(),
            lang: Some(lang.into()),
            title: None,
            codec: None,
            channels: None,
            forced,
            default,
            external: false,
        }
    }

    #[test]
    fn remembers_tracks_per_show() {
        let lib = Library::in_memory().unwrap();
        let p = lib.profiles().unwrap()[0].id;
        let prefs = TrackPrefs {
            audio_lang: Some("jpn".into()),
            sub_lang: Some("eng".into()),
            ..Default::default()
        };
        prefs.save(&lib, p, "tt1:1:1").unwrap();
        assert_eq!(
            TrackPrefs::load(&lib, p, "tt1:3:7").unwrap(),
            prefs,
            "same show, other episode"
        );
        assert_eq!(
            TrackPrefs::load(&lib, p, "tt2").unwrap(),
            TrackPrefs::default()
        );
    }

    #[test]
    fn picks_remembered_language_and_honors_forced() {
        let tracks = vec![
            t(1, "audio", "eng", false, true),
            t(2, "audio", "jpn", false, false),
            t(3, "sub", "eng", true, false),
            t(4, "sub", "en", false, false),
        ];
        let anime = TrackPrefs {
            audio_lang: Some("ja".into()),
            sub_lang: Some("eng".into()),
            ..Default::default()
        };
        assert_eq!(
            choose_tracks(&tracks, &anime),
            (Some(2), Some(4)),
            "full subs, not forced"
        );

        let subs_off = TrackPrefs::default();
        assert_eq!(
            choose_tracks(&tracks, &subs_off),
            (Some(1), Some(3)),
            "forced English signs still shown"
        );
    }

    #[test]
    fn sub_offset_per_file() {
        let lib = Library::in_memory().unwrap();
        let p = lib.profiles().unwrap()[0].id;
        set_sub_offset_ms(&lib, p, "hash123", -150).unwrap();
        assert_eq!(sub_offset_ms(&lib, p, "hash123").unwrap(), -150);
        assert_eq!(sub_offset_ms(&lib, p, "other").unwrap(), 0);
    }

    #[test]
    fn throttle() {
        let t0 = Instant::now();
        let mut th = Throttle::new(Duration::from_millis(250));
        assert!(th.ready(t0));
        assert!(!th.ready(t0 + Duration::from_millis(100)));
        assert!(th.ready(t0 + Duration::from_millis(260)));
    }
}
