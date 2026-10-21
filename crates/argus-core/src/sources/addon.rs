//! Stremio addon protocol client (https://github.com/Stremio/stremio-addon-sdk).
//!
//! Requests fan out to every installed addon in parallel with a per-addon
//! deadline, so one slow addon never blocks the stream list.

use std::time::Duration;

use futures::future::join_all;
use serde::{Deserialize, Serialize};
use url::Url;

use crate::model::{Meta, MetaPreview, Stream, Subtitle};
use crate::{Error, Result};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtraProp {
    pub name: String,
    #[serde(default)]
    pub is_required: bool,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub options: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogDef {
    #[serde(rename = "type")]
    pub kind: String,
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub extra: Vec<ExtraProp>,
}

impl CatalogDef {
    pub fn supports_search(&self) -> bool {
        self.extra.iter().any(|e| e.name == "search")
    }

    /// Shown on the home screen: needs no required extra (e.g. search).
    pub fn is_browsable(&self) -> bool {
        !self.extra.iter().any(|e| e.is_required)
    }
}

/// `resources` entries are either a bare name or an object with filters.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ResourceDef {
    Name(String),
    Full {
        name: String,
        #[serde(default)]
        types: Vec<String>,
        #[serde(default, rename = "idPrefixes")]
        id_prefixes: Option<Vec<String>>,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub logo: Option<String>,
    #[serde(default)]
    pub types: Vec<String>,
    #[serde(default)]
    pub catalogs: Vec<CatalogDef>,
    #[serde(default)]
    pub resources: Vec<ResourceDef>,
    #[serde(default)]
    pub id_prefixes: Option<Vec<String>>,
}

impl Manifest {
    /// Whether this addon claims to serve `resource` for `kind` + `id`.
    pub fn handles(&self, resource: &str, kind: &str, id: &str) -> bool {
        let prefix_ok = |prefixes: Option<&Vec<String>>| {
            prefixes.is_none_or(|p| p.iter().any(|pre| id.starts_with(pre.as_str())))
        };
        self.resources.iter().any(|r| match r {
            ResourceDef::Name(n) => {
                n == resource
                    && (self.types.is_empty() || self.types.iter().any(|t| t == kind))
                    && prefix_ok(self.id_prefixes.as_ref())
            }
            ResourceDef::Full {
                name,
                types,
                id_prefixes,
            } => {
                name == resource
                    && (types.is_empty() || types.iter().any(|t| t == kind))
                    && prefix_ok(id_prefixes.as_ref().or(self.id_prefixes.as_ref()))
            }
        })
    }
}

/// An installed addon: its base URL (without `/manifest.json`) plus manifest.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Addon {
    pub base_url: String,
    pub manifest: Manifest,
}

/// Normalise anything a user might paste (`stremio://`, trailing manifest) to a base URL.
pub fn normalize_base_url(input: &str) -> Result<Url> {
    let trimmed = input.trim();
    let with_scheme = match trimmed.strip_prefix("stremio://") {
        Some(rest) => format!("https://{rest}"),
        None => trimmed.to_string(),
    };
    let mut url = Url::parse(&with_scheme)?;
    let path = url
        .path()
        .trim_end_matches('/')
        .trim_end_matches("/manifest.json")
        .to_string();
    url.set_path(&path);
    url.set_query(None);
    url.set_fragment(None);
    Ok(url)
}

/// Builds `{base}/{resource}/{type}/{id}[/{extra}].json` with protocol escaping.
pub fn resource_url(
    base: &str,
    resource: &str,
    kind: &str,
    id: &str,
    extra: &[(&str, &str)],
) -> String {
    let enc = |s: &str| url::form_urlencoded::byte_serialize(s.as_bytes()).collect::<String>();
    let mut out = format!(
        "{}/{}/{}/{}",
        base.trim_end_matches('/'),
        resource,
        enc(kind),
        enc(id)
    );
    if !extra.is_empty() {
        let joined: Vec<String> = extra
            .iter()
            .map(|(k, v)| format!("{}={}", enc(k), enc(v)))
            .collect();
        out.push('/');
        out.push_str(&joined.join("&"));
    }
    out.push_str(".json");
    out
}

/// Items are parsed one by one so a single malformed entry never empties a row.
#[derive(Deserialize)]
struct MetasResponse {
    #[serde(default)]
    metas: Vec<serde_json::Value>,
}

impl MetasResponse {
    fn into_items(self) -> Vec<MetaPreview> {
        self.metas
            .into_iter()
            .filter_map(|v| serde_json::from_value(v).ok())
            .collect()
    }
}

#[derive(Deserialize)]
struct MetaResponse {
    meta: Meta,
}

#[derive(Deserialize)]
struct StreamsResponse {
    #[serde(default)]
    streams: Vec<Stream>,
}

#[derive(Deserialize)]
struct SubtitlesResponse {
    #[serde(default)]
    subtitles: Vec<Subtitle>,
}

#[derive(Clone)]
pub struct AddonClient {
    http: reqwest::Client,
    per_addon_timeout: Duration,
}

impl AddonClient {
    pub fn new(http: reqwest::Client) -> Self {
        Self {
            http,
            per_addon_timeout: Duration::from_secs(6),
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.per_addon_timeout = timeout;
        self
    }

    async fn get_json<T: for<'de> Deserialize<'de>>(&self, url: &str) -> Result<T> {
        let resp = self
            .http
            .get(url)
            .timeout(self.per_addon_timeout)
            .send()
            .await?;
        Ok(resp.error_for_status()?.json().await?)
    }

    /// Fetches and validates a manifest. Use when installing an addon.
    pub async fn install(&self, input: &str) -> Result<Addon> {
        let base_url = normalize_base_url(input)?
            .as_str()
            .trim_end_matches('/')
            .to_string();
        let manifest: Manifest = self.get_json(&format!("{base_url}/manifest.json")).await?;
        Ok(Addon { base_url, manifest })
    }

    pub async fn catalog(
        &self,
        addon: &Addon,
        kind: &str,
        id: &str,
        extra: &[(&str, &str)],
    ) -> Result<Vec<MetaPreview>> {
        let url = resource_url(&addon.base_url, "catalog", kind, id, extra);
        Ok(self.get_json::<MetasResponse>(&url).await?.into_items())
    }

    /// Searches every addon catalog that supports search, merged and de-duplicated by id.
    pub async fn search(&self, addons: &[Addon], query: &str) -> Vec<MetaPreview> {
        let calls = addons.iter().flat_map(|a| {
            a.manifest
                    .catalogs
                    .iter()
                    .filter(|c| c.supports_search())
                    .map(move |c| async move {
                        self.catalog(a, &c.kind, &c.id, &[("search", query)]).await
                    })
        });
        let mut seen = std::collections::HashSet::new();
        join_all(calls)
            .await
            .into_iter()
            .filter_map(Result::ok)
            .flatten()
            .filter(|m| seen.insert(m.id.clone()))
            .collect()
    }

    /// First addon that has metadata for the id wins (install order = priority).
    pub async fn meta(&self, addons: &[Addon], kind: &str, id: &str) -> Result<Meta> {
        let calls = addons
            .iter()
            .filter(|a| a.manifest.handles("meta", kind, id))
            .map(|a| async move {
                self.get_json::<MetaResponse>(&resource_url(&a.base_url, "meta", kind, id, &[]))
                    .await
            });
        join_all(calls)
            .await
            .into_iter()
            .find_map(|r| r.ok().map(|m| m.meta.normalized()))
            .ok_or_else(|| Error::NotFound(format!("{kind}/{id}")))
    }

    /// Subtitles from one addon base URL, for sources that aren't installed.
    pub async fn subtitles_at(
        &self,
        base_url: &str,
        name: &str,
        kind: &str,
        id: &str,
        extra: &[(&str, &str)],
    ) -> Vec<Subtitle> {
        let url = resource_url(base_url, "subtitles", kind, id, extra);
        let subs = self
            .get_json::<SubtitlesResponse>(&url)
            .await
            .map(|r| r.subtitles)
            .unwrap_or_default();
        subs.into_iter()
            .map(|mut s| {
                s.origin = Some(name.to_string());
                s
            })
            .collect()
    }

    /// Subtitles from every capable addon. `extra` may carry `videoHash`,
    /// `videoSize` and `filename` (OpenSubtitles-style matching).
    pub async fn subtitles(
        &self,
        addons: &[Addon],
        kind: &str,
        id: &str,
        extra: &[(&str, &str)],
    ) -> Vec<Subtitle> {
        let calls = addons
            .iter()
            .filter(|a| a.manifest.handles("subtitles", kind, id))
            .map(|a| async move {
                let url = resource_url(&a.base_url, "subtitles", kind, id, extra);
                let subs = self
                    .get_json::<SubtitlesResponse>(&url)
                    .await
                    .map(|r| r.subtitles)
                    .unwrap_or_default();
                subs.into_iter()
                    .map(|mut s| {
                        s.origin = Some(a.manifest.name.clone());
                        s
                    })
                    .collect::<Vec<_>>()
            });
        join_all(calls).await.into_iter().flatten().collect()
    }

    /// Streams from every capable addon in priority order, tagged with origin.
    /// Rank them with [`crate::ranking::Preferences::rank`].
    pub async fn streams(&self, addons: &[Addon], kind: &str, id: &str) -> Vec<Stream> {
        let calls = addons
            .iter()
            .filter(|a| a.manifest.handles("stream", kind, id))
            .map(|a| async move {
                let url = resource_url(&a.base_url, "stream", kind, id, &[]);
                let streams = self
                    .get_json::<StreamsResponse>(&url)
                    .await
                    .map(|r| r.streams)
                    .unwrap_or_default();
                streams
                    .into_iter()
                    .map(|mut s| {
                        s.origin = Some(a.manifest.name.clone());
                        s
                    })
                    .collect::<Vec<_>>()
            });
        join_all(calls).await.into_iter().flatten().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const CINEMETA: &str = include_str!("../../tests/fixtures/cinemeta_manifest.json");

    #[test]
    fn normalizes_pasted_urls() {
        let u = normalize_base_url("stremio://v3-cinemeta.strem.io/manifest.json").unwrap();
        assert_eq!(u.as_str(), "https://v3-cinemeta.strem.io/");
        let u = normalize_base_url(" https://a.b/cfg123/manifest.json?x=1 ").unwrap();
        assert_eq!(u.as_str(), "https://a.b/cfg123");
    }

    #[test]
    fn builds_resource_urls() {
        assert_eq!(
            resource_url("https://a.b/", "stream", "series", "tt1:1:2", &[]),
            "https://a.b/stream/series/tt1%3A1%3A2.json"
        );
        assert_eq!(
            resource_url(
                "https://a.b",
                "catalog",
                "movie",
                "top",
                &[("search", "the matrix")]
            ),
            "https://a.b/catalog/movie/top/search=the+matrix.json"
        );
    }

    #[test]
    fn parses_manifest_and_routes_resources() {
        let m: Manifest = serde_json::from_str(CINEMETA).unwrap();
        assert!(m.handles("meta", "movie", "tt0133093"));
        assert!(!m.handles("meta", "movie", "kitsu:1"));
        assert!(!m.handles("stream", "movie", "tt0133093"));
        assert!(m.catalogs.iter().any(CatalogDef::supports_search));
        assert!(m.catalogs.iter().any(CatalogDef::is_browsable));
    }
}
