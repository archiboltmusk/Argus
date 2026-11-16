use serde::{Deserialize, Serialize};

/// Content profile defining bitrate fluctuation and buffering behavior.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContentProfile {
    Lecture,
    Action4k,
    StandardDrama,
    Scrubbing,
}

impl Default for ContentProfile {
    fn default() -> Self {
        Self::StandardDrama
    }
}

/// Dynamic playback context reported by the player / mpv hooks.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackContextDto {
    pub current_time_sec: f64,
    pub duration_sec: f64,
    pub playback_rate: f64,
    pub is_paused: bool,
    pub is_seeking: bool,
    pub content_profile: Option<ContentProfile>,
    pub bitrate_bps: Option<u64>,
    pub piece_length: u32,
    pub total_pieces: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PieceRangeDto {
    pub start_piece: u32,
    pub end_piece: u32,
    pub piece_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DualWindowBoundsDto {
    pub high_window: PieceRangeDto,
    pub low_window: PieceRangeDto,
    pub current_piece_index: u32,
    pub urgent_target_seconds: f64,
    pub lookahead_target_seconds: f64,
    pub burst_multiplier: f64,
    pub seek_halo: Option<PieceRangeDto>,
}

pub struct DualWindowScheduler {
    context: PlaybackContextDto,
}

impl DualWindowScheduler {
    pub fn new(context: PlaybackContextDto) -> Self {
        Self { context }
    }

    #[allow(dead_code)]
    pub fn update_context(&mut self, ctx: PlaybackContextDto) {
        self.context = ctx;
    }

    pub fn calculate_windows(&self) -> DualWindowBoundsDto {
        let ctx = &self.context;
        let total_pieces = ctx.total_pieces.max(1);
        let piece_length = ctx.piece_length.max(32 * 1024) as u64;
        let rate = ctx.playback_rate.max(0.25);
        let profile = ctx.content_profile.unwrap_or_default();
        let bitrate = ctx.bitrate_bps.unwrap_or(6_000_000); // 6 Mbps default

        // Current piece calculation
        let current_piece = if ctx.duration_sec > 0.0 {
            let frac = (ctx.current_time_sec.max(0.0) / ctx.duration_sec).min(1.0);
            ((frac * total_pieces as f64).floor() as u32).min(total_pieces - 1)
        } else {
            0
        };

        let (burst_multiplier, base_urgent_sec, base_lookahead_sec) = match profile {
            ContentProfile::Lecture => (1.1, 15.0, 120.0),
            ContentProfile::Action4k => (2.2, 30.0, 90.0),
            ContentProfile::Scrubbing => (1.0, 8.0, 16.0),
            ContentProfile::StandardDrama => (1.3, 20.0, 75.0),
        };

        let urgent_target_seconds = base_urgent_sec * rate;
        let lookahead_target_seconds = base_lookahead_sec * rate;

        let bytes_per_sec = ((bitrate as f64) / 8.0) * burst_multiplier;
        let urgent_bytes = urgent_target_seconds * bytes_per_sec;
        let lookahead_bytes = lookahead_target_seconds * bytes_per_sec;

        let urgent_piece_count = 3.max((urgent_bytes / (piece_length as f64)).ceil() as u32);
        let lookahead_piece_count = 5.max((lookahead_bytes / (piece_length as f64)).ceil() as u32);

        let high_start = current_piece.min(total_pieces - 1);
        let high_end = (high_start + urgent_piece_count - 1).min(total_pieces - 1);

        let low_start = (high_end + 1).min(total_pieces - 1);
        let low_end = (low_start + lookahead_piece_count - 1).min(total_pieces - 1);

        let seek_halo = if ctx.is_seeking {
            let start = current_piece.saturating_sub(2);
            let end = (current_piece + 8).min(total_pieces - 1);
            Some(PieceRangeDto {
                start_piece: start,
                end_piece: end,
                piece_count: end.saturating_sub(start) + 1,
            })
        } else {
            None
        };

        DualWindowBoundsDto {
            high_window: PieceRangeDto {
                start_piece: high_start,
                end_piece: high_end,
                piece_count: high_end.saturating_sub(high_start) + 1,
            },
            low_window: PieceRangeDto {
                start_piece: low_start,
                end_piece: low_end,
                piece_count: low_end.saturating_sub(low_start) + 1,
            },
            current_piece_index: current_piece,
            urgent_target_seconds,
            lookahead_target_seconds,
            burst_multiplier,
            seek_halo,
        }
    }
}
