//! Stream safety filter: drops placeholders, fakes and wrong episodes before
//! ranking, so the top result is something worth pressing play on.

use std::sync::OnceLock;

use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::model::Stream;
use crate::ranking::StreamInfo;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Safety {
    /// Also drops extras, shorts and undersized files.
    Strict,
    /// Drops dead placeholders, junk files, samples and wrong episodes.
    #[default]
    Balanced,
    Off,
}

/// The season and episode the user asked for, from ids like `tt0903747:1:2`.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Want {
    pub season: Option<u32>,
    pub episode: Option<u32>,
}

impl Want {
    pub fn from_video_id(id: &str) -> Self {
        let mut p = id.split(':').skip(1);
        Self {
            season: p.next().and_then(|s| s.parse().ok()),
            episode: p.next().and_then(|s| s.parse().ok()),
        }
    }
}

fn re(cell: &'static OnceLock<Regex>, pattern: &str) -> &'static Regex {
    cell.get_or_init(|| Regex::new(pattern).expect("valid regex"))
}

const MB: u64 = 1 << 20;

/// Why a stream should be dropped, or `None` to keep it.
pub fn reject(
    safety: Safety,
    stream: &Stream,
    info: &StreamInfo,
    want: Want,
) -> Option<&'static str> {
    static BANNER: OnceLock<Regex> = OnceLock::new();
    static JUNK: OnceLock<Regex> = OnceLock::new();
    static SAMPLE: OnceLock<Regex> = OnceLock::new();
    static EXTRA: OnceLock<Regex> = OnceLock::new();
    static SE: OnceLock<Regex> = OnceLock::new();
    static RANGE: OnceLock<Regex> = OnceLock::new();

    if safety == Safety::Off {
        return None;
    }
    let text = [
        stream.name.as_deref(),
        stream.description.as_deref(),
        stream.behavior_hints.filename.as_deref(),
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>()
    .join("\n");

    let has_locator = stream.url.is_some()
        || stream.info_hash.is_some()
        || stream.yt_id.is_some()
        || stream.external_url.is_some();
    if !has_locator
        || re(
            &BANNER,
            r"(?i)(no\s+streams?\s+(found|available)|streams?\s+(filtered|blocked)|api\s+(key|limit))",
        )
        .is_match(&text)
    {
        return Some("placeholder");
    }
    if re(&JUNK, r"(?i)\.(exe|zip|rar|lnk|scr|bat|iso|img|apk)\b").is_match(&text) {
        return Some("not a video");
    }
    if re(&SAMPLE, r"(?i)\b(sample|trailer|teaser)\b").is_match(&text) {
        return Some("sample or trailer");
    }
    if let Some(size) = info.size_bytes {
        let floor = if safety == Safety::Strict {
            let movie = want.episode.is_none();
            let base = match info.resolution {
                2160.. => 800,
                1080.. => 400,
                720.. => 200,
                _ => 80,
            };
            (if movie { base } else { base / 2 }) * MB
        } else {
            20 * MB
        };
        if size < floor {
            return Some("too small");
        }
    }
    if safety == Safety::Strict
        && re(
            &EXTRA,
            r"(?i)\b(featurette|behind the scenes|extras?|deleted scenes?|ova|webisode)\b",
        )
        .is_match(&text)
    {
        return Some("extra");
    }
    if let (Some(ws), Some(we)) = (want.season, want.episode) {
        if !re(&RANGE, r"(?i)e\d{1,3}\s*[-–]\s*e?\d{1,3}").is_match(&text) {
            let found = re(
                &SE,
                r"(?i)\bs(\d{1,2})\s*e(\d{1,3})\b|\b(\d{1,2})x(\d{2,3})\b",
            )
            .captures(&text)
            .and_then(|c| {
                let (s, e) = match (c.get(1), c.get(3)) {
                    (Some(_), _) => (c.get(1)?, c.get(2)?),
                    (_, Some(_)) => (c.get(3)?, c.get(4)?),
                    _ => return None,
                };
                Some((
                    s.as_str().parse::<u32>().ok()?,
                    e.as_str().parse::<u32>().ok()?,
                ))
            });
            if found.is_some_and(|f| f != (ws, we)) {
                return Some("wrong episode");
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn stream(name: &str, hash: bool) -> Stream {
        Stream {
            name: Some(name.into()),
            info_hash: hash.then(|| "abc".into()),
            ..Default::default()
        }
    }

    fn check(safety: Safety, name: &str, want: Want) -> Option<&'static str> {
        let s = stream(name, true);
        reject(safety, &s, &StreamInfo::parse(&s), want)
    }

    #[test]
    fn drops_junk_and_placeholders() {
        let w = Want::default();
        assert_eq!(
            check(Safety::Balanced, "Movie.2020.1080p.exe", w),
            Some("not a video")
        );
        assert_eq!(
            check(Safety::Balanced, "Movie.2020.SAMPLE.mkv", w),
            Some("sample or trailer")
        );
        assert_eq!(check(Safety::Balanced, "Movie.2020.1080p.BluRay", w), None);
        let banner = Stream {
            name: Some("No streams found".into()),
            url: Some("x".into()),
            ..Default::default()
        };
        assert_eq!(
            reject(Safety::Balanced, &banner, &StreamInfo::parse(&banner), w),
            Some("placeholder")
        );
        assert_eq!(check(Safety::Off, "Movie.exe", w), None);
    }

    #[test]
    fn rejects_wrong_episode_but_keeps_packs_and_ranges() {
        let w = Want::from_video_id("tt0903747:1:2");
        assert_eq!(
            check(Safety::Balanced, "Show.S01E03.1080p", w),
            Some("wrong episode")
        );
        assert_eq!(
            check(Safety::Balanced, "Show.1x03.720p", w),
            Some("wrong episode")
        );
        assert_eq!(check(Safety::Balanced, "Show.S01E02.1080p", w), None);
        assert_eq!(check(Safety::Balanced, "Show.S01.COMPLETE.1080p", w), None);
        assert_eq!(check(Safety::Balanced, "Show.S01E01-E03.1080p", w), None);
    }

    #[test]
    fn strict_drops_undersized_and_extras() {
        let w = Want::default();
        assert_eq!(
            check(Safety::Strict, "Movie 1080p 150 MB", w),
            Some("too small")
        );
        assert_eq!(check(Safety::Balanced, "Movie 1080p 150 MB", w), None);
        assert_eq!(
            check(Safety::Strict, "Movie Behind The Scenes 1080p", w),
            Some("extra")
        );
    }
}
