//! Jellyfin (and Emby, which shares most of the API). Plex follows the same
//! shape and lands next to this module.

use serde::Deserialize;

use crate::model::{MediaType, Meta, MetaPreview, Video};
use crate::{Error, Result};

#[derive(Debug, Clone)]
pub struct Jellyfin {
    http: reqwest::Client,
    pub server: String,
    pub user_id: String,
    api_key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct ItemsResponse {
    #[serde(default)]
    items: Vec<Item>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct Item {
    id: String,
    name: String,
    #[serde(rename = "Type")]
    kind: String,
    #[serde(default)]
    production_year: Option<u32>,
    #[serde(default)]
    overview: Option<String>,
    #[serde(default)]
    parent_index_number: Option<u32>,
    #[serde(default)]
    index_number: Option<u32>,
    #[serde(default)]
    premiere_date: Option<String>,
}

/// Header Jellyfin wants on unauthenticated calls such as sign-in.
fn client_header(device_id: &str) -> String {
    format!(
        r#"MediaBrowser Client="Argus", Device="Argus", DeviceId="{device_id}", Version="{}""#,
        env!("CARGO_PKG_VERSION")
    )
}

impl Jellyfin {
    pub fn new(http: reqwest::Client, server: &str, user_id: &str, api_key: &str) -> Self {
        Self {
            http,
            server: server.trim_end_matches('/').to_string(),
            user_id: user_id.to_string(),
            api_key: api_key.to_string(),
        }
    }

    /// Username/password sign-in. Returns `(user_id, access_token)`.
    pub async fn login(
        http: &reqwest::Client,
        server: &str,
        username: &str,
        password: &str,
        device_id: &str,
    ) -> Result<(String, String)> {
        #[derive(Deserialize)]
        #[serde(rename_all = "PascalCase")]
        struct Auth {
            user: User,
            access_token: String,
        }
        #[derive(Deserialize)]
        #[serde(rename_all = "PascalCase")]
        struct User {
            id: String,
        }
        let resp = http
            .post(format!(
                "{}/Users/AuthenticateByName",
                server.trim_end_matches('/')
            ))
            .header("X-Emby-Authorization", client_header(device_id))
            .json(&serde_json::json!({ "Username": username, "Pw": password }))
            .send()
            .await?;
        if resp.status() == reqwest::StatusCode::UNAUTHORIZED {
            return Err(Error::source("Jellyfin", "wrong username or password"));
        }
        let a: Auth = resp.error_for_status()?.json().await?;
        Ok((a.user.id, a.access_token))
    }

    /// Ids are namespaced so they never collide with addon ids.
    pub fn item_id(id: &str) -> String {
        format!("jellyfin:{id}")
    }

    fn to_preview(&self, i: Item) -> MetaPreview {
        MetaPreview {
            poster: Some(format!(
                "{}/Items/{}/Images/Primary?maxHeight=450",
                self.server, i.id
            )),
            background: Some(format!("{}/Items/{}/Images/Backdrop", self.server, i.id)),
            id: Self::item_id(&i.id),
            kind: if i.kind == "Series" {
                MediaType::Series
            } else {
                MediaType::Movie
            },
            name: i.name,
            logo: None,
            description: i.overview,
            release_info: i.production_year.map(|y| y.to_string()),
            imdb_rating: None,
            genres: vec![],
        }
    }

    async fn items(&self, path: &str, query: &[(&str, &str)]) -> Result<Vec<MetaPreview>> {
        let resp: ItemsResponse = self
            .http
            .get(format!("{}{}", self.server, path))
            .header("X-Emby-Token", &self.api_key)
            .query(query)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(resp.items.into_iter().map(|i| self.to_preview(i)).collect())
    }

    pub async fn search(&self, term: &str) -> Result<Vec<MetaPreview>> {
        self.items(
            &format!("/Users/{}/Items", self.user_id),
            &[
                ("searchTerm", term),
                ("Recursive", "true"),
                ("IncludeItemTypes", "Movie,Series"),
                ("Limit", "50"),
            ],
        )
        .await
    }

    pub async fn resume(&self) -> Result<Vec<MetaPreview>> {
        self.items(
            &format!("/Users/{}/Items/Resume", self.user_id),
            &[("Limit", "20")],
        )
        .await
    }

    /// Recently added movies and shows, for a home row.
    pub async fn latest(&self) -> Result<Vec<MetaPreview>> {
        self.items(
            &format!("/Users/{}/Items", self.user_id),
            &[
                ("Recursive", "true"),
                ("IncludeItemTypes", "Movie,Series"),
                ("SortBy", "DateCreated"),
                ("SortOrder", "Descending"),
                ("Limit", "40"),
            ],
        )
        .await
    }

    async fn raw_items(&self, path: &str, query: &[(&str, &str)]) -> Result<Vec<Item>> {
        let resp: ItemsResponse = self
            .http
            .get(format!("{}{}", self.server, path))
            .header("X-Emby-Token", &self.api_key)
            .query(query)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(resp.items)
    }

    /// Details for one item; series include their episodes.
    pub async fn meta(&self, id: &str) -> Result<Meta> {
        let raw = id.strip_prefix("jellyfin:").unwrap_or(id);
        let item: Item = self
            .http
            .get(format!(
                "{}/Users/{}/Items/{raw}",
                self.server, self.user_id
            ))
            .header("X-Emby-Token", &self.api_key)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        let is_series = item.kind == "Series";
        let mut meta = Meta {
            preview: self.to_preview(item),
            runtime: None,
            cast: vec![],
            director: vec![],
            videos: vec![],
        };
        if is_series {
            let eps = self
                .raw_items(
                    &format!("/Shows/{raw}/Episodes"),
                    &[("UserId", self.user_id.as_str())],
                )
                .await?;
            meta.videos = eps
                .into_iter()
                .map(|e| Video {
                    thumbnail: Some(format!(
                        "{}/Items/{}/Images/Primary?maxHeight=300",
                        self.server, e.id
                    )),
                    id: Self::item_id(&e.id),
                    title: e.name,
                    released: e.premiere_date,
                    season: e.parent_index_number,
                    episode: e.index_number,
                    number: None,
                    overview: e.overview,
                })
                .collect();
        }
        Ok(meta)
    }

    /// Direct-play URL; the server remuxes only when the player cannot.
    pub fn stream_url(&self, item_id: &str) -> String {
        let raw = item_id.strip_prefix("jellyfin:").unwrap_or(item_id);
        format!(
            "{}/Videos/{}/stream?static=true&api_key={}",
            self.server, raw, self.api_key
        )
    }
}
