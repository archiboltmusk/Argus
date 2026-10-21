//! Debrid services turn a torrent info-hash into a direct HTTPS link.
//! Real-Debrid first; others (AllDebrid, Premiumize, TorBox) plug into [`Debrid`].

use std::time::Duration;

use serde::Deserialize;

use crate::model::Stream;
use crate::{Error, Result};

pub fn magnet(info_hash: &str) -> String {
    format!("magnet:?xt=urn:btih:{}", info_hash.to_ascii_lowercase())
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Debrid {
    RealDebrid { api_key: String },
}

impl Debrid {
    pub fn name(&self) -> &'static str {
        match self {
            Self::RealDebrid { .. } => "Real-Debrid",
        }
    }
}

#[derive(Debug, Deserialize)]
struct AddMagnet {
    id: String,
}

#[derive(Debug, Deserialize)]
pub struct TorrentFile {
    pub id: u32,
    pub path: String,
    pub bytes: u64,
    pub selected: u8,
}

#[derive(Debug, Deserialize)]
pub struct TorrentInfo {
    pub id: String,
    pub status: String,
    #[serde(default)]
    pub files: Vec<TorrentFile>,
    #[serde(default)]
    pub links: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct Unrestricted {
    download: String,
}

#[derive(Clone)]
pub struct RealDebrid {
    http: reqwest::Client,
    api_key: String,
    base: String,
}

impl RealDebrid {
    pub const BASE: &'static str = "https://api.real-debrid.com/rest/1.0";

    pub fn new(http: reqwest::Client, api_key: impl Into<String>) -> Self {
        Self {
            http,
            api_key: api_key.into(),
            base: Self::BASE.into(),
        }
    }

    /// Points the client at another host (tests, mirrors).
    pub fn with_base(mut self, base: impl Into<String>) -> Self {
        self.base = base.into();
        self
    }

    fn req(&self, method: reqwest::Method, path: &str) -> reqwest::RequestBuilder {
        self.http
            .request(method, format!("{}{}", self.base, path))
            .bearer_auth(&self.api_key)
    }

    pub async fn add_magnet(&self, info_hash: &str) -> Result<String> {
        let r: AddMagnet = self
            .req(reqwest::Method::POST, "/torrents/addMagnet")
            .form(&[("magnet", magnet(info_hash))])
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(r.id)
    }

    pub async fn info(&self, id: &str) -> Result<TorrentInfo> {
        Ok(self
            .req(reqwest::Method::GET, &format!("/torrents/info/{id}"))
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?)
    }

    pub async fn select_file(&self, id: &str, file_id: u32) -> Result<()> {
        self.req(
            reqwest::Method::POST,
            &format!("/torrents/selectFiles/{id}"),
        )
        .form(&[("files", file_id.to_string())])
        .send()
        .await?
        .error_for_status()?;
        Ok(())
    }

    pub async fn unrestrict(&self, link: &str) -> Result<String> {
        let r: Unrestricted = self
            .req(reqwest::Method::POST, "/unrestrict/link")
            .form(&[("link", link)])
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(r.download)
    }

    /// Full flow: add magnet, pick the file, wait until ready, return a direct URL.
    /// Gives up after `wait` so the UI can offer the next stream instead of hanging.
    pub async fn resolve(&self, stream: &Stream, wait: Duration) -> Result<String> {
        let hash = stream
            .info_hash
            .as_deref()
            .ok_or_else(|| Error::source("Real-Debrid", "stream has no info hash"))?;
        let id = self.add_magnet(hash).await?;
        let info = self.info(&id).await?;
        let file = pick_file(&info.files, stream.file_idx)
            .ok_or_else(|| Error::source("Real-Debrid", "no video file in torrent"))?;
        self.select_file(&id, file).await?;

        let deadline = tokio::time::Instant::now() + wait;
        loop {
            let info = self.info(&id).await?;
            match info.status.as_str() {
                "downloaded" => {
                    let link = info
                        .links
                        .first()
                        .ok_or_else(|| Error::source("Real-Debrid", "no link"))?;
                    return self.unrestrict(link).await;
                }
                "error" | "dead" | "virus" | "magnet_error" => {
                    return Err(Error::source(
                        "Real-Debrid",
                        format!("torrent {}", info.status),
                    ));
                }
                _ if tokio::time::Instant::now() >= deadline => {
                    return Err(Error::source(
                        "Real-Debrid",
                        "not cached, still downloading",
                    ));
                }
                _ => tokio::time::sleep(Duration::from_millis(750)).await,
            }
        }
    }
}

const VIDEO_EXT: &[&str] = &["mkv", "mp4", "avi", "mov", "m4v", "webm", "ts", "wmv"];

/// Uses the addon's `fileIdx` when valid, otherwise the largest video file.
/// RD file ids are 1-based; Stremio `fileIdx` is 0-based.
pub fn pick_file(files: &[TorrentFile], file_idx: Option<u32>) -> Option<u32> {
    let is_video = |f: &&TorrentFile| {
        f.path
            .rsplit('.')
            .next()
            .is_some_and(|e| VIDEO_EXT.contains(&e.to_ascii_lowercase().as_str()))
    };
    if let Some(idx) = file_idx {
        if let Some(f) = files.iter().find(|f| f.id == idx + 1).filter(is_video) {
            return Some(f.id);
        }
    }
    files
        .iter()
        .filter(is_video)
        .max_by_key(|f| f.bytes)
        .map(|f| f.id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn f(id: u32, path: &str, bytes: u64) -> TorrentFile {
        TorrentFile {
            id,
            path: path.into(),
            bytes,
            selected: 0,
        }
    }

    #[test]
    fn picks_requested_or_largest_video() {
        let files = vec![
            f(1, "/sample.mkv", 10),
            f(2, "/Movie.mkv", 900),
            f(3, "/movie.nfo", 2000),
        ];
        assert_eq!(pick_file(&files, None), Some(2));
        assert_eq!(pick_file(&files, Some(0)), Some(1));
        assert_eq!(
            pick_file(&files, Some(2)),
            Some(2),
            "fileIdx on a non-video falls back"
        );
    }

    #[test]
    fn magnet_is_lowercase() {
        assert_eq!(magnet("ABC"), "magnet:?xt=urn:btih:abc");
    }
}
