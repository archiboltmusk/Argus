use std::io::SeekFrom;
use std::path::Path as FsPath;
use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Json, Path, RawQuery, State};
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::Router;
use futures_util::StreamExt;
use librqbit::api::TorrentIdOrHash;
use librqbit::Session;
use serde::Deserialize;
use tokio::io::{AsyncReadExt, AsyncSeekExt};

pub fn router(session: Arc<Session>) -> Router {
    Router::new()
        .route("/stream/{hash}/{file_id}", get(h_stream).head(h_stream))
        .route("/health", get(health))
        .route("/settings", get(h_settings).post(h_post_settings))
        .route("/{hash}/create", post(h_create))
        .route(
            "/{hash}/{file_id}",
            get(h_remote_stream).head(h_remote_stream),
        )
        .with_state(session)
}

async fn health() -> &'static str {
    "ok"
}

#[derive(Clone)]
pub struct RuntimeServerSettings {
    pub cache_root: String,
    pub cache_size: Option<u64>,
    pub transcode_profile: Option<String>,
    pub remote_https: String,
    pub bt_max_connections: u32,
    pub bt_handshake_timeout: u32,
    pub bt_request_timeout: u32,
    pub bt_download_speed_soft_limit: f64,
    pub bt_download_speed_hard_limit: f64,
    pub bt_min_peers_for_stable: u32,
}

impl Default for RuntimeServerSettings {
    fn default() -> Self {
        Self {
            cache_root: String::new(),
            cache_size: Some(10 * 1024 * 1024 * 1024),
            transcode_profile: if cfg!(target_os = "macos") {
                Some("videotoolbox".to_string())
            } else {
                None
            },
            remote_https: String::new(),
            bt_max_connections: 55,
            bt_handshake_timeout: 20000,
            bt_request_timeout: 4000,
            bt_download_speed_soft_limit: 2_621_440.0,
            bt_download_speed_hard_limit: 3_670_016.0,
            bt_min_peers_for_stable: 5,
        }
    }
}

fn runtime_settings() -> &'static std::sync::Mutex<RuntimeServerSettings> {
    static S: std::sync::OnceLock<std::sync::Mutex<RuntimeServerSettings>> =
        std::sync::OnceLock::new();
    S.get_or_init(|| std::sync::Mutex::new(RuntimeServerSettings::default()))
}

pub fn apply_profile_preset(st: &mut RuntimeServerSettings, profile: &str) {
    match profile {
        "soft" => {
            st.bt_max_connections = 35;
            st.bt_handshake_timeout = 20000;
            st.bt_request_timeout = 4000;
            st.bt_download_speed_soft_limit = 1_677_721.6;
            st.bt_download_speed_hard_limit = 1_677_721.6;
            st.bt_min_peers_for_stable = 5;
        }
        "fast" => {
            st.bt_max_connections = 200;
            st.bt_handshake_timeout = 20000;
            st.bt_request_timeout = 4000;
            st.bt_download_speed_soft_limit = 4_194_304.0;
            st.bt_download_speed_hard_limit = 39_321_600.0;
            st.bt_min_peers_for_stable = 5;
        }
        "ultra-fast" => {
            st.bt_max_connections = 500;
            st.bt_handshake_timeout = 25000;
            st.bt_request_timeout = 6000;
            st.bt_download_speed_soft_limit = 8_388_608.0;
            st.bt_download_speed_hard_limit = 78_643_200.0;
            st.bt_min_peers_for_stable = 10;
        }
        _ => {
            st.bt_max_connections = 55;
            st.bt_handshake_timeout = 20000;
            st.bt_request_timeout = 4000;
            st.bt_download_speed_soft_limit = 2_621_440.0;
            st.bt_download_speed_hard_limit = 3_670_016.0;
            st.bt_min_peers_for_stable = 5;
        }
    }
}

pub fn sync_runtime_settings(
    cache_root: Option<String>,
    max_gb: Option<u64>,
    torrent_profile: Option<&str>,
    transcode_profile: Option<String>,
) {
    let mut st = runtime_settings().lock().unwrap();
    if let Some(root) = cache_root {
        st.cache_root = root;
    }
    if let Some(gb) = max_gb {
        st.cache_size = if gb == 0 {
            None
        } else {
            Some(gb.saturating_mul(1024 * 1024 * 1024))
        };
    }
    if let Some(profile) = torrent_profile {
        apply_profile_preset(&mut st, profile);
    }
    if let Some(tp) = transcode_profile {
        st.transcode_profile = if tp.trim().is_empty() || tp == "none" {
            None
        } else {
            Some(tp)
        };
    }
}

fn build_settings_json() -> serde_json::Value {
    let st = runtime_settings().lock().unwrap().clone();
    let hw_selections = if cfg!(target_os = "macos") {
        serde_json::json!([
            { "name": "Disabled", "val": serde_json::Value::Null },
            { "name": "videotoolbox", "val": "videotoolbox" },
            { "name": "software", "val": "software" }
        ])
    } else if cfg!(target_os = "windows") {
        serde_json::json!([
            { "name": "Disabled", "val": serde_json::Value::Null },
            { "name": "nvenc", "val": "nvenc" },
            { "name": "qsv", "val": "qsv" },
            { "name": "amf", "val": "amf" },
            { "name": "software", "val": "software" }
        ])
    } else {
        serde_json::json!([
            { "name": "Disabled", "val": serde_json::Value::Null },
            { "name": "vaapi", "val": "vaapi" },
            { "name": "nvenc", "val": "nvenc" },
            { "name": "qsv", "val": "qsv" },
            { "name": "software", "val": "software" }
        ])
    };
    serde_json::json!({
        "options": [
            {
                "id": "transcodeProfile",
                "label": "Transcode profile",
                "type": "select",
                "selections": hw_selections
            }
        ],
        "values": {
            "serverVersion": "4.22.4",
            "appPath": st.cache_root,
            "cacheRoot": st.cache_root,
            "cacheSize": st.cache_size,
            "btMaxConnections": st.bt_max_connections,
            "btHandshakeTimeout": st.bt_handshake_timeout,
            "btRequestTimeout": st.bt_request_timeout,
            "btDownloadSpeedSoftLimit": st.bt_download_speed_soft_limit,
            "btDownloadSpeedHardLimit": st.bt_download_speed_hard_limit,
            "btMinPeersForStable": st.bt_min_peers_for_stable,
            "transcodeProfile": st.transcode_profile,
            "remoteHttps": st.remote_https,
        }
    })
}

async fn h_settings() -> Response {
    let body = build_settings_json();
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/json")],
        body.to_string(),
    )
        .into_response()
}

async fn h_post_settings(Json(payload): Json<serde_json::Value>) -> Response {
    if let Some(obj) = payload.as_object() {
        let mut st = runtime_settings().lock().unwrap();
        if let Some(root) = obj.get("cacheRoot").and_then(|v| v.as_str()) {
            st.cache_root = root.to_string();
        }
        if let Some(size_val) = obj.get("cacheSize") {
            st.cache_size = size_val.as_u64();
        }
        if let Some(tp_val) = obj.get("transcodeProfile") {
            st.transcode_profile = tp_val
                .as_str()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty() && s != "none");
        }
        if let Some(https_val) = obj.get("remoteHttps").or_else(|| obj.get("httpsEndpoint")) {
            st.remote_https = https_val.as_str().unwrap_or("").to_string();
        }
        if let Some(v) = obj.get("btMaxConnections").and_then(|v| v.as_u64()) {
            st.bt_max_connections = v as u32;
        }
        if let Some(v) = obj.get("btHandshakeTimeout").and_then(|v| v.as_u64()) {
            st.bt_handshake_timeout = v as u32;
        }
        if let Some(v) = obj.get("btRequestTimeout").and_then(|v| v.as_u64()) {
            st.bt_request_timeout = v as u32;
        }
        if let Some(v) = obj.get("btDownloadSpeedSoftLimit").and_then(|v| v.as_f64()) {
            st.bt_download_speed_soft_limit = v;
        }
        if let Some(v) = obj.get("btDownloadSpeedHardLimit").and_then(|v| v.as_f64()) {
            st.bt_download_speed_hard_limit = v;
        }
        if let Some(v) = obj.get("btMinPeersForStable").and_then(|v| v.as_u64()) {
            st.bt_min_peers_for_stable = v as u32;
        }
    }
    let out = serde_json::json!({ "success": true });
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/json")],
        out.to_string(),
    )
        .into_response()
}

#[derive(Deserialize)]
struct CreateBody {
    #[serde(rename = "peerSearch")]
    peer_search: Option<PeerSearch>,
}

#[derive(Deserialize)]
struct PeerSearch {
    sources: Option<Vec<String>>,
}

fn trackers_from_sources(sources: Option<Vec<String>>) -> Vec<String> {
    sources
        .unwrap_or_default()
        .into_iter()
        .filter_map(|s| {
            if let Some(rest) = s.strip_prefix("tracker:") {
                Some(rest.to_string())
            } else if s.starts_with("dht:") {
                None
            } else if s.starts_with("udp://")
                || s.starts_with("http://")
                || s.starts_with("https://")
                || s.starts_with("ws://")
                || s.starts_with("wss://")
            {
                Some(s)
            } else {
                None
            }
        })
        .collect()
}

fn trackers_from_query(query: Option<String>) -> Vec<String> {
    let raw = query.unwrap_or_default();
    raw.split('&')
        .filter_map(|pair| pair.strip_prefix("tr="))
        .filter_map(|v| urldecode(v))
        .filter(|v| !v.is_empty())
        .collect()
}

fn urldecode(input: &str) -> Option<String> {
    let bytes = input.replace('+', " ");
    let bytes = bytes.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let h = std::str::from_utf8(&bytes[i + 1..i + 3]).ok()?;
            let n = u8::from_str_radix(h, 16).ok()?;
            out.push(n);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

async fn h_create(
    State(session): State<Arc<Session>>,
    Path(hash): Path<String>,
    Json(body): Json<CreateBody>,
) -> Response {
    let trackers = trackers_from_sources(body.peer_search.and_then(|p| p.sources));
    match super::ensure_added(&session, &hash, trackers, None).await {
        Ok((_info_hash, files)) => {
            let guessed = files.iter().max_by_key(|f| f.length).map(|f| f.idx);
            let out = serde_json::json!({
                "guessedFileIdx": guessed,
                "files": files,
            });
            (
                StatusCode::OK,
                [(header::CONTENT_TYPE, "application/json")],
                out.to_string(),
            )
                .into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn h_remote_stream(
    State(session): State<Arc<Session>>,
    Path((hash, file_id)): Path<(String, usize)>,
    RawQuery(query): RawQuery,
    headers: HeaderMap,
) -> Response {
    let trackers = trackers_from_query(query);
    if let Err(e) = super::ensure_added(&session, &hash, trackers, Some(file_id)).await {
        return (StatusCode::NOT_FOUND, e).into_response();
    }
    stream_file(&session, &hash, file_id, &headers).await
}

async fn h_stream(
    State(session): State<Arc<Session>>,
    Path((hash, file_id)): Path<(String, usize)>,
    headers: HeaderMap,
) -> Response {
    stream_file(&session, &hash, file_id, &headers).await
}

async fn stream_file(
    session: &Arc<Session>,
    hash: &str,
    file_id: usize,
    headers: &HeaderMap,
) -> Response {
    match super::run_session(session, async {
        Ok(stream_file_inner(session, hash, file_id, headers).await)
    })
    .await
    {
        Ok(response) => response,
        Err(error) => (StatusCode::SERVICE_UNAVAILABLE, error).into_response(),
    }
}

async fn stream_file_inner(
    session: &Arc<Session>,
    hash: &str,
    file_id: usize,
    headers: &HeaderMap,
) -> Response {
    let Ok(id) = TorrentIdOrHash::parse(hash) else {
        return (StatusCode::BAD_REQUEST, "bad hash").into_response();
    };
    let Some(handle) = session.get(id) else {
        return (StatusCode::NOT_FOUND, "no torrent").into_response();
    };
    // Torrent selection resolves metadata only. Peer transfer starts when a
    // player or an intentional download actually asks for stream bytes.
    if handle.is_paused() {
        if let Err(error) = session.unpause(&handle).await {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("could not start torrent: {error:#}"),
            )
                .into_response();
        }
    }
    let ct = handle
        .with_metadata(|m| {
            m.file_infos
                .get(file_id)
                .map(|fi| ct_for(&fi.relative_filename))
        })
        .ok()
        .flatten()
        .unwrap_or("application/octet-stream");
    let mut stream = match handle.stream(file_id) {
        Ok(s) => s,
        Err(e) => return (StatusCode::NOT_FOUND, format!("{e:#}")).into_response(),
    };
    let len = stream.len();
    let requested_range = headers.get(header::RANGE);
    let parsed = requested_range
        .and_then(|value| value.to_str().ok())
        .map(|value| parse_range(value, len));
    let (status, start, end) = match parsed {
        Some(Ok((start, end))) => (StatusCode::PARTIAL_CONTENT, start, end),
        Some(Err(())) => {
            let mut response =
                (StatusCode::RANGE_NOT_SATISFIABLE, "range not satisfiable").into_response();
            if let Ok(value) = HeaderValue::from_str(&format!("bytes */{len}")) {
                response.headers_mut().insert(header::CONTENT_RANGE, value);
            }
            return response;
        }
        None => (StatusCode::OK, 0u64, len),
    };
    if start > 0 && stream.seek(SeekFrom::Start(start)).await.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, "seek failed").into_response();
    }
    let to_take = end - start;
    let mut out = HeaderMap::new();
    out.insert(header::ACCEPT_RANGES, HeaderValue::from_static("bytes"));
    out.insert(header::CONTENT_TYPE, HeaderValue::from_static(ct));
    out.insert(
        header::CONTENT_LENGTH,
        HeaderValue::from_str(&to_take.to_string()).unwrap(),
    );
    if status == StatusCode::PARTIAL_CONTENT {
        out.insert(
            header::CONTENT_RANGE,
            HeaderValue::from_str(&format!("bytes {}-{}/{}", start, end - 1, len)).unwrap(),
        );
    }
    let body = Body::from_stream(
        tokio_util::io::ReaderStream::with_capacity(stream.take(to_take), 65536)
            .take_until(session.cancellation_token().clone().cancelled_owned()),
    );
    (status, out, body).into_response()
}

fn parse_range(raw: &str, len: u64) -> Result<(u64, u64), ()> {
    let spec = raw.trim().strip_prefix("bytes=").ok_or(())?.trim();
    if spec.contains(',') || len == 0 {
        return Err(());
    }
    let (start_raw, end_raw) = spec.split_once('-').ok_or(())?;
    let start_raw = start_raw.trim();
    let end_raw = end_raw.trim();

    if start_raw.is_empty() {
        let suffix_len = end_raw.parse::<u64>().map_err(|_| ())?;
        if suffix_len == 0 {
            return Err(());
        }
        return Ok((len.saturating_sub(suffix_len), len));
    }

    let start = start_raw.parse::<u64>().map_err(|_| ())?;
    if start >= len {
        return Err(());
    }
    if end_raw.is_empty() {
        return Ok((start, len));
    }

    let inclusive_end = end_raw.parse::<u64>().map_err(|_| ())?;
    if inclusive_end < start {
        return Err(());
    }
    Ok((start, inclusive_end.saturating_add(1).min(len)))
}

#[cfg(test)]
mod tests {
    use super::parse_range;

    #[test]
    fn parses_http_byte_ranges_used_by_media_players() {
        assert_eq!(parse_range("bytes=0-499", 1_000), Ok((0, 500)));
        assert_eq!(parse_range("bytes=500-", 1_000), Ok((500, 1_000)));
        assert_eq!(parse_range("bytes=-500", 1_000), Ok((500, 1_000)));
        assert_eq!(parse_range("bytes=-1500", 1_000), Ok((0, 1_000)));
        assert_eq!(parse_range("bytes=900-2000", 1_000), Ok((900, 1_000)));
    }

    #[test]
    fn rejects_invalid_or_unsatisfiable_http_byte_ranges() {
        assert_eq!(parse_range("bytes=1000-", 1_000), Err(()));
        assert_eq!(parse_range("bytes=10-9", 1_000), Err(()));
        assert_eq!(parse_range("bytes=-0", 1_000), Err(()));
        assert_eq!(parse_range("bytes=0-1,4-5", 1_000), Err(()));
        assert_eq!(parse_range("not-a-range", 1_000), Err(()));
        assert_eq!(parse_range("bytes=0-", 0), Err(()));
    }
}

fn ct_for(path: &FsPath) -> &'static str {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "mp4" | "m4v" => "video/mp4",
        "mkv" => "video/x-matroska",
        "webm" => "video/webm",
        "avi" => "video/x-msvideo",
        "mov" => "video/quicktime",
        "ts" | "m2ts" | "mts" => "video/mp2t",
        "ogv" => "video/ogg",
        "mp3" => "audio/mpeg",
        "flac" => "audio/flac",
        "aac" | "m4a" => "audio/aac",
        "srt" => "application/x-subrip",
        "vtt" => "text/vtt",
        _ => "application/octet-stream",
    }
}
