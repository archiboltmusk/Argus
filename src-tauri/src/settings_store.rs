use tauri::Manager;

fn settings_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

fn settings_read_sync(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    let path = settings_path(app)?;
    match std::fs::read_to_string(&path) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

fn settings_write_sync(app: &tauri::AppHandle, content: &str) -> Result<(), String> {
    let path = settings_path(app)?;
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, content.as_bytes()).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn settings_read(app: tauri::AppHandle) -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(move || settings_read_sync(&app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn settings_write(app: tauri::AppHandle, content: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || settings_write_sync(&app, &content))
        .await
        .map_err(|e| e.to_string())?
}

fn secrets_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("secrets.json"))
}

pub(crate) fn secrets_read_sync(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    let path = secrets_path(app)?;
    match std::fs::read_to_string(&path) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub(crate) fn secrets_write_sync(app: &tauri::AppHandle, content: &str) -> Result<(), String> {
    let path = secrets_path(app)?;
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, content.as_bytes()).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn secrets_read(app: tauri::AppHandle) -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(move || secrets_read_sync(&app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn secrets_write(app: tauri::AppHandle, content: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || secrets_write_sync(&app, &content))
        .await
        .map_err(|e| e.to_string())?
}

pub(crate) fn secret_value(app: &tauri::AppHandle, key: &str) -> Result<Option<String>, String> {
    let Some(content) = secrets_read_sync(app)? else {
        return Ok(None);
    };
    let value =
        serde_json::from_str::<serde_json::Value>(&content).map_err(|error| error.to_string())?;
    Ok(value
        .as_object()
        .and_then(|items| items.get(key))
        .and_then(serde_json::Value::as_str)
        .map(str::to_string))
}

pub fn read_torrents_disabled(app: &tauri::AppHandle) -> bool {
    let Ok(path) = settings_path(app) else {
        return false;
    };
    let Ok(s) = std::fs::read_to_string(&path) else {
        return false;
    };
    parse_torrents_disabled(&s)
}

pub fn read_defer_torrent_engine(app: &tauri::AppHandle) -> bool {
    let Ok(path) = settings_path(app) else {
        return false;
    };
    let Ok(s) = std::fs::read_to_string(&path) else {
        return false;
    };
    parse_bool_flag(&s, "deferTorrentEngine")
}

fn parse_torrents_disabled(json: &str) -> bool {
    parse_bool_flag(json, "torrentsDisabled")
}

fn parse_bool_flag(json: &str, key: &str) -> bool {
    let needle = format!("\"{}\"", key);
    let Some(idx) = json.find(&needle) else {
        return false;
    };
    let rest = &json[idx + needle.len()..];
    let mut chars = rest.chars().peekable();
    while let Some(c) = chars.peek() {
        if c.is_whitespace() || *c == ':' {
            chars.next();
        } else {
            break;
        }
    }
    matches!(chars.next(), Some('t') | Some('T'))
}
