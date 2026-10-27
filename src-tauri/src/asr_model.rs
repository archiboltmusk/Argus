use futures_util::StreamExt;
use std::io::Write;
use std::path::PathBuf;
use tauri::{Emitter, Manager};

const MIN_VALID_BYTES: u64 = 1_000_000;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct ModelSpec {
    pub id: String,
    pub filename: String,
    pub url: String,
    pub name: String,
    pub description: String,
    pub size_mb: u32,
    pub downloaded: bool,
    pub active: bool,
}

pub fn model_specs() -> &'static [(&'static str, &'static str, &'static str, &'static str, &'static str, u32)] {
    &[
        (
            "tiny",
            "ggml-tiny.bin",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
            "Whisper Tiny (77 MB)",
            "Lightweight & fastest speech recognition. Low RAM usage.",
            77,
        ),
        (
            "base.en",
            "ggml-base.en.bin",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin",
            "Whisper Base English (148 MB)",
            "Crisp English dialogue, strong separation of speech from songs and music.",
            148,
        ),
        (
            "base",
            "ggml-base.bin",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
            "Whisper Base Multilingual (148 MB)",
            "Balanced recognition across 99 languages (Hindi, Bengali, Spanish, French, etc.).",
            148,
        ),
        (
            "small.en",
            "ggml-small.en.bin",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin",
            "Whisper Small English (488 MB)",
            "Studio-grade accuracy for quiet whispers, thick accents, and noisy scenes.",
            488,
        ),
        (
            "small",
            "ggml-small.bin",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
            "Whisper Small Multilingual (488 MB)",
            "Studio-grade multilingual recognition and live audio translation.",
            488,
        ),
    ]
}

fn model_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(base.join("asr"))
}

pub fn active_model_id(app: &tauri::AppHandle) -> String {
    if let Ok(dir) = model_dir(app) {
        let tag = dir.join("active_model.txt");
        if let Ok(content) = std::fs::read_to_string(&tag) {
            let trimmed = content.trim().to_string();
            if model_specs().iter().any(|(id, ..)| *id == trimmed) {
                return trimmed;
            }
        }
        // Default to tiny if already downloaded, else base.en
        if dir.join("ggml-tiny.bin").exists() {
            return "tiny".to_string();
        }
        if dir.join("ggml-base.en.bin").exists() {
            return "base.en".to_string();
        }
    }
    "base.en".to_string()
}

pub fn set_active_model_id(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
    if !model_specs().iter().any(|(m_id, ..)| *m_id == id) {
        return Err(format!("unknown model id: {id}"));
    }
    let dir = model_dir(app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let tag = dir.join("active_model.txt");
    std::fs::write(&tag, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn asr_list_models(app: tauri::AppHandle) -> Result<Vec<ModelSpec>, String> {
    let dir = model_dir(&app)?;
    let active = active_model_id(&app);
    let mut list = Vec::new();
    for (id, filename, url, name, desc, size_mb) in model_specs() {
        let dest = dir.join(filename);
        let downloaded = matches!(std::fs::metadata(&dest), Ok(m) if m.len() >= MIN_VALID_BYTES);
        list.push(ModelSpec {
            id: id.to_string(),
            filename: filename.to_string(),
            url: url.to_string(),
            name: name.to_string(),
            description: desc.to_string(),
            size_mb: *size_mb,
            downloaded,
            active: active == *id,
        });
    }
    Ok(list)
}

#[tauri::command]
pub fn asr_set_active_model(app: tauri::AppHandle, model_id: String) -> Result<(), String> {
    set_active_model_id(&app, &model_id)
}

#[tauri::command]
pub fn asr_model_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let dir = model_dir(&app)?;
    let active = active_model_id(&app);
    let spec = model_specs()
        .iter()
        .find(|(id, ..)| *id == active)
        .or_else(|| model_specs().first())
        .unwrap();
    let dest = dir.join(spec.1);
    match std::fs::metadata(&dest) {
        Ok(m) if m.len() >= MIN_VALID_BYTES => Ok(Some(dest.to_string_lossy().into_owned())),
        _ => Ok(None),
    }
}

#[tauri::command]
pub async fn asr_ensure_model(app: tauri::AppHandle) -> Result<String, String> {
    let dir = model_dir(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("create dir: {}", e))?;
    let active = active_model_id(&app);
    let spec = model_specs()
        .iter()
        .find(|(id, ..)| *id == active)
        .or_else(|| model_specs().first())
        .unwrap();
    let filename = spec.1;
    let url = spec.2;
    let dest = dir.join(filename);
    if let Ok(m) = std::fs::metadata(&dest) {
        if m.len() >= MIN_VALID_BYTES {
            return Ok(dest.to_string_lossy().into_owned());
        }
    }

    let tmp = dir.join(format!("{}.part", filename));
    let client = reqwest::Client::builder()
        .user_agent("Argus")
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("download model: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("download model: HTTP {}", resp.status()));
    }
    let total = resp.content_length().unwrap_or(0);
    let mut file = std::fs::File::create(&tmp).map_err(|e| format!("create part: {}", e))?;
    let mut received: u64 = 0;
    let mut last_emit: u64 = 0;
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("read: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("write: {}", e))?;
        received += chunk.len() as u64;
        if received - last_emit >= 1_048_576 {
            last_emit = received;
            let _ = app.emit("asr-model://progress", (received, total));
        }
    }
    file.flush().map_err(|e| format!("flush: {}", e))?;
    drop(file);
    if received < MIN_VALID_BYTES {
        let _ = std::fs::remove_file(&tmp);
        return Err("download truncated".into());
    }
    std::fs::rename(&tmp, &dest).map_err(|e| format!("finalize: {}", e))?;
    let _ = app.emit("asr-model://progress", (received, received));
    Ok(dest.to_string_lossy().into_owned())
}
