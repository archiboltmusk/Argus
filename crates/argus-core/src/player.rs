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

/// Stremio/Harbor-style player settings, stored per profile as JSON under
/// `player.prefs`. Every field has a sensible default so a missing or old
/// blob never breaks playback.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PlayerPrefs {
    /// Preferred audio languages, comma-separated ISO codes ("eng,jpn").
    pub audio_langs: String,
    /// Preferred subtitle languages; empty = no automatic subtitles.
    pub sub_langs: String,
    /// Subtitle size in mpv points (default 55 ≈ Stremio "100%").
    pub sub_size: u32,
    /// `#RRGGBB`.
    pub sub_color: String,
    pub sub_outline_color: String,
    /// 0 (top) to 100 (bottom).
    pub sub_position: u32,
    /// Outline thickness 0-8.
    pub sub_outline: u32,
    pub sub_bold: bool,
    /// `auto-safe` (hardware) or `no` (software).
    pub hwdec: String,
    pub volume: u32,
    /// Start the next episode automatically when one ends.
    pub auto_next: bool,
    /// Let mpv resolve YouTube/other page URLs with the user's own yt-dlp.
    pub ytdl: bool,
    /// Show a Skip button over intros, recaps and credits found in chapters.
    pub skip_button: bool,
    /// Jump over them without asking.
    pub auto_skip: bool,
    /// `auto`, `16:9`, `4:3`, `21:9`, `fill` (crop to fill) or `stretch`.
    pub aspect: String,
    /// Even out loud and quiet scenes.
    pub normalize: bool,
    /// `off`, `night`, `voice`, `bass` or `treble`.
    pub eq: String,
    /// Convert HDR to SDR for non-HDR displays.
    pub tonemap: bool,
    /// Seconds before the end to offer "Next episode" (0 = no prompt).
    pub next_prompt_secs: u32,
    /// Hide the Skip button after this many seconds (0 = keep it).
    pub skip_hide_secs: u32,
}

impl Default for PlayerPrefs {
    fn default() -> Self {
        Self {
            audio_langs: String::new(),
            sub_langs: String::new(),
            sub_size: 55,
            sub_color: "#FFFFFF".into(),
            sub_outline_color: "#000000".into(),
            sub_position: 100,
            sub_outline: 3,
            sub_bold: false,
            hwdec: "auto-safe".into(),
            volume: 100,
            auto_next: true,
            ytdl: false,
            skip_button: true,
            auto_skip: false,
            aspect: "auto".into(),
            normalize: false,
            eq: "off".into(),
            tonemap: false,
            next_prompt_secs: 0,
            skip_hide_secs: 0,
        }
    }
}

impl PlayerPrefs {
    pub const KEY: &'static str = "player.prefs";

    pub fn load(lib: &Library, profile: i64) -> Result<Self> {
        Ok(lib
            .setting(profile, Self::KEY)?
            .and_then(|j| serde_json::from_str(&j).ok())
            .unwrap_or_default())
    }

    /// mpv `name=value` pairs for these settings. Colors are validated so a
    /// bad value can't reach mpv.
    pub fn mpv_properties(&self) -> Vec<(&'static str, String)> {
        let color = |c: &str, fallback: &str| {
            let ok =
                c.len() == 7 && c.starts_with('#') && c[1..].chars().all(|x| x.is_ascii_hexdigit());
            if ok {
                c.to_string()
            } else {
                fallback.to_string()
            }
        };
        let langs = |l: &str| {
            l.split(',')
                .map(str::trim)
                .filter(|x| !x.is_empty() && x.chars().all(|c| c.is_ascii_alphabetic() || c == '-'))
                .collect::<Vec<_>>()
                .join(",")
        };
        let mut props = vec![
            ("alang", langs(&self.audio_langs)),
            ("slang", langs(&self.sub_langs)),
            ("sub-font-size", self.sub_size.clamp(20, 120).to_string()),
            ("sub-color", color(&self.sub_color, "#FFFFFF")),
            (
                "sub-border-color",
                color(&self.sub_outline_color, "#000000"),
            ),
            ("sub-pos", self.sub_position.clamp(0, 100).to_string()),
            ("sub-border-size", self.sub_outline.clamp(0, 8).to_string()),
            ("sub-bold", if self.sub_bold { "yes" } else { "no" }.into()),
            (
                "hwdec",
                if self.hwdec == "no" {
                    "no"
                } else {
                    "auto-safe"
                }
                .into(),
            ),
            ("volume", self.volume.clamp(0, 130).to_string()),
        ];
        let (aspect, panscan) = match self.aspect.as_str() {
            "16:9" | "4:3" | "21:9" => (self.aspect.clone(), "0"),
            "fill" => ("-1".into(), "1"),
            "stretch" => ("-1".into(), "0"),
            _ => ("-1".into(), "0"),
        };
        props.push(("video-aspect-override", aspect));
        props.push(("panscan", panscan.into()));
        props.push((
            "keepaspect",
            if self.aspect == "stretch" {
                "no"
            } else {
                "yes"
            }
            .into(),
        ));
        let mut af = Vec::new();
        if self.normalize {
            af.push("dynaudnorm=f=250:g=15");
        }
        match self.eq.as_str() {
            "night" => af.push("acompressor=threshold=-24dB:ratio=6:attack=20:release=250"),
            "voice" => af.push("equalizer=f=2500:t=q:w=1:g=5,equalizer=f=150:t=q:w=1:g=-4"),
            "bass" => af.push("equalizer=f=80:t=q:w=1:g=6"),
            "treble" => af.push("equalizer=f=8000:t=q:w=1:g=5"),
            _ => {}
        }
        props.push(("af", af.join(",")));
        props.push((
            "tone-mapping",
            if self.tonemap { "bt.2390" } else { "auto" }.into(),
        ));
        props.push((
            "target-colorspace-hint",
            if self.tonemap { "no" } else { "auto" }.into(),
        ));
        props
    }
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

    #[test]
    fn prefs_defaults_survive_partial_json_and_bad_values() {
        let p: PlayerPrefs = serde_json::from_str(
            r##"{"subSize":70,"subColor":"red; osd","audioLangs":"eng, jpn,;rm"}"##,
        )
        .unwrap();
        assert!(p.auto_next && p.sub_outline == 3);
        let props: std::collections::HashMap<_, _> = p.mpv_properties().into_iter().collect();
        assert_eq!(props["sub-font-size"], "70");
        assert_eq!(props["sub-color"], "#FFFFFF");
        assert_eq!(props["alang"], "eng,jpn");
        assert_eq!(props["hwdec"], "auto-safe");
    }

    #[test]
    fn video_and_audio_prefs_map_to_mpv() {
        let p = PlayerPrefs {
            aspect: "fill".into(),
            normalize: true,
            eq: "bass".into(),
            tonemap: true,
            ..Default::default()
        };
        let m: std::collections::HashMap<_, _> = p.mpv_properties().into_iter().collect();
        assert_eq!(m["panscan"], "1");
        assert_eq!(m["tone-mapping"], "bt.2390");
        assert!(m["af"].starts_with("dynaudnorm") && m["af"].contains("equalizer"));
        let d: std::collections::HashMap<_, _> = PlayerPrefs::default()
            .mpv_properties()
            .into_iter()
            .collect();
        assert_eq!(d["af"], "");
        assert_eq!(d["video-aspect-override"], "-1");
        let bad = PlayerPrefs {
            aspect: "9:1;x".into(),
            eq: "../x".into(),
            ..Default::default()
        };
        let b: std::collections::HashMap<_, _> = bad.mpv_properties().into_iter().collect();
        assert_eq!(b["video-aspect-override"], "-1");
        assert_eq!(b["af"], "");
    }

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
