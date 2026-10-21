//! AllDebrid: https://docs.alldebrid.com (API v4). Responses are wrapped in
//! `{"status": "success"|"error", "data": …, "error": {"message": …}}`.

use std::time::Duration;

use serde::de::DeserializeOwned;
use serde::Deserialize;

use super::{magnet, pick_file, DebridFile, DeviceCode};
use crate::model::Stream;
use crate::{Error, Result};

const BASE: &str = "https://api.alldebrid.com/v4";
const AGENT: &str = "argus";
const NAME: &str = "AllDebrid";

#[derive(Deserialize)]
struct Envelope<T> {
    status: String,
    data: Option<T>,
    error: Option<ApiError>,
}

#[derive(Deserialize)]
struct ApiError {
    message: String,
}

fn unwrap<T>(e: Envelope<T>) -> Result<T> {
    match (e.status.as_str(), e.data) {
        ("success", Some(d)) => Ok(d),
        _ => Err(Error::source(
            NAME,
            e.error
                .map_or_else(|| "unknown error".into(), |e| e.message),
        )),
    }
}

#[derive(Deserialize)]
struct Uploaded {
    magnets: Vec<UploadedMagnet>,
}

#[derive(Deserialize)]
struct UploadedMagnet {
    id: u64,
}

#[derive(Deserialize)]
struct Status {
    magnets: MagnetStatus,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MagnetStatus {
    status_code: u32,
    #[serde(default)]
    links: Vec<MagnetLink>,
}

#[derive(Deserialize)]
struct MagnetLink {
    link: String,
    filename: String,
    size: u64,
}

#[derive(Debug, Deserialize)]
struct Unlocked {
    link: String,
}

#[derive(Clone)]
pub struct AllDebrid {
    http: reqwest::Client,
    api_key: String,
}

impl AllDebrid {
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
            .query(&[("agent", AGENT)])
            .query(query)
            .send()
            .await?
            .json()
            .await?;
        unwrap(env)
    }

    pub async fn resolve(&self, stream: &Stream, wait: Duration) -> Result<String> {
        let hash = stream
            .info_hash
            .as_deref()
            .ok_or_else(|| Error::source(NAME, "stream has no info hash"))?;
        let up: Uploaded = self
            .get("/magnet/upload", &[("magnets[]", &magnet(hash))])
            .await?;
        let id = up
            .magnets
            .first()
            .ok_or_else(|| Error::source(NAME, "upload failed"))?
            .id
            .to_string();

        let deadline = tokio::time::Instant::now() + wait;
        loop {
            let st: Status = self.get("/magnet/status", &[("id", &id)]).await?;
            match st.magnets.status_code {
                // 4 = Ready
                4 => {
                    let files: Vec<DebridFile> = st
                        .magnets
                        .links
                        .iter()
                        .map(|l| DebridFile {
                            path: l.filename.clone(),
                            bytes: l.size,
                        })
                        .collect();
                    let pos = pick_file(&files, stream.file_idx)
                        .ok_or_else(|| Error::source(NAME, "no video file"))?;
                    let u: Unlocked = self
                        .get("/link/unlock", &[("link", &st.magnets.links[pos].link)])
                        .await?;
                    return Ok(u.link);
                }
                // 5..=15 are error states
                5..=15 => {
                    return Err(Error::source(
                        NAME,
                        format!("magnet failed (code {})", st.magnets.status_code),
                    ))
                }
                _ if tokio::time::Instant::now() >= deadline => {
                    return Err(Error::source(NAME, "not cached, still downloading"));
                }
                _ => tokio::time::sleep(Duration::from_millis(750)).await,
            }
        }
    }
}

/// PIN sign-in: user opens the URL and types the PIN; poll returns the API key.
pub mod pin {
    use super::*;

    #[derive(Deserialize)]
    struct Pin {
        pin: String,
        check: String,
        expires_in: u64,
        user_url: String,
    }

    #[derive(Deserialize)]
    struct Check {
        activated: bool,
        apikey: Option<String>,
    }

    pub async fn start(http: &reqwest::Client) -> Result<DeviceCode> {
        let env: Envelope<Pin> = http
            .get(format!("{BASE}/pin/get"))
            .query(&[("agent", AGENT)])
            .send()
            .await?
            .json()
            .await?;
        let p = unwrap(env)?;
        // The check token rides in device_code as "check:pin".
        Ok(DeviceCode {
            device_code: format!("{}:{}", p.check, p.pin),
            user_code: p.pin,
            verification_url: p.user_url,
            interval_s: 5,
            expires_in_s: p.expires_in,
        })
    }

    pub async fn poll(http: &reqwest::Client, code: &DeviceCode) -> Result<Option<String>> {
        let (check, pin) = code
            .device_code
            .split_once(':')
            .ok_or_else(|| Error::source(NAME, "bad pin code"))?;
        let env: Envelope<Check> = http
            .get(format!("{BASE}/pin/check"))
            .query(&[("agent", AGENT), ("check", check), ("pin", pin)])
            .send()
            .await?
            .json()
            .await?;
        let c = unwrap(env)?;
        Ok(c.activated.then_some(c.apikey).flatten())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn envelope_errors_surface_message() {
        let e: Envelope<Unlocked> = serde_json::from_str(
            r#"{"status":"error","error":{"code":"AUTH_BAD_APIKEY","message":"Invalid apikey"}}"#,
        )
        .unwrap();
        assert!(unwrap(e)
            .unwrap_err()
            .to_string()
            .contains("Invalid apikey"));
    }
}
