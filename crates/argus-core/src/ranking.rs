//! Stream ranking (spec feature 2). Parses the free-text labels addons put on
//! streams into structured facts, filters by the user's pinned preferences and
//! orders best-first: cached on debrid, then resolution, HDR, codec, seeders.

use std::sync::OnceLock;

use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::model::Stream;
use crate::trust::{reject, Safety, Want};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Hdr {
    None,
    Hlg,
    Hdr10,
    Hdr10Plus,
    DolbyVision,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Codec {
    Av1,
    Hevc,
    H264,
    Other,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Release {
    Remux,
    BluRay,
    Web,
    Hdtv,
    /// Camera / telesync rips. Hidden by default.
    Cam,
    Unknown,
}

/// Facts extracted from a stream's labels. Shown on stream cards.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamInfo {
    /// Vertical resolution, 0 when unknown.
    pub resolution: u16,
    pub hdr: Hdr,
    pub codec: Codec,
    pub release: Release,
    /// e.g. "TrueHD Atmos", "DTS-HD MA", "DD+", "AAC".
    pub audio: Option<String>,
    /// e.g. "5.1", "7.1", "2.0".
    pub channels: Option<String>,
    pub size_bytes: Option<u64>,
    pub seeders: Option<u32>,
    /// Some(true) when the addon or a debrid cache check says it is instant.
    pub cached: Option<bool>,
    /// Audio languages named in the release, as ISO 639-2 codes ("eng").
    /// Empty when the release doesn't say; `multi` marks multi-audio.
    #[serde(default)]
    pub languages: Vec<String>,
}

const LANGUAGE_WORDS: &[(&str, &[&str])] = &[
    ("eng", &["english", "🇬🇧", "🇺🇸"]),
    ("hin", &["hindi", "🇮🇳"]),
    (
        "spa",
        &["spanish", "español", "castellano", "latino", "🇪🇸", "🇲🇽"],
    ),
    ("fre", &["french", "français", "vostfr", "truefrench", "🇫🇷"]),
    ("ger", &["german", "deutsch", "🇩🇪"]),
    ("ita", &["italian", "italiano", "🇮🇹"]),
    ("por", &["portuguese", "português", "🇵🇹", "🇧🇷"]),
    ("rus", &["russian", "🇷🇺"]),
    ("jpn", &["japanese", "🇯🇵"]),
    ("kor", &["korean", "🇰🇷"]),
    ("chi", &["chinese", "mandarin", "cantonese", "🇨🇳"]),
    ("ara", &["arabic", "🇸🇦"]),
    ("tur", &["turkish", "🇹🇷"]),
    ("pol", &["polish", "🇵🇱"]),
    ("dut", &["dutch", "🇳🇱"]),
    ("swe", &["swedish", "🇸🇪"]),
    ("tam", &["tamil"]),
    ("tel", &["telugu"]),
];

fn detect_languages(lower: &str) -> Vec<String> {
    let mut out: Vec<String> = LANGUAGE_WORDS
        .iter()
        .filter(|(_, words)| words.iter().any(|w| lower.contains(w)))
        .map(|(code, _)| code.to_string())
        .collect();
    if ["multi", "dual audio", "dual-audio"]
        .iter()
        .any(|w| lower.contains(w))
    {
        out.push("multi".into());
    }
    out
}

fn re(cell: &'static OnceLock<Regex>, pattern: &str) -> &'static Regex {
    cell.get_or_init(|| Regex::new(pattern).expect("valid regex"))
}

impl StreamInfo {
    pub fn parse(stream: &Stream) -> Self {
        static RES: OnceLock<Regex> = OnceLock::new();
        static SIZE: OnceLock<Regex> = OnceLock::new();
        static SEED: OnceLock<Regex> = OnceLock::new();
        static CH: OnceLock<Regex> = OnceLock::new();
        static CACHED: OnceLock<Regex> = OnceLock::new();
        static UNCACHED: OnceLock<Regex> = OnceLock::new();
        static CAM: OnceLock<Regex> = OnceLock::new();

        let text = [
            stream.name.as_deref(),
            stream.description.as_deref(),
            stream.behavior_hints.filename.as_deref(),
        ]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>()
        .join("\n");
        let lower = text.to_ascii_lowercase();
        let has = |needles: &[&str]| needles.iter().any(|n| lower.contains(n));

        let resolution = re(
            &RES,
            r"(?i)\b(2160|1440|1080|720|576|480|360)p\b|\b(4k|uhd)\b",
        )
        .captures(&text)
        .map(|c| match c.get(1) {
            Some(m) => m.as_str().parse().unwrap_or(0),
            None => 2160,
        })
        .unwrap_or(0);

        let hdr = if has(&[
            "dolby vision",
            "dovi",
            ".dv.",
            " dv ",
            "[dv]",
            "dv hdr",
            "hdr dv",
            "dv-",
        ]) || text
            .split(|c: char| !c.is_ascii_alphanumeric())
            .any(|w| w == "DV")
        {
            Hdr::DolbyVision
        } else if has(&["hdr10+", "hdr10plus"]) {
            Hdr::Hdr10Plus
        } else if has(&["hdr"]) {
            Hdr::Hdr10
        } else if has(&["hlg"]) {
            Hdr::Hlg
        } else {
            Hdr::None
        };

        let codec = if has(&["av1"]) {
            Codec::Av1
        } else if has(&["hevc", "x265", "h265", "h.265"]) {
            Codec::Hevc
        } else if has(&["x264", "h264", "h.264", "avc"]) {
            Codec::H264
        } else {
            Codec::Other
        };

        let release = if re(&CAM, r"(?i)\b(cam|camrip|hdcam|ts|telesync|hdts|tc)\b").is_match(&text)
        {
            Release::Cam
        } else if has(&["remux"]) {
            Release::Remux
        } else if has(&["bluray", "blu-ray", "bdrip", "brrip"]) {
            Release::BluRay
        } else if has(&["web-dl", "webdl", "webrip", "web "]) || lower.contains(".web.") {
            Release::Web
        } else if has(&["hdtv"]) {
            Release::Hdtv
        } else {
            Release::Unknown
        };

        let audio = [
            (&["truehd atmos", "truehd.atmos"][..], "TrueHD Atmos"),
            (&["truehd"], "TrueHD"),
            (
                &["dts-hd ma", "dts-hd.ma", "dts-hdma", "dtshd"],
                "DTS-HD MA",
            ),
            (&["dts:x", "dts-x"], "DTS:X"),
            (&["dts"], "DTS"),
            (&["atmos"], "Atmos"),
            (&["ddp", "dd+", "eac3", "e-ac-3"], "DD+"),
            (&["ac3", "dd5", "dd 5", "dolby digital"], "DD"),
            (&["flac"], "FLAC"),
            (&["opus"], "Opus"),
            (&["aac"], "AAC"),
        ]
        .iter()
        .find(|(needles, _)| has(needles))
        .map(|(_, label)| label.to_string());

        let channels = re(&CH, r"(?:^|[^0-9])([2-7])[. ]([01])(?:$|[^0-9])")
            .captures(&text)
            .map(|c| format!("{}.{}", &c[1], &c[2]));

        let size_bytes = re(&SIZE, r"(?i)(\d+(?:[.,]\d+)?)\s*(gb|gib|mb|mib)\b")
            .captures(&text)
            .and_then(|c| {
                let n: f64 = c[1].replace(',', ".").parse().ok()?;
                let mul = if c[2].to_ascii_lowercase().starts_with('g') {
                    1u64 << 30
                } else {
                    1 << 20
                };
                Some((n * mul as f64) as u64)
            });
        let size_bytes = size_bytes.or(stream.behavior_hints.video_size);

        let seeders = re(&SEED, r"(?:👤|seeders?:?|seeds?:?|S:)\s*(\d+)")
            .captures(&text)
            .and_then(|c| c[1].parse().ok());

        // Torrentio-style tags: [RD+] cached, [RD download] not cached.
        let cached = if re(&CACHED, r"(?i)\[(rd|ad|pm|tb|dl|ed)\+\]|⚡").is_match(&text) {
            Some(true)
        } else if re(&UNCACHED, r"(?i)\[(rd|ad|pm|tb|dl|ed) download\]|⏳").is_match(&text) {
            Some(false)
        } else {
            None
        };

        Self {
            resolution,
            hdr,
            codec,
            release,
            audio,
            channels,
            size_bytes,
            seeders,
            cached,
            languages: detect_languages(&lower),
        }
    }
}

/// User-pinned filters, stored per profile.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Preferences {
    pub max_resolution: Option<u16>,
    pub min_resolution: Option<u16>,
    pub max_size_gb: Option<f64>,
    pub hide_cam: bool,
    /// Skip HDR when the display or user can't use it.
    pub allow_hdr: bool,
    pub prefer_hevc: bool,
    pub exclude_keywords: Vec<String>,
    /// Only show streams that are instant on debrid (torrents need debrid anyway).
    pub cached_only: bool,
    /// How hard to filter placeholders, fakes and wrong episodes.
    pub safety: Safety,
    /// Which kind of source to put first.
    pub source: SourcePref,
    /// Best-first by score, or exactly as the addons returned them.
    pub order: Order,
    /// How long to wait for each addon before moving on (seconds).
    pub addon_wait_secs: u32,
    /// Audio languages to favour, best first (ISO 639-2: "eng", "hin").
    pub languages: Vec<String>,
    /// Hide streams that name only other audio languages.
    pub only_my_languages: bool,
}

/// Which kind of stream wins ties in the list.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SourcePref {
    /// No preference.
    #[default]
    Both,
    /// Direct links and debrid-cached streams first.
    Debrid,
    /// Torrent streams first.
    P2p,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Order {
    #[default]
    Rank,
    Addon,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            max_resolution: None,
            min_resolution: None,
            max_size_gb: None,
            hide_cam: true,
            allow_hdr: true,
            prefer_hevc: false,
            exclude_keywords: Vec::new(),
            cached_only: false,
            safety: Safety::default(),
            source: SourcePref::default(),
            order: Order::default(),
            addon_wait_secs: 6,
            languages: Vec::new(),
            only_my_languages: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RankedStream {
    pub stream: Stream,
    pub info: StreamInfo,
    pub score: i64,
}

impl Preferences {
    fn allows(&self, s: &Stream, i: &StreamInfo, want: Want) -> bool {
        if reject(self.safety, s, i, want).is_some() {
            return false;
        }
        if self.hide_cam && i.release == Release::Cam {
            return false;
        }
        if self.only_my_languages
            && !self.languages.is_empty()
            && !i.languages.is_empty()
            && !i
                .languages
                .iter()
                .any(|l| l == "multi" || self.languages.contains(l))
        {
            return false;
        }
        if self.cached_only && s.info_hash.is_some() && i.cached != Some(true) {
            return false;
        }
        if self.max_resolution.is_some_and(|m| i.resolution > m) {
            return false;
        }
        if self
            .min_resolution
            .is_some_and(|m| i.resolution != 0 && i.resolution < m)
        {
            return false;
        }
        if let (Some(max), Some(size)) = (self.max_size_gb, i.size_bytes) {
            if size as f64 > max * (1u64 << 30) as f64 {
                return false;
            }
        }
        if !self.exclude_keywords.is_empty() {
            let label = format!("{:?} {:?}", s.name, s.description).to_lowercase();
            if self
                .exclude_keywords
                .iter()
                .any(|k| !k.is_empty() && label.contains(&k.to_lowercase()))
            {
                return false;
            }
        }
        true
    }

    fn score(&self, s: &Stream, i: &StreamInfo) -> i64 {
        let mut score = 0i64;
        // Playable now beats everything: cached debrid or a direct URL.
        score += match (i.cached, s.url.is_some()) {
            (Some(true), _) => 100_000,
            (_, true) => 80_000,
            (None, false) => 20_000,
            (Some(false), false) => 0,
        };
        score += i64::from(i.resolution) * 10;
        score += match i.hdr {
            _ if !self.allow_hdr => 0,
            Hdr::DolbyVision => 900,
            Hdr::Hdr10Plus => 800,
            Hdr::Hdr10 => 700,
            Hdr::Hlg => 300,
            Hdr::None => 0,
        };
        score += match (i.codec, self.prefer_hevc) {
            (Codec::Hevc | Codec::Av1, true) => 500,
            (Codec::Hevc | Codec::Av1, false) => 100,
            _ => 0,
        };
        score += match i.release {
            Release::Remux => 400,
            Release::BluRay => 300,
            Release::Web => 200,
            Release::Hdtv => 50,
            Release::Unknown => 0,
            Release::Cam => -5_000,
        };
        // Favoured audio languages: first choice counts most.
        if let Some(rank) = self
            .languages
            .iter()
            .position(|l| i.languages.iter().any(|x| x == l))
        {
            score += 20_000 - (rank as i64) * 3_000;
        }
        let direct = i.cached == Some(true) || s.url.is_some();
        score += match self.source {
            SourcePref::Debrid if direct => 100_000,
            SourcePref::P2p if s.info_hash.is_some() && s.url.is_none() => 100_000,
            _ => 0,
        };
        // Seeders matter only for uncached torrents; log-scaled so 5000 ≈ 50.
        if i.cached != Some(true) && s.info_hash.is_some() {
            score += i
                .seeders
                .map_or(0, |n| (f64::from(n + 1).log10() * 150.0) as i64);
        }
        score
    }

    /// Filters and orders streams best-first. Stable for equal scores, so
    /// addon priority order breaks ties.
    pub fn rank(&self, streams: Vec<Stream>) -> Vec<RankedStream> {
        self.rank_for(streams, Want::default())
    }

    /// Like [`rank`](Self::rank), also dropping streams for another episode.
    pub fn rank_for(&self, streams: Vec<Stream>, want: Want) -> Vec<RankedStream> {
        let mut out: Vec<RankedStream> = streams
            .into_iter()
            .map(|stream| {
                let info = StreamInfo::parse(&stream);
                RankedStream {
                    score: self.score(&stream, &info),
                    stream,
                    info,
                }
            })
            .filter(|r| self.allows(&r.stream, &r.info, want))
            .collect();
        if self.order == Order::Rank {
            out.sort_by_key(|r| std::cmp::Reverse(r.score));
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(name: &str, desc: &str, hash: bool) -> Stream {
        Stream {
            name: Some(name.into()),
            description: Some(desc.into()),
            info_hash: hash.then(|| "abc".into()),
            url: (!hash).then(|| "http://x".into()),
            ..Default::default()
        }
    }

    #[test]
    fn source_preference_and_addon_order() {
        let list = vec![s("a", "1080p", true), s("b", "720p", false)];
        let both = Preferences::default().rank(list.clone());
        // Direct URL wins by default (playable now).
        assert_eq!(both[0].stream.name.as_deref(), Some("b"));
        let p2p = Preferences {
            source: SourcePref::P2p,
            ..Default::default()
        }
        .rank(list.clone());
        assert_eq!(p2p[0].stream.name.as_deref(), Some("a"));
        let addon = Preferences {
            order: Order::Addon,
            ..Default::default()
        }
        .rank(list);
        assert_eq!(addon[0].stream.name.as_deref(), Some("a"));
    }

    #[test]
    fn language_preference_ranks_and_filters() {
        let list = vec![
            s("a", "Movie.2024.1080p.WEB-DL.Hindi", true),
            s("b", "Movie.2024.1080p.WEB-DL.English", true),
            s("c", "Movie.2024.720p.WEB-DL", true),
            s("d", "Movie.2024.720p.MULTi", true),
        ];
        let want = |only| Preferences {
            languages: vec!["eng".into()],
            only_my_languages: only,
            ..Default::default()
        };
        let ranked = want(false).rank(list.clone());
        assert_eq!(ranked[0].stream.name.as_deref(), Some("b"));
        let only: Vec<_> = want(true)
            .rank(list)
            .iter()
            .filter_map(|r| r.stream.name.clone())
            .collect();
        // Hindi-only is hidden; unknown and multi-audio stay.
        assert!(!only.contains(&"a".to_string()));
        assert!(only.contains(&"c".to_string()) && only.contains(&"d".to_string()));
    }

    #[test]
    fn parses_torrentio_style_label() {
        let i = StreamInfo::parse(&s(
            "[RD+] Torrentio\n4k DV | HDR",
            "Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX.DV.HDR.HEVC.TrueHD.Atmos.7.1-GRP\n👤 312 💾 64.2 GB ⚙️ ThePirateBay",
            true,
        ));
        assert_eq!(i.resolution, 2160);
        assert_eq!(i.hdr, Hdr::DolbyVision);
        assert_eq!(i.codec, Codec::Hevc);
        assert_eq!(i.release, Release::Remux);
        assert_eq!(i.audio.as_deref(), Some("TrueHD Atmos"));
        assert_eq!(i.channels.as_deref(), Some("7.1"));
        assert_eq!(i.seeders, Some(312));
        assert_eq!(i.cached, Some(true));
        assert_eq!(i.size_bytes, Some((64.2 * (1u64 << 30) as f64) as u64));
    }

    #[test]
    fn plain_label_has_no_false_hdr() {
        let i = StreamInfo::parse(&s("Server 1", "Movie 1080p WEB-DL DDP5.1 x264", false));
        assert_eq!(
            (i.resolution, i.hdr, i.codec),
            (1080, Hdr::None, Codec::H264)
        );
        assert_eq!(i.audio.as_deref(), Some("DD+"));
        assert_eq!(i.channels.as_deref(), Some("5.1"));
    }

    #[test]
    fn cached_beats_resolution_and_cam_is_hidden() {
        let streams = vec![
            s("[RD download]", "Film 2160p HDR 👤 900", true),
            s("[RD+]", "Film 1080p WEB", true),
            s("x", "Film HDCAM 1080p", false),
        ];
        let ranked = Preferences::default().rank(streams);
        assert_eq!(ranked.len(), 2);
        assert_eq!(ranked[0].info.cached, Some(true));
    }

    #[test]
    fn pinned_filters_apply() {
        let prefs = Preferences {
            max_resolution: Some(1080),
            max_size_gb: Some(10.0),
            exclude_keywords: vec!["hindi".into()],
            ..Default::default()
        };
        let ranked = prefs.rank(vec![
            s("a", "2160p 20 GB", false),
            s("b", "1080p 30 GB", false),
            s("c", "1080p 4 GB HINDI", false),
            s("d", "720p 2 GB", false),
        ]);
        let names: Vec<_> = ranked
            .iter()
            .map(|r| r.stream.name.clone().unwrap())
            .collect();
        assert_eq!(names, ["d"]);
    }
}
