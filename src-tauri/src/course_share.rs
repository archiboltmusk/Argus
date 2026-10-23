//! Shares a local "Courses" folder as a Stremio addon on the LAN.
//!
//! Runs on its own port so nothing else (web UI, phone remote) is exposed.
//! Only lessons the user registered are served, under an unguessable token.

use axum::body::Body;
use axum::extract::{Path, Request, State};
use axum::http::{header, HeaderMap, HeaderValue, Response, StatusCode};
use axum::routing::get;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::net::{SocketAddr, UdpSocket};
use std::sync::{Arc, Mutex, OnceLock};
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use tokio::net::TcpListener;
use tokio::sync::oneshot;

pub const COURSE_PORT: u16 = 11472;

#[derive(Clone, Deserialize)]
pub struct SharedLesson {
    pub id: String,
    pub title: String,
    pub season: u32,
    pub episode: u32,
    pub path: String,
}

#[derive(Clone)]
struct SharedCourse {
    name: String,
    lessons: Vec<SharedLesson>,
}

type Registry = Arc<Mutex<HashMap<String, SharedCourse>>>;

fn registry() -> &'static Registry {
    static R: OnceLock<Registry> = OnceLock::new();
    R.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

fn shutdown_slot() -> &'static Mutex<Option<oneshot::Sender<()>>> {
    static S: OnceLock<Mutex<Option<oneshot::Sender<()>>>> = OnceLock::new();
    S.get_or_init(|| Mutex::new(None))
}

fn course_id(token: &str) -> String {
    format!("edu:{token}")
}

pub(crate) fn manifest_json(token: &str, name: &str) -> Value {
    json!({
        "id": format!("app.argus.course.{token}"),
        "version": "1.0.0",
        "name": name,
        "description": "A course shared from Argus",
        "resources": ["catalog", "meta", "stream"],
        "types": ["series"],
        "idPrefixes": ["edu:"],
        "catalogs": [{ "type": "series", "id": "edu_catalog", "name": name }],
    })
}

pub(crate) fn catalog_json(token: &str, name: &str) -> Value {
    json!({ "metas": [{ "id": course_id(token), "type": "series", "name": name }] })
}

pub(crate) fn meta_json(token: &str, name: &str, lessons: &[SharedLesson]) -> Value {
    let videos: Vec<Value> = lessons
        .iter()
        .map(|l| {
            json!({
                "id": format!("{}:{}:{}", course_id(token), l.season, l.episode),
                "title": l.title,
                "season": l.season,
                "episode": l.episode,
                "released": "1970-01-01T00:00:00.000Z",
            })
        })
        .collect();
    json!({ "meta": { "id": course_id(token), "type": "series", "name": name, "videos": videos } })
}

/// Parses `edu:<token>:<season>:<episode>` stream ids.
pub(crate) fn parse_video_id(id: &str) -> Option<(String, u32, u32)> {
    let mut it = id.split(':');
    if it.next()? != "edu" {
        return None;
    }
    let token = it.next()?.to_string();
    let season = it.next()?.parse().ok()?;
    let episode = it.next()?.parse().ok()?;
    Some((token, season, episode))
}

/// Parses a single `bytes=a-b` range. `None` means "serve the whole file".
pub(crate) fn parse_range(value: &str, len: u64) -> Option<(u64, u64)> {
    let spec = value.strip_prefix("bytes=")?;
    if spec.contains(',') || len == 0 {
        return None;
    }
    let (a, b) = spec.split_once('-')?;
    let (start, end) = if a.is_empty() {
        let n: u64 = b.parse().ok()?;
        (len.saturating_sub(n), len - 1)
    } else {
        let start: u64 = a.parse().ok()?;
        let end = if b.is_empty() {
            len - 1
        } else {
            b.parse().ok()?
        };
        (start, end.min(len - 1))
    };
    (start <= end && start < len).then_some((start, end))
}

fn mime_for(path: &str) -> &'static str {
    match path
        .rsplit('.')
        .next()
        .map(|e| e.to_ascii_lowercase())
        .as_deref()
    {
        Some("mp4") | Some("m4v") => "video/mp4",
        Some("webm") => "video/webm",
        Some("mkv") => "video/x-matroska",
        Some("mov") => "video/quicktime",
        _ => "application/octet-stream",
    }
}

fn json_response(value: Value) -> Response<Body> {
    Response::builder()
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(Body::from(value.to_string()))
        .unwrap()
}

fn status(code: StatusCode) -> Response<Body> {
    Response::builder()
        .status(code)
        .body(Body::empty())
        .unwrap()
}

fn course_for(reg: &Registry, token: &str) -> Option<SharedCourse> {
    reg.lock().ok()?.get(token).cloned()
}

fn strip_json(s: &str) -> &str {
    s.strip_suffix(".json").unwrap_or(s)
}

async fn manifest(State(reg): State<Registry>, Path(token): Path<String>) -> Response<Body> {
    match course_for(&reg, &token) {
        Some(c) => json_response(manifest_json(&token, &c.name)),
        None => status(StatusCode::NOT_FOUND),
    }
}

async fn catalog(
    State(reg): State<Registry>,
    Path((token, _id)): Path<(String, String)>,
) -> Response<Body> {
    match course_for(&reg, &token) {
        Some(c) => json_response(catalog_json(&token, &c.name)),
        None => status(StatusCode::NOT_FOUND),
    }
}

async fn meta(
    State(reg): State<Registry>,
    Path((token, id)): Path<(String, String)>,
) -> Response<Body> {
    let Some(c) = course_for(&reg, &token) else {
        return status(StatusCode::NOT_FOUND);
    };
    if strip_json(&id) != course_id(&token) {
        return status(StatusCode::NOT_FOUND);
    }
    json_response(meta_json(&token, &c.name, &c.lessons))
}

async fn stream(
    State(reg): State<Registry>,
    headers: HeaderMap,
    Path((token, id)): Path<(String, String)>,
) -> Response<Body> {
    let Some(c) = course_for(&reg, &token) else {
        return status(StatusCode::NOT_FOUND);
    };
    let Some((t, season, episode)) = parse_video_id(strip_json(&id)) else {
        return status(StatusCode::NOT_FOUND);
    };
    let Some(lesson) = c
        .lessons
        .iter()
        .find(|l| t == token && l.season == season && l.episode == episode)
    else {
        return json_response(json!({ "streams": [] }));
    };
    let host = headers
        .get(header::HOST)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("localhost");
    let url = format!("http://{host}/course/{token}/file/{}", lesson.id);
    json_response(json!({ "streams": [{ "url": url, "name": "Argus", "title": lesson.title }] }))
}

async fn file(
    State(reg): State<Registry>,
    Path((token, lesson_id)): Path<(String, String)>,
    req: Request,
) -> Response<Body> {
    let Some(c) = course_for(&reg, &token) else {
        return status(StatusCode::NOT_FOUND);
    };
    // Only registered paths are readable; the id never reaches the filesystem.
    let Some(lesson) = c.lessons.iter().find(|l| l.id == lesson_id) else {
        return status(StatusCode::NOT_FOUND);
    };
    let Ok(mut f) = tokio::fs::File::open(&lesson.path).await else {
        return status(StatusCode::NOT_FOUND);
    };
    let Ok(md) = f.metadata().await else {
        return status(StatusCode::INTERNAL_SERVER_ERROR);
    };
    let len = md.len();
    let range = req
        .headers()
        .get(header::RANGE)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| parse_range(v, len));
    let (start, end, code) = match range {
        Some((s, e)) => (s, e, StatusCode::PARTIAL_CONTENT),
        None => (0, len.saturating_sub(1), StatusCode::OK),
    };
    if f.seek(std::io::SeekFrom::Start(start)).await.is_err() {
        return status(StatusCode::INTERNAL_SERVER_ERROR);
    }
    let count = if len == 0 { 0 } else { end - start + 1 };
    let body = Body::from_stream(tokio_util::io::ReaderStream::new(f.take(count)));
    let mut b = Response::builder()
        .status(code)
        .header(header::CONTENT_TYPE, mime_for(&lesson.path))
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_LENGTH, count)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*");
    if code == StatusCode::PARTIAL_CONTENT {
        b = b.header(
            header::CONTENT_RANGE,
            HeaderValue::from_str(&format!("bytes {start}-{end}/{len}")).unwrap(),
        );
    }
    b.body(body).unwrap()
}

async fn ensure_running() -> Result<(), String> {
    if shutdown_slot().lock().unwrap().is_some() {
        return Ok(());
    }
    let listener = TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], COURSE_PORT)))
        .await
        .map_err(|e| format!("port {COURSE_PORT} unavailable: {e}"))?;
    let (tx, rx) = oneshot::channel::<()>();
    *shutdown_slot().lock().unwrap() = Some(tx);
    let router = axum::Router::new()
        .route("/course/{token}/manifest.json", get(manifest))
        .route("/course/{token}/catalog/series/{id}", get(catalog))
        .route("/course/{token}/meta/series/{id}", get(meta))
        .route("/course/{token}/stream/series/{id}", get(stream))
        .route("/course/{token}/file/{lesson}", get(file))
        .with_state(registry().clone());
    tauri::async_runtime::spawn(async move {
        let _ = axum::serve(listener, router)
            .with_graceful_shutdown(async {
                let _ = rx.await;
            })
            .await;
    });
    Ok(())
}

/// The address other devices on the LAN can reach this machine at.
fn lan_ip() -> Option<String> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("192.0.2.1:9").ok()?; // UDP connect sends no packet
    Some(socket.local_addr().ok()?.ip().to_string())
}

/// Registers (or replaces) a shared course and returns its manifest URL.
#[tauri::command]
pub async fn course_share_set(
    token: String,
    name: String,
    lessons: Vec<SharedLesson>,
) -> Result<String, String> {
    if token.len() < 16 || !token.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("invalid share token".into());
    }
    ensure_running().await?;
    registry()
        .lock()
        .unwrap()
        .insert(token.clone(), SharedCourse { name, lessons });
    let ip = lan_ip().ok_or_else(|| "no network address found".to_string())?;
    Ok(format!(
        "http://{ip}:{COURSE_PORT}/course/{token}/manifest.json"
    ))
}

#[tauri::command]
pub fn course_share_remove(token: String) {
    let empty = {
        let mut reg = registry().lock().unwrap();
        reg.remove(&token);
        reg.is_empty()
    };
    if empty {
        if let Some(tx) = shutdown_slot().lock().unwrap().take() {
            let _ = tx.send(());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_ranges() {
        assert_eq!(parse_range("bytes=0-9", 100), Some((0, 9)));
        assert_eq!(parse_range("bytes=90-", 100), Some((90, 99)));
        assert_eq!(parse_range("bytes=-10", 100), Some((90, 99)));
        assert_eq!(parse_range("bytes=50-500", 100), Some((50, 99)));
        assert_eq!(parse_range("bytes=100-", 100), None);
        assert_eq!(parse_range("bytes=0-1,5-6", 100), None);
    }

    #[test]
    fn parses_video_ids() {
        assert_eq!(parse_video_id("edu:abc:1:12"), Some(("abc".into(), 1, 12)));
        assert_eq!(parse_video_id("tt123:1:2"), None);
    }

    #[test]
    fn meta_lists_lessons() {
        let lessons = vec![SharedLesson {
            id: "a".into(),
            title: "One".into(),
            season: 1,
            episode: 1,
            path: "/x/1.mp4".into(),
        }];
        let m = meta_json("tok", "C", &lessons);
        assert_eq!(m["meta"]["videos"][0]["id"], "edu:tok:1:1");
        assert_eq!(manifest_json("tok", "C")["idPrefixes"][0], "edu:");
    }
}
