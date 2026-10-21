//! Offline downloads: a small queue on top of `argus_core::downloads`.
//! Records persist in the app settings table; the source stream (not its
//! URL) is stored so expired debrid links are re-resolved on resume.
//! Torrents without debrid download through the in-process engine.

use std::collections::HashMap;
use std::path::PathBuf;

use argus_core::downloads::{self, Outcome, PauseHandle};
use argus_core::model::Stream;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::Mutex;

use crate::{err, AppState, CmdResult};

const RECORDS_KEY: &str = "downloads.records";
const DIR_KEY: &str = "downloads.dir";
const CAP_KEY: &str = "downloads.capGb";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DlState {
    Downloading,
    Paused,
    Done,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Record {
    id: String,
    profile: i64,
    item_id: String,
    video_id: String,
    kind: String,
    name: String,
    poster: Option<String>,
    stream: Stream,
    file: PathBuf,
    state: DlState,
    downloaded: u64,
    total: Option<u64>,
    error: Option<String>,
}

#[derive(Default)]
pub struct Downloads {
    records: Mutex<Option<Vec<Record>>>,
    running: Mutex<HashMap<String, PauseHandle>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewDownload {
    item_id: String,
    video_id: String,
    kind: String,
    name: String,
    poster: Option<String>,
}

fn dir(app: &AppHandle) -> CmdResult<PathBuf> {
    let st = app.state::<AppState>();
    if let Some(d) = st
        .lib
        .app_setting(DIR_KEY)
        .map_err(err)?
        .filter(|d| !d.is_empty())
    {
        return Ok(PathBuf::from(d));
    }
    let base = app
        .path()
        .video_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(err)?;
    Ok(base.join("Argus"))
}

fn cap_bytes(st: &AppState) -> Option<u64> {
    st.lib
        .app_setting(CAP_KEY)
        .ok()
        .flatten()
        .and_then(|v| v.parse::<f64>().ok())
        .filter(|gb| *gb > 0.0)
        .map(|gb| (gb * 1024.0 * 1024.0 * 1024.0) as u64)
}

/// Filesystem-safe name from a title.
fn safe_name(name: &str) -> String {
    let s: String = name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || " .-_()".contains(c) {
                c
            } else {
                '_'
            }
        })
        .collect();
    s.trim().chars().take(120).collect()
}

impl Downloads {
    async fn with<R>(&self, st: &AppState, f: impl FnOnce(&mut Vec<Record>) -> R) -> CmdResult<R> {
        let mut guard = self.records.lock().await;
        if guard.is_none() {
            let loaded: Vec<Record> = st
                .lib
                .app_setting(RECORDS_KEY)
                .map_err(err)?
                .and_then(|j| serde_json::from_str(&j).ok())
                .unwrap_or_default();
            *guard = Some(loaded);
        }
        let list = guard.as_mut().unwrap();
        let r = f(list);
        st.lib
            .set_app_setting(RECORDS_KEY, &serde_json::to_string(list).map_err(err)?)
            .map_err(err)?;
        Ok(r)
    }

    /// Completed download for a video, if any.
    pub async fn local_file(&self, st: &AppState, profile: i64, video_id: &str) -> Option<PathBuf> {
        self.with(st, |l| {
            l.iter()
                .find(|r| {
                    r.profile == profile && r.video_id == video_id && r.state == DlState::Done
                })
                .map(|r| r.file.clone())
        })
        .await
        .ok()
        .flatten()
        .filter(|f| f.exists())
    }
}

fn spawn(app: AppHandle, id: String) {
    tauri::async_runtime::spawn(async move {
        let st = app.state::<AppState>();
        let Ok(Some(rec)) = st
            .downloads
            .with(&st, |l| l.iter().find(|r| r.id == id).cloned())
            .await
        else {
            return;
        };
        let pause = PauseHandle::default();
        st.downloads
            .running
            .lock()
            .await
            .insert(id.clone(), pause.clone());
        let set = |state: DlState, error: Option<String>| {
            let (app, id) = (app.clone(), id.clone());
            async move {
                let st = app.state::<AppState>();
                let _ = st
                    .downloads
                    .with(&st, |l| {
                        if let Some(r) = l.iter_mut().find(|r| r.id == id) {
                            r.state = state;
                            r.error = error;
                        }
                    })
                    .await;
                let _ = app.emit("downloads://changed", ());
            }
        };
        set(DlState::Downloading, None).await;
        let result = async {
            let url = crate::resolve(&st, rec.profile, rec.stream.clone()).await?;
            let progress_app = app.clone();
            let progress_id = id.clone();
            downloads::download(&st.http, &url, &rec.file, cap_bytes(&st), &pause, move |p| {
                let _ = progress_app.emit(
                    "downloads://progress",
                    serde_json::json!({ "id": progress_id, "downloaded": p.downloaded, "total": p.total }),
                );
            })
            .await
            .map_err(err)
        }
        .await;
        st.downloads.running.lock().await.remove(&id);
        if let Ok(meta) = std::fs::metadata(downloads::part_path(&rec.file))
            .or_else(|_| std::fs::metadata(&rec.file))
        {
            let _ = st
                .downloads
                .with(&st, |l| {
                    if let Some(r) = l.iter_mut().find(|r| r.id == id) {
                        r.downloaded = meta.len();
                        r.total = r.total.or(rec.file.exists().then_some(meta.len()));
                    }
                })
                .await;
        }
        match result {
            Ok(Outcome::Completed) => set(DlState::Done, None).await,
            Ok(Outcome::Paused) => set(DlState::Paused, None).await,
            Err(e) => set(DlState::Failed, Some(e)).await,
        }
    });
}

#[tauri::command]
pub async fn download_start(
    app: AppHandle,
    s: State<'_, AppState>,
    profile: i64,
    item: NewDownload,
    stream: Stream,
) -> CmdResult<()> {
    let ext = stream
        .behavior_hints
        .filename
        .as_deref()
        .and_then(|f| f.rsplit_once('.').map(|(_, e)| e.to_string()))
        .filter(|e| e.len() <= 4)
        .unwrap_or_else(|| "mkv".into());
    let id = format!("{profile}:{}", item.video_id);
    let file = dir(&app)?.join(format!("{}.{ext}", safe_name(&item.name_for_file())));
    let rec = Record {
        id: id.clone(),
        profile,
        item_id: item.item_id,
        video_id: item.video_id,
        kind: item.kind,
        name: item.name,
        poster: item.poster,
        stream,
        file,
        state: DlState::Paused,
        downloaded: 0,
        total: None,
        error: None,
    };
    s.downloads
        .with(&s, |l| {
            l.retain(|r| r.id != id);
            l.push(rec);
        })
        .await?;
    spawn(app, id);
    Ok(())
}

impl NewDownload {
    /// Episodes get their id suffix so files from one show don't collide.
    fn name_for_file(&self) -> String {
        match self.video_id.split_once(':') {
            Some((_, ep)) if self.kind == "series" => {
                format!("{} {}", self.name, ep.replace(':', "x"))
            }
            _ => self.name.clone(),
        }
    }
}

#[tauri::command]
pub async fn download_list(s: State<'_, AppState>, profile: i64) -> CmdResult<Vec<Record>> {
    s.downloads
        .with(&s, |l| {
            l.iter().filter(|r| r.profile == profile).cloned().collect()
        })
        .await
}

#[tauri::command]
pub async fn download_pause(s: State<'_, AppState>, id: String) -> CmdResult<()> {
    if let Some(p) = s.downloads.running.lock().await.get(&id) {
        p.pause();
    }
    Ok(())
}

#[tauri::command]
pub async fn download_resume(app: AppHandle, id: String) -> CmdResult<()> {
    spawn(app, id);
    Ok(())
}

#[tauri::command]
pub async fn download_remove(s: State<'_, AppState>, id: String) -> CmdResult<()> {
    if let Some(p) = s.downloads.running.lock().await.remove(&id) {
        p.pause();
    }
    let removed = s
        .downloads
        .with(&s, |l| {
            let pos = l.iter().position(|r| r.id == id);
            pos.map(|i| l.remove(i))
        })
        .await?;
    if let Some(r) = removed {
        let _ = tokio::fs::remove_file(&r.file).await;
        let _ = tokio::fs::remove_file(downloads::part_path(&r.file)).await;
    }
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadSettings {
    dir: String,
    cap_gb: Option<f64>,
    used_bytes: u64,
}

#[tauri::command]
pub fn download_settings(app: AppHandle, s: State<'_, AppState>) -> CmdResult<DownloadSettings> {
    let d = dir(&app)?;
    Ok(DownloadSettings {
        used_bytes: downloads::used_bytes(&d),
        dir: d.to_string_lossy().into_owned(),
        cap_gb: s
            .lib
            .app_setting(CAP_KEY)
            .map_err(err)?
            .and_then(|v| v.parse().ok()),
    })
}
