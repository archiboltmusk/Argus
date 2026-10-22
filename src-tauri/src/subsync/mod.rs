mod correlate;
mod extract;
pub mod moviehash;

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(serde::Serialize)]
pub struct SyncOut {
    #[serde(rename = "offsetSec")]
    pub offset_sec: f32,
    pub ratio: f32,
    pub confidence: f32,
    /// (time in the fitted timeline, residual offset) pairs; empty when the global fit is enough.
    pub anchors: Vec<[f32; 2]>,
}

static BUSY: AtomicBool = AtomicBool::new(false);

struct BusyGuard;
impl Drop for BusyGuard {
    fn drop(&mut self) {
        BUSY.store(false, Ordering::SeqCst);
    }
}

fn windows(dur: f32) -> Vec<(f32, f32)> {
    if dur < 900.0 {
        let start = (dur * 0.05).max(5.0);
        let len = (dur * 0.9 - start).max(30.0);
        return vec![(start, len)];
    }
    // Spread samples across the film so local residuals (cuts, uneven drift) can be measured.
    let len = 240.0f32;
    let first = 180.0f32;
    let last = (dur - len - 120.0).max(first + len);
    let n = 5usize;
    (0..n).map(|i| (first + (last - first) * i as f32 / (n - 1) as f32, len)).collect()
}

#[tauri::command]
pub async fn sync_subtitle(
    url: String,
    headers: Option<HashMap<String, String>>,
    cues: Vec<[f32; 2]>,
    duration_sec: f32,
    info_hash: Option<String>,
    conf_min: Option<f32>,
) -> Result<Option<SyncOut>, String> {
    if info_hash.as_deref().map(|h| !h.is_empty()).unwrap_or(false) {
        return Ok(None);
    }
    if !crate::transcode::ffmpeg_present() {
        return Err("ffmpeg-unavailable".into());
    }
    if cues.len() < 4 || duration_sec < 60.0 {
        return Ok(None);
    }
    if BUSY.swap(true, Ordering::SeqCst) {
        return Ok(None);
    }
    let _guard = BusyGuard;

    let hdrs = headers.unwrap_or_default();
    let mut audio: Vec<(f32, f32)> = Vec::new();
    for (start, len) in windows(duration_sec) {
        if let Ok(iv) = extract::speech_intervals(&url, &hdrs, start, len).await {
            audio.extend(iv);
        }
    }
    if audio.is_empty() {
        return Err("no-audio-analyzed".into());
    }

    let cue_pairs: Vec<(f32, f32)> = cues.iter().map(|c| (c[0], c[1])).collect();
    let res = correlate::solve(&audio, &cue_pairs, duration_sec, conf_min.unwrap_or(0.55));
    Ok(res.map(|r| {
        let anchors = if duration_sec >= 900.0 {
            correlate::local_anchors(&audio, &cue_pairs, r.ratio, r.offset_sec, duration_sec)
                .into_iter()
                .map(|a| [a.t, a.offset_sec])
                .collect()
        } else {
            Vec::new()
        };
        SyncOut { offset_sec: r.offset_sec, ratio: r.ratio, confidence: r.confidence, anchors }
    }))
}
