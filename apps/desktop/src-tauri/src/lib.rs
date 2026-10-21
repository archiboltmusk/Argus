//! Thin Tauri shell: every command forwards to `argus-core`. No business
//! logic here, so mobile and TV shells can reuse the core unchanged.

mod downloads;
mod live;
mod mpv;
mod player;
mod servers;
mod signin;
mod torrent;

use std::time::Duration;

use argus_core::episodes::{self, CalendarEntry};
use argus_core::futures::future::join_all;
use argus_core::library::{Library, LibraryItem, Profile, Progress};
use argus_core::model::{Meta, MetaPreview, Stream};
use argus_core::ranking::{Preferences, RankedStream, StreamInfo};
use argus_core::sources::addon::{Addon, AddonClient};
use argus_core::sources::debrid::{apply_cache, Debrid, Provider};
use serde::Serialize;
use tauri::{Manager, State};
use tauri_plugin_opener::OpenerExt;

pub(crate) struct AppState {
    lib: Library,
    http: argus_core::reqwest::Client,
    addons: AddonClient,
    player: player::Player,
    torrents: torrent::TorrentEngine,
    local: servers::LocalCache,
    live: live::LiveCache,
    downloads: downloads::Downloads,
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
    let (rows, addon_rows) = tokio::join!(servers::rows(&s, profile), join_all(calls));
    let mut rows = rows.unwrap_or_default();
    rows.extend(addon_rows.into_iter().filter(|r| !r.items.is_empty()));
    Ok(rows)
}

/// One page of any addon catalog, with Stremio-style extras (genre, skip).
#[tauri::command]
async fn catalog_page(
    s: State<'_, AppState>,
    profile: i64,
    addon: String,
    kind: String,
    id: String,
    extra: Vec<(String, String)>,
) -> CmdResult<Vec<MetaPreview>> {
    let addons = s.lib.addons(profile).map_err(err)?;
    let a = addons
        .iter()
        .find(|a| a.base_url == addon)
        .ok_or("That addon was removed")?;
    let extra: Vec<(&str, &str)> = extra
        .iter()
        .map(|(k, v)| (k.as_str(), v.as_str()))
        .collect();
    s.addons.catalog(a, &kind, &id, &extra).await.map_err(err)
}

#[tauri::command]
fn watched_videos(s: State<'_, AppState>, profile: i64, item_id: String) -> CmdResult<Vec<String>> {
    s.lib.watched_videos(profile, &item_id).map_err(err)
}

#[tauri::command]
fn set_watched(
    s: State<'_, AppState>,
    profile: i64,
    item_id: String,
    video_ids: Vec<String>,
    watched: bool,
) -> CmdResult<()> {
    for v in &video_ids {
        s.lib
            .set_watched(profile, &item_id, v, watched)
            .map_err(err)?;
    }
    Ok(())
}

#[tauri::command]
async fn search(
    s: State<'_, AppState>,
    profile: i64,
    query: String,
) -> CmdResult<Vec<MetaPreview>> {
    let addons = s.lib.addons(profile).map_err(err)?;
    let query = query.trim();
    let (own, found) = tokio::join!(
        servers::search(&s, profile, query),
        s.addons.search(&addons, query)
    );
    let mut out = own.unwrap_or_default();
    out.extend(found);
    Ok(out)
}

#[tauri::command]
async fn meta(s: State<'_, AppState>, profile: i64, kind: String, id: String) -> CmdResult<Meta> {
    if let Some(m) = servers::meta(&s, profile, &id).await {
        return m;
    }
    let addons = s.lib.addons(profile).map_err(err)?;
    s.addons.meta(&addons, &kind, &id).await.map_err(err)
}

/// First debrid provider the profile has signed in to, in a fixed order.
async fn debrid_for(s: &AppState, profile: i64) -> CmdResult<Option<Debrid>> {
    for p in Provider::ALL {
        if p == Provider::RealDebrid {
            if let Some(token) = signin::realdebrid_token(s, profile).await? {
                return Ok(Some(Debrid::new(p, s.http.clone(), token)));
            }
        }
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
    if let Some(stream) = servers::stream(&s, profile, &id).await {
        let stream = stream?;
        let info = StreamInfo::parse(&stream);
        return Ok(vec![RankedStream {
            stream,
            info,
            score: 0,
        }]);
    }
    let offline = s
        .downloads
        .local_file(&s, profile, &id)
        .await
        .map(|f| Stream {
            name: Some("Downloaded · plays offline".into()),
            url: Some(f.to_string_lossy().into_owned()),
            origin: Some("Downloads".into()),
            ..Default::default()
        });
    let addons = s.lib.addons(profile).map_err(err)?;
    let mut list = s.addons.streams(&addons, &kind, &id).await;
    if let Some(debrid) = debrid_for(&s, profile).await? {
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
    let mut ranked = prefs.rank_for(list, argus_core::trust::Want::from_video_id(&id));
    if let Some(stream) = offline {
        let info = StreamInfo::parse(&stream);
        ranked.insert(
            0,
            RankedStream {
                stream,
                info,
                score: i64::MAX,
            },
        );
    }
    Ok(ranked)
}

/// Turns any stream into a URL a player can open. Torrents go through
/// debrid when the profile has one, otherwise the in-process engine.
#[tauri::command]
async fn resolve_stream(s: State<'_, AppState>, profile: i64, stream: Stream) -> CmdResult<String> {
    resolve(&s, profile, stream).await
}

pub(crate) async fn resolve(s: &AppState, profile: i64, stream: Stream) -> CmdResult<String> {
    if let Some(url) = stream.url.clone().or_else(|| stream.external_url.clone()) {
        return Ok(url);
    }
    if stream.info_hash.is_some() {
        if let Some(debrid) = debrid_for(s, profile).await? {
            return debrid
                .resolve(&stream, Duration::from_secs(20))
                .await
                .map_err(err);
        }
        let prefs = argus_core::torrent::TorrentPrefs::parse(
            s.lib
                .setting(profile, argus_core::torrent::SETTING_KEY)
                .map_err(err)?
                .as_deref(),
        );
        return s.torrents.stream_url(&stream, &prefs).await;
    }
    if let Some(yt) = stream.yt_id {
        return Ok(format!("https://www.youtube.com/watch?v={yt}"));
    }
    Err("This stream has no playable source.".into())
}

/// "Open file / URL / magnet": anything the user pastes or picks becomes a
/// playable URL (magnets go through debrid or the in-process engine).
#[tauri::command]
async fn resolve_input(s: State<'_, AppState>, profile: i64, input: String) -> CmdResult<String> {
    let input = input.trim();
    if input.starts_with("magnet:") {
        let stream = Stream::from_magnet(input).ok_or("That magnet link isn't valid")?;
        return resolve(&s, profile, stream).await;
    }
    if input.starts_with("http://")
        || input.starts_with("https://")
        || input.starts_with("rtmp://")
        || input.starts_with("rtsp://")
        || std::path::Path::new(input).is_absolute()
    {
        return Ok(input.to_string());
    }
    Err("Paste a link, a magnet, or choose a file".into())
}

/// Hands the URL to an external player (spec feature 11), starting at
/// `start` seconds where the player supports it. Empty setting = OS default.
#[tauri::command]
fn play_external(
    app: tauri::AppHandle,
    s: State<'_, AppState>,
    profile: i64,
    url: String,
    start: Option<f64>,
) -> CmdResult<()> {
    let player = s
        .lib
        .setting(profile, SETTING_PLAYER)
        .map_err(err)?
        .filter(|p| !p.trim().is_empty());
    let start = start.unwrap_or(0.0).max(0.0);
    #[cfg(target_os = "macos")]
    if let Some(p) = player.as_deref() {
        let lower = p.to_ascii_lowercase();
        let flag = if lower.contains("iina") {
            Some(format!("--mpv-start=+{start:.0}"))
        } else if lower.contains("vlc") {
            Some(format!("--start-time={start:.0}"))
        } else {
            None
        };
        if lower.contains("infuse") {
            let enc: String = argus_core::reqwest::Url::parse_with_params(
                "infuse://x-callback-url/play",
                &[("url", &url)],
            )
            .map_err(err)?
            .into();
            return app.opener().open_url(enc, None::<&str>).map_err(err);
        }
        let mut cmd = std::process::Command::new("open");
        cmd.args(["-na", p, "--args"]);
        if let Some(f) = flag {
            cmd.arg(f);
        }
        cmd.arg(&url).spawn().map_err(err)?;
        return Ok(());
    }
    let _ = start;
    app.opener().open_url(url, player).map_err(err)
}

#[tauri::command]
fn player_load(
    app: tauri::AppHandle,
    s: State<'_, AppState>,
    url: String,
    start: f64,
    session: player::Session,
) -> CmdResult<()> {
    s.player.load(&app, &url, start, session)
}

#[tauri::command]
fn player_command(
    app: tauri::AppHandle,
    s: State<'_, AppState>,
    command: player::Command,
) -> CmdResult<()> {
    s.player.command(&app, command)
}

#[tauri::command]
fn player_tracks(s: State<'_, AppState>) -> Vec<argus_core::player::Track> {
    s.player.tracks()
}

#[tauri::command]
fn player_clock(s: State<'_, AppState>) -> player::Clock {
    s.player.clock()
}

/// Subtitles from addons for the playing video (spec feature 6).
#[tauri::command]
async fn subtitles(
    s: State<'_, AppState>,
    profile: i64,
    kind: String,
    id: String,
    filename: Option<String>,
) -> CmdResult<Vec<argus_core::model::Subtitle>> {
    let addons = s.lib.addons(profile).map_err(err)?;
    let extra: Vec<(&str, &str)> = filename
        .as_deref()
        .map(|f| vec![("filename", f)])
        .unwrap_or_default();
    Ok(s.addons.subtitles(&addons, &kind, &id, &extra).await)
}

/// Next episode after `video_id`, for auto-queue (spec feature 10).
#[tauri::command]
async fn next_episode(
    s: State<'_, AppState>,
    profile: i64,
    item_id: String,
    video_id: String,
) -> CmdResult<Option<argus_core::model::Video>> {
    let addons = s.lib.addons(profile).map_err(err)?;
    let meta = s
        .addons
        .meta(&addons, "series", &item_id)
        .await
        .map_err(err)?;
    Ok(episodes::next_episode(&meta, &video_id, &episodes::today_utc()).cloned())
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let lib = Library::open(dir.join("argus.db"))?;
            let http = argus_core::http_client();
            app.manage(AppState {
                lib,
                addons: AddonClient::new(http.clone()),
                http,
                player: player::Player::default(),
                local: servers::LocalCache::default(),
                live: live::LiveCache::default(),
                downloads: downloads::Downloads::default(),
                torrents: torrent::TorrentEngine::new(app.path().app_cache_dir()?.join("torrents")),
            });
            #[cfg(target_os = "macos")]
            if let Some(win) = app.get_webview_window("main") {
                // Video view sits behind the transparent webview.
                let content = win.ns_view()?;
                if let Some(view) = unsafe { argus_mac_video::attach_video_view(content) } {
                    app.state::<AppState>().player.set_wid(view as usize);
                }
            }
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
            player_load,
            player_command,
            player_tracks,
            player_clock,
            subtitles,
            next_episode,
            continue_watching,
            save_progress,
            get_setting,
            set_setting,
            signin::signins,
            signin::signin_start,
            signin::signin_poll,
            signin::signout,
            servers::server_status,
            servers::jellyfin_login,
            servers::server_signout,
            servers::set_local_folders,
            live::live_sources,
            live::set_live_sources,
            live::live_channels,
            live::live_guide,
            resolve_input,
            catalog_page,
            watched_videos,
            set_watched,
            player::ytdlp_available,
            downloads::download_start,
            downloads::download_list,
            downloads::download_pause,
            downloads::download_resume,
            downloads::download_remove,
            downloads::download_settings,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Argus")
        .run(|app, event| {
            // Finder "Open With Argus" / double-clicking a video.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                let files: Vec<String> = urls
                    .iter()
                    .filter_map(|u| u.to_file_path().ok())
                    .map(|p| p.to_string_lossy().into_owned())
                    .collect();
                if !files.is_empty() {
                    let _ = tauri::Emitter::emit(app, "open-files", files);
                }
            }
            #[cfg(not(target_os = "macos"))]
            let _ = (app, event);
        });
}
