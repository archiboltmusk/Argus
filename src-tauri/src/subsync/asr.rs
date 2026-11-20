#![allow(dead_code)]

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, LazyLock, Mutex};
use std::time::Duration;
use tokio::process::Command;

use super::asr_match::{cue_tokens, score_window};
use super::url_guard;

pub static ACTIVE_ASR_CANCEL: LazyLock<Mutex<Option<Arc<AtomicBool>>>> =
    LazyLock::new(|| Mutex::new(None));

pub const ASR_SAMPLE_RATE: u32 = 16000;
const PCM_TIMEOUT_SECS: u64 = 60;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct AsrToken {
    pub text: String,
    pub t0: f32,
    pub t1: f32,
    pub p: f32,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AsrSegment {
    pub text: String,
    pub t0: f32,
    pub t1: f32,
    pub no_speech: f32,
    pub tokens: Vec<AsrToken>,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsrWindow {
    pub start_sec: f32,
    pub len_sec: f32,
    pub lang: String,
    pub tokens: Vec<AsrToken>,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowEvidence {
    pub start_sec: f32,
    pub len_sec: f32,
    pub lang: String,
    pub speech_tokens: u32,
    pub eligible: u32,
    pub matched: u32,
    pub residual_sec: f32,
    pub word_offset_sec: f32,
    pub word_ratio: f32,
    pub anchors: u32,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifyReport {
    pub windows: Vec<WindowEvidence>,
    pub model: String,
    pub sub_lang: String,
    pub offset_sec: f32,
    pub ratio: f32,
}

pub trait AsrEngine: Send + Sync {
    fn transcribe(
        &self,
        pcm: &[f32],
        lang: Option<&str>,
        translate: bool,
    ) -> Result<Vec<AsrSegment>, String>;
}

pub struct NullEngine;
impl AsrEngine for NullEngine {
    fn transcribe(&self, _: &[f32], _: Option<&str>, _: bool) -> Result<Vec<AsrSegment>, String> {
        Err("asr-engine-unavailable".into())
    }
}

async fn run_ffmpeg_pcm(
    url: &str,
    headers: &HashMap<String, String>,
    start_sec: f32,
    len_sec: f32,
    map_spec: Option<&str>,
    use_speechnorm: bool,
) -> Result<Vec<f32>, String> {
    let ff = crate::transcode::locate_ffmpeg().ok_or("ffmpeg not found")?;

    let resolved_url_string = if let Some(rest) = url.strip_prefix("http://asset.localhost/")
        .or_else(|| url.strip_prefix("https://asset.localhost/"))
        .or_else(|| url.strip_prefix("asset://localhost/"))
        .or_else(|| url.strip_prefix("asset://"))
    {
        let decoded = urlencoding::decode(rest).unwrap_or_else(|_| rest.into());
        if !decoded.starts_with('/') && !decoded.contains(':') {
            format!("/{}", decoded)
        } else {
            decoded.into_owned()
        }
    } else if let Some(rest) = url.strip_prefix("file://") {
        urlencoding::decode(rest).unwrap_or_else(|_| rest.into()).into_owned()
    } else {
        url.to_string()
    };

    let mut cmd = Command::new(&ff);
    cmd.arg("-hide_banner")
        .arg("-nostats")
        .arg("-loglevel")
        .arg("error");

    // Automatically reconnect on dropped TCP/TLS sockets during backgrounding or network latency
    if (resolved_url_string.starts_with("http://") || resolved_url_string.starts_with("https://"))
        && !resolved_url_string.contains("asset.localhost")
    {
        cmd.arg("-reconnect")
            .arg("1")
            .arg("-reconnect_streamed")
            .arg("1")
            .arg("-reconnect_delay_max")
            .arg("5");
        cmd.arg("-user_agent")
            .arg(url_guard::user_agent(headers).unwrap_or_else(|| "Argus".into()));
        let blob = url_guard::safe_header_blob(headers);
        if !blob.is_empty() {
            cmd.arg("-headers").arg(blob);
        }
    }
    // Fast seek before input URL
    cmd.arg("-ss")
        .arg(start_sec.to_string())
        .arg("-accurate_seek")
        .arg("-i")
        .arg(&resolved_url_string)
        // Duration MUST be placed AFTER -i as an output option to slice exactly len_sec from seek point
        .arg("-t")
        .arg(len_sec.to_string())
        .arg("-vn");

    if let Some(spec) = map_spec {
        if !spec.is_empty() {
            cmd.arg("-map").arg(spec);
        }
    }

    let filter = if use_speechnorm {
        "highpass=f=100,lowpass=f=6000,speechnorm=e=4:r=0.0005:l=1,aresample=16000"
    } else {
        "highpass=f=100,lowpass=f=6000,aresample=16000"
    };

    cmd.arg("-af")
        .arg(filter)
        .arg("-ac")
        .arg("1")
        .arg("-ar")
        .arg(ASR_SAMPLE_RATE.to_string())
        .arg("-f")
        .arg("f32le")
        .arg("-acodec")
        .arg("pcm_f32le")
        .arg("-");
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    cmd.kill_on_drop(true);
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000 | 0x0000_4000);

    let output = tokio::time::timeout(Duration::from_secs(PCM_TIMEOUT_SECS), cmd.output())
        .await
        .map_err(|_| "ffmpeg-timeout".to_string())?
        .map_err(|error| format!("run ffmpeg: {}", error))?;
    if !output.status.success() {
        let err_text = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffmpeg-exit-status: {} ({})", output.status, err_text.trim()));
    }
    let buf = output.stdout;

    let mut pcm = Vec::with_capacity(buf.len() / 4);
    let mut i = 0;
    while i + 4 <= buf.len() {
        pcm.push(f32::from_le_bytes([
            buf[i],
            buf[i + 1],
            buf[i + 2],
            buf[i + 3],
        ]));
        i += 4;
    }
    Ok(pcm)
}

pub async fn pcm_window(
    url: &str,
    headers: &HashMap<String, String>,
    start_sec: f32,
    len_sec: f32,
    map_spec: &str,
) -> Result<Vec<f32>, String> {
    match run_ffmpeg_pcm(url, headers, start_sec, len_sec, Some(map_spec), true).await {
        Ok(pcm) if !pcm.is_empty() => Ok(pcm),
        Err(err) => {
            eprintln!("[ASR] pcm_window initial attempt failed: {}. Retrying the selected stream with the standard filter...", err);
            match run_ffmpeg_pcm(url, headers, start_sec, len_sec, Some(map_spec), false).await {
                Ok(pcm) => Ok(pcm),
                Err(err2) => Err(format!("initial: {}, fallback: {}", err, err2)),
            }
        }
        Ok(_) => {
            // Empty buffer, retry the same stream with the standard filter
            run_ffmpeg_pcm(url, headers, start_sec, len_sec, Some(map_spec), false).await
        }
    }
}

pub fn probe_windows(dur: f32, n: usize, len: f32) -> Vec<(f32, f32)> {
    let n = n.max(1);
    let lo = (dur * 0.08).max(5.0);
    let hi = (dur * 0.92 - len).max(lo);
    if hi <= lo || n == 1 {
        return vec![((lo + hi) * 0.5, len.min(dur))];
    }
    let step = (hi - lo) / (n as f32 - 1.0);
    (0..n).map(|k| (lo + step * k as f32, len)).collect()
}

pub async fn transcribe_windows(
    engine: &dyn AsrEngine,
    url: &str,
    headers: &HashMap<String, String>,
    probes: &[(f32, f32)],
    lang: Option<&str>,
    map_spec: &str,
) -> Vec<AsrWindow> {
    let mut out = Vec::new();
    for &(start, len) in probes {
        let pcm = match pcm_window(url, headers, start, len, map_spec).await {
            Ok(p) if p.len() > ASR_SAMPLE_RATE as usize => p,
            _ => continue,
        };
        let segs = match engine.transcribe(&pcm, lang, false) {
            Ok(s) => s,
            Err(_) => continue,
        };
        let mut tokens = Vec::new();
        for seg in segs {
            for mut tk in seg.tokens {
                tk.t0 += start;
                tk.t1 += start;
                tokens.push(tk);
            }
        }
        out.push(AsrWindow {
            start_sec: start,
            len_sec: len,
            lang: lang.unwrap_or("auto").into(),
            tokens,
        });
    }
    out
}

#[allow(clippy::too_many_arguments)]
pub async fn verify(
    engine: &dyn AsrEngine,
    url: &str,
    headers: &HashMap<String, String>,
    cues: &[(f32, f32, String)],
    offset_sec: f32,
    ratio: f32,
    sub_lang: &str,
    probes: &[(f32, f32)],
    model_name: &str,
    map_spec: &str,
) -> Result<VerifyReport, String> {
    let asr = transcribe_windows(engine, url, headers, probes, Some(sub_lang), map_spec).await;
    if asr.is_empty() {
        return Err("no-audio-transcribed".into());
    }
    let mut windows = Vec::new();
    for w in asr {
        let subs = cue_tokens(
            cues,
            w.start_sec,
            w.start_sec + w.len_sec,
            offset_sec,
            ratio,
        );
        windows.push(score_window(
            &w.tokens,
            &subs,
            w.lang,
            w.start_sec,
            w.len_sec,
        ));
    }
    Ok(VerifyReport {
        windows,
        model: model_name.into(),
        sub_lang: sub_lang.into(),
        offset_sec,
        ratio,
    })
}

pub async fn probe_media_duration(url: &str, headers: &HashMap<String, String>) -> Option<f32> {
    let ffprobe = crate::transcode::locate_ffprobe()?;
    let mut cmd = tokio::process::Command::new(&ffprobe);
    cmd.arg("-v")
        .arg("error")
        .arg("-show_entries")
        .arg("format=duration")
        .arg("-of")
        .arg("default=noprint_wrappers=1:nokey=1");
    let blob = url_guard::safe_header_blob(headers);
    if !blob.is_empty() {
        cmd.arg("-headers").arg(blob);
    }
    cmd.arg("-i").arg(url);
    cmd.stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null());
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);

    let output = tokio::time::timeout(Duration::from_secs(8), cmd.output())
        .await
        .ok()?
        .ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout.trim().parse::<f32>().ok().filter(|&d| d > 10.0)
}

pub fn segments_to_srt(segments: &[AsrSegment]) -> String {
    let mut srt = String::new();
    let mut idx = 1;
    for seg in segments {
        let text = seg.text.trim();
        if text.is_empty()
            || text == "..."
            || text == "."
            || text == "-"
            || text.starts_with("[_")
            || text.starts_with("<|")
        {
            continue;
        }

        let t0 = seg.t0;
        let mut t1 = seg.t1;
        if t1 <= t0 {
            t1 = t0 + 1.5;
        } else if t1 - t0 < 0.8 {
            t1 = t0 + 0.8;
        }

        let t0_ms = (t0 * 1000.0).round() as u64;
        let t1_ms = (t1 * 1000.0).round() as u64;

        let h0 = t0_ms / 3_600_000;
        let m0 = (t0_ms % 3_600_000) / 60_000;
        let s0 = (t0_ms % 60_000) / 1000;
        let ms0 = t0_ms % 1000;

        let h1 = t1_ms / 3_600_000;
        let m1 = (t1_ms % 3_600_000) / 60_000;
        let s1 = (t1_ms % 60_000) / 1000;
        let ms1 = t1_ms % 1000;

        srt.push_str(&format!("{}
", idx));
        srt.push_str(&format!(
            "{:02}:{:02}:{:02},{:03} --> {:02}:{:02}:{:02},{:03}
",
            h0, m0, s0, ms0, h1, m1, s1, ms1
        ));
        srt.push_str(text);
        srt.push_str("

");
        idx += 1;
    }
    srt
}
fn subtitle_checkpoint_dir(
    app: &tauri::AppHandle,
    source: &str,
    model: &str,
    duration: f32,
    language: Option<&str>,
    translate: bool,
    map_spec: &str,
) -> Option<std::path::PathBuf> {
    use sha2::{Digest, Sha256};
    use tauri::Manager;

    // A URL alone does not identify the audio: a server may return different
    // cuts or tracks on different requests. Resume only identifiable local files.
    let path = if source.starts_with("file://") {
        url::Url::parse(source).ok()?.to_file_path().ok()?
    } else {
        std::path::PathBuf::from(source)
    };
    let path = path.canonicalize().ok()?;
    let metadata = path.metadata().ok()?;
    if !metadata.is_file() {
        return None;
    }
    let modified = metadata.modified().ok()?.duration_since(std::time::UNIX_EPOCH).ok()?;
    let key = serde_json::to_vec(&(
        path.to_str()?, metadata.len(), modified.as_nanos(), model,
        duration.to_bits(), language, translate, map_spec,
    )).ok()?;
    let dir = app.path().app_cache_dir().ok()?
        .join("subtitle-checkpoints-v1")
        .join(format!("{:x}", Sha256::digest(key)));
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir)
}

fn store_subtitle_chunk(path: &std::path::Path, segments: &[AsrSegment]) -> Result<(), String> {
    static SEQUENCE: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let temporary = path.with_extension(format!(
        "{}-{}.tmp", std::process::id(), SEQUENCE.fetch_add(1, Ordering::Relaxed)
    ));
    let bytes = serde_json::to_vec(segments).map_err(|err| err.to_string())?;
    let result = std::fs::write(&temporary, bytes).and_then(|_| std::fs::rename(&temporary, path));
    if result.is_err() {
        let _ = std::fs::remove_file(&temporary);
    }
    result.map_err(|err| err.to_string())
}

async fn transcribe_window(
    engine: &dyn AsrEngine,
    url: &str,
    headers: &HashMap<String, String>,
    start: f32,
    length: f32,
    map_spec: &str,
    lang: Option<&str>,
    translate: bool,
) -> Result<Vec<AsrSegment>, String> {
    let pcm = pcm_window(url, headers, start, length, map_spec).await?;
    if pcm.is_empty() {
        return Err("no audio samples".into());
    }
    let audio_seconds = pcm.len() as f32 / ASR_SAMPLE_RATE as f32;
    if audio_seconds + 0.5 < length {
        return Err("audio ended before the requested range".into());
    }
    let mut segments = engine.transcribe(&pcm, lang, translate)?;
    for segment in &mut segments {
        segment.t0 += start;
        segment.t1 = (segment.t1 + start).min(start + length);
        for token in &mut segment.tokens {
            token.t0 += start;
            token.t1 += start;
        }
    }
    segments.retain(|segment| {
        let text = segment.text.trim();
        segment.t1 > segment.t0
            && !matches!(text, "" | "..." | "." | "-")
            && !text.starts_with("[_")
            && !text.starts_with("<|")
    });
    Ok(segments)
}

pub async fn generate(
    app: &tauri::AppHandle,
    engine: &dyn AsrEngine,
    url: &str,
    headers: &HashMap<String, String>,
    dur: f32,
    lang: Option<&str>,
    translate: bool,
    map_spec: &str,
    out_path: Option<&str>,
    checkpoints: Option<&std::path::Path>,
    cancel_signal: Arc<AtomicBool>,
) -> Result<(Vec<AsrSegment>, Vec<(f32, f32)>), String> {
    use tauri::{Emitter, Manager};
    const CHUNK: f32 = 30.0;
    let mut out = Vec::<AsrSegment>::new();
    let mut gaps = Vec::new();
    let total = (dur / CHUNK).ceil() as usize;
    if let Some(parent) = out_path.and_then(|path| std::path::Path::new(path).parent()) {
        std::fs::create_dir_all(parent).map_err(|err| format!("Saving subtitles failed: {err}"))?;
    }

    for index in 0..total {
        if cancel_signal.load(Ordering::Relaxed) {
            return Err("cancelled".into());
        }
        let start = index as f32 * CHUNK;
        let length = CHUNK.min(dur - start);
        let checkpoint = checkpoints.map(|dir| dir.join(format!("{index}.json")));
        let cached = checkpoint.as_ref()
            .and_then(|path| std::fs::read(path).ok())
            .and_then(|bytes| serde_json::from_slice::<Vec<AsrSegment>>(&bytes).ok());

        let needs_checkpoint = cached.is_none();
        let segments = match cached {
            Some(segments) => segments,
            None => {
                let result = transcribe_window(
                    engine, url, headers, start, length, map_spec, lang, translate,
                ).await;
                if result.is_err() {
                    let mut recovered = Vec::new();
                    let mut offset = 0.0;
                    while offset < length {
                        if cancel_signal.load(Ordering::Relaxed) {
                            return Err("cancelled".into());
                        }
                        let span = 10.0_f32.min(length - offset);
                        let from = start + offset;
                        match transcribe_window(engine, url, headers, from, span, map_spec, lang, translate).await {
                            Ok(segments) => recovered.extend(segments),
                            Err(_) => gaps.push((from, from + span)),
                        }
                        offset += span;
                    }
                    recovered
                } else {
                    result.unwrap_or_default()
                }
            }
        };

        if cancel_signal.load(Ordering::Relaxed) {
            return Err("cancelled".into());
        }
        if !gaps.last().is_some_and(|(from, _)| *from >= start) {
            if let Some(path) = &checkpoint {
                if needs_checkpoint {
                    store_subtitle_chunk(path, &segments)
                        .map_err(|err| format!("Saving subtitle progress failed: {err}"))?;
                }
            }
        }

        let had_cues = !segments.is_empty();
        out.extend(segments);
        if had_cues {
            let srt = segments_to_srt(&out);
            if let Some(path) = out_path {
                std::fs::write(path, &srt).map_err(|err| format!("Saving subtitles failed: {err}"))?;
            }
            if let Some(mpv) = app.try_state::<crate::mpv::MpvState>() {
                let _ = crate::mpv::mpv_command(
                    mpv,
                    vec![serde_json::Value::String("sub-reload".to_string())],
                ).await;
            }
            let latest_text = out.last().map(|segment| segment.text.as_str()).unwrap_or_default();
            let _ = app.emit("asr://live-cues", serde_json::json!({
                "chunk": index + 1, "total": total, "srt": srt, "count": out.len(),
                "filePath": out_path, "latestText": latest_text,
            }));
        }
        let _ = app.emit("asr://progress", serde_json::json!({
            "current": index + 1, "total": total, "currentSec": start + length,
            "totalSec": dur, "count": out.len(),
        }));
    }
    Ok((out, gaps))
}

#[cfg(feature = "asr-whisper")]
fn load_engine(model_path: &str) -> Result<Box<dyn AsrEngine>, String> {
    Ok(Box::new(super::asr_whisper::WhisperEngine::load(
        model_path,
    )?))
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn asr_transcribe_windows(
    url: String,
    headers: Option<HashMap<String, String>>,
    duration_sec: f32,
    sub_lang: Option<String>,
    probe_count: Option<usize>,
    window_sec: Option<f32>,
    model_path: Option<String>,
    map_spec: Option<String>,
) -> Result<Vec<AsrWindow>, String> {
    #[cfg(not(feature = "asr-whisper"))]
    return {
        let _ = (
            &url,
            &headers,
            duration_sec,
            &sub_lang,
            probe_count,
            window_sec,
            &model_path,
            &map_spec,
        );
        Ok(Vec::new())
    };

    #[cfg(feature = "asr-whisper")]
    {
        url_guard::validate_media_url(&url, true)?;
        let Some(model) = model_path else {
            return Ok(Vec::new());
        };
        let engine = match load_engine(&model) {
            Ok(e) => e,
            Err(_) => return Ok(Vec::new()),
        };
        let hdrs = headers.unwrap_or_default();
        let ms = url_guard::safe_map_spec(map_spec.as_deref());
        let win = window_sec.unwrap_or(30.0).max(5.0);
        let probes = probe_windows(duration_sec, probe_count.unwrap_or(3), win);
        let lang = sub_lang.as_deref().filter(|s| !s.is_empty());
        Ok(transcribe_windows(engine.as_ref(), &url, &hdrs, &probes, lang, &ms).await)
    }
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn asr_verify(
    url: String,
    headers: Option<HashMap<String, String>>,
    cues: Vec<(f32, f32, String)>,
    offset_sec: f32,
    ratio: f32,
    sub_lang: String,
    duration_sec: f32,
    probe_count: Option<usize>,
    window_sec: Option<f32>,
    model_path: Option<String>,
    map_spec: Option<String>,
) -> Result<Option<VerifyReport>, String> {
    #[cfg(not(feature = "asr-whisper"))]
    return {
        let _ = (
            &url,
            &headers,
            &cues,
            offset_sec,
            ratio,
            &sub_lang,
            duration_sec,
            probe_count,
            window_sec,
            &model_path,
            &map_spec,
        );
        Ok(None)
    };

    #[cfg(feature = "asr-whisper")]
    {
        url_guard::validate_media_url(&url, true)?;
        let Some(model) = model_path else {
            return Ok(None);
        };
        let engine = match load_engine(&model) {
            Ok(e) => e,
            Err(_) => return Ok(None),
        };
        let hdrs = headers.unwrap_or_default();
        let ms = url_guard::safe_map_spec(map_spec.as_deref());
        let win = window_sec.unwrap_or(30.0).max(5.0);
        let probes = probe_windows(duration_sec, probe_count.unwrap_or(3), win);
        let lang = if sub_lang.is_empty() {
            "auto"
        } else {
            sub_lang.as_str()
        };
        match verify(
            engine.as_ref(),
            &url,
            &hdrs,
            &cues,
            offset_sec,
            ratio,
            lang,
            &probes,
            &model,
            &ms,
        )
        .await
        {
            Ok(rep) => Ok(Some(rep)),
            Err(_) => Ok(None),
        }
    }
}

#[tauri::command]
pub fn asr_is_available() -> bool {
    cfg!(feature = "asr-whisper")
}

#[tauri::command]
pub async fn asr_cancel_subtitles() -> Result<(), String> {
    let mut lock = ACTIVE_ASR_CANCEL.lock().unwrap();
    if let Some(cancel) = lock.take() {
        cancel.store(true, Ordering::SeqCst);
    }
    Ok(())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedSubtitles {
    srt: String,
    missing_ranges: Vec<(f32, f32)>,
}

#[tauri::command]
pub async fn asr_generate_subtitles(
    app: tauri::AppHandle,
    url: String,
    headers: Option<HashMap<String, String>>,
    duration_sec: Option<f32>,
    audio_stream_index: Option<u32>,
    lang: Option<String>,
    translate: Option<bool>,
    output_path: Option<String>,
) -> Result<GeneratedSubtitles, String> {
    url_guard::validate_media_url(&url, true)?;

    #[cfg(not(feature = "asr-whisper"))]
    return {
        let _ = (&app, &url, &headers, duration_sec, audio_stream_index, &lang, translate, &output_path);
        Err("Whisper ASR is not compiled into this build".to_string())
    };

    #[cfg(feature = "asr-whisper")]
    {
        // Cancel any active transcription session and register the new cancellation token
        let cancel_signal = Arc::new(AtomicBool::new(false));
        {
            let mut lock = ACTIVE_ASR_CANCEL.lock().unwrap();
            if let Some(prev) = lock.take() {
                prev.store(true, Ordering::SeqCst);
            }
            *lock = Some(cancel_signal.clone());
        }

        let lang = lang.as_deref().filter(|s| !s.is_empty() && *s != "auto");
        let is_translate = translate.unwrap_or(false);
        let model_path = crate::asr_model::ensure_generation_model(&app, lang, is_translate).await?;
        if cancel_signal.load(Ordering::Relaxed) {
            return Err("cancelled".into());
        }
        let engine = load_engine(&model_path)?;
        let hdrs = headers.unwrap_or_default();
        let dur = match duration_sec {
            Some(d) if d.is_finite() && d > 0.0 => d,
            _ => probe_media_duration(&url, &hdrs).await
                .filter(|d| d.is_finite() && *d > 0.0)
                .ok_or("Could not determine media duration. Wait for playback to load and retry.")?,
        };

        let audio_map = audio_stream_index.map_or_else(|| "0:a:0".to_string(), |index| format!("0:{index}"));
        let checkpoints = subtitle_checkpoint_dir(&app, &url, &model_path, dur, lang, is_translate, &audio_map);
        let (segments, missing_ranges) = generate(
            &app,
            &*engine,
            &url,
            &hdrs,
            dur,
            lang,
            is_translate,
            &audio_map,
            output_path.as_deref(),
            checkpoints.as_deref(),
            cancel_signal,
        )
        .await?;

        let srt = segments_to_srt(&segments);

        if srt.is_empty() && missing_ranges.is_empty() {
            return Err("No intelligible dialogue found in stream".to_string());
        }

        if let Some(ref path) = output_path {
            if let Some(parent) = std::path::Path::new(path).parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            std::fs::write(path, &srt).map_err(|err| format!("Saving subtitles failed: {err}"))?;
        }

        Ok(GeneratedSubtitles { srt, missing_ranges })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checkpoint_round_trips_silent_and_spoken_ranges() {
        let dir = std::env::temp_dir().join(format!("argus-asr-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("chunk.json");
        store_subtitle_chunk(&path, &[]).unwrap();
        let empty: Vec<AsrSegment> = serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
        assert!(empty.is_empty());

        let segment = AsrSegment {
            text: "Hello".to_string(),
            t0: 60.5,
            t1: 61.5,
            no_speech: 0.0,
            tokens: Vec::new(),
        };
        let spoken_path = dir.join("spoken.json");
        store_subtitle_chunk(&spoken_path, &[segment]).unwrap();
        let restored: Vec<AsrSegment> =
            serde_json::from_slice(&std::fs::read(&spoken_path).unwrap()).unwrap();
        assert_eq!(restored.len(), 1);
        assert_eq!(restored[0].text, "Hello");
        assert_eq!(restored[0].t0, 60.5);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn probe_windows_spread_across_middle() {
        let w = probe_windows(3600.0, 3, 20.0);
        assert_eq!(w.len(), 3);
        assert!(w[0].0 >= 5.0 && w[2].0 < 3600.0 * 0.92);
        assert!(w[1].0 > w[0].0 && w[2].0 > w[1].0);
    }

    #[test]
    fn probe_windows_single_centered() {
        let w = probe_windows(120.0, 1, 60.0);
        assert_eq!(w.len(), 1);
    }
}
