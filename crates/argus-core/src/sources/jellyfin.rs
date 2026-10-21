//! Jellyfin (and Emby, which shares most of the API). Plex follows the same
//! shape and lands next to this module.

use serde::Deserialize;

use crate::model::{MediaType, MetaPreview};
use crate::Result;

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

    /// Direct-play URL; the server remuxes only when the player cannot.
    pub fn stream_url(&self, item_id: &str) -> String {
        let raw = item_id.strip_prefix("jellyfin:").unwrap_or(item_id);
        format!(
            "{}/Videos/{}/stream?static=true&api_key={}",
            self.server, raw, self.api_key
        )
    }
}
