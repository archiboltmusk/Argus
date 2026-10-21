//! Stremio account import: the user's addon collection, library and
//! Continue Watching. The password is used once to obtain an auth key and is
//! never stored; only the key is kept, and signing out forgets it.

use serde::Deserialize;
use serde_json::{json, Value};

use crate::library::{LibraryItem, Progress};
use crate::{Error, Result};

const API: &str = "https://api.strem.io/api";

async fn call(http: &reqwest::Client, method: &str, body: Value) -> Result<Value> {
    let v: Value = http
        .post(format!("{API}/{method}"))
        .json(&body)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    if let Some(msg) = v.pointer("/error/message").and_then(Value::as_str) {
        return Err(Error::source("Stremio", msg.to_string()));
    }
    Ok(v.get("result").cloned().unwrap_or(Value::Null))
}

/// Exchanges email and password for an auth key.
pub async fn login(http: &reqwest::Client, email: &str, password: &str) -> Result<String> {
    let r = call(
        http,
        "login",
        json!({ "type": "Login", "email": email.trim(), "password": password, "facebook": false }),
    )
    .await?;
    r.get("authKey")
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| Error::source("Stremio", "no auth key in the response".to_string()))
}

/// Addon manifest URLs from the account's collection.
pub async fn addon_urls(http: &reqwest::Client, auth_key: &str) -> Result<Vec<String>> {
    let r = call(
        http,
        "addonCollectionGet",
        json!({ "type": "AddonCollectionGet", "authKey": auth_key, "update": true }),
    )
    .await?;
    Ok(parse_addon_urls(&r))
}

pub fn parse_addon_urls(result: &Value) -> Vec<String> {
    result
        .get("addons")
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(|x| x.get("transportUrl")?.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

#[derive(Debug, Default)]
pub struct Imported {
    pub library: Vec<LibraryItem>,
    pub progress: Vec<Progress>,
}

pub async fn library(http: &reqwest::Client, auth_key: &str) -> Result<Imported> {
    let r = call(
        http,
        "datastoreGet",
        json!({ "authKey": auth_key, "collection": "libraryItem", "ids": [], "all": true }),
    )
    .await?;
    Ok(parse_library(&r))
}

#[derive(Deserialize)]
struct Item {
    #[serde(rename = "_id")]
    id: String,
    #[serde(default)]
    name: String,
    #[serde(default, rename = "type")]
    kind: String,
    #[serde(default)]
    poster: Option<String>,
    #[serde(default)]
    removed: bool,
    #[serde(default)]
    temp: bool,
    #[serde(default)]
    state: State,
}

#[derive(Deserialize, Default)]
struct State {
    #[serde(default)]
    video_id: Option<String>,
    #[serde(default, rename = "timeOffset")]
    time_offset: f64,
    #[serde(default)]
    duration: f64,
}

pub fn parse_library(result: &Value) -> Imported {
    let mut out = Imported::default();
    let Some(list) = result.as_array() else {
        return out;
    };
    for raw in list {
        let Ok(it) = serde_json::from_value::<Item>(raw.clone()) else {
            continue;
        };
        // `removed` is the user's delete; `temp` is just a viewing history entry.
        if it.removed || (it.temp && it.state.time_offset <= 0.0) || it.name.is_empty() {
            continue;
        }
        if !it.temp {
            out.library.push(LibraryItem {
                item_id: it.id.clone(),
                kind: it.kind.clone(),
                name: it.name.clone(),
                poster: it.poster.clone(),
                added_at: 0,
            });
        }
        // Stremio stores milliseconds; unfinished items become Continue Watching.
        if it.state.time_offset > 0.0 && it.state.duration > 0.0 {
            let frac = it.state.time_offset / it.state.duration;
            if frac < 0.92 {
                out.progress.push(Progress {
                    video_id: it.state.video_id.clone().unwrap_or_else(|| it.id.clone()),
                    item_id: it.id,
                    kind: it.kind,
                    name: it.name,
                    poster: it.poster,
                    position_s: it.state.time_offset / 1000.0,
                    duration_s: it.state.duration / 1000.0,
                    updated_at: 0,
                });
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_addon_collection() {
        let r = json!({"addons": [{"transportUrl": "https://a.example/manifest.json"}, {"x": 1}]});
        assert_eq!(parse_addon_urls(&r), ["https://a.example/manifest.json"]);
    }

    #[test]
    fn imports_library_and_unfinished_progress() {
        let r = json!([
            {"_id": "tt1", "name": "Heat", "type": "movie", "poster": "p", "removed": false, "temp": false,
             "state": {"video_id": "tt1", "timeOffset": 600000.0, "duration": 6000000.0}},
            {"_id": "tt2", "name": "Gone", "type": "movie", "removed": true},
            {"_id": "tt3", "name": "Seen", "type": "movie", "temp": false,
             "state": {"timeOffset": 5900000.0, "duration": 6000000.0}},
            {"_id": "tt4", "name": "Peeked", "type": "series", "temp": true, "state": {}}
        ]);
        let i = parse_library(&r);
        assert_eq!(i.library.len(), 2);
        assert_eq!(i.progress.len(), 1);
        assert_eq!(i.progress[0].position_s, 600.0);
    }
}
