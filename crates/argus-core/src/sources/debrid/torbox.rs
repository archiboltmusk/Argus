//! TorBox: https://api.torbox.app (v1). Batch cache check plus the usual
//! create → wait → request-download flow.

use std::collections::HashMap;
use std::time::Duration;

use serde::de::DeserializeOwned;
use serde::Deserialize;

use super::{magnet, pick_file, DebridFile};
use crate::model::Stream;
use crate::{Error, Result};

const BASE: &str = "https://api.torbox.app/v1/api";
const NAME: &str = "TorBox";

#[derive(Deserialize)]
struct Envelope<T> {
    success: bool,
    data: Option<T>,
    detail: Option<String>,
}

fn unwrap<T>(e: Envelope<T>) -> Result<T> {
    match (e.success, e.data) {
        (true, Some(d)) => Ok(d),
        _ => Err(Error::source(
            NAME,
            e.detail.unwrap_or_else(|| "unknown error".into()),
        )),
    }
}

#[derive(Deserialize)]
struct Cached {
    hash: String,
}

#[derive(Deserialize)]
struct Created {
    torrent_id: u64,
}

#[derive(Deserialize)]
struct Torrent {
    #[serde(default)]
    download_finished: bool,
    #[serde(default)]
    download_state: String,
    #[serde(default)]
    files: Vec<TorrentFile>,
}

#[derive(Deserialize)]
struct TorrentFile {
    id: u64,
    name: String,
    size: u64,
}

#[derive(Clone)]
pub struct TorBox {
    http: reqwest::Client,
    api_key: String,
}

impl TorBox {
    pub fn new(http: reqwest::Client, api_key: impl Into<String>) -> Self {
        Self {
            http,
            api_key: api_key.into(),
        }
    }

    async fn get<T: DeserializeOwned>(&self, path: &str, query: &[(&str, &str)]) -> Result<T> {
        let env: Envelope<T> = self
            .http
            .get(format!("{BASE}{path}"))
            .bearer_auth(&self.api_key)
            .query(query)
            .send()
            .await?
            .json()
            .await?;
        unwrap(env)
    }

    pub async fn cache_check(&self, hashes: &[String]) -> Result<HashMap<String, bool>> {
        let mut out: HashMap<String, bool> = hashes
            .iter()
            .map(|h| (h.to_ascii_lowercase(), false))
            .collect();
        for chunk in hashes.chunks(100) {
            let joined = chunk.join(",");
            let cached: Vec<Cached> = self
                .get(
                    "/torrents/checkcached",
                    &[
                        ("hash", &joined),
                        ("format", "list"),
                        ("list_files", "false"),
                    ],
                )
                .await?;
            for c in cached {
                out.insert(c.hash.to_ascii_lowercase(), true);
            }
        }
        Ok(out)
    }

    pub async fn resolve(&self, stream: &Stream, wait: Duration) -> Result<String> {
        let hash = stream
            .info_hash
            .as_deref()
            .ok_or_else(|| Error::source(NAME, "stream has no info hash"))?;
        let form = reqwest::multipart::Form::new().text("magnet", magnet(hash));
        let env: Envelope<Created> = self
            .http
            .post(format!("{BASE}/torrents/createtorrent"))
            .bearer_auth(&self.api_key)
            .multipart(form)
            .send()
            .await?
            .json()
            .await?;
        let id = unwrap(env)?.torrent_id.to_string();

        let deadline = tokio::time::Instant::now() + wait;
        loop {
            let t: Torrent = self
                .get("/torrents/mylist", &[("id", &id), ("bypass_cache", "true")])
                .await?;
            if t.download_finished {
                let files: Vec<DebridFile> = t
                    .files
                    .iter()
                    .map(|f| DebridFile {
                        path: f.name.clone(),
                        bytes: f.size,
                    })
                    .collect();
                let pos = pick_file(&files, stream.file_idx)
                    .ok_or_else(|| Error::source(NAME, "no video file"))?;
                let file_id = t.files[pos].id.to_string();
                return self
                    .get(
                        "/torrents/requestdl",
                        &[
                            ("token", &self.api_key),
                            ("torrent_id", &id),
                            ("file_id", &file_id),
                        ],
                    )
                    .await;
            }
            if t.download_state.starts_with("error") || t.download_state == "failed" {
                return Err(Error::source(NAME, format!("torrent {}", t.download_state)));
            }
            if tokio::time::Instant::now() >= deadline {
                return Err(Error::source(NAME, "not cached, still downloading"));
            }
            tokio::time::sleep(Duration::from_millis(750)).await;
        }
    }
}
