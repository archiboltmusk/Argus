//! Thin Tauri shell: every command forwards to `argus-core`. No business
//! logic here, so mobile and TV shells can reuse the core unchanged.

use std::time::Duration;

use argus_core::episodes::{self, CalendarEntry};
use argus_core::futures::future::join_all;
use argus_core::library::{Library, LibraryItem, Profile, Progress};
use argus_core::model::{Meta, MetaPreview, Stream};
use argus_core::ranking::{Preferences, RankedStream};
use argus_core::sources::addon::{Addon, AddonClient};
use argus_core::sources::debrid::{apply_cache, Debrid, Provider};
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

const SETTING_STREAM_PREFS: &str = "streams.prefs";
const SETTING_PLAYER: &str = "player.external";

#[tauri::command]
fn profiles(s: State<'_, AppState>) -> CmdResult<Vec<Profile>> {
    s.lib.profiles().map_err(err)
}

#[tauri::command]
fn create_profile(s: State<'_, AppState>, name: String, kids: bool) -> CmdResult<Profile> {
    s.lib.create_profile(&name, kids).map_err(err)
}

#[tauri::command]
fn delete_profile(s: State<'_, AppState>, profile: i64) -> CmdResult<()> {
    s.lib.delete_profile(profile).map_err(err)
}

#[tauri::command]
fn rename_profile(s: State<'_, AppState>, profile: i64, name: String) -> CmdResult<()> {
    s.lib.rename_profile(profile, &name).map_err(err)
}

#[tauri::command]
fn set_pin(s: State<'_, AppState>, profile: i64, pin: Option<String>) -> CmdResult<()> {
    s.lib.set_pin(profile, pin.as_deref()).map_err(err)
}

#[tauri::command]
fn check_pin(s: State<'_, AppState>, profile: i64, pin: String) -> CmdResult<bool> {
    s.lib.check_pin(profile, &pin).map_err(err)
}

#[tauri::command]
fn library(s: State<'_, AppState>, profile: i64) -> CmdResult<Vec<LibraryItem>> {
    s.lib.library(profile).map_err(err)
}

#[tauri::command]
fn add_to_library(s: State<'_, AppState>, profile: i64, item: LibraryItem) -> CmdResult<()> {
    s.lib.add_to_library(profile, &item).map_err(err)
}

#[tauri::command]
fn remove_from_library(s: State<'_, AppState>, profile: i64, item_id: String) -> CmdResult<()> {
    s.lib.remove_from_library(profile, &item_id).map_err(err)
}

/// Upcoming and recent episodes for series in the profile's library.
#[tauri::command]
async fn calendar(s: State<'_, AppState>, profile: i64) -> CmdResult<Vec<CalendarEntry>> {
    let addons = s.lib.addons(profile).map_err(err)?;
    let shows: Vec<LibraryItem> = s
        .lib
        .library(profile)
        .map_err(err)?
        .into_iter()
        .filter(|i| i.kind == "series")
        .collect();
    let metas = join_all(
        shows
            .iter()
            .map(|i| s.addons.meta(&addons, "series", &i.item_id)),
    )
    .await;
    let metas: Vec<Meta> = metas.into_iter().filter_map(Result::ok).collect();
    let today = episodes::today_utc();
    let days = argus_core::sources::debrid::now().div_euclid(86_400);
    let from = episodes::days_to_date(days - 7);
    let to = episodes::days_to_date(days + 30);
    debug_assert!(from <= today && today <= to);
    Ok(episodes::calendar(&metas, &from, &to))
}

#[tauri::command]
fn get_app_setting(s: State<'_, AppState>, key: String) -> CmdResult<Option<String>> {
    s.lib.app_setting(&key).map_err(err)
}

#[tauri::command]
fn set_app_setting(s: State<'_, AppState>, key: String, value: String) -> CmdResult<()> {
    s.lib.set_app_setting(&key, &value).map_err(err)
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

/// First debrid provider the profile has signed in to, in a fixed order.
fn debrid_for(s: &AppState, profile: i64) -> CmdResult<Option<Debrid>> {
    for p in Provider::ALL {
        if let Some(key) = s.lib.setting(profile, &p.setting_key()).map_err(err)? {
            if !key.trim().is_empty() {
                return Ok(Some(Debrid::new(p, s.http.clone(), key.trim())));
            }
        }
    }
    Ok(None)
}

/// Streams from all addons, cache-checked on debrid, filtered by the
/// profile's pinned preferences and ranked best-first.
#[tauri::command]
async fn streams(
    s: State<'_, AppState>,
    profile: i64,
    kind: String,
    id: String,
) -> CmdResult<Vec<RankedStream>> {
    let addons = s.lib.addons(profile).map_err(err)?;
    let mut list = s.addons.streams(&addons, &kind, &id).await;
    if let Some(debrid) = debrid_for(&s, profile)? {
        let hashes: Vec<String> = list.iter().filter_map(|x| x.info_hash.clone()).collect();
        // A failed cache check only loses the "instant" badge; never block streams on it.
        if let Ok(cached) = debrid.cache_check(&hashes).await {
            apply_cache(&mut list, &cached, debrid.provider());
        }
    }
    let prefs: Preferences = s
        .lib
        .setting(profile, SETTING_STREAM_PREFS)
        .map_err(err)?
        .and_then(|j| serde_json::from_str(&j).ok())
        .unwrap_or_default();
    Ok(prefs.rank(list))
}

/// Turns any stream into a URL a player can open (debrid for torrents).
#[tauri::command]
async fn resolve_stream(s: State<'_, AppState>, profile: i64, stream: Stream) -> CmdResult<String> {
    if let Some(url) = stream.url.clone().or_else(|| stream.external_url.clone()) {
        return Ok(url);
    }
    if stream.info_hash.is_some() {
        let debrid = debrid_for(&s, profile)?
            .ok_or("Torrent streams need a debrid account. Add one in Settings.")?;
        return debrid
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
            delete_profile,
            rename_profile,
            set_pin,
            check_pin,
            library,
            add_to_library,
            remove_from_library,
            calendar,
            get_app_setting,
            set_app_setting,
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
