//! Plex (spec feature 12): PIN sign-in, server discovery, libraries as
//! catalogs, direct-play URLs and two-way watched state.

use serde::Deserialize;

use super::debrid::DeviceCode;
use crate::model::{MediaType, MetaPreview};
use crate::{Error, Result};

const PRODUCT: &str = "Argus";

/// Headers Plex requires on every call. `client_id` is a stable per-install UUID.
fn plex_headers(req: reqwest::RequestBuilder, client_id: &str) -> reqwest::RequestBuilder {
    req.header("Accept", "application/json")
        .header("X-Plex-Product", PRODUCT)
        .header("X-Plex-Client-Identifier", client_id)
}

pub mod auth {
    use super::*;

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Pin {
        id: u64,
        code: String,
        #[serde(default)]
        auth_token: Option<String>,
        #[serde(default)]
        expires_in: Option<u64>,
    }

    pub async fn start(http: &reqwest::Client, client_id: &str) -> Result<DeviceCode> {
        let p: Pin = plex_headers(
            http.post("https://plex.tv/api/v2/pins?strong=true"),
            client_id,
        )
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
        let url = format!(
            "https://app.plex.tv/auth#?clientID={client_id}&code={}&context%5Bdevice%5D%5Bproduct%5D={PRODUCT}",
            p.code
        );
        Ok(DeviceCode {
            device_code: p.id.to_string(),
            user_code: p.code,
            verification_url: url,
            interval_s: 2,
            expires_in_s: p.expires_in.unwrap_or(900),
        })
    }

    pub async fn poll(
        http: &reqwest::Client,
        client_id: &str,
        code: &DeviceCode,
    ) -> Result<Option<String>> {
        let p: Pin = plex_headers(
            http.get(format!("https://plex.tv/api/v2/pins/{}", code.device_code)),
            client_id,
        )
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
        Ok(p.auth_token.filter(|t| !t.is_empty()))
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Resource {
    pub name: String,
    #[serde(default)]
    pub provides: String,
    #[serde(default)]
    pub access_token: Option<String>,
    #[serde(default)]
    pub connections: Vec<Connection>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Connection {
    pub uri: String,
    #[serde(default)]
    pub local: bool,
    #[serde(default)]
    pub relay: bool,
}

impl Resource {
    /// Prefer local, then remote direct, then relay (slowest).
    pub fn best_uri(&self) -> Option<&str> {
        let mut c: Vec<&Connection> = self.connections.iter().collect();
        c.sort_by_key(|c| (c.relay, !c.local));
        c.first().map(|c| c.uri.as_str())
    }
}

pub async fn servers(
    http: &reqwest::Client,
    client_id: &str,
    token: &str,
) -> Result<Vec<Resource>> {
    let all: Vec<Resource> = plex_headers(http.get("https://plex.tv/api/v2/resources"), client_id)
        .query(&[("includeHttps", "1"), ("X-Plex-Token", token)])
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    Ok(all
        .into_iter()
        .filter(|r| r.provides.contains("server"))
        .collect())
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct Container<T> {
    media_container: T,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct Sections {
    #[serde(default)]
    directory: Vec<Section>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Section {
    pub key: String,
    pub title: String,
    #[serde(rename = "type")]
    pub kind: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct Items {
    #[serde(default)]
    metadata: Vec<Item>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub rating_key: String,
    pub title: String,
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub year: Option<u32>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub thumb: Option<String>,
    #[serde(default)]
    pub art: Option<String>,
    #[serde(default)]
    pub view_count: Option<u32>,
    #[serde(default)]
    pub view_offset: Option<u64>,
}

#[derive(Clone)]
pub struct Plex {
    http: reqwest::Client,
    pub server: String,
    token: String,
    client_id: String,
}

impl Plex {
    pub fn new(http: reqwest::Client, server: &str, token: &str, client_id: &str) -> Self {
        Self {
            http,
            server: server.trim_end_matches('/').into(),
            token: token.into(),
            client_id: client_id.into(),
        }
    }

    pub fn item_id(rating_key: &str) -> String {
        format!("plex:{rating_key}")
    }

    fn rating_key(id: &str) -> &str {
        id.strip_prefix("plex:").unwrap_or(id)
    }

    async fn get<T: for<'de> Deserialize<'de>>(
        &self,
        path: &str,
        query: &[(&str, &str)],
    ) -> Result<T> {
        let c: Container<T> = plex_headers(
            self.http.get(format!("{}{}", self.server, path)),
            &self.client_id,
        )
        .header("X-Plex-Token", &self.token)
        .query(query)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
        Ok(c.media_container)
    }

    fn image(&self, path: Option<&str>) -> Option<String> {
        path.map(|p| format!("{}{}?X-Plex-Token={}", self.server, p, self.token))
    }

    fn to_preview(&self, i: Item) -> MetaPreview {
        MetaPreview {
            poster: self.image(i.thumb.as_deref()),
            background: self.image(i.art.as_deref()),
            id: Self::item_id(&i.rating_key),
            kind: if i.kind == "show" {
                MediaType::Series
            } else {
                MediaType::Movie
            },
            name: i.title,
            logo: None,
            description: i.summary,
            release_info: i.year.map(|y| y.to_string()),
            imdb_rating: None,
            genres: vec![],
        }
    }

    /// Movie and show libraries; each becomes a catalog row.
    pub async fn sections(&self) -> Result<Vec<Section>> {
        let s: Sections = self.get("/library/sections", &[]).await?;
        Ok(s.directory
            .into_iter()
            .filter(|d| d.kind == "movie" || d.kind == "show")
            .collect())
    }

    pub async fn section_items(
        &self,
        key: &str,
        start: u32,
        size: u32,
    ) -> Result<Vec<MetaPreview>> {
        let (start, size) = (start.to_string(), size.to_string());
        let i: Items = self
            .get(
                &format!("/library/sections/{key}/all"),
                &[
                    ("X-Plex-Container-Start", &start),
                    ("X-Plex-Container-Size", &size),
                ],
            )
            .await?;
        Ok(i.metadata.into_iter().map(|x| self.to_preview(x)).collect())
    }

    pub async fn search(&self, query: &str) -> Result<Vec<MetaPreview>> {
        let i: Items = self
            .get("/library/search", &[("query", query), ("limit", "50")])
            .await?;
        Ok(i.metadata
            .into_iter()
            .filter(|x| x.kind == "movie" || x.kind == "show")
            .map(|x| self.to_preview(x))
            .collect())
    }

    /// Direct-play URL for a movie/episode's first part.
    pub async fn stream_url(&self, id: &str) -> Result<String> {
        #[derive(Deserialize)]
        #[serde(rename_all = "PascalCase")]
        struct Meta {
            metadata: Vec<WithMedia>,
        }
        #[derive(Deserialize)]
        #[serde(rename_all = "PascalCase")]
        struct WithMedia {
            #[serde(default)]
            media: Vec<Media>,
        }
        #[derive(Deserialize)]
        #[serde(rename_all = "PascalCase")]
        struct Media {
            part: Vec<Part>,
        }
        #[derive(Deserialize)]
        struct Part {
            key: String,
        }
        let m: Meta = self
            .get(&format!("/library/metadata/{}", Self::rating_key(id)), &[])
            .await?;
        let key = m
            .metadata
            .first()
            .and_then(|x| x.media.first())
            .and_then(|x| x.part.first())
            .map(|p| p.key.clone())
            .ok_or_else(|| Error::source("Plex", "item has no playable file"))?;
        Ok(format!(
            "{}{}?X-Plex-Token={}",
            self.server, key, self.token
        ))
    }

    /// Two-way watched state: mark watched / unwatched on the server.
    pub async fn set_watched(&self, id: &str, watched: bool) -> Result<()> {
        let path = if watched {
            "/:/scrobble"
        } else {
            "/:/unscrobble"
        };
        plex_headers(
            self.http.get(format!("{}{}", self.server, path)),
            &self.client_id,
        )
        .header("X-Plex-Token", &self.token)
        .query(&[
            ("key", Self::rating_key(id)),
            ("identifier", "com.plexapp.plugins.library"),
        ])
        .send()
        .await?
        .error_for_status()?;
        Ok(())
    }

    /// Resume point reporting so Plex's own clients see Argus progress.
    pub async fn report_progress(
        &self,
        id: &str,
        position_ms: u64,
        duration_ms: u64,
        state: &str,
    ) -> Result<()> {
        let (pos, dur) = (position_ms.to_string(), duration_ms.to_string());
        plex_headers(
            self.http.get(format!("{}/:/timeline", self.server)),
            &self.client_id,
        )
        .header("X-Plex-Token", &self.token)
        .query(&[
            ("ratingKey", Self::rating_key(id)),
            (
                "key",
                &format!("/library/metadata/{}", Self::rating_key(id)),
            ),
            ("state", state),
            ("time", &pos),
            ("duration", &dur),
        ])
        .send()
        .await?
        .error_for_status()?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefers_local_over_relay() {
        let r: Resource = serde_json::from_value(serde_json::json!({
            "name": "NAS", "provides": "server",
            "connections": [
                {"uri": "https://relay", "local": false, "relay": true},
                {"uri": "https://remote", "local": false, "relay": false},
                {"uri": "https://192-168-1-2.local", "local": true, "relay": false}
            ]
        }))
        .unwrap();
        assert_eq!(r.best_uri(), Some("https://192-168-1-2.local"));
    }

    #[test]
    fn parses_library_items() {
        let c: Container<Items> = serde_json::from_str(
            r#"{"MediaContainer":{"Metadata":[{"ratingKey":"42","title":"Heat","type":"movie","year":1995,"thumb":"/t/42"}]}}"#,
        )
        .unwrap();
        let plex = Plex::new(reqwest::Client::new(), "http://srv:32400/", "tok", "cid");
        let p = plex.to_preview(c.media_container.metadata[0].clone());
        assert_eq!(p.id, "plex:42");
        assert_eq!(
            p.poster.as_deref(),
            Some("http://srv:32400/t/42?X-Plex-Token=tok")
        );
    }
}
