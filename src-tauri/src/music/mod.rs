//! Music module: local audio library, tags, covers, lyrics and decoding.
//! Playback itself runs in the webview; this side owns file access and decoding.

pub mod decode;
mod library;

use std::path::{Path, PathBuf};

use base64::Engine;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use library::Track;

fn music_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("music");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn load_index(app: &AppHandle) -> Vec<Track> {
    music_dir(app)
        .ok()
        .and_then(|d| std::fs::read(d.join("index.json")).ok())
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

#[tauri::command]
pub fn music_index(app: AppHandle) -> Vec<Track> {
    load_index(&app)
}

#[derive(Serialize, Clone)]
struct ScanProgress {
    scanned: usize,
}

#[tauri::command]
pub async fn music_scan(app: AppHandle, folders: Vec<String>) -> Result<Vec<Track>, String> {
    let previous = load_index(&app);
    let dir = music_dir(&app)?;
    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let tracks = library::scan(&folders, previous, |scanned| {
            let _ = handle.emit("music://scan", ScanProgress { scanned });
        });
        let json = serde_json::to_vec(&tracks).map_err(|e| e.to_string())?;
        std::fs::write(dir.join("index.json"), json).map_err(|e| e.to_string())?;
        Ok(tracks)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn music_cover(path: String) -> Option<String> {
    tauri::async_runtime::spawn_blocking(move || {
        library::cover_bytes(Path::new(&path)).map(|(bytes, mime)| {
            format!(
                "data:{mime};base64,{}",
                base64::engine::general_purpose::STANDARD.encode(bytes)
            )
        })
    })
    .await
    .ok()
    .flatten()
}

fn lyrics_cache(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
    if !id.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("invalid track id".into());
    }
    let dir = music_dir(app)?.join("lyrics");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{id}.lrc")))
}

#[tauri::command]
pub async fn music_lyrics(app: AppHandle, path: String, id: String) -> Option<String> {
    let cached = lyrics_cache(&app, &id).ok();
    tauri::async_runtime::spawn_blocking(move || {
        library::lyrics_text(Path::new(&path))
            .or_else(|| cached.and_then(|p| std::fs::read_to_string(p).ok()))
    })
    .await
    .ok()
    .flatten()
}

#[tauri::command]
pub fn music_lyrics_store(app: AppHandle, id: String, text: String) -> Result<(), String> {
    std::fs::write(lyrics_cache(&app, &id)?, text).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn music_peaks(path: String, buckets: usize) -> Result<Vec<f32>, String> {
    tauri::async_runtime::spawn_blocking(move || decode::peaks(Path::new(&path), buckets.min(4096)))
        .await
        .map_err(|e| e.to_string())?
}

/// Returns a path the webview can play: the file itself, or a decoded WAV
/// copy for formats the webview cannot handle (e.g. Ogg Vorbis on WebKit).
#[tauri::command]
pub async fn music_playable_path(
    app: AppHandle,
    path: String,
    id: String,
) -> Result<String, String> {
    let dir = music_dir(&app)?.join("wav");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let out = dir.join(format!("{id}.wav"));
    tauri::async_runtime::spawn_blocking(move || {
        if !out.is_file() {
            let decoded = decode::decode_file(Path::new(&path), 0, None)?;
            decode::write_wav(&decoded, &out)?;
        }
        Ok(out.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
