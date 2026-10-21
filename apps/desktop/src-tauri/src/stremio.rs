//! Stremio account import (addon collection, library, Continue Watching).

use argus_core::sources::stremio as api;
use serde::Serialize;
use tauri::State;

use crate::{err, AppState, CmdResult};

const KEY_SETTING: &str = "account.stremio.key";

#[tauri::command]
pub fn stremio_signed_in(s: State<'_, AppState>, profile: i64) -> CmdResult<bool> {
    Ok(s.lib
        .setting(profile, KEY_SETTING)
        .map_err(err)?
        .is_some_and(|k| !k.is_empty()))
}

/// The password goes to Stremio once and is dropped; only the auth key is kept.
#[tauri::command]
pub async fn stremio_login(
    s: State<'_, AppState>,
    profile: i64,
    email: String,
    password: String,
) -> CmdResult<()> {
    let key = api::login(&s.http, &email, &password).await.map_err(err)?;
    s.lib.set_setting(profile, KEY_SETTING, &key).map_err(err)
}

#[tauri::command]
pub fn stremio_logout(s: State<'_, AppState>, profile: i64) -> CmdResult<()> {
    s.lib.set_setting(profile, KEY_SETTING, "").map_err(err)
}

#[derive(Serialize)]
pub struct ImportSummary {
    addons: usize,
    library: usize,
    progress: usize,
}

/// Copies the account's addons, library and unfinished titles into this
/// profile. Existing local progress is never overwritten.
#[tauri::command]
pub async fn stremio_import(s: State<'_, AppState>, profile: i64) -> CmdResult<ImportSummary> {
    let key = s
        .lib
        .setting(profile, KEY_SETTING)
        .map_err(err)?
        .filter(|k| !k.is_empty())
        .ok_or("Sign in to Stremio first")?;

    let have: Vec<String> = s
        .lib
        .addons(profile)
        .map_err(err)?
        .into_iter()
        .map(|a| a.base_url)
        .collect();
    let mut addons = 0;
    for url in api::addon_urls(&s.http, &key).await.map_err(err)? {
        let Ok(addon) = s.addons.install(&url).await else {
            continue;
        };
        if !have.contains(&addon.base_url) {
            s.lib.save_addon(profile, &addon).map_err(err)?;
            addons += 1;
        }
    }

    let imported = api::library(&s.http, &key).await.map_err(err)?;
    for item in &imported.library {
        s.lib.add_to_library(profile, item).map_err(err)?;
    }
    let local: Vec<String> = s
        .lib
        .continue_watching(profile, 200)
        .map_err(err)?
        .into_iter()
        .map(|p| p.item_id)
        .collect();
    let mut progress = 0;
    for p in imported
        .progress
        .iter()
        .filter(|p| !local.contains(&p.item_id))
    {
        s.lib.save_progress(profile, p).map_err(err)?;
        progress += 1;
    }
    Ok(ImportSummary {
        addons,
        library: imported.library.len(),
        progress,
    })
}
