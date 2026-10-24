//! Stall fallback (Roadmap #5): detect playback buffer stalls and pick the
//! next best-ranked cached Debrid / HTTP stream to resume seamlessly.

use std::time::{Duration, Instant};

use crate::types::ScoredStream;

pub const STALL_THRESHOLD: Duration = Duration::from_secs(8);

/// Fed by mpv's core-idle / paused-for-cache events and decoded frame progress.
#[derive(Debug, Clone)]
pub struct StallDetector {
    buffering_since: Option<Instant>,
    last_decoded_frame_at: Option<Instant>,
    reported: bool,
    threshold: Duration,
}

impl Default for StallDetector {
    fn default() -> Self {
        Self::new(STALL_THRESHOLD)
    }
}

impl StallDetector {
    pub fn new(threshold: Duration) -> Self {
        Self {
            buffering_since: None,
            last_decoded_frame_at: None,
            reported: false,
            threshold,
        }
    }

    /// Called when mpv emits a new decoded frame (e.g. `time-pos` progression).
    pub fn on_decoded_frame(&mut self, now: Instant) {
        self.last_decoded_frame_at = Some(now);
        self.buffering_since = None;
        self.reported = false;
    }

    /// Called when mpv reports `paused-for-cache`.
    pub fn on_buffering(&mut self, now: Instant) {
        self.buffering_since.get_or_insert(now);
    }

    /// Called when mpv reports `core-idle`.
    pub fn on_core_idle(&mut self, idle: bool, user_paused: bool, now: Instant) {
        if idle && !user_paused {
            self.buffering_since.get_or_insert(now);
        } else if !idle {
            self.buffering_since = None;
            self.reported = false;
        }
    }

    /// Called when playback resumes normally.
    pub fn on_playing(&mut self) {
        self.buffering_since = None;
        self.reported = false;
    }

    /// True once per stall, when buffering or time since last decoded frame
    /// has exceeded the threshold.
    pub fn is_stalled(&mut self, now: Instant) -> bool {
        if self.reported {
            return false;
        }

        // Active buffering / core-idle exceeding threshold
        if let Some(since) = self.buffering_since {
            if now.duration_since(since) >= self.threshold {
                self.reported = true;
                return true;
            }
        }

        // Playback expected but no decoded frame progress past threshold
        if let Some(last_frame) = self.last_decoded_frame_at {
            if self.buffering_since.is_some() && now.duration_since(last_frame) >= self.threshold {
                self.reported = true;
                return true;
            }
        }

        false
    }

    pub fn reset(&mut self) {
        self.buffering_since = None;
        self.reported = false;
    }
}

/// Pick the next best-ranked stream:
/// Must not be the current stream (different info_hash and different url).
/// Must be cached on at least one active debrid provider, OR a direct HTTP stream.
pub fn next_fallback_stream(
    candidates: &[ScoredStream],
    current_url: Option<&str>,
    current_info_hash: Option<&str>,
    active_debrids: &[String],
) -> Option<usize> {
    candidates.iter().enumerate().position(|(_, s)| {
        let stream = &s.parsed.stream;

        // Skip the current stream if hash matches
        if let (Some(cur_h), Some(h)) = (current_info_hash, stream.info_hash.as_deref()) {
            if !cur_h.is_empty() && cur_h.eq_ignore_ascii_case(h) {
                return false;
            }
        }

        // Skip the current stream if URL matches
        if let (Some(cur_u), Some(u)) = (current_url, stream.url.as_deref()) {
            if !cur_u.is_empty() && cur_u == u {
                return false;
            }
        }

        // Direct HTTP stream without info hash is playable
        if stream.info_hash.is_none() {
            if let Some(u) = stream.url.as_deref() {
                if u.starts_with("http://") || u.starts_with("https://") {
                    return true;
                }
            }
        }

        // Torrent stream must have cached debrid
        if stream.info_hash.is_some() && !active_debrids.is_empty() {
            let cached = &s.parsed.cached;
            let is_cached = active_debrids
                .iter()
                .any(|d| cached.get(d).copied().unwrap_or(false));
            if is_cached {
                return true;
            }
        }

        false
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{ParsedStream, Resolution, ScoreReason, Stream, Tier};
    use std::collections::BTreeMap;

    fn mock_scored(
        url: Option<&str>,
        info_hash: Option<&str>,
        cached_debrids: &[&str],
    ) -> ScoredStream {
        let mut cached = BTreeMap::new();
        for d in cached_debrids {
            cached.insert(d.to_string(), true);
        }
        ScoredStream {
            parsed: ParsedStream {
                stream: Stream {
                    url: url.map(|s| s.to_string()),
                    info_hash: info_hash.map(|s| s.to_string()),
                    addon_id: "test".into(),
                    addon_name: "test".into(),
                    ..Default::default()
                },
                parsed_title: "Test".into(),
                episode_title: None,
                resolution: Resolution::P1080,
                hdr_format: None,
                codec: Default::default(),
                source: Default::default(),
                audio: Default::default(),
                audio_languages: vec![],
                size: None,
                seeders: None,
                cached,
                in_library: Default::default(),
                container: None,
                release_group: None,
                release_group_normalized: None,
                remux: false,
                edition: None,
                year: None,
                year_range: None,
                season: None,
                episode: None,
                episode_end: None,
                season_pack: false,
                disc_index: None,
                repack_iteration: 0,
                proper: false,
                hardcoded: false,
                anime_hash: None,
                scam_score: 0,
            },
            score: 100.0,
            reasons: vec![ScoreReason {
                signal: "cached".into(),
                delta: 10.0,
            }],
            tier: Tier::P1080,
        }
    }

    #[test]
    fn detects_stall_after_8_seconds_buffering() {
        let t0 = Instant::now();
        let mut d = StallDetector::default();
        d.on_buffering(t0);
        d.on_buffering(t0 + Duration::from_secs(5));
        assert!(!d.is_stalled(t0 + Duration::from_secs(7)));
        assert!(d.is_stalled(t0 + Duration::from_secs(8)));
        assert!(
            !d.is_stalled(t0 + Duration::from_secs(20)),
            "only reports once"
        );
        d.on_playing();
        d.on_buffering(t0 + Duration::from_secs(30));
        assert!(!d.is_stalled(t0 + Duration::from_secs(35)));
        assert!(d.is_stalled(t0 + Duration::from_secs(38)));
    }

    #[test]
    fn detects_stall_on_core_idle_unpaused() {
        let t0 = Instant::now();
        let mut d = StallDetector::default();
        d.on_core_idle(true, false, t0);
        assert!(!d.is_stalled(t0 + Duration::from_secs(4)));
        assert!(d.is_stalled(t0 + Duration::from_secs(8)));
    }

    #[test]
    fn ignores_core_idle_when_paused() {
        let t0 = Instant::now();
        let mut d = StallDetector::default();
        d.on_core_idle(true, true, t0); // user paused
        assert!(!d.is_stalled(t0 + Duration::from_secs(10)));
    }

    #[test]
    fn decoded_frame_resets_stall() {
        let t0 = Instant::now();
        let mut d = StallDetector::default();
        d.on_buffering(t0);
        d.on_decoded_frame(t0 + Duration::from_secs(5));
        assert!(!d.is_stalled(t0 + Duration::from_secs(10)));
    }

    #[test]
    fn selects_next_best_cached_debrid_or_http() {
        let s1 = mock_scored(Some("https://stream1.mp4"), None, &[]);
        let s2 = mock_scored(None, Some("hash_uncached"), &[]);
        let s3 = mock_scored(None, Some("hash_rd_cached"), &["rd"]);
        let s4 = mock_scored(Some("https://stream4.mp4"), None, &[]);

        let candidates = vec![s1, s2, s3, s4];
        let debrids = vec!["rd".to_string()];

        // When currently playing stream 1 (url "https://stream1.mp4"),
        // it skips s1 (current) and s2 (uncached torrent), and selects s3 (cached RD)!
        let next = next_fallback_stream(&candidates, Some("https://stream1.mp4"), None, &debrids);
        assert_eq!(next, Some(2));

        // When currently playing s3 (hash "hash_rd_cached"),
        // it selects s4 (next http stream)!
        let next_after_s3 =
            next_fallback_stream(&candidates, None, Some("hash_rd_cached"), &debrids);
        assert_eq!(next_after_s3, Some(0)); // s1 is https://stream1.mp4 which is playable
    }
}
