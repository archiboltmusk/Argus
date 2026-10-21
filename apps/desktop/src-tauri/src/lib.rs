//! Thin Tauri shell: every command forwards to `argus-core`. No business
//! logic here, so mobile and TV shells can reuse the core unchanged.

use std::time::Duration;

use argus_core::futures::future::join_all;
use argus_core::library::{Library, Profile, Progress};
use argus_core::model::{Meta, MetaPreview, Stream};
use argus_core::sources::addon::{Addon, AddonClient};
use argus_core::sources::debrid::RealDebrid;
use serde::Serialize;
use tauri::{Manager, State};
use tauri_plugin_opener::OpenerExt;

struct AppState {
    lib: Library,
    http: argus_core::reqwest::Client,
    addons: AddonClient,
}

/// Commands return strings as errors so the UI can show them directly.
type CmdResult<T> = Result<T, String>;

fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CatalogRow {
    addon: String,
    title: String,
    kind: String,
    id: String,
    items: Vec<MetaPreview>,
}

const SETTING_RD_KEY: &str = "debrid.realdebrid.key";
const SETTING_PLAYER: &str = "player.external";

#[tauri::command]
fn profiles(s: State<'_, AppState>) -> CmdResult<Vec<Profile>> {
    s.lib.profiles().map_err(err)
}

#[tauri::command]
fn create_profile(s: State<'_, AppState>, name: String) -> CmdResult<Profile> {
    s.lib.create_profile(name.trim()).map_err(err)
}

#[tauri::command]
fn addons(s: State<'_, AppState>, profile: i64) -> CmdResult<Vec<Addon>> {
    s.lib.addons(profile).map_err(err)
}

#[tauri::command]
async fn install_addon(s: State<'_, AppState>, profile: i64, url: String) -> CmdResult<Addon> {
    let addon = s.addons.install(&url).await.map_err(err)?;
    s.lib.save_addon(profile, &addon).map_err(err)?;
    Ok(addon)
}

#[tauri::command]
fn remove_addon(s: State<'_, AppState>, profile: i64, base_url: String) -> CmdResult<()> {
    s.lib.remove_addon(profile, &base_url).map_err(err)
}

#[tauri::command]
fn reorder_addons(s: State<'_, AppState>, profile: i64, base_urls: Vec<String>) -> CmdResult<()> {
    s.lib.reorder_addons(profile, &base_urls).map_err(err)
}

/// First page of every browsable catalog, fetched in parallel. Empty or
/// failing catalogs are dropped instead of showing broken rows.
#[tauri::command]
async fn home_rows(s: State<'_, AppState>, profile: i64) -> CmdResult<Vec<CatalogRow>> {
    let addons = s.lib.addons(profile).map_err(err)?;
    let client = &s.addons;
    let calls = addons.iter().flat_map(|a| {
        a.manifest
            .catalogs
            .iter()
            .filter(|c| c.is_browsable())
            .map(move |c| async move {
                let items = client
                    .catalog(a, &c.kind, &c.id, &[])
                    .await
                    .unwrap_or_default();
                CatalogRow {
                    addon: a.manifest.name.clone(),
                    title: c.name.clone().unwrap_or_else(|| c.id.clone()),
                    kind: c.kind.clone(),
                    id: c.id.clone(),
                    items,
                }
            })
    });
    Ok(join_all(calls)
        .await
        .into_iter()
        .filter(|r| !r.items.is_empty())
        .collect())
}

#[tauri::command]
async fn search(
    s: State<'_, AppState>,
    profile: i64,
    query: String,
) -> CmdResult<Vec<MetaPreview>> {
    let addons = s.lib.addons(profile).map_err(err)?;
    Ok(s.addons.search(&addons, query.trim()).await)
}

#[tauri::command]
async fn meta(s: State<'_, AppState>, profile: i64, kind: String, id: String) -> CmdResult<Meta> {
    let addons = s.lib.addons(profile).map_err(err)?;
    s.addons.meta(&addons, &kind, &id).await.map_err(err)
}

#[tauri::command]
async fn streams(
    s: State<'_, AppState>,
    profile: i64,
    kind: String,
    id: String,
) -> CmdResult<Vec<Stream>> {
    let addons = s.lib.addons(profile).map_err(err)?;
    Ok(s.addons.streams(&addons, &kind, &id).await)
}

/// Turns any stream into a URL a player can open (debrid for torrents).
#[tauri::command]
async fn resolve_stream(s: State<'_, AppState>, profile: i64, stream: Stream) -> CmdResult<String> {
    if let Some(url) = stream.url.clone().or_else(|| stream.external_url.clone()) {
        return Ok(url);
    }
    if stream.info_hash.is_some() {
        let key = s.lib.setting(profile, SETTING_RD_KEY).map_err(err)?.ok_or(
            "Torrent streams need a debrid account. Add your Real-Debrid key in Settings.",
        )?;
        return RealDebrid::new(s.http.clone(), key)
            .resolve(&stream, Duration::from_secs(20))
            .await
            .map_err(err);
    }
    if let Some(yt) = stream.yt_id {
        return Ok(format!("https://www.youtube.com/watch?v={yt}"));
    }
    Err("This stream has no playable source.".into())
}

/// Hands the URL to the user's chosen player (IINA, VLC...) or the OS default.
/// The built-in libmpv player replaces this as the default in a later step.
#[tauri::command]
fn play_external(
    app: tauri::AppHandle,
    s: State<'_, AppState>,
    profile: i64,
    url: String,
) -> CmdResult<()> {
    let player = s
        .lib
        .setting(profile, SETTING_PLAYER)
        .map_err(err)?
        .filter(|p| !p.is_empty());
    app.opener().open_url(url, player).map_err(err)
}

#[tauri::command]
fn continue_watching(s: State<'_, AppState>, profile: i64) -> CmdResult<Vec<Progress>> {
    s.lib.continue_watching(profile, 20).map_err(err)
}

#[tauri::command]
fn save_progress(s: State<'_, AppState>, profile: i64, progress: Progress) -> CmdResult<()> {
    s.lib.save_progress(profile, &progress).map_err(err)
}

#[tauri::command]
fn get_setting(s: State<'_, AppState>, profile: i64, key: String) -> CmdResult<Option<String>> {
    s.lib.setting(profile, &key).map_err(err)
}

#[tauri::command]
fn set_setting(s: State<'_, AppState>, profile: i64, key: String, value: String) -> CmdResult<()> {
    s.lib.set_setting(profile, &key, &value).map_err(err)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let lib = Library::open(dir.join("argus.db"))?;
            let http = argus_core::http_client();
            app.manage(AppState {
                lib,
                addons: AddonClient::new(http.clone()),
                http,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            profiles,
            create_profile,
            addons,
            install_addon,
            remove_addon,
            reorder_addons,
            home_rows,
            search,
            meta,
            streams,
            resolve_stream,
            play_external,
            continue_watching,
            save_progress,
            get_setting,
            set_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Argus");
}
