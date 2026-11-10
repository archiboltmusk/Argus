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

#[derive(Clone, serde::Serialize)]
pub struct AsrToken {
    pub text: String,
    pub t0: f32,
    pub t1: f32,
    pub p: f32,
}

#[derive(Clone, serde::Serialize)]
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

pub async fn pcm_window(
    url: &str,
    headers: &HashMap<String, String>,
    start_sec: f32,
    len_sec: f32,
    map_spec: &str,
) -> Result<Vec<f32>, String> {
    let ff = crate::transcode::locate_ffmpeg().ok_or("ffmpeg not found")?;
    let mut cmd = Command::new(&ff);
    cmd.arg("-hide_banner")
        .arg("-nostats")
        .arg("-loglevel")
        .arg("error");

    // Automatically reconnect on dropped TCP/TLS sockets during backgrounding or network latency
    if url.starts_with("http://") || url.starts_with("https://") {
        cmd.arg("-reconnect")
            .arg("1")
            .arg("-reconnect_at_eof")
            .arg("1")
            .arg("-reconnect_streamed")
            .arg("1")
            .arg("-reconnect_delay_max")
            .arg("5");
    }

    cmd.arg("-user_agent")
        .arg(url_guard::user_agent(headers).unwrap_or_else(|| "Argus".into()));
    let blob = url_guard::safe_header_blob(headers);
    if !blob.is_empty() {
        cmd.arg("-headers").arg(blob);
    }
    cmd.arg("-ss")
        .arg(start_sec.to_string())
        .arg("-accurate_seek")
        .arg("-t")
        .arg(len_sec.to_string())
        .arg("-i")
        .arg(url)
        .arg("-vn")
        .arg("-map")
        .arg(map_spec)
        .arg("-af")
        .arg("highpass=f=100,lowpass=f=6000,speechnorm=e=4:r=0.0005:l=1")
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
    cmd.stderr(std::process::Stdio::null());
    cmd.kill_on_drop(true);
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000 | 0x0000_4000);

    let output = tokio::time::timeout(Duration::from_secs(PCM_TIMEOUT_SECS), cmd.output())
        .await
        .map_err(|_| "ffmpeg-timeout".to_string())?
        .map_err(|error| format!("run ffmpeg: {}", error))?;
    if !output.status.success() {
        return Err(format!("ffmpeg-exit-status: {}", output.status));
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
    cancel_signal: Arc<AtomicBool>,
) -> Result<Vec<AsrSegment>, String> {
    use tauri::{Emitter, Manager};
    let chunk = 30.0f32;
    let overlap = 1.0f32;
    let mut out: Vec<AsrSegment> = Vec::new();
    let mut start = 0.0f32;
    let total_chunks = (dur / chunk).ceil().max(1.0) as usize;
    let mut chunk_idx = 0;
    let mut consecutive_failures = 0;

    while start < dur {
        if cancel_signal.load(Ordering::Relaxed) {
            eprintln!("[ASR] transcription cancelled");
            return Err("cancelled".into());
        }

        let len = chunk.min(dur - start);
        if len < 1.0 {
            break;
        }

        chunk_idx += 1;
        let _ = app.emit(
            "asr://progress",
            serde_json::json!({
                "current": chunk_idx,
                "total": total_chunks,
                "currentSec": start,
                "totalSec": dur,
                "count": out.len(),
            }),
        );

        // Fetch audio chunk with up to 3 retries
        let mut pcm_opt = None;
        for attempt in 1..=3 {
            if cancel_signal.load(Ordering::Relaxed) {
                return Err("cancelled".into());
            }
            match pcm_window(url, headers, start, len + overlap, map_spec).await {
                Ok(p) => {
                    pcm_opt = Some(p);
                    consecutive_failures = 0;
                    break;
                }
                Err(err) => {
                    eprintln!("[ASR] chunk {} at {:.1}s attempt {} failed: {}", chunk_idx, start, attempt, err);
                    if attempt < 3 {
                        tokio::time::sleep(Duration::from_millis(500 * attempt as u64)).await;
                    }
                }
            }
        }

        let pcm = match pcm_opt {
            Some(p) => p,
            None => {
                consecutive_failures += 1;
                // Only abort if 10 consecutive chunks completely fail (e.g. stream terminated)
                if consecutive_failures >= 10 {
                    eprintln!("[ASR] 10 consecutive chunk failures; ending transcription early");
                    break;
                }
                // Skip this single bad/silent chunk so the remaining movie is NOT chopped!
                start += chunk;
                continue;
            }
        };

        if pcm.len() > ASR_SAMPLE_RATE as usize {
            if let Ok(segs) = engine.transcribe(&pcm, lang, translate) {
                let mut added_any = false;
                for mut seg in segs {
                    seg.t0 += start;
                    seg.t1 += start;
                    let clean = seg.text.trim();
                    if clean.is_empty()
                        || clean == "..."
                        || clean == "."
                        || clean == "-"
                        || clean == "You"
                        || clean == "Thank you."
                        || clean.starts_with("[_")
                        || clean.starts_with("<|")
                    {
                        continue;
                    }
                    if out.last().map(|p| seg.t0 >= p.t1 - 0.25).unwrap_or(true) {
                        for tk in seg.tokens.iter_mut() {
                            tk.t0 += start;
                            tk.t1 += start;
                        }
                        out.push(seg);
                        added_any = true;
                    }
                }
                if added_any {
                    let current_srt = segments_to_srt(&out);

                    // Write directly to disk from Rust on EVERY chunk!
                    // This guarantees subtitles remain continuous even when minimized!
                    if let Some(path) = out_path {
                        if let Err(e) = std::fs::write(path, &current_srt) {
                            eprintln!("[ASR] error writing srt: {}", e);
                        }
                    }

                    // Directly notify mpv to reload subtitles from Rust!
                    if let Some(mpv) = app.try_state::<crate::mpv::MpvState>() {
                        let _ = crate::mpv::mpv_command(
                            mpv,
                            vec![serde_json::Value::String("sub-reload".to_string())],
                        )
                        .await;
                    }

                    let _ = app.emit("asr://live-cues", serde_json::json!({
                        "chunk": chunk_idx,
                        "total": total_chunks,
                        "srt": current_srt,
                        "count": out.len(),
                        "filePath": out_path,
                    }));
                }
            }
        }

        start += chunk;
    }

    Ok(out)
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

#[tauri::command]
pub async fn asr_generate_subtitles(
    app: tauri::AppHandle,
    url: String,
    headers: Option<HashMap<String, String>>,
    duration_sec: Option<f32>,
    lang: Option<String>,
    translate: Option<bool>,
    output_path: Option<String>,
) -> Result<String, String> {
    url_guard::validate_media_url(&url, true)?;

    #[cfg(not(feature = "asr-whisper"))]
    return {
        let _ = (&app, &url, &headers, duration_sec, &lang, translate, &output_path);
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

        let model_path = crate::asr_model::asr_ensure_model(app.clone()).await?;
        let engine = load_engine(&model_path)?;
        let hdrs = headers.unwrap_or_default();
        let dur = match duration_sec {
            Some(d) if d > 30.0 => d,
            _ => probe_media_duration(&url, &hdrs).await.unwrap_or(7200.0),
        };

        let is_translate = translate.unwrap_or(false);
        let segments = generate(
            &app,
            &*engine,
            &url,
            &hdrs,
            dur,
            lang.as_deref().filter(|s| !s.is_empty()),
            is_translate,
            "0:a:0",
            output_path.as_deref(),
            cancel_signal,
        )
        .await?;

        let srt = segments_to_srt(&segments);

        if srt.is_empty() {
            return Err("No intelligible dialogue found in stream".to_string());
        }

        if let Some(ref path) = output_path {
            let _ = std::fs::write(path, &srt);
        }

        Ok(srt)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
