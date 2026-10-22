use crate::video_archive::{extract_video, message, prune_cache};
use std::path::PathBuf;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedVideo {
    path: String,
    name: String,
    bytes: u64,
}

/// Extracts the biggest video from a local archive into the cache and returns its path.
#[tauri::command]
pub async fn archive_extract_video(
    app: tauri::AppHandle,
    path: String,
) -> Result<ExtractedVideo, String> {
    use tauri::Manager;
    let archive = PathBuf::from(path);
    let cache = app
        .path()
        .app_cache_dir()
        .map_err(|_| "Could not find the cache folder.".to_string())?
        .join("video-archives");
    tauri::async_runtime::spawn_blocking(move || {
        prune_cache(&cache, std::time::Duration::from_secs(3 * 24 * 60 * 60));
        extract_video(&archive, &cache)
    })
    .await
    .map_err(|_| "Could not read this archive.".to_string())?
    .map(|video| ExtractedVideo {
        path: video.path.to_string_lossy().into_owned(),
        name: video.name,
        bytes: video.bytes,
    })
    .map_err(|code| message(code))
}
