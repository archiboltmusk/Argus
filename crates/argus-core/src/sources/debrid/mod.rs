//! Debrid services turn a torrent info-hash into a direct HTTPS link
//! (spec feature 3). One enum dispatches to each provider so callers never
//! care which service the user signed in with.

pub mod alldebrid;
pub mod premiumize;
pub mod realdebrid;
pub mod torbox;

use std::collections::HashMap;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::model::Stream;
use crate::Result;

pub use alldebrid::AllDebrid;
pub use premiumize::Premiumize;
pub use realdebrid::RealDebrid;
pub use torbox::TorBox;

pub fn magnet(info_hash: &str) -> String {
    format!("magnet:?xt=urn:btih:{}", info_hash.to_ascii_lowercase())
}

pub fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_secs() as i64)
}

/// A file inside a torrent, in the torrent's own order.
#[derive(Debug, Clone, PartialEq)]
pub struct DebridFile {
    pub path: String,
    pub bytes: u64,
}

const VIDEO_EXT: &[&str] = &["mkv", "mp4", "avi", "mov", "m4v", "webm", "ts", "wmv"];

/// Index into `files` of the file to play: the addon's `fileIdx` when it is a
/// video, otherwise the largest video (skips samples, nfo, subs).
pub fn pick_file(files: &[DebridFile], file_idx: Option<u32>) -> Option<usize> {
    let is_video = |f: &DebridFile| {
        f.path
            .rsplit('.')
            .next()
            .is_some_and(|e| VIDEO_EXT.contains(&e.to_ascii_lowercase().as_str()))
    };
    if let Some(i) = file_idx.map(|i| i as usize) {
        if files.get(i).is_some_and(is_video) {
            return Some(i);
        }
    }
    files
        .iter()
        .enumerate()
        .filter(|(_, f)| is_video(f))
        .max_by_key(|(_, f)| f.bytes)
        .map(|(i, _)| i)
}

/// Shown to the user during device sign-in: "go to URL, enter CODE".
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceCode {
    pub device_code: String,
    pub user_code: String,
    pub verification_url: String,
    pub interval_s: u64,
    pub expires_in_s: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthToken {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    RealDebrid,
    AllDebrid,
    Premiumize,
    TorBox,
}

impl Provider {
    pub const ALL: [Provider; 4] = [
        Self::RealDebrid,
        Self::AllDebrid,
        Self::Premiumize,
        Self::TorBox,
    ];

    pub fn name(self) -> &'static str {
        match self {
            Self::RealDebrid => "Real-Debrid",
            Self::AllDebrid => "AllDebrid",
            Self::Premiumize => "Premiumize",
            Self::TorBox => "TorBox",
        }
    }

    /// Settings key holding this provider's token for a profile.
    pub fn setting_key(self) -> String {
        format!("debrid.{}.key", self.slug())
    }

    pub fn slug(self) -> &'static str {
        match self {
            Self::RealDebrid => "realdebrid",
            Self::AllDebrid => "alldebrid",
            Self::Premiumize => "premiumize",
            Self::TorBox => "torbox",
        }
    }
}

#[derive(Clone)]
pub enum Debrid {
    RealDebrid(RealDebrid),
    AllDebrid(AllDebrid),
    Premiumize(Premiumize),
    TorBox(TorBox),
}

impl Debrid {
    pub fn new(provider: Provider, http: reqwest::Client, token: impl Into<String>) -> Self {
        match provider {
            Provider::RealDebrid => Self::RealDebrid(RealDebrid::new(http, token)),
            Provider::AllDebrid => Self::AllDebrid(AllDebrid::new(http, token)),
            Provider::Premiumize => Self::Premiumize(Premiumize::new(http, token)),
            Provider::TorBox => Self::TorBox(TorBox::new(http, token)),
        }
    }

    pub fn provider(&self) -> Provider {
        match self {
            Self::RealDebrid(_) => Provider::RealDebrid,
            Self::AllDebrid(_) => Provider::AllDebrid,
            Self::Premiumize(_) => Provider::Premiumize,
            Self::TorBox(_) => Provider::TorBox,
        }
    }

    /// Which hashes are instantly playable. Providers without a cache API
    /// (Real-Debrid, AllDebrid removed theirs) return an empty map, and
    /// ranking falls back to the addon's own `[RD+]` style tags.
    pub async fn cache_check(&self, hashes: &[String]) -> Result<HashMap<String, bool>> {
        if hashes.is_empty() {
            return Ok(HashMap::new());
        }
        match self {
            Self::Premiumize(p) => p.cache_check(hashes).await,
            Self::TorBox(t) => t.cache_check(hashes).await,
            Self::RealDebrid(_) | Self::AllDebrid(_) => Ok(HashMap::new()),
        }
    }

    /// Torrent stream → direct URL, waiting at most `wait` for non-cached ones.
    pub async fn resolve(&self, stream: &Stream, wait: Duration) -> Result<String> {
        match self {
            Self::RealDebrid(c) => c.resolve(stream, wait).await,
            Self::AllDebrid(c) => c.resolve(stream, wait).await,
            Self::Premiumize(c) => c.resolve(stream).await,
            Self::TorBox(c) => c.resolve(stream, wait).await,
        }
    }
}

/// Marks streams the cache check found as instant, so ranking puts them first.
pub fn apply_cache(streams: &mut [Stream], cached: &HashMap<String, bool>, provider: Provider) {
    let tag = match provider {
        Provider::RealDebrid => "RD",
        Provider::AllDebrid => "AD",
        Provider::Premiumize => "PM",
        Provider::TorBox => "TB",
    };
    for s in streams {
        let Some(hash) = s.info_hash.as_deref().map(str::to_ascii_lowercase) else {
            continue;
        };
        if cached.get(&hash) == Some(&true) {
            let name = s.name.take().unwrap_or_default();
            if !name.contains('+') {
                s.name = Some(format!("[{tag}+] {name}"));
            } else {
                s.name = Some(name);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn f(path: &str, bytes: u64) -> DebridFile {
        DebridFile {
            path: path.into(),
            bytes,
        }
    }

    #[test]
    fn picks_requested_or_largest_video() {
        let files = vec![
            f("/sample.mkv", 10),
            f("/Movie.mkv", 900),
            f("/movie.nfo", 2000),
        ];
        assert_eq!(pick_file(&files, None), Some(1));
        assert_eq!(pick_file(&files, Some(0)), Some(0));
        assert_eq!(
            pick_file(&files, Some(2)),
            Some(1),
            "fileIdx on a non-video falls back"
        );
        assert_eq!(pick_file(&[f("/a.txt", 1)], None), None);
    }

    #[test]
    fn magnet_is_lowercase() {
        assert_eq!(magnet("ABC"), "magnet:?xt=urn:btih:abc");
    }

    #[test]
    fn cache_result_tags_streams_for_ranking() {
        let mut streams = vec![Stream {
            info_hash: Some("AbC".into()),
            name: Some("Src".into()),
            ..Default::default()
        }];
        let cached = HashMap::from([("abc".to_string(), true)]);
        apply_cache(&mut streams, &cached, Provider::TorBox);
        assert_eq!(streams[0].name.as_deref(), Some("[TB+] Src"));
        let info = crate::ranking::StreamInfo::parse(&streams[0]);
        assert_eq!(info.cached, Some(true));
    }
}
