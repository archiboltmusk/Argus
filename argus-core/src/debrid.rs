//! Debrid cache verification module for Argus.
//!
//! Provides high-throughput batch cache checking for supported Debrid providers:
//! - Real-Debrid (`/torrents/instantAvailability/{hashes}`)
//! - TorBox (`/torrents/checkcached`)
//! - AllDebrid (`/magnet/instant`)
//! - Premiumize (`/cache/check`)
//! - Debrid-Link (`/seedbox/cached`)
//!
//! Hashes are batched up to 100 per request and dispatched concurrently inside
//! tokio task pools (`tokio::task::JoinSet`) to render stream cards instantly.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Supported debrid providers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DebridProvider {
    #[serde(rename = "rd", alias = "realdebrid", alias = "real-debrid")]
    RealDebrid,
    #[serde(rename = "tb", alias = "torbox")]
    TorBox,
    #[serde(rename = "ad", alias = "alldebrid", alias = "all-debrid")]
    AllDebrid,
    #[serde(rename = "pm", alias = "premiumize")]
    Premiumize,
    #[serde(rename = "dl", alias = "debridlink", alias = "debrid-link")]
    DebridLink,
}

impl DebridProvider {
    /// Return the canonical short slug for the provider.
    pub fn slug(&self) -> &'static str {
        match self {
            Self::RealDebrid => "rd",
            Self::TorBox => "tb",
            Self::AllDebrid => "ad",
            Self::Premiumize => "pm",
            Self::DebridLink => "dl",
        }
    }

    /// Parse a provider slug or name.
    pub fn from_slug(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "rd" | "realdebrid" | "real-debrid" => Some(Self::RealDebrid),
            "tb" | "torbox" => Some(Self::TorBox),
            "ad" | "alldebrid" | "all-debrid" => Some(Self::AllDebrid),
            "pm" | "premiumize" => Some(Self::Premiumize),
            "dl" | "debridlink" | "debrid-link" => Some(Self::DebridLink),
            _ => None,
        }
    }

    /// Maximum number of hashes per batch request allowed by the provider's API.
    pub fn max_batch_size(&self) -> usize {
        match self {
            Self::RealDebrid => 100,
            Self::TorBox => 100,
            Self::AllDebrid => 100,
            Self::Premiumize => 100,
            Self::DebridLink => 100,
        }
    }
}

/// Provider credentials for multi-provider batch checks.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCreds {
    pub provider: DebridProvider,
    pub api_key: String,
}

// ---------------------------------------------------------------------------
// Pure response parsers
// ---------------------------------------------------------------------------

/// Parse Real-Debrid `/torrents/instantAvailability/{hashes}` response.
///
/// Response structure is a map of `{ [hash: string]: { [file_id: string]: [{ filename, filesize }] } }`.
/// A hash is cached if its value contains at least one non-empty file variant array.
pub fn parse_realdebrid_response(
    json: &serde_json::Value,
    requested: &[String],
) -> HashMap<String, bool> {
    let mut out = HashMap::new();
    let requested_set: std::collections::HashSet<String> =
        requested.iter().map(|h| h.to_ascii_lowercase()).collect();

    let Some(map) = json.as_object() else {
        return out;
    };

    for (hash_key, files_val) in map {
        let lk = hash_key.to_ascii_lowercase();
        if !requested_set.contains(&lk) {
            continue;
        }

        let is_cached = if let Some(files_obj) = files_val.as_object() {
            files_obj.values().any(|variant| {
                if let Some(arr) = variant.as_array() {
                    !arr.is_empty()
                } else {
                    variant.is_object()
                }
            })
        } else if let Some(arr) = files_val.as_array() {
            !arr.is_empty()
        } else {
            false
        };

        if is_cached {
            out.insert(lk, true);
        }
    }

    out
}

/// Parse TorBox `/torrents/checkcached` response.
///
/// Supports object format: `{ "success": true, "data": { [hash]: { ... } | true } }`
/// and array format: `{ "success": true, "data": [ { "hash": "..." } ] }`.
pub fn parse_torbox_response(
    json: &serde_json::Value,
    requested: &[String],
) -> HashMap<String, bool> {
    let mut out = HashMap::new();
    let requested_set: std::collections::HashSet<String> =
        requested.iter().map(|h| h.to_ascii_lowercase()).collect();

    let data = json.get("data").unwrap_or(json);

    if let Some(obj) = data.as_object() {
        for (k, v) in obj {
            let lk = k.to_ascii_lowercase();
            let is_cached = match v {
                serde_json::Value::Bool(b) => *b,
                serde_json::Value::Null => false,
                serde_json::Value::Object(inner) => {
                    if let Some(h) = inner.get("hash").and_then(|h| h.as_str()) {
                        let lh = h.to_ascii_lowercase();
                        if requested_set.contains(&lh) {
                            out.insert(lh, true);
                        }
                    }
                    true
                }
                _ => true,
            };
            if is_cached && requested_set.contains(&lk) {
                out.insert(lk, true);
            }
        }
    } else if let Some(arr) = data.as_array() {
        for item in arr {
            if let Some(h) = item.get("hash").and_then(|h| h.as_str()) {
                let lh = h.to_ascii_lowercase();
                if requested_set.contains(&lh) {
                    out.insert(lh, true);
                }
            } else if let Some(s) = item.as_str() {
                let ls = s.to_ascii_lowercase();
                if requested_set.contains(&ls) {
                    out.insert(ls, true);
                }
            }
        }
    }

    out
}

/// Parse AllDebrid `/magnet/instant` response.
///
/// Format: `{ "status": "success", "data": { "magnets": [ { "hash": "...", "instant": true } ] } }`.
pub fn parse_alldebrid_response(
    json: &serde_json::Value,
    requested: &[String],
) -> HashMap<String, bool> {
    let mut out = HashMap::new();
    let requested_set: std::collections::HashSet<String> =
        requested.iter().map(|h| h.to_ascii_lowercase()).collect();

    let magnets = json
        .get("data")
        .and_then(|d| d.get("magnets"))
        .and_then(|m| m.as_array())
        .or_else(|| json.get("magnets").and_then(|m| m.as_array()));

    if let Some(arr) = magnets {
        for item in arr {
            let hash = item.get("hash").and_then(|h| h.as_str());
            let instant = item
                .get("instant")
                .and_then(|i| i.as_bool())
                .unwrap_or(false);
            if let Some(h) = hash {
                let lh = h.to_ascii_lowercase();
                if instant && requested_set.contains(&lh) {
                    out.insert(lh, true);
                }
            }
        }
    }

    out
}

/// Parse Premiumize `/cache/check` response.
///
/// Format: `{ "status": "success", "response": [ true, false, ... ] }`.
/// Results map 1:1 by index to requested hashes.
pub fn parse_premiumize_response(
    json: &serde_json::Value,
    requested: &[String],
) -> HashMap<String, bool> {
    let mut out = HashMap::new();
    if let Some(responses) = json.get("response").and_then(|r| r.as_array()) {
        for (idx, val) in responses.iter().enumerate() {
            if idx < requested.len() && val.as_bool() == Some(true) {
                out.insert(requested[idx].to_ascii_lowercase(), true);
            }
        }
    }
    out
}

/// Parse Debrid-Link `/seedbox/cached` response.
///
/// Format: `{ "success": true, "value": { [hash]: { ... } } }`.
pub fn parse_debridlink_response(
    json: &serde_json::Value,
    requested: &[String],
) -> HashMap<String, bool> {
    let mut out = HashMap::new();
    let requested_set: std::collections::HashSet<String> =
        requested.iter().map(|h| h.to_ascii_lowercase()).collect();

    let value = json.get("value").and_then(|v| v.as_object());
    if let Some(map) = value {
        for (k, v) in map {
            let lk = k.to_ascii_lowercase();
            if requested_set.contains(&lk) && (v.is_object() || v.as_bool() == Some(true)) {
                out.insert(lk, true);
            }
        }
    }
    out
}

// ---------------------------------------------------------------------------
// Native async batch network implementation
// ---------------------------------------------------------------------------

#[cfg(not(target_arch = "wasm32"))]
mod net {
    use super::*;
    use std::time::Duration;

    const REQUEST_TIMEOUT: Duration = Duration::from_secs(12);

    /// Default HTTP client for debrid checks.
    fn default_client() -> reqwest::Client {
        reqwest::Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .user_agent("Argus/1.0 (Debrid Cache Checker)")
            .build()
            .unwrap_or_else(|_| reqwest::Client::new())
    }

    /// Build the HTTP request for a single batch of up to 100 hashes.
    pub fn build_batch_request(
        client: &reqwest::Client,
        provider: DebridProvider,
        api_key: &str,
        batch: &[String],
    ) -> Result<reqwest::RequestBuilder, String> {
        match provider {
            DebridProvider::RealDebrid => {
                let url = format!(
                    "https://api.real-debrid.com/rest/1.0/torrents/instantAvailability/{}",
                    batch.join("/")
                );
                Ok(client
                    .get(&url)
                    .header("Authorization", format!("Bearer {api_key}"))
                    .header("Accept", "application/json"))
            }
            DebridProvider::TorBox => {
                let mut url =
                    reqwest::Url::parse("https://api.torbox.app/v1/api/torrents/checkcached")
                        .map_err(|e| e.to_string())?;
                {
                    let mut q = url.query_pairs_mut();
                    q.append_pair("format", "object");
                    q.append_pair("list_files", "false");
                    for h in batch {
                        q.append_pair("hash", h);
                    }
                }
                Ok(client
                    .get(url)
                    .header("Authorization", format!("Bearer {api_key}"))
                    .header("Accept", "application/json"))
            }
            DebridProvider::AllDebrid => {
                let url = "https://api.alldebrid.com/v4/magnet/instant?agent=Argus";
                let params: Vec<(&str, &str)> =
                    batch.iter().map(|h| ("magnets[]", h.as_str())).collect();
                Ok(client
                    .post(url)
                    .header("Authorization", format!("Bearer {api_key}"))
                    .header("Accept", "application/json")
                    .form(&params))
            }
            DebridProvider::Premiumize => {
                let mut url = reqwest::Url::parse("https://www.premiumize.me/api/cache/check")
                    .map_err(|e| e.to_string())?;
                {
                    let mut q = url.query_pairs_mut();
                    q.append_pair("apikey", api_key);
                    for h in batch {
                        q.append_pair("items[]", h);
                    }
                }
                Ok(client.get(url).header("Accept", "application/json"))
            }
            DebridProvider::DebridLink => {
                let url = format!(
                    "https://debrid-link.com/api/v2/seedbox/cached?url={}",
                    batch.join(",")
                );
                Ok(client
                    .get(&url)
                    .header("Authorization", format!("Bearer {api_key}"))
                    .header("Accept", "application/json"))
            }
        }
    }

    /// Query cache status for a single batch of hashes (up to 100).
    pub async fn check_cache_single_batch(
        client: &reqwest::Client,
        provider: DebridProvider,
        api_key: &str,
        batch: &[String],
    ) -> Result<HashMap<String, bool>, String> {
        if batch.is_empty() {
            return Ok(HashMap::new());
        }

        let req = build_batch_request(client, provider, api_key, batch)?;
        let resp = req
            .send()
            .await
            .map_err(|e| format!("request error: {e}"))?;

        if !resp.status().is_success() {
            return Err(format!("status {}: {}", resp.status(), provider.slug()));
        }

        let json: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("json decode error: {e}"))?;

        let parsed = match provider {
            DebridProvider::RealDebrid => parse_realdebrid_response(&json, batch),
            DebridProvider::TorBox => parse_torbox_response(&json, batch),
            DebridProvider::AllDebrid => parse_alldebrid_response(&json, batch),
            DebridProvider::Premiumize => parse_premiumize_response(&json, batch),
            DebridProvider::DebridLink => parse_debridlink_response(&json, batch),
        };

        Ok(parsed)
    }

    /// Query debrid cache availability for any number of info hashes.
    ///
    /// Chunks hashes into batches of up to 100 hashes and dispatches all batches
    /// concurrently in a tokio task pool (`tokio::task::JoinSet`).
    pub async fn check_cache_provider(
        provider: DebridProvider,
        api_key: &str,
        hashes: &[String],
        client: Option<&reqwest::Client>,
    ) -> HashMap<String, bool> {
        let mut clean_hashes = Vec::new();
        let mut seen = std::collections::HashSet::new();
        for h in hashes {
            let trimmed = h.trim().to_ascii_lowercase();
            if !trimmed.is_empty() && seen.insert(trimmed.clone()) {
                clean_hashes.push(trimmed);
            }
        }

        if clean_hashes.is_empty() || api_key.trim().is_empty() {
            return HashMap::new();
        }

        let owned_client = match client {
            Some(c) => c.clone(),
            None => default_client(),
        };

        let batch_size = provider.max_batch_size();
        let chunks: Vec<Vec<String>> = clean_hashes
            .chunks(batch_size)
            .map(|chunk| chunk.to_vec())
            .collect();

        let mut join_set = tokio::task::JoinSet::new();

        for chunk in chunks {
            let client = owned_client.clone();
            let key = api_key.to_string();
            join_set.spawn(async move {
                check_cache_single_batch(&client, provider, &key, &chunk).await
            });
        }

        let mut merged = HashMap::new();
        while let Some(res) = join_set.join_next().await {
            match res {
                Ok(Ok(batch_map)) => {
                    merged.extend(batch_map);
                }
                Ok(Err(_err)) => {
                    // One batch failure doesn't block the other batches
                }
                Err(_join_err) => {
                    // Task panicked or was cancelled
                }
            }
        }

        merged
    }

    /// Query debrid cache across multiple providers concurrently using tokio tasks.
    ///
    /// Returns `{ [provider_slug]: { [hash]: is_cached } }`.
    pub async fn check_cache_all_providers(
        providers: &[ProviderCreds],
        hashes: &[String],
        client: Option<&reqwest::Client>,
    ) -> HashMap<String, HashMap<String, bool>> {
        if providers.is_empty() || hashes.is_empty() {
            return HashMap::new();
        }

        let owned_client = match client {
            Some(c) => c.clone(),
            None => default_client(),
        };

        let mut join_set = tokio::task::JoinSet::new();

        for cred in providers {
            let client = owned_client.clone();
            let provider = cred.provider;
            let key = cred.api_key.clone();
            let hash_list = hashes.to_vec();
            join_set.spawn(async move {
                let map = check_cache_provider(provider, &key, &hash_list, Some(&client)).await;
                (provider.slug().to_string(), map)
            });
        }

        let mut results = HashMap::new();
        while let Some(res) = join_set.join_next().await {
            if let Ok((slug, map)) = res {
                results.insert(slug, map);
            }
        }

        results
    }
}

#[cfg(not(target_arch = "wasm32"))]
pub use net::*;

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_provider_slugs() {
        assert_eq!(
            DebridProvider::from_slug("rd"),
            Some(DebridProvider::RealDebrid)
        );
        assert_eq!(
            DebridProvider::from_slug("realdebrid"),
            Some(DebridProvider::RealDebrid)
        );
        assert_eq!(
            DebridProvider::from_slug("real-debrid"),
            Some(DebridProvider::RealDebrid)
        );
        assert_eq!(
            DebridProvider::from_slug("tb"),
            Some(DebridProvider::TorBox)
        );
        assert_eq!(
            DebridProvider::from_slug("torbox"),
            Some(DebridProvider::TorBox)
        );
        assert_eq!(
            DebridProvider::from_slug("ad"),
            Some(DebridProvider::AllDebrid)
        );
        assert_eq!(
            DebridProvider::from_slug("alldebrid"),
            Some(DebridProvider::AllDebrid)
        );
        assert_eq!(
            DebridProvider::from_slug("pm"),
            Some(DebridProvider::Premiumize)
        );
        assert_eq!(
            DebridProvider::from_slug("dl"),
            Some(DebridProvider::DebridLink)
        );
        assert_eq!(DebridProvider::from_slug("unknown"), None);
    }

    #[test]
    fn test_parse_realdebrid_response() {
        let h1 = "0123456789abcdef0123456789abcdef01234567".to_string();
        let h2 = "abcdef0123456789abcdef0123456789abcdef01".to_string();
        let h3 = "9999999999999999999999999999999999999999".to_string();

        let json = json!({
            &h1: {
                "rd": [
                    { "filename": "movie.mkv", "filesize": 1500000000u64 }
                ]
            },
            &h2: {}, // empty means uncached
            &h3: {
                "rd": [] // empty array means uncached
            }
        });

        let requested = vec![h1.clone(), h2.clone(), h3.clone()];
        let cached = parse_realdebrid_response(&json, &requested);

        assert_eq!(cached.get(&h1), Some(&true));
        assert_eq!(cached.get(&h2), None);
        assert_eq!(cached.get(&h3), None);
    }

    #[test]
    fn test_parse_torbox_response_object() {
        let h1 = "1111111111111111111111111111111111111111".to_string();
        let h2 = "2222222222222222222222222222222222222222".to_string();

        let json = json!({
            "success": true,
            "data": {
                &h1: { "name": "series.s01e01.mkv", "size": 900000000u64 },
                &h2: false
            }
        });

        let requested = vec![h1.clone(), h2.clone()];
        let cached = parse_torbox_response(&json, &requested);

        assert_eq!(cached.get(&h1), Some(&true));
        assert_eq!(cached.get(&h2), None);
    }

    #[test]
    fn test_parse_alldebrid_response() {
        let h1 = "3333333333333333333333333333333333333333".to_string();
        let h2 = "4444444444444444444444444444444444444444".to_string();

        let json = json!({
            "status": "success",
            "data": {
                "magnets": [
                    { "hash": &h1, "instant": true },
                    { "hash": &h2, "instant": false }
                ]
            }
        });

        let requested = vec![h1.clone(), h2.clone()];
        let cached = parse_alldebrid_response(&json, &requested);

        assert_eq!(cached.get(&h1), Some(&true));
        assert_eq!(cached.get(&h2), None);
    }

    #[test]
    fn test_parse_premiumize_response() {
        let h1 = "5555555555555555555555555555555555555555".to_string();
        let h2 = "6666666666666666666666666666666666666666".to_string();

        let json = json!({
            "status": "success",
            "response": [true, false]
        });

        let requested = vec![h1.clone(), h2.clone()];
        let cached = parse_premiumize_response(&json, &requested);

        assert_eq!(cached.get(&h1), Some(&true));
        assert_eq!(cached.get(&h2), None);
    }

    #[test]
    fn test_parse_debridlink_response() {
        let h1 = "7777777777777777777777777777777777777777".to_string();
        let h2 = "8888888888888888888888888888888888888888".to_string();

        let json = json!({
            "success": true,
            "value": {
                &h1: { "name": "download.mp4" }
            }
        });

        let requested = vec![h1.clone(), h2.clone()];
        let cached = parse_debridlink_response(&json, &requested);

        assert_eq!(cached.get(&h1), Some(&true));
        assert_eq!(cached.get(&h2), None);
    }

    #[tokio::test]
    async fn test_empty_hashes_returns_empty_map() {
        let cached = check_cache_provider(DebridProvider::RealDebrid, "dummy_key", &[], None).await;
        assert!(cached.is_empty());

        let cached_all = check_cache_all_providers(&[], &[], None).await;
        assert!(cached_all.is_empty());
    }

    #[test]
    fn test_batch_sizing_and_deduplication() {
        assert_eq!(DebridProvider::RealDebrid.max_batch_size(), 100);
        assert_eq!(DebridProvider::TorBox.max_batch_size(), 100);
        assert_eq!(DebridProvider::AllDebrid.max_batch_size(), 100);
    }
}
