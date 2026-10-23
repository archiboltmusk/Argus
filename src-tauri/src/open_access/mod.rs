//! Opt-in local search over open-access metadata (OAI-PMH repositories such as arXiv and the
//! PubMed Central open set). The user adds each repository; Argus ships none, stores metadata
//! only, and never touches the media engine.

mod oai;
mod store;
mod sync;

use rusqlite::Connection;
use std::collections::HashSet;
use std::sync::Mutex;
use std::time::Duration;
use store::{Hit, Source};
use sync::{from_date, harvest, SyncReport, PAGE_DELAY};
use tauri::Manager;
use url::Url;

const MAX_BODY: usize = 32 * 1024 * 1024;
const RETRY_AFTER_CAP: u64 = 60;
const MAX_RETRIES: usize = 3;

#[derive(Default)]
pub struct OpenAccessState {
    conn: Mutex<Option<Connection>>,
    syncing: Mutex<HashSet<String>>,
}

struct SyncGuard<'a>(&'a OpenAccessState, String);

impl Drop for SyncGuard<'_> {
    fn drop(&mut self) {
        if let Ok(mut syncing) = self.0.syncing.lock() {
            syncing.remove(&self.1);
        }
    }
}

/// Opens the database on first use, so an install that never enables the feature has no file.
fn with_db<T>(
    app: &tauri::AppHandle,
    run: impl FnOnce(&mut Connection) -> rusqlite::Result<T>,
) -> Result<T, String> {
    let state = app.state::<OpenAccessState>();
    let mut guard = state
        .conn
        .lock()
        .map_err(|_| "The index is busy.".to_string())?;
    if guard.is_none() {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|_| "Could not find the data folder.".to_string())?;
        std::fs::create_dir_all(&dir)
            .map_err(|_| "Could not create the data folder.".to_string())?;
        let conn = Connection::open(dir.join("open_access_index.db"))
            .map_err(|_| "Could not open the index.".to_string())?;
        store::open(&conn).map_err(|_| "Could not prepare the index.".to_string())?;
        *guard = Some(conn);
    }
    let conn = guard
        .as_mut()
        .ok_or_else(|| "The index is unavailable.".to_string())?;
    run(conn).map_err(|_| "The index could not be read.".to_string())
}

async fn blocking_db<T: Send + 'static>(
    app: &tauri::AppHandle,
    run: impl FnOnce(&mut Connection) -> rusqlite::Result<T> + Send + 'static,
) -> Result<T, String> {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || with_db(&app, run))
        .await
        .map_err(|_| "The index is unavailable.".to_string())?
}

async fn fetch_text(client: &reqwest::Client, url: Url) -> Result<String, String> {
    for attempt in 0..=MAX_RETRIES {
        let mut response = client
            .get(url.clone())
            .header(reqwest::header::ACCEPT, "text/xml, application/xml")
            .send()
            .await
            .map_err(|_| "Could not reach this repository.".to_string())?;
        let status = response.status();
        if status.as_u16() == 503 && attempt < MAX_RETRIES {
            let wait = response
                .headers()
                .get(reqwest::header::RETRY_AFTER)
                .and_then(|value| value.to_str().ok())
                .and_then(|value| value.trim().parse::<u64>().ok())
                .unwrap_or(5)
                .clamp(1, RETRY_AFTER_CAP);
            tokio::time::sleep(Duration::from_secs(wait)).await;
            continue;
        }
        if !status.is_success() {
            return Err(format!(
                "The repository answered with HTTP {}.",
                status.as_u16()
            ));
        }
        let mut body = Vec::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|_| "The repository stopped responding.".to_string())?
        {
            if body.len() + chunk.len() > MAX_BODY {
                return Err("The repository sent a page that is too large.".to_string());
            }
            body.extend_from_slice(&chunk);
        }
        return Ok(String::from_utf8_lossy(&body).into_owned());
    }
    Err("The repository is busy. Try again later.".to_string())
}

#[tauri::command]
pub async fn add_oa_source(
    app: tauri::AppHandle,
    name: String,
    url: String,
    protocol: String,
) -> Result<Source, String> {
    if protocol != "oai_pmh" {
        return Err("Only OAI-PMH repositories are supported.".to_string());
    }
    let base = oai::validate_base_url(&url)
        .map_err(|_| "Enter the repository's http(s) OAI-PMH address.".to_string())?;
    let created = blocking_db(&app, move |conn| {
        Ok(store::add_source(conn, &name, base.as_str()))
    })
    .await?;
    created.map_err(|code| match code {
        "name" => "Enter a name of up to 120 characters.".to_string(),
        "duplicate" => "That repository is already added.".to_string(),
        _ => "The index could not be updated.".to_string(),
    })
}

#[tauri::command]
pub async fn list_oa_sources(app: tauri::AppHandle) -> Result<Vec<Source>, String> {
    blocking_db(&app, |conn| store::list_sources(conn)).await
}

#[tauri::command]
pub async fn set_oa_source_enabled(
    app: tauri::AppHandle,
    source_id: String,
    enabled: bool,
) -> Result<(), String> {
    blocking_db(&app, move |conn| {
        store::set_enabled(conn, &source_id, enabled)
    })
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn remove_oa_source(app: tauri::AppHandle, source_id: String) -> Result<(), String> {
    blocking_db(&app, move |conn| store::remove_source(conn, &source_id))
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn sync_oa_source(
    app: tauri::AppHandle,
    source_id: String,
) -> Result<SyncReport, String> {
    let state = app.state::<OpenAccessState>();
    {
        let mut syncing = state
            .syncing
            .lock()
            .map_err(|_| "The index is busy.".to_string())?;
        if !syncing.insert(source_id.clone()) {
            return Err("This repository is already syncing.".to_string());
        }
    }
    let _guard = SyncGuard(&state, source_id.clone());

    let lookup = source_id.clone();
    let source = blocking_db(&app, move |conn| store::get_source(conn, &lookup))
        .await?
        .ok_or_else(|| "That repository no longer exists.".to_string())?;
    if !source.enabled {
        return Err("Turn this repository on before syncing it.".to_string());
    }
    let base = oai::validate_base_url(&source.base_url)
        .map_err(|_| "The saved repository address is invalid.".to_string())?;
    let client = reqwest::Client::builder()
        .user_agent(concat!("Argus/", env!("CARGO_PKG_VERSION")))
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|_| "Could not start the download.".to_string())?;
    let from = from_date(source.last_synced_at.as_deref());

    let (report, server_date) = harvest(
        &base,
        from.as_deref(),
        PAGE_DELAY,
        |url| fetch_text(&client, url),
        |page| {
            let app = app.clone();
            let id = source_id.clone();
            async move {
                blocking_db(&app, move |conn| {
                    store::apply_page(conn, &id, &page.records, &page.deleted)
                })
                .await
            }
        },
    )
    .await?;

    if report.complete {
        if let Some(date) = server_date {
            let id = source_id.clone();
            blocking_db(&app, move |conn| store::mark_synced(conn, &id, &date)).await?;
        }
    }
    Ok(report)
}

#[tauri::command]
pub async fn search_open_access(
    app: tauri::AppHandle,
    query: String,
    filter_type: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<Hit>, String> {
    blocking_db(&app, move |conn| {
        store::search(conn, &query, filter_type.as_deref(), limit.unwrap_or(25))
    })
    .await
}
