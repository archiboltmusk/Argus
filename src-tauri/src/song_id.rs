#[cfg(windows)]
use std::collections::VecDeque;

use serde::Serialize;

#[derive(Serialize, Debug)]
pub struct SongResult {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub artwork: String,
    pub link: String,
}

#[tauri::command]
pub async fn recognize_now_playing(
    api_token: String,
    seconds: Option<u32>,
) -> Result<Option<SongResult>, String> {
    #[cfg(windows)]
    {
        let secs = seconds.unwrap_or(7).clamp(3, 15);
        let (pcm, sample_rate, channels, bits) =
            tauri::async_runtime::spawn_blocking(move || capture_loopback(secs))
                .await
                .map_err(|e| e.to_string())??;
        ensure_audible(&pcm)?;
        let wav = pcm_to_wav(&pcm, sample_rate, channels, bits)?;
        audd_recognize(wav, api_token).await
    }
    #[cfg(not(windows))]
    {
        let _ = (api_token, seconds);
        Err("Song identification is only supported on Windows for now".into())
    }
}

#[tauri::command]
pub async fn recognize_now_playing_ai(
    api_key: String,
    model: Option<String>,
    seconds: Option<u32>,
) -> Result<Option<SongResult>, String> {
    #[cfg(windows)]
    {
        let secs = seconds.unwrap_or(8).clamp(3, 15);
        let (pcm, sample_rate, channels, bits) =
            tauri::async_runtime::spawn_blocking(move || capture_loopback(secs))
                .await
                .map_err(|e| e.to_string())??;
        ensure_audible(&pcm)?;
        let wav = pcm_to_wav(&pcm, sample_rate, channels, bits)?;
        crate::song_id_gemini::recognize(wav, api_key, model).await
    }
    #[cfg(not(windows))]
    {
        let _ = (api_key, model, seconds);
        Err("Song identification is only supported on Windows for now".into())
    }
}

#[cfg(windows)]
fn capture_loopback(seconds: u32) -> Result<(Vec<u8>, u32, u16, u16), String> {
    use wasapi::*;
    initialize_mta()
        .ok()
        .map_err(|e| format!("COM init failed: {e}"))?;

    let sample_rate = 44100u32;
    let channels = 2u16;
    let bits = 16u16;

    let device = get_default_device(&Direction::Render).map_err(|e| e.to_string())?;
    let mut audio_client = device.get_iaudioclient().map_err(|e| e.to_string())?;

    let format = WaveFormat::new(
        bits as usize,
        bits as usize,
        &SampleType::Int,
        sample_rate as usize,
        channels as usize,
        None,
    );

    let (_default_period, min_period) = audio_client.get_periods().map_err(|e| e.to_string())?;
    audio_client
        .initialize_client(
            &format,
            min_period,
            &Direction::Capture,
            &ShareMode::Shared,
            true,
        )
        .map_err(|e| e.to_string())?;

    let h_event = audio_client
        .set_get_eventhandle()
        .map_err(|e| e.to_string())?;
    let capture_client = audio_client
        .get_audiocaptureclient()
        .map_err(|e| e.to_string())?;
    let blockalign = format.get_blockalign() as usize;

    audio_client.start_stream().map_err(|e| e.to_string())?;

    let target_bytes = sample_rate as usize * seconds as usize * blockalign;
    let mut queue: VecDeque<u8> = VecDeque::new();
    while queue.len() < target_bytes {
        capture_client
            .read_from_device_to_deque(&mut queue)
            .map_err(|e| e.to_string())?;
        if h_event.wait_for_event(2000).is_err() {
            break;
        }
    }
    audio_client.stop_stream().map_err(|e| e.to_string())?;

    let bytes_per_sec = sample_rate as usize * blockalign;
    let got = queue.len();
    if got < target_bytes.min(bytes_per_sec * 4) {
        let secs = got as f32 / bytes_per_sec as f32;
        return Err(format!(
            "Argus only captured {secs:.1}s before your playback device went quiet. Keep the scene playing while Argus listens."
        ));
    }

    let pcm: Vec<u8> = queue.into_iter().take(target_bytes).collect();
    Ok((pcm, sample_rate, channels, bits))
}

#[cfg(windows)]
fn ensure_audible(pcm: &[u8]) -> Result<(), String> {
    let peak = pcm
        .chunks_exact(2)
        .map(|c| (i16::from_le_bytes([c[0], c[1]]) as i32).abs())
        .max()
        .unwrap_or(0);
    if peak < 150 {
        return Err("Argus heard silence on your default playback device. Play the scene with sound, and make sure Windows is playing it through the device set as default.".to_string());
    }
    Ok(())
}

#[cfg(windows)]
fn pcm_to_wav(pcm: &[u8], sample_rate: u32, channels: u16, bits: u16) -> Result<Vec<u8>, String> {
    use hound::{SampleFormat, WavSpec, WavWriter};
    use std::io::Cursor;

    let spec = WavSpec {
        channels,
        sample_rate,
        bits_per_sample: bits,
        sample_format: SampleFormat::Int,
    };
    let mut cursor = Cursor::new(Vec::<u8>::new());
    {
        let mut writer = WavWriter::new(&mut cursor, spec).map_err(|e| e.to_string())?;
        for chunk in pcm.chunks_exact(2) {
            let s = i16::from_le_bytes([chunk[0], chunk[1]]);
            writer.write_sample(s).map_err(|e| e.to_string())?;
        }
        writer.finalize().map_err(|e| e.to_string())?;
    }
    Ok(cursor.into_inner())
}

async fn audd_recognize(wav: Vec<u8>, api_token: String) -> Result<Option<SongResult>, String> {
    use reqwest::multipart::{Form, Part};

    let part = Part::bytes(wav)
        .file_name("clip.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;
    let form = Form::new()
        .text("api_token", api_token)
        .text("return", "apple_music,spotify")
        .part("file", part);

    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .post("https://api.audd.io/")
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if json["status"] != "success" {
        let msg = json["error"]["error_message"]
            .as_str()
            .unwrap_or("unknown error");
        return Err(format!("AudD: {msg}"));
    }

    let r = &json["result"];
    if r.is_null() {
        return Ok(None);
    }

    let title = r["title"].as_str().unwrap_or("").to_string();
    let artist = r["artist"].as_str().unwrap_or("").to_string();
    let album = r["album"].as_str().unwrap_or("").to_string();
    let link = r["song_link"].as_str().unwrap_or("").to_string();

    let mut artwork = String::new();
    if let Some(u) = r["apple_music"]["artwork"]["url"].as_str() {
        artwork = u.replace("{w}", "300").replace("{h}", "300");
    } else if let Some(u) = r["spotify"]["album"]["images"][0]["url"].as_str() {
        artwork = u.to_string();
    }

    Ok(Some(SongResult {
        title,
        artist,
        album,
        artwork,
        link,
    }))
}

const FILE_CLIP_SECS: u32 = 12;
const FILE_CLIP_START_SECS: f64 = 15.0;
const FINGERPRINT_SECS: u32 = 120;
const TOOL_TIMEOUT_SECS: u64 = 60;

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())
}

fn local_audio_path(path: &str) -> Result<std::path::PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() || trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return Err("Pick a local audio or video file".into());
    }
    let pb = std::path::PathBuf::from(trimmed);
    if !pb.is_file() {
        return Err("That file could not be found".into());
    }
    Ok(pb)
}

async fn run_ffmpeg(args: Vec<std::ffi::OsString>) -> Result<std::process::Output, String> {
    let ff = crate::transcode::locate_ffmpeg().ok_or("ffmpeg not found")?;
    let mut cmd = tokio::process::Command::new(ff);
    cmd.arg("-hide_banner")
        .arg("-nostats")
        .args(args)
        .stdin(std::process::Stdio::null());
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);
    tokio::time::timeout(
        std::time::Duration::from_secs(TOOL_TIMEOUT_SECS),
        cmd.output(),
    )
    .await
    .map_err(|_| "ffmpeg timed out".to_string())?
    .map_err(|e| format!("ffmpeg: {e}"))
}

async fn decode_clip_wav(path: &std::path::Path, start: f64, secs: u32) -> Result<Vec<u8>, String> {
    let mut out = std::env::temp_dir();
    out.push(format!("argus-songid-{}.wav", std::process::id()));
    let args: Vec<std::ffi::OsString> = vec![
        "-y".into(),
        "-ss".into(),
        start.to_string().into(),
        "-t".into(),
        secs.to_string().into(),
        "-i".into(),
        path.into(),
        "-vn".into(),
        "-ac".into(),
        "1".into(),
        "-ar".into(),
        "16000".into(),
        "-c:a".into(),
        "pcm_s16le".into(),
        (&out).into(),
    ];
    let res = run_ffmpeg(args).await;
    let wav = std::fs::read(&out).map_err(|_| "Could not decode audio from that file".to_string());
    let _ = std::fs::remove_file(&out);
    let output = res?;
    if !output.status.success() {
        return Err("Could not decode audio from that file".into());
    }
    let wav = wav?;
    if wav.len() < 44 + 16000 {
        return Err("That file has no audio at the sample position".into());
    }
    Ok(wav)
}

struct Chromaprint {
    duration: u32,
    fingerprint: String,
}

fn parse_ffmpeg_duration(stderr: &str) -> Option<u32> {
    let rest = stderr.split("Duration: ").nth(1)?;
    let stamp = rest.split(',').next()?.trim();
    let mut parts = stamp.split(':');
    let h: f64 = parts.next()?.parse().ok()?;
    let m: f64 = parts.next()?.parse().ok()?;
    let s: f64 = parts.next()?.parse().ok()?;
    Some((h * 3600.0 + m * 60.0 + s).round() as u32)
}

async fn chromaprint_fpcalc(path: &std::path::Path) -> Result<Chromaprint, String> {
    let fpcalc = crate::subsync::fingerprint::locate_fpcalc().ok_or("fpcalc not found")?;
    let mut cmd = tokio::process::Command::new(fpcalc);
    cmd.arg("-json")
        .arg("-length")
        .arg(FINGERPRINT_SECS.to_string())
        .arg(path)
        .stdin(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);
    let out = tokio::time::timeout(
        std::time::Duration::from_secs(TOOL_TIMEOUT_SECS),
        cmd.output(),
    )
    .await
    .map_err(|_| "fpcalc timed out".to_string())?
    .map_err(|e| format!("fpcalc: {e}"))?;
    if !out.status.success() {
        return Err("fpcalc failed".into());
    }
    let v: serde_json::Value = serde_json::from_slice(&out.stdout).map_err(|e| e.to_string())?;
    let fingerprint = v["fingerprint"]
        .as_str()
        .ok_or("fpcalc returned no fingerprint")?;
    let duration = v["duration"]
        .as_f64()
        .ok_or("fpcalc returned no duration")?;
    Ok(Chromaprint {
        duration: duration.round() as u32,
        fingerprint: fingerprint.to_string(),
    })
}

async fn chromaprint_ffmpeg(path: &std::path::Path) -> Result<Chromaprint, String> {
    let args: Vec<std::ffi::OsString> = vec![
        "-i".into(),
        path.into(),
        "-t".into(),
        FINGERPRINT_SECS.to_string().into(),
        "-vn".into(),
        "-ac".into(),
        "1".into(),
        "-ar".into(),
        "11025".into(),
        "-f".into(),
        "chromaprint".into(),
        "-fp_format".into(),
        "base64".into(),
        "-".into(),
    ];
    let out = run_ffmpeg(args).await?;
    let stderr = String::from_utf8_lossy(&out.stderr);
    let fingerprint = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if !out.status.success() || fingerprint.is_empty() {
        return Err(
            "This ffmpeg build cannot fingerprint audio. Install Chromaprint (fpcalc) or use AudD"
                .into(),
        );
    }
    let duration = parse_ffmpeg_duration(&stderr).ok_or("Could not read the file duration")?;
    Ok(Chromaprint {
        duration,
        fingerprint,
    })
}

async fn chromaprint_of(path: &std::path::Path) -> Result<Chromaprint, String> {
    match chromaprint_fpcalc(path).await {
        Ok(c) => Ok(c),
        Err(_) => chromaprint_ffmpeg(path).await,
    }
}

fn parse_acoustid(json: &serde_json::Value) -> Result<Option<SongResult>, String> {
    if json["status"] != "ok" {
        let msg = json["error"]["message"].as_str().unwrap_or("unknown error");
        return Err(format!("AcoustID: {msg}"));
    }
    let best = json["results"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|r| r["score"].as_f64().unwrap_or(0.0) >= 0.5)
        .filter(|r| r["recordings"].as_array().is_some_and(|a| !a.is_empty()))
        .max_by(|a, b| {
            let sa = a["score"].as_f64().unwrap_or(0.0);
            let sb = b["score"].as_f64().unwrap_or(0.0);
            sa.partial_cmp(&sb).unwrap_or(std::cmp::Ordering::Equal)
        });
    let Some(rec) = best.and_then(|r| {
        r["recordings"]
            .as_array()?
            .iter()
            .find(|x| x["title"].is_string())
    }) else {
        return Ok(None);
    };
    let artist = rec["artists"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|a| a["name"].as_str())
        .collect::<Vec<_>>()
        .join(", ");
    let group = rec["releasegroups"].as_array().and_then(|g| g.first());
    let album = group
        .and_then(|g| g["title"].as_str())
        .unwrap_or("")
        .to_string();
    let artwork = group
        .and_then(|g| g["id"].as_str())
        .map(|id| format!("https://coverartarchive.org/release-group/{id}/front-250"))
        .unwrap_or_default();
    let link = rec["id"]
        .as_str()
        .map(|id| format!("https://musicbrainz.org/recording/{id}"))
        .unwrap_or_default();
    Ok(Some(SongResult {
        title: rec["title"].as_str().unwrap_or("").to_string(),
        artist,
        album,
        artwork,
        link,
    }))
}

async fn acoustid_recognize(
    path: &std::path::Path,
    client_key: String,
) -> Result<Option<SongResult>, String> {
    let fp = chromaprint_of(path).await?;
    let resp = http_client()?
        .post("https://api.acoustid.org/v2/lookup")
        .form(&[
            ("client", client_key.as_str()),
            ("meta", "recordings releasegroups"),
            ("duration", &fp.duration.to_string()),
            ("fingerprint", &fp.fingerprint),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    parse_acoustid(&json)
}

/// Identifies a local audio/video file. `provider` is "acoustid", "audd" or "ai".
#[tauri::command]
pub async fn recognize_file(
    path: String,
    provider: String,
    api_key: String,
    model: Option<String>,
    start_sec: Option<f64>,
) -> Result<Option<SongResult>, String> {
    let key = api_key.trim().to_string();
    if key.is_empty() {
        return Err("Add an API key for this provider first".into());
    }
    let file = local_audio_path(&path)?;
    match provider.as_str() {
        "acoustid" => acoustid_recognize(&file, key).await,
        "audd" | "ai" => {
            let start = start_sec.unwrap_or(FILE_CLIP_START_SECS).max(0.0);
            let wav = match decode_clip_wav(&file, start, FILE_CLIP_SECS).await {
                Ok(w) => w,
                Err(_) if start > 0.0 => decode_clip_wav(&file, 0.0, FILE_CLIP_SECS).await?,
                Err(e) => return Err(e),
            };
            if provider == "audd" {
                audd_recognize(wav, key).await
            } else {
                crate::song_id_gemini::recognize(wav, key, model).await
            }
        }
        other => Err(format!("Unknown song ID provider: {other}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn acoustid_picks_best_scored_recording() {
        let json = serde_json::json!({
            "status": "ok",
            "results": [
                {"score": 0.3, "recordings": [{"id": "low", "title": "Low"}]},
                {"score": 0.97, "recordings": [{
                    "id": "rec1", "title": "Song",
                    "artists": [{"name": "A"}, {"name": "B"}],
                    "releasegroups": [{"id": "rg1", "title": "Album"}]
                }]}
            ]
        });
        let r = parse_acoustid(&json).unwrap().unwrap();
        assert_eq!(r.title, "Song");
        assert_eq!(r.artist, "A, B");
        assert_eq!(r.album, "Album");
        assert!(r.artwork.ends_with("/release-group/rg1/front-250"));
        assert!(r.link.ends_with("/recording/rec1"));
    }

    #[test]
    fn acoustid_no_match_and_error() {
        let none = serde_json::json!({"status": "ok", "results": [{"score": 0.9}]});
        assert!(parse_acoustid(&none).unwrap().is_none());
        let err = serde_json::json!({"status": "error", "error": {"message": "invalid API key"}});
        assert_eq!(
            parse_acoustid(&err).unwrap_err(),
            "AcoustID: invalid API key"
        );
    }

    #[test]
    fn parses_ffmpeg_duration() {
        let s = "  Duration: 00:03:45.12, start: 0.000000, bitrate: 320 kb/s";
        assert_eq!(parse_ffmpeg_duration(s), Some(225));
        assert_eq!(parse_ffmpeg_duration("nothing"), None);
    }
}
