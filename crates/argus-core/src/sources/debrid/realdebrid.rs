//! Real-Debrid: https://api.real-debrid.com

use std::time::Duration;

use serde::Deserialize;

use super::{magnet, pick_file, DebridFile, DeviceCode, OAuthToken};
use crate::model::Stream;
use crate::{Error, Result};

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
        let files: Vec<DebridFile> = info
            .files
            .iter()
            .map(|f| DebridFile {
                path: f.path.clone(),
                bytes: f.bytes,
            })
            .collect();
        let pos = pick_file(&files, stream.file_idx)
            .ok_or_else(|| Error::source("Real-Debrid", "no video file in torrent"))?;
        self.select_file(&id, info.files[pos].id).await?;

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

/// Device-code sign-in (spec: "OAuth/device-code sign-in"). Uses Real-Debrid's
/// public client id for open-source apps, so users never paste API keys.
pub mod oauth {
    use super::*;

    const OAUTH: &str = "https://api.real-debrid.com/oauth/v2";
    const OPEN_SOURCE_CLIENT_ID: &str = "X245A4XAIBGVM";

    #[derive(Deserialize)]
    struct Code {
        device_code: String,
        user_code: String,
        interval: u64,
        expires_in: u64,
        verification_url: String,
    }

    #[derive(Deserialize)]
    struct Credentials {
        client_id: String,
        client_secret: String,
    }

    #[derive(Deserialize)]
    struct Token {
        access_token: String,
        refresh_token: String,
        expires_in: i64,
    }

    pub async fn start(http: &reqwest::Client) -> Result<DeviceCode> {
        let c: Code = http
            .get(format!("{OAUTH}/device/code"))
            .query(&[
                ("client_id", OPEN_SOURCE_CLIENT_ID),
                ("new_credentials", "yes"),
            ])
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(DeviceCode {
            device_code: c.device_code,
            user_code: c.user_code,
            verification_url: c.verification_url,
            interval_s: c.interval.max(1),
            expires_in_s: c.expires_in,
        })
    }

    /// One poll. `Ok(None)` while the user hasn't approved yet.
    pub async fn poll(http: &reqwest::Client, code: &DeviceCode) -> Result<Option<OAuthToken>> {
        let resp = http
            .get(format!("{OAUTH}/device/credentials"))
            .query(&[
                ("client_id", OPEN_SOURCE_CLIENT_ID),
                ("code", code.device_code.as_str()),
            ])
            .send()
            .await?;
        if !resp.status().is_success() {
            return Ok(None);
        }
        let creds: Credentials = resp.json().await?;
        exchange(
            http,
            &creds.client_id,
            &creds.client_secret,
            &code.device_code,
        )
        .await
        .map(Some)
    }

    pub async fn refresh(http: &reqwest::Client, token: &OAuthToken) -> Result<OAuthToken> {
        let (id, secret) = (
            token.client_id.as_deref().unwrap_or_default(),
            token.client_secret.as_deref().unwrap_or_default(),
        );
        exchange(http, id, secret, &token.refresh_token).await
    }

    async fn exchange(
        http: &reqwest::Client,
        client_id: &str,
        secret: &str,
        code: &str,
    ) -> Result<OAuthToken> {
        let t: Token = http
            .post(format!("{OAUTH}/token"))
            .form(&[
                ("client_id", client_id),
                ("client_secret", secret),
                ("code", code),
                ("grant_type", "http://oauth.net/grant_type/device/1.0"),
            ])
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(OAuthToken {
            access_token: t.access_token,
            refresh_token: t.refresh_token,
            expires_at: super::super::now() + t.expires_in,
            client_id: Some(client_id.to_string()),
            client_secret: Some(secret.to_string()),
        })
    }
}
