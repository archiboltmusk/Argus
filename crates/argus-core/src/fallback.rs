//! Stall fallback (spec feature 5): detect a buffer stall longer than the
//! threshold and pick the next-ranked stream to switch to, resuming at the
//! same position.

use std::time::{Duration, Instant};

use crate::ranking::RankedStream;

pub const STALL_THRESHOLD: Duration = Duration::from_secs(8);

/// Fed by the player's buffering events. Pure state, no timers, so every
/// platform's player can drive it and tests can use fake clocks.
#[derive(Debug, Default)]
pub struct StallDetector {
    buffering_since: Option<Instant>,
    reported: bool,
}

impl StallDetector {
    pub fn on_buffering(&mut self, now: Instant) {
        self.buffering_since.get_or_insert(now);
    }

    pub fn on_playing(&mut self) {
        self.buffering_since = None;
        self.reported = false;
    }

    /// True once per stall, when buffering has lasted past the threshold.
    pub fn should_offer_fallback(&mut self, now: Instant) -> bool {
        match self.buffering_since {
            Some(t) if !self.reported && now.duration_since(t) >= STALL_THRESHOLD => {
                self.reported = true;
                true
            }
            _ => false,
        }
    }
}

/// Index of the next stream to try after `current`: lower-ranked, not the
/// same source (same hash or URL), and playable with what the user has.
pub fn next_stream(ranked: &[RankedStream], current: usize, has_debrid: bool) -> Option<usize> {
    let cur = &ranked.get(current)?.stream;
    let same = |s: &crate::model::Stream| {
        (s.info_hash.is_some() && s.info_hash == cur.info_hash)
            || (s.url.is_some() && s.url == cur.url)
    };
    ranked
        .iter()
        .enumerate()
        .skip(current + 1)
        .find(|(_, r)| !same(&r.stream) && (r.stream.info_hash.is_none() || has_debrid))
        .map(|(i, _)| i)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::Stream;
    use crate::ranking::Preferences;

    #[test]
    fn detects_stall_once() {
        let t0 = Instant::now();
        let mut d = StallDetector::default();
        d.on_buffering(t0);
        d.on_buffering(t0 + Duration::from_secs(5)); // still the same stall
        assert!(!d.should_offer_fallback(t0 + Duration::from_secs(7)));
        assert!(d.should_offer_fallback(t0 + Duration::from_secs(8)));
        assert!(
            !d.should_offer_fallback(t0 + Duration::from_secs(20)),
            "offer once"
        );
        d.on_playing();
        d.on_buffering(t0 + Duration::from_secs(30));
        assert!(!d.should_offer_fallback(t0 + Duration::from_secs(31)));
    }

    #[test]
    fn skips_same_source_and_unplayable_torrents() {
        let url = |u: &str| Stream {
            url: Some(u.into()),
            ..Default::default()
        };
        let tor = |h: &str| Stream {
            info_hash: Some(h.into()),
            ..Default::default()
        };
        let ranked = Preferences::default().rank(vec![url("a"), url("a"), tor("h1"), url("b")]);
        assert_eq!(
            next_stream(&ranked, 0, false).map(|i| ranked[i].stream.url.clone()),
            Some(Some("b".into()))
        );
        let with_debrid = next_stream(&ranked, 0, true).unwrap();
        assert!(
            ranked[with_debrid].stream.info_hash.is_some()
                || ranked[with_debrid].stream.url.as_deref() == Some("b")
        );
    }
}
