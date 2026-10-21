//! Premiumize: https://www.premiumize.me/api. Supports batch cache checks and
//! instant `directdl` for cached torrents.

use std::collections::HashMap;

use serde::Deserialize;

use super::{magnet, pick_file, DebridFile};
use crate::model::Stream;
use crate::{Error, Result};

const BASE: &str = "https://www.premiumize.me/api";
const NAME: &str = "Premiumize";

#[derive(Deserialize)]
struct CacheCheck {
    status: String,
    #[serde(default)]
    response: Vec<bool>,
    message: Option<String>,
}

#[derive(Deserialize)]
struct DirectDl {
    status: String,
    #[serde(default)]
    content: Vec<Content>,
    message: Option<String>,
}

#[derive(Deserialize)]
struct Content {
    path: String,
    size: u64,
    link: String,
    #[serde(default)]
    stream_link: Option<String>,
}

#[derive(Clone)]
pub struct Premiumize {
    http: reqwest::Client,
    api_key: String,
}

impl Premiumize {
    pub fn new(http: reqwest::Client, api_key: impl Into<String>) -> Self {
        Self {
            http,
            api_key: api_key.into(),
        }
    }

    /// One request for up to ~100 hashes; chunked beyond that.
    pub async fn cache_check(&self, hashes: &[String]) -> Result<HashMap<String, bool>> {
        let mut out = HashMap::new();
        for chunk in hashes.chunks(100) {
            let mut query: Vec<(&str, &str)> = vec![("apikey", &self.api_key)];
            query.extend(chunk.iter().map(|h| ("items[]", h.as_str())));
            let r: CacheCheck = self
                .http
                .get(format!("{BASE}/cache/check"))
                .query(&query)
                .send()
                .await?
                .json()
                .await?;
            if r.status != "success" {
                return Err(Error::source(NAME, r.message.unwrap_or_default()));
            }
            out.extend(chunk.iter().map(|h| h.to_ascii_lowercase()).zip(r.response));
        }
        Ok(out)
    }

    /// Works only for cached torrents; uncached ones error out quickly so the
    /// player can move to the next stream.
    pub async fn resolve(&self, stream: &Stream) -> Result<String> {
        let hash = stream
            .info_hash
            .as_deref()
            .ok_or_else(|| Error::source(NAME, "stream has no info hash"))?;
        let r: DirectDl = self
            .http
            .post(format!("{BASE}/transfer/directdl"))
            .query(&[("apikey", &self.api_key)])
            .form(&[("src", magnet(hash))])
            .send()
            .await?
            .json()
            .await?;
        if r.status != "success" {
            return Err(Error::source(
                NAME,
                r.message.unwrap_or_else(|| "not cached".into()),
            ));
        }
        let files: Vec<DebridFile> = r
            .content
            .iter()
            .map(|c| DebridFile {
                path: c.path.clone(),
                bytes: c.size,
            })
            .collect();
        let pos = pick_file(&files, stream.file_idx)
            .ok_or_else(|| Error::source(NAME, "no video file"))?;
        // Original file, not the transcoded stream_link: mpv handles every codec.
        let c = &r.content[pos];
        Ok(if c.link.is_empty() {
            c.stream_link.clone().unwrap_or_default()
        } else {
            c.link.clone()
        })
    }
}
