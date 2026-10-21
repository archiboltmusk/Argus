//! Plex, Jellyfin and local folders as first-class sources: their libraries
//! become home rows, show up in search, and play without any addon.

use std::path::PathBuf;

use argus_core::futures::future::join_all;
use argus_core::model::{Meta, MetaPreview, Stream};
use argus_core::sources::jellyfin::Jellyfin;
use argus_core::sources::local;
use argus_core::sources::plex::{self, Plex};
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;

use crate::{err, AppState, CatalogRow, CmdResult};

const PLEX_KEY: &str = "server.plex";
const JELLYFIN_KEY: &str = "server.jellyfin";
const FOLDERS_KEY: &str = "local.folders";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PlexConfig {
    server: String,
    name: String,
    token: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JellyfinConfig {
    server: String,
    user_id: String,
    token: String,
}

/// Scanned local titles, per profile, rebuilt on demand.
#[derive(Default)]
pub struct LocalCache(Mutex<std::collections::HashMap<i64, Vec<Meta>>>);

fn read<T: for<'de> Deserialize<'de>>(
    s: &AppState,
    profile: i64,
    key: &str,
) -> CmdResult<Option<T>> {
    Ok(s.lib
        .setting(profile, key)
        .map_err(err)?
        .filter(|v| !v.is_empty())
        .and_then(|v| serde_json::from_str(&v).ok()))
}

/// Stable per-install id Plex and Jellyfin use to tell devices apart.
pub fn device_id(s: &AppState) -> CmdResult<String> {
    if let Some(id) = s.lib.app_setting("device.id").map_err(err)? {
        return Ok(id);
    }
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let id = format!("argus-{nanos:x}");
    s.lib.set_app_setting("device.id", &id).map_err(err)?;
    Ok(id)
}

fn plex(s: &AppState, profile: i64) -> CmdResult<Option<Plex>> {
    let Some(c) = read::<PlexConfig>(s, profile, PLEX_KEY)? else {
        return Ok(None);
    };
    Ok(Some(Plex::new(
        s.http.clone(),
        &c.server,
        &c.token,
        &device_id(s)?,
    )))
}

fn jellyfin(s: &AppState, profile: i64) -> CmdResult<Option<Jellyfin>> {
    let Some(c) = read::<JellyfinConfig>(s, profile, JELLYFIN_KEY)? else {
        return Ok(None);
    };
    Ok(Some(Jellyfin::new(
        s.http.clone(),
        &c.server,
        &c.user_id,
        &c.token,
    )))
}

/// After Plex PIN sign-in: pick the best server the account can reach.
pub async fn finish_plex_signin(s: &AppState, profile: i64, token: &str) -> CmdResult<()> {
    let servers = plex::servers(&s.http, &device_id(s)?, token)
        .await
        .map_err(err)?;
    let (name, uri) = servers
        .iter()
        .find_map(|r| r.best_uri().map(|u| (r.name.clone(), u.to_string())))
        .ok_or("Signed in, but this Plex account has no server Argus can reach")?;
    let c = PlexConfig {
        server: uri,
        name,
        token: token.into(),
    };
    s.lib
        .set_setting(profile, PLEX_KEY, &serde_json::to_string(&c).map_err(err)?)
        .map_err(err)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerStatus {
    plex: Option<String>,
    jellyfin: Option<String>,
    folders: Vec<String>,
}

#[tauri::command]
pub fn server_status(s: State<'_, AppState>, profile: i64) -> CmdResult<ServerStatus> {
    Ok(ServerStatus {
        plex: read::<PlexConfig>(&s, profile, PLEX_KEY)?.map(|c| c.name),
        jellyfin: read::<JellyfinConfig>(&s, profile, JELLYFIN_KEY)?.map(|c| c.server),
        folders: read(&s, profile, FOLDERS_KEY)?.unwrap_or_default(),
    })
}

#[tauri::command]
pub async fn jellyfin_login(
    s: State<'_, AppState>,
    profile: i64,
    server: String,
    username: String,
    password: String,
) -> CmdResult<()> {
    let server = server.trim().trim_end_matches('/').to_string();
    let (user_id, token) = Jellyfin::login(&s.http, &server, &username, &password, &device_id(&s)?)
        .await
        .map_err(err)?;
    let c = JellyfinConfig {
        server,
        user_id,
        token,
    };
    s.lib
        .set_setting(
            profile,
            JELLYFIN_KEY,
            &serde_json::to_string(&c).map_err(err)?,
        )
        .map_err(err)
}

#[tauri::command]
pub fn server_signout(s: State<'_, AppState>, profile: i64, server: String) -> CmdResult<()> {
    let key = if server == "plex" {
        PLEX_KEY
    } else {
        JELLYFIN_KEY
    };
    s.lib.set_setting(profile, key, "").map_err(err)
}

#[tauri::command]
pub async fn set_local_folders(
    s: State<'_, AppState>,
    profile: i64,
    folders: Vec<String>,
) -> CmdResult<()> {
    s.lib
        .set_setting(
            profile,
            FOLDERS_KEY,
            &serde_json::to_string(&folders).map_err(err)?,
        )
        .map_err(err)?;
    s.local.0.lock().await.remove(&profile);
    Ok(())
}

async fn local_metas(s: &AppState, profile: i64) -> CmdResult<Vec<Meta>> {
    let mut cache = s.local.0.lock().await;
    if let Some(m) = cache.get(&profile) {
        return Ok(m.clone());
    }
    let folders: Vec<String> = read(s, profile, FOLDERS_KEY)?.unwrap_or_default();
    let scans = join_all(folders.into_iter().map(|f| local::scan(PathBuf::from(f)))).await;
    let files: Vec<_> = scans.into_iter().filter_map(Result::ok).flatten().collect();
    let metas = local::to_metas(&files);
    cache.insert(profile, metas.clone());
    Ok(metas)
}

fn row(source: &str, title: &str, id: &str, items: Vec<MetaPreview>) -> CatalogRow {
    CatalogRow {
        addon: source.into(),
        title: title.into(),
        kind: "mixed".into(),
        id: id.into(),
        items,
    }
}

/// Home rows from servers and folders; a failing server just has no rows.
pub async fn rows(s: &AppState, profile: i64) -> CmdResult<Vec<CatalogRow>> {
    let mut out = Vec::new();
    let local = local_metas(s, profile).await?;
    if !local.is_empty() {
        out.push(row(
            "This Mac",
            "On this Mac",
            "local",
            local.into_iter().map(|m| m.preview).collect(),
        ));
    }
    if let Some(j) = jellyfin(s, profile)? {
        if let Ok(items) = j.resume().await {
            out.push(row("Jellyfin", "Continue on Jellyfin", "jf-resume", items));
        }
        if let Ok(items) = j.latest().await {
            out.push(row("Jellyfin", "Recently added", "jf-latest", items));
        }
    }
    if let Some(p) = plex(s, profile)? {
        if let Ok(sections) = p.sections().await {
            let fetched =
                join_all(sections.iter().map(|sec| p.section_items(&sec.key, 0, 40))).await;
            for (sec, items) in sections.iter().zip(fetched) {
                if let Ok(items) = items {
                    out.push(row("Plex", &sec.title, &format!("plex-{}", sec.key), items));
                }
            }
        }
    }
    out.retain(|r| !r.items.is_empty());
    Ok(out)
}

pub async fn search(s: &AppState, profile: i64, query: &str) -> CmdResult<Vec<MetaPreview>> {
    let q = query.to_lowercase();
    let mut out: Vec<MetaPreview> = local_metas(s, profile)
        .await?
        .into_iter()
        .map(|m| m.preview)
        .filter(|p| p.name.to_lowercase().contains(&q))
        .collect();
    if let Some(p) = plex(s, profile)? {
        out.extend(p.search(query).await.unwrap_or_default());
    }
    if let Some(j) = jellyfin(s, profile)? {
        out.extend(j.search(query).await.unwrap_or_default());
    }
    Ok(out)
}

/// `None` when the id isn't a server or local id.
pub async fn meta(s: &AppState, profile: i64, id: &str) -> Option<CmdResult<Meta>> {
    if id.starts_with("plex:") {
        return Some(match plex(s, profile) {
            Ok(Some(p)) => p.meta(id).await.map_err(err),
            Ok(None) => Err("Sign in to Plex again in Settings".into()),
            Err(e) => Err(e),
        });
    }
    if id.starts_with("jellyfin:") {
        return Some(match jellyfin(s, profile) {
            Ok(Some(j)) => j.meta(id).await.map_err(err),
            Ok(None) => Err("Sign in to Jellyfin again in Settings".into()),
            Err(e) => Err(e),
        });
    }
    if id.starts_with("local:") || id.starts_with("localshow:") {
        return Some(local_metas(s, profile).await.and_then(|all| {
            all.into_iter()
                .find(|m| m.preview.id == id)
                .ok_or_else(|| "This file is no longer in your folders".into())
        }));
    }
    None
}

/// The single direct-play stream for a server or local video id.
pub async fn stream(s: &AppState, profile: i64, id: &str) -> Option<CmdResult<Stream>> {
    let (url, origin) = if let Some(path) = id.strip_prefix("local:") {
        (Ok(path.to_string()), "This Mac")
    } else if id.starts_with("plex:") {
        let url = match plex(s, profile) {
            Ok(Some(p)) => p.stream_url(id).await.map_err(err),
            Ok(None) => Err("Sign in to Plex again in Settings".into()),
            Err(e) => Err(e),
        };
        (url, "Plex")
    } else if id.starts_with("jellyfin:") {
        let url = match jellyfin(s, profile) {
            Ok(Some(j)) => Ok(j.stream_url(id)),
            Ok(None) => Err("Sign in to Jellyfin again in Settings".into()),
            Err(e) => Err(e),
        };
        (url, "Jellyfin")
    } else {
        return None;
    };
    Some(url.map(|url| Stream {
        name: Some(format!("{origin} · original quality")),
        url: Some(url),
        origin: Some(origin.into()),
        ..Default::default()
    }))
}
