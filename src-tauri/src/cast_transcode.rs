//! Decides how a source is converted for a cast receiver and builds the FFmpeg arguments for it.
//!
//! The options mirror the cast settings panel (quality, forced conversion, native H.265, hardware
//! decoding/encoding, HDR tone mapping, deinterlacing, aspect, surround, volume and delays). The plan
//! is pure (`build_plan`) so it can be unit tested; probing the source and the local FFmpeg build is
//! async and cached. The same plan feeds both outputs a receiver can take: an HLS event playlist
//! (Chromecast, AirPlay, Roku, optionally DLNA) and one continuous MPEG-TS response (DLNA's most
//! widely supported transfer).

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::OnceCell;

/// Viewer choices from the cast settings panel. Every field is lenient: an unknown value falls
/// back to the default instead of failing the cast.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct CastOptions {
    /// 720p | 1080p | 1080p-hq | 4k | original
    pub quality: String,
    /// Convert even when the receiver could take the source as it is.
    pub force_conversion: bool,
    /// The receiver decodes H.265 (and its HDR) itself, so H.265 sources are sent untouched.
    pub hevc_native: bool,
    pub hardware_decoding: bool,
    pub hardware_encoding: bool,
    /// Seeks restart at the nearest keyframe instead of the exact frame: faster, up to ~2 s early.
    pub fast_seek: bool,
    /// auto | on | off
    pub tonemap: String,
    /// none | auto | always
    pub deinterlace: String,
    /// default | 16:9 | 4:3 | 21:9 | fill
    pub aspect: String,
    /// auto | ts | hls
    pub stream_format: String,
    /// stereo | surround | original
    pub audio_mode: String,
    /// Percent added to the volume: 0, 25, 50, 100.
    pub volume_boost: u32,
    pub night_mode: bool,
    pub dialogue_boost: bool,
    /// Positive values delay the sound on the TV.
    pub audio_delay_ms: i32,
    /// Positive values show burned-in subtitles later.
    pub sub_delay_ms: i32,
    /// auto | utf-8 | windows-1256 | windows-1252 | ... (text subtitles only)
    pub sub_encoding: String,
}

impl Default for CastOptions {
    fn default() -> Self {
        CastOptions {
            quality: "1080p-hq".into(),
            force_conversion: false,
            hevc_native: false,
            hardware_decoding: true,
            hardware_encoding: true,
            fast_seek: false,
            tonemap: "auto".into(),
            deinterlace: "auto".into(),
            aspect: "default".into(),
            stream_format: "auto".into(),
            audio_mode: "stereo".into(),
            volume_boost: 0,
            night_mode: false,
            dialogue_boost: false,
            audio_delay_ms: 0,
            sub_delay_ms: 0,
            sub_encoding: "auto".into(),
        }
    }
}

impl CastOptions {
    /// (max output height, target video kbps)
    fn quality(&self) -> (u32, u32) {
        match self.quality.as_str() {
            "720p" => (720, 4_000),
            "1080p" => (1080, 8_000),
            "4k" => (2160, 30_000),
            "original" => (4320, 40_000),
            _ => (1080, 14_000),
        }
    }

    /// Whether a picture of this size is beyond the quality setting: taller than its height, or
    /// wider than a receiver of that height decodes. `build_plan` brings such a picture within it.
    pub(crate) fn picture_beyond_quality(&self, width: u32, height: u32) -> bool {
        let (max_height, _) = self.quality();
        height > max_height || width > max_width_for(max_height)
    }

    pub(crate) fn audio_filters_requested(&self) -> bool {
        self.volume_boost > 0 || self.night_mode || self.dialogue_boost || self.audio_delay_ms != 0
    }

    /// Picture settings that change the video whatever the source is, so a stream handed to the
    /// receiver as it is would ignore them. A quality limit needs the source's height, which only
    /// the probe knows; the frontend asks for the conversion when it knows the source is taller.
    pub(crate) fn picture_changes_requested(&self) -> bool {
        self.aspect_ratio().is_some() || self.deinterlace == "always" || self.tonemap == "on"
    }

    fn aspect_ratio(&self) -> Option<(u32, u32)> {
        match self.aspect.as_str() {
            "16:9" | "fill" => Some((16, 9)),
            "4:3" => Some((4, 3)),
            "21:9" => Some((64, 27)),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub index: u32,
    pub codec: String,
    pub pix_fmt: String,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub hdr: bool,
    pub dolby_vision: Option<u32>,
    /// The transfer characteristic the stream declares ("smpte2084", "bt709"); empty when it
    /// declares none, as Dolby Vision profile 5 and many untagged files do.
    pub transfer: String,
    /// The colour primaries ("bt2020") and matrix ("bt2020nc") it declares; empty when unknown.
    pub primaries: String,
    pub matrix: String,
    pub interlaced: bool,
    /// Average bits per second (the stream's own field, or Matroska's BPS tag); 0 when unknown.
    pub bitrate: u64,
    /// The peak bits per second the stream declares (MP4 `btrt`/`esds` maxBitrate, as ffprobe's
    /// `max_bit_rate`); 0 when it declares none. A copied picture's BANDWIDTH announces it.
    pub max_bitrate: u64,
    /// Sample (pixel) aspect ratio when it is not square, e.g. 16:15 for a PAL DVD.
    pub sar: Option<(u32, u32)>,
    /// The level the stream declares (H.264: 41 for 4.1; H.265: general_level_idc, 153 for 5.1).
    pub level: Option<u32>,
    /// The profile as FFmpeg names it ("Constrained Baseline", "Main", "High").
    pub profile: Option<String>,
    /// H.264: the SPS's profile_idc, constraint flags and level_idc, read from the stream's
    /// parameter sets by [`probe`]; `None` when they could not be read.
    pub avc_header: Option<[u8; 3]>,
    /// H.265: the general profile_tier_level the stream declares (profile space, tier and
    /// profile_idc; 32 compatibility flags; 6 constraint bytes; level_idc), read like `avc_header`.
    pub hevc_ptl: Option<[u8; 12]>,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioInfo {
    pub index: u32,
    pub codec: String,
    pub channels: u32,
    pub language: Option<String>,
    /// Bits per second as the container reports it; 0 when it does not (common in MKV).
    pub bitrate: u64,
    /// Samples per second; 0 when the probe does not say.
    pub sample_rate: u32,
    /// The profile as FFmpeg names it ("LC", "HE-AAC", "HE-AACv2").
    pub profile: Option<String>,
}

impl AudioInfo {
    /// The rate this track can reach when it is copied: its reported rate, or else the highest
    /// its codec allows in the streams Argus copies (AC-3 640k, E-AC-3 6144k, MP3 320k).
    fn copied_bitrate(&self) -> u64 {
        if self.bitrate > 0 {
            return self.bitrate;
        }
        match self.codec.as_str() {
            "ac3" => 640_000,
            "eac3" => 6_144_000,
            "mp3" => 320_000,
            // AAC: a frame of 1024 samples carries at most 6144 bits per channel (the decoder's
            // input buffer), so 6 bits per sample per channel. An unknown sample rate counts as
            // 96 kHz, the highest in AAC's sampling-frequency table.
            _ => {
                let rate = if self.sample_rate > 0 { self.sample_rate } else { 96_000 };
                6 * u64::from(self.channels.max(1)) * u64::from(rate)
            }
        }
    }
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleInfo {
    pub index: u32,
    pub codec: String,
    pub language: Option<String>,
}

impl SubtitleInfo {
    /// Picture subtitles (Blu-ray, DVD, DVB) cannot become text; they are overlaid instead.
    pub fn is_bitmap(&self) -> bool {
        matches!(self.codec.as_str(), "hdmv_pgs_subtitle" | "dvd_subtitle" | "dvb_subtitle" | "xsub")
    }
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaProbe {
    pub duration: f64,
    pub container: String,
    /// The whole file's bits per second (every stream together); 0 when unknown.
    pub bitrate: u64,
    pub video: Option<VideoInfo>,
    pub audio: Vec<AudioInfo>,
    pub subtitles: Vec<SubtitleInfo>,
}

pub fn is_http(url: &str) -> bool {
    let lower = url.trim_start().to_ascii_lowercase();
    lower.starts_with("http://") || lower.starts_with("https://")
}

/// HTTP options for an input. FFmpeg refuses to open a local file when any of them is present,
/// which is what left local-file casts "Transcoding" forever.
pub fn http_input_args(url: &str, headers: &HashMap<String, String>, reconnect: bool) -> Vec<String> {
    if !is_http(url) {
        return Vec::new();
    }
    let mut args = Vec::new();
    // A line break inside a value would start a header of its own in FFmpeg's request.
    let ua = headers
        .iter()
        .find(|(k, v)| k.eq_ignore_ascii_case("user-agent") && !v.contains(['\r', '\n']))
        .map(|(_, v)| v.clone())
        .unwrap_or_else(|| "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Argus/3.0".into());
    args.push("-user_agent".into());
    args.push(ua);
    let blob: String = headers
        .iter()
        .filter(|(k, v)| !k.eq_ignore_ascii_case("user-agent") && !k.contains(['\r', '\n']) && !v.contains(['\r', '\n']))
        .map(|(k, v)| format!("{k}: {v}\r\n"))
        .collect();
    if !blob.is_empty() {
        args.push("-headers".into());
        args.push(blob);
    }
    if reconnect {
        for (k, v) in [
            ("-reconnect", "1"),
            ("-reconnect_streamed", "1"),
            ("-reconnect_on_network_error", "1"),
            ("-reconnect_delay_max", "8"),
        ] {
            args.push(k.into());
            args.push(v.into());
        }
    }
    args
}

#[derive(Deserialize)]
struct ProbeJson {
    #[serde(default)]
    streams: Vec<ProbeStream>,
    #[serde(default)]
    format: Option<ProbeFormat>,
}

#[derive(Deserialize, Default)]
struct ProbeStream {
    #[serde(default)]
    index: u32,
    #[serde(default)]
    codec_type: String,
    #[serde(default)]
    codec_name: String,
    #[serde(default)]
    pix_fmt: Option<String>,
    #[serde(default)]
    width: Option<u32>,
    #[serde(default)]
    height: Option<u32>,
    #[serde(default)]
    avg_frame_rate: Option<String>,
    #[serde(default)]
    r_frame_rate: Option<String>,
    #[serde(default)]
    sample_aspect_ratio: Option<String>,
    #[serde(default)]
    level: Option<i64>,
    #[serde(default)]
    profile: Option<String>,
    #[serde(default)]
    color_transfer: Option<String>,
    #[serde(default)]
    color_primaries: Option<String>,
    #[serde(default)]
    color_space: Option<String>,
    #[serde(default)]
    field_order: Option<String>,
    #[serde(default)]
    channels: Option<u32>,
    #[serde(default)]
    sample_rate: Option<String>,
    #[serde(default)]
    bit_rate: Option<String>,
    #[serde(default)]
    max_bit_rate: Option<String>,
    #[serde(default)]
    tags: HashMap<String, String>,
    #[serde(default)]
    disposition: HashMap<String, i64>,
    #[serde(default)]
    side_data_list: Vec<HashMap<String, serde_json::Value>>,
}

#[derive(Deserialize, Default)]
struct ProbeFormat {
    #[serde(default)]
    duration: Option<String>,
    #[serde(default)]
    format_name: Option<String>,
    #[serde(default)]
    bit_rate: Option<String>,
}

fn parse_rate(rate: Option<&str>) -> Option<f64> {
    let (n, d) = rate?.split_once('/')?;
    let (n, d) = (n.parse::<f64>().ok()?, d.parse::<f64>().ok()?);
    (d > 0.0 && n > 0.0).then_some(n / d).filter(|v| *v > 1.0 && *v < 300.0)
}

/// A stream's bits per second: the rate FFmpeg reports, or else the statistics tag Matroska muxers
/// write (`BPS`, `BPS-eng` from older mkvmerge), since MKV has no rate field of its own.
fn stream_bitrate(bit_rate: Option<&str>, tags: &HashMap<String, String>) -> u64 {
    bit_rate
        .and_then(|b| b.trim().parse::<u64>().ok())
        .filter(|b| *b > 0)
        .or_else(|| {
            tags.iter()
                .find(|(k, _)| k.eq_ignore_ascii_case("bps") || k.to_ascii_lowercase().starts_with("bps-"))
                .and_then(|(_, v)| v.trim().parse::<u64>().ok())
        })
        .unwrap_or(0)
}

/// A colour property ffprobe reports, or "" when the stream does not declare it.
fn declared_colour(value: Option<&str>) -> String {
    match value.map(str::trim).unwrap_or("") {
        "" | "unknown" | "reserved" | "unspecified" | "N/A" => String::new(),
        other => other.to_string(),
    }
}

/// "16:15" -> (16, 15); square ("1:1") and unknown ("0:1", "N/A") ratios give None.
fn parse_sar(sar: Option<&str>) -> Option<(u32, u32)> {
    let (n, d) = sar?.split_once(':')?;
    let (n, d) = (n.trim().parse::<u32>().ok()?, d.trim().parse::<u32>().ok()?);
    (n > 0 && d > 0 && n != d).then_some((n, d))
}

pub(crate) fn parse_probe(json: &str) -> Result<MediaProbe, String> {
    let parsed: ProbeJson = serde_json::from_str(json).map_err(|e| format!("ffprobe json: {e}"))?;
    let format = parsed.format.unwrap_or_default();
    let mut probe = MediaProbe {
        duration: format.duration.and_then(|d| d.parse().ok()).unwrap_or(0.0),
        container: format.format_name.unwrap_or_default(),
        bitrate: format.bit_rate.and_then(|b| b.trim().parse().ok()).unwrap_or(0),
        ..Default::default()
    };
    for s in parsed.streams {
        match s.codec_type.as_str() {
            // Cover art travels as a one-frame video stream; it is never the film.
            "video" if s.disposition.get("attached_pic").copied().unwrap_or(0) == 0 && probe.video.is_none() => {
                let transfer = s.color_transfer.as_deref().unwrap_or("");
                let dolby_vision = s.side_data_list.iter().find_map(|d| {
                    let kind = d.get("side_data_type")?.as_str()?.to_ascii_lowercase();
                    if !kind.contains("dovi") && !kind.contains("dolby vision") {
                        return None;
                    }
                    d.get("dv_profile").and_then(|v| v.as_u64()).map(|v| v as u32)
                });
                let field_order = s.field_order.as_deref().unwrap_or("");
                probe.video = Some(VideoInfo {
                    index: s.index,
                    codec: s.codec_name.to_ascii_lowercase(),
                    pix_fmt: s.pix_fmt.unwrap_or_default(),
                    width: s.width.unwrap_or(0),
                    height: s.height.unwrap_or(0),
                    fps: parse_rate(s.avg_frame_rate.as_deref())
                        .or_else(|| parse_rate(s.r_frame_rate.as_deref()))
                        .unwrap_or(24.0),
                    hdr: matches!(transfer, "smpte2084" | "arib-std-b67") || dolby_vision.is_some(),
                    dolby_vision,
                    transfer: declared_colour(Some(transfer)),
                    primaries: declared_colour(s.color_primaries.as_deref()),
                    matrix: declared_colour(s.color_space.as_deref()),
                    interlaced: matches!(field_order, "tt" | "bb" | "tb" | "bt"),
                    bitrate: stream_bitrate(s.bit_rate.as_deref(), &s.tags),
                    max_bitrate: s.max_bit_rate.as_deref().and_then(|b| b.trim().parse().ok()).unwrap_or(0),
                    sar: parse_sar(s.sample_aspect_ratio.as_deref()),
                    level: s.level.and_then(|l| u32::try_from(l).ok()).filter(|l| *l > 0),
                    profile: s.profile.clone().filter(|p| !p.is_empty() && p != "unknown"),
                    avc_header: None,
                    hevc_ptl: None,
                });
            }
            "audio" => probe.audio.push(AudioInfo {
                index: s.index,
                codec: s.codec_name.to_ascii_lowercase(),
                channels: s.channels.unwrap_or(2),
                language: s.tags.get("language").cloned().filter(|l| l != "und"),
                bitrate: stream_bitrate(s.bit_rate.as_deref(), &s.tags),
                sample_rate: s.sample_rate.as_deref().and_then(|r| r.parse().ok()).unwrap_or(0),
                profile: s.profile.clone().filter(|p| !p.is_empty() && p != "unknown"),
            }),
            "subtitle" => probe.subtitles.push(SubtitleInfo {
                index: s.index,
                codec: s.codec_name.to_ascii_lowercase(),
                language: s.tags.get("language").cloned().filter(|l| l != "und"),
            }),
            _ => {}
        }
    }
    if probe.video.is_none() && probe.audio.is_empty() {
        return Err("no playable streams".into());
    }
    Ok(probe)
}

#[allow(unused_mut)]
pub(crate) fn quiet_command(program: &std::path::Path) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    cmd
}

pub async fn probe(url: &str, headers: &HashMap<String, String>) -> Result<MediaProbe, String> {
    let ffprobe = crate::transcode::locate_ffprobe().ok_or("ffprobe not found")?;
    let mut cmd = quiet_command(&ffprobe);
    cmd.arg("-v").arg("error");
    cmd.args(http_input_args(url, headers, false));
    cmd.args(["-analyzeduration", "10M", "-probesize", "10M", "-show_streams", "-show_format", "-of", "json"])
        .arg("-i")
        .arg(url);
    let output = crate::process_output::output(cmd, Duration::from_secs(20))
        .await
        .map_err(|e| format!("ffprobe: {e}"))?;
    let mut probe = parse_probe(&String::from_utf8_lossy(&output.stdout))?;
    if let Some(video) = probe.video.as_mut().filter(|v| matches!(v.codec.as_str(), "h264" | "hevc")) {
        if let Some(config) = probe_video_config(&ffprobe, url, headers).await {
            video.avc_header = (video.codec == "h264").then(|| avc_header(&config)).flatten();
            video.hevc_ptl = (video.codec == "hevc").then(|| hevc_ptl(&config)).flatten();
        }
    }
    Ok(probe)
}

/// The first video stream's parameter sets (its extradata). A second, short probe of that one
/// stream: `-show_data` on the full probe would also hex-dump every attachment, such as the fonts a
/// Matroska file carries.
async fn probe_video_config(ffprobe: &std::path::Path, url: &str, headers: &HashMap<String, String>) -> Option<Vec<u8>> {
    let mut cmd = quiet_command(ffprobe);
    cmd.arg("-v").arg("error");
    cmd.args(http_input_args(url, headers, false));
    cmd.args(["-probesize", "2M", "-analyzeduration", "0", "-select_streams", "V:0"])
        .args(["-show_entries", "stream=extradata", "-show_data", "-of", "json"])
        .arg("-i")
        .arg(url);
    let output = crate::process_output::output(cmd, Duration::from_secs(10)).await.ok()?;
    let parsed: serde_json::Value = serde_json::from_slice(&output.stdout).ok()?;
    let dump = parsed.get("streams")?.get(0)?.get("extradata")?.as_str()?;
    parse_hex_dump(dump)
}

/// ffprobe's `-show_data` hex dump back to bytes. Each line is an 8-digit offset, ": ", then up to
/// 16 bytes in groups of two padded to 41 columns, then the same bytes as text.
fn parse_hex_dump(dump: &str) -> Option<Vec<u8>> {
    let mut bytes = Vec::new();
    for line in dump.lines().filter(|line| !line.trim().is_empty()) {
        if line.get(8..10) != Some(": ") {
            return None;
        }
        let rest = &line[10..];
        let digits: Vec<u8> = rest.get(..41).unwrap_or(rest).bytes().filter(|b| *b != b' ').collect();
        if digits.len() % 2 != 0 {
            return None;
        }
        for pair in digits.chunks(2) {
            bytes.push(u8::from_str_radix(std::str::from_utf8(pair).ok()?, 16).ok()?);
        }
    }
    Some(bytes)
}

/// profile_idc, constraint flags and level_idc from H.264 parameter sets: an avcC record (MP4,
/// Matroska) holds them right after its version byte; Annex B (MPEG-TS) has them after the SPS's
/// NAL header. No emulation prevention byte can fall among them: profile_idc and level_idc are
/// never 0.
fn avc_header(extradata: &[u8]) -> Option<[u8; 3]> {
    let header: [u8; 3] = if extradata.first() == Some(&1) {
        extradata.get(1..4)?.try_into().ok()?
    } else {
        extradata.windows(3).enumerate().filter(|(_, start)| *start == [0, 0, 1]).find_map(|(at, _)| {
            let nal = *extradata.get(at + 3)?;
            if nal & 0x9F != 7 {
                return None;
            }
            extradata.get(at + 4..at + 7)?.try_into().ok()
        })?
    };
    (header[0] != 0 && header[2] != 0).then_some(header)
}

/// The general profile_tier_level from H.265 parameter sets: an hvcC record (MP4, Matroska) holds
/// it right after its version byte; in Annex B (MPEG-TS) it follows the SPS's NAL header and first
/// byte, with emulation prevention bytes (00 00 03) removed, since its zero-heavy flags often carry
/// them.
fn hevc_ptl(config: &[u8]) -> Option<[u8; 12]> {
    let ptl: [u8; 12] = if config.first() == Some(&1) {
        config.get(1..13)?.try_into().ok()?
    } else {
        let start = config.windows(3).enumerate().filter(|(_, start)| *start == [0, 0, 1]).find_map(|(at, _)| {
            let nal = *config.get(at + 3)?;
            (nal & 0x80 == 0 && (nal >> 1) & 0x3F == 33).then_some(at + 5)
        })?;
        let mut rbsp = Vec::with_capacity(13);
        let mut zeros = 0;
        for &byte in config.get(start..)? {
            if zeros >= 2 && byte == 3 {
                zeros = 0;
                continue;
            }
            zeros = if byte == 0 { zeros + 1 } else { 0 };
            rbsp.push(byte);
            if rbsp.len() == 13 {
                break;
            }
        }
        // The SPS's first byte (VPS id, sub-layer count) precedes the profile_tier_level.
        rbsp.get(1..13)?.try_into().ok()?
    };
    (ptl[0] & 0x1F != 0 && ptl[11] != 0).then_some(ptl)
}

/// What the local FFmpeg build can do. Hardware encoders are listed by most builds whether or not
/// the machine has the hardware, so each one is confirmed with a tiny real encode.
#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FfmpegCaps {
    pub available: bool,
    pub nvenc: bool,
    pub qsv: bool,
    pub amf: bool,
    pub videotoolbox: bool,
    pub libplacebo: bool,
    pub zscale_tonemap: bool,
    pub readrate: bool,
}

impl FfmpegCaps {
    pub fn hardware_label(&self) -> Option<&'static str> {
        if self.nvenc {
            Some("NVIDIA NVENC")
        } else if self.qsv {
            Some("Intel Quick Sync")
        } else if self.amf {
            Some("AMD AMF")
        } else if self.videotoolbox {
            Some("Apple VideoToolbox")
        } else {
            None
        }
    }
}

static CAPS: OnceCell<FfmpegCaps> = OnceCell::const_new();

async fn ffmpeg_ok(ffmpeg: &std::path::Path, args: &[&str]) -> bool {
    let mut cmd = quiet_command(ffmpeg);
    cmd.args(["-hide_banner", "-v", "error", "-nostdin"]).args(args);
    matches!(
        crate::process_output::output(cmd, Duration::from_secs(12)).await,
        Ok(out) if out.status.success()
    )
}

async fn listing(ffmpeg: &std::path::Path, flag: &str) -> HashSet<String> {
    let mut cmd = quiet_command(ffmpeg);
    cmd.args(["-hide_banner", flag]);
    let Ok(out) = crate::process_output::output(cmd, Duration::from_secs(10)).await else {
        return HashSet::new();
    };
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .filter_map(|line| line.split_whitespace().nth(1).map(str::to_string))
        .collect()
}

pub async fn caps() -> FfmpegCaps {
    CAPS.get_or_init(|| async {
        let Some(ffmpeg) = crate::transcode::locate_ffmpeg() else {
            return FfmpegCaps::default();
        };
        let (encoders, filters) = tokio::join!(listing(&ffmpeg, "-encoders"), listing(&ffmpeg, "-filters"));
        let test_encode = |encoder: &'static str| {
            let ffmpeg = ffmpeg.clone();
            let listed = encoders.contains(encoder);
            async move {
                listed
                    && ffmpeg_ok(
                        &ffmpeg,
                        &["-f", "lavfi", "-i", "color=c=black:s=320x240:r=24:d=0.4", "-pix_fmt", "yuv420p", "-c:v", encoder, "-f", "null", "-"],
                    )
                    .await
            }
        };
        let nvenc = test_encode("h264_nvenc").await;
        let qsv = !nvenc && test_encode("h264_qsv").await;
        let amf = !nvenc && !qsv && test_encode("h264_amf").await;
        let videotoolbox = cfg!(target_os = "macos") && test_encode("h264_videotoolbox").await;
        let libplacebo = filters.contains("libplacebo")
            && ffmpeg_ok(
                &ffmpeg,
                &[
                    "-init_hw_device", "vulkan", "-f", "lavfi", "-i", "color=c=black:s=320x240:d=0.2,format=yuv420p10le",
                    "-vf", "libplacebo=w=160:h=120:tonemapping=bt.2390:colorspace=bt709:color_primaries=bt709:color_trc=bt709:format=yuv420p",
                    "-f", "null", "-",
                ],
            )
            .await;
        let zscale_tonemap = filters.contains("zscale") && filters.contains("tonemap");
        let readrate = ffmpeg_ok(
            &ffmpeg,
            &["-readrate", "8", "-readrate_initial_burst", "1", "-f", "lavfi", "-i", "anullsrc=d=0.1", "-f", "null", "-"],
        )
        .await;
        let caps = FfmpegCaps { available: true, nvenc, qsv, amf, videotoolbox, libplacebo, zscale_tonemap, readrate };
        eprintln!("[argus::cast] ffmpeg capabilities: {caps:?}");
        caps
    })
    .await
    .clone()
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanSummary {
    /// "copy" or the encoder used.
    pub video: String,
    pub audio: String,
    pub source_video: String,
    pub source_audio: String,
    pub output_width: u32,
    pub output_height: u32,
    pub tonemap: Option<String>,
    pub hardware: Option<String>,
    pub burned_subtitles: bool,
    pub deinterlaced: bool,
    pub reasons: Vec<String>,
}

/// Everything FFmpeg needs except the input URL and the output destination.
#[derive(Clone, Debug)]
pub struct CastPlan {
    pub pre_input: Vec<String>,
    pub output: Vec<String>,
    pub summary: PlanSummary,
    pub hls_codecs: String,
    /// H.265 sent untouched: HLS receivers (Apple TV above all) only take it in fragmented MP4
    /// segments, never in MPEG-TS.
    pub hls_fmp4: bool,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub bandwidth: u64,
}

pub struct PlanInput<'a> {
    pub probe: Option<&'a MediaProbe>,
    pub options: &'a CastOptions,
    pub audio_ordinal: u32,
    /// Burned-in subtitle file and its ASS force_style.
    pub burn_sub: Option<&'a (String, String)>,
    /// Absolute index of an embedded picture subtitle stream to overlay.
    pub burn_bitmap: Option<u32>,
    /// The caller already knows the receiver cannot take the source's video as it is.
    pub force_video_encode: bool,
    /// What the receiver's device profile rules out.
    pub limits: DeviceLimits,
}

/// Limits from the receiver's device profile (`cast-resolve.ts`), on top of the quality setting:
/// a Nest Hub stops at 720p, an older TV takes only stereo AAC.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct DeviceLimits {
    /// The tallest picture the receiver decodes; a taller one is converted.
    pub max_height: Option<u32>,
    /// The most Argus encodes for this receiver, peak included. It is the profile's budget for a
    /// conversion (8000 kbit/s at 1080p), not a decoder limit: a picture the receiver plays as it
    /// is, is copied whatever its rate.
    pub max_video_kbps: Option<u32>,
    pub force_aac: bool,
    pub force_stereo: bool,
}

fn even(v: f64) -> u32 {
    ((v / 2.0).round() as u32 * 2).max(2)
}

/// The widest picture a receiver of a height class decodes: 16:9 at that height (1920 at 1080p,
/// 1280 at 720p), and DCI's 4096 from 2160 up.
fn max_width_for(max_height: u32) -> u32 {
    if max_height >= 2160 {
        even(4096.0 * f64::from(max_height) / 2160.0)
    } else {
        even(f64::from(max_height) * 16.0 / 9.0)
    }
}

/// zscale refuses a picture that does not declare its colours ("no path between colorspaces"), as
/// Dolby Vision profile 5 and many untagged files do, and the cast then sends no picture at all.
/// The missing ones are declared on the frames first: HDR10's for an HDR source, BT.709's for any
/// other.
fn declare_input_colours(video: Option<&VideoInfo>) -> Option<String> {
    let hdr = video.is_some_and(|v| v.hdr);
    let (transfer, primaries, matrix) = if hdr { ("smpte2084", "bt2020", "bt2020nc") } else { ("bt709", "bt709", "bt709") };
    let mut named = Vec::new();
    if video.is_none_or(|v| v.transfer.is_empty()) {
        named.push(format!("color_trc={transfer}"));
    }
    if video.is_none_or(|v| v.primaries.is_empty()) {
        named.push(format!("color_primaries={primaries}"));
    }
    if video.is_none_or(|v| v.matrix.is_empty()) {
        named.push(format!("colorspace={matrix}"));
    }
    (!named.is_empty()).then(|| format!("setparams={}", named.join(":")))
}

fn ffmpeg_number(v: f64) -> String {
    format!("{v:.3}").trim_end_matches('0').trim_end_matches('.').to_string()
}

/// Audio filters for the TV mix. Dialogue boost re-weights the centre channel while folding a
/// surround track to stereo, which is where film dialogue lives.
fn audio_filters(options: &CastOptions, channels_in: u32, stereo_out: bool) -> Vec<String> {
    let mut out = Vec::new();
    if options.dialogue_boost && stereo_out && channels_in >= 6 {
        out.push("pan=stereo|FL<0.6*FL+1.2*FC+0.4*BL+0.4*SL+0.2*LFE|FR<0.6*FR+1.2*FC+0.4*BR+0.4*SR+0.2*LFE".into());
    }
    if options.night_mode {
        out.push("dynaudnorm=f=200:g=15:p=0.9:m=10".into());
    }
    if options.volume_boost > 0 {
        let gain = 1.0 + options.volume_boost.min(200) as f64 / 100.0;
        out.push(format!("volume={}", ffmpeg_number(gain)));
        out.push("alimiter=limit=0.95:level=disabled".into());
    }
    match options.audio_delay_ms {
        d if d > 0 => out.push(format!("adelay=delays={d}:all=1")),
        d if d < 0 => out.push(format!("atrim=start={},asetpts=PTS-STARTPTS", ffmpeg_number(-d as f64 / 1000.0))),
        _ => {}
    }
    out
}

/// Crops the picture to `(w, h)` aspect when "fill" is chosen, returning the crop filter and the
/// cropped size.
fn fill_crop(src_w: u32, src_h: u32, aspect: (u32, u32)) -> Option<(String, u32, u32)> {
    if src_w == 0 || src_h == 0 {
        return None;
    }
    let target = aspect.0 as f64 / aspect.1 as f64;
    let current = src_w as f64 / src_h as f64;
    if (current - target).abs() < 0.01 {
        return None;
    }
    let (w, h) = if current > target {
        (even(src_h as f64 * target), src_h)
    } else {
        (src_w, even(src_w as f64 / target))
    };
    Some((format!("crop={w}:{h}"), w, h))
}

/// H.264 levels and the limits that pick one (ITU-T H.264 Table A-1, High profile bit rates):
/// (level_idc, max macroblocks per frame, max macroblocks per second, max kbit/s, max CPB kbit).
const H264_LEVELS: &[(u32, u64, u64, u64, u64)] = &[
    (30, 1_620, 40_500, 12_500, 12_500),
    (31, 3_600, 108_000, 17_500, 17_500),
    (32, 5_120, 216_000, 25_000, 25_000),
    (40, 8_192, 245_760, 25_000, 31_250),
    (41, 8_192, 245_760, 62_500, 78_125),
    (42, 8_704, 522_240, 62_500, 78_125),
    (50, 22_080, 589_824, 168_750, 168_750),
    (51, 36_864, 983_040, 300_000, 300_000),
    (52, 36_864, 2_073_600, 300_000, 300_000),
    (60, 139_264, 4_177_920, 300_000, 300_000),
    (61, 139_264, 8_355_840, 600_000, 600_000),
    (62, 139_264, 16_711_680, 1_000_000, 1_000_000),
];

/// H.265 levels by luma picture size and luma sample rate (ITU-T H.265 Table A.8):
/// (general_level_idc, max luma samples per picture, max luma samples per second).
const HEVC_LEVELS: &[(u32, u64, u64)] = &[
    (30, 36_864, 552_960),
    (60, 122_880, 3_686_400),
    (63, 245_760, 7_372_800),
    (90, 552_960, 16_588_800),
    (93, 983_040, 33_177_600),
    (120, 2_228_224, 66_846_720),
    (123, 2_228_224, 133_693_440),
    (150, 8_912_896, 267_386_880),
    (153, 8_912_896, 534_773_760),
    (156, 8_912_896, 1_069_547_520),
    (180, 35_651_584, 1_069_547_520),
    (183, 35_651_584, 2_139_095_040),
    (186, 35_651_584, 4_278_190_080),
];

/// The lowest H.264 level a picture of this size and frame rate fits, within the peak bit rate
/// and buffer when they are known. 1080p60 needs 4.2, not the 4.1 that suffices at 30.
fn h264_level(width: u32, height: u32, fps: f64, kbps: Option<u32>, buffer_kbit: Option<u32>) -> u32 {
    let frame = u64::from(width.div_ceil(16)) * u64::from(height.div_ceil(16));
    let rate = (frame as f64 * fps).ceil() as u64;
    H264_LEVELS
        .iter()
        .find(|(_, max_frame, max_rate, max_kbps, max_cpb)| {
            frame <= *max_frame
                && rate <= *max_rate
                && kbps.is_none_or(|k| u64::from(k) <= *max_kbps)
                && buffer_kbit.is_none_or(|b| u64::from(b) <= *max_cpb)
        })
        .map_or(62, |level| level.0)
}

/// The lowest H.265 level a picture of this size and frame rate fits.
fn hevc_level(width: u32, height: u32, fps: f64) -> u32 {
    let picture = u64::from(width) * u64::from(height);
    let rate = (picture as f64 * fps).ceil() as u64;
    HEVC_LEVELS
        .iter()
        .find(|(_, max_picture, max_rate)| picture <= *max_picture && rate <= *max_rate)
        .map_or(186, |level| level.0)
}

/// `-level` for the encoders that take it as text: 42 becomes "4.2".
fn level_arg(level_idc: u32) -> String {
    format!("{}.{}", level_idc / 10, level_idc % 10)
}

/// The CODECS name the HLS playlist announces for H.264 High at `level_idc`. Receivers check it
/// before loading, so it must not claim less than the stream needs.
fn h264_codec_string(level_idc: u32) -> String {
    format!("avc1.6400{level_idc:02X}")
}

/// The CODECS name for a copied H.264 picture at `level_idc`: the profile and constraint flags its
/// own SPS carries, or, when that could not be read, the ones its profile's name implies.
fn copied_h264_codec_string(video: &VideoInfo, level_idc: u32) -> String {
    let (profile, constraints) = match video.avc_header {
        Some([profile, constraints, _]) => (profile, constraints),
        None => h264_profile_bytes(video.profile.as_deref()),
    };
    format!("avc1.{profile:02X}{constraints:02X}{level_idc:02X}")
}

/// profile_idc and the constraint flags a profile name implies (FFmpeg's names): Constrained
/// Baseline is Baseline with constraint_set1, the Intra profiles set constraint_set3. An unknown
/// name keeps High, which covers every 8-bit 4:2:0 stream.
fn h264_profile_bytes(name: Option<&str>) -> (u8, u8) {
    match name.unwrap_or("") {
        "Constrained Baseline" => (66, 0x40),
        "Baseline" => (66, 0),
        "Main" => (77, 0),
        "Extended" => (88, 0),
        "High 10" => (110, 0),
        "High 10 Intra" => (110, 0x10),
        "High 4:2:2" => (122, 0),
        "High 4:2:2 Intra" => (122, 0x10),
        "High 4:4:4 Predictive" => (244, 0),
        "High 4:4:4 Intra" => (244, 0x10),
        "CAVLC 4:4:4" | "CAVLC 4:4:4 Intra" => (44, 0),
        _ => (100, 0),
    }
}

/// The CODECS name for a copied H.265 picture at `level_idc` (ISO/IEC 14496-15 E.3): its own
/// profile space, profile, compatibility flags (in reverse bit order), tier and constraint bytes
/// (trailing zero bytes left out), or the guess below when they could not be read.
fn copied_hevc_codec_string(video: &VideoInfo, level_idc: u32) -> String {
    let Some(ptl) = video.hevc_ptl else {
        return hevc_codec_string(video, level_idc);
    };
    let space = ["", "A", "B", "C"][usize::from(ptl[0] >> 6)];
    let tier = if ptl[0] & 0x20 != 0 { 'H' } else { 'L' };
    let compatibility = u32::from_be_bytes([ptl[1], ptl[2], ptl[3], ptl[4]]).reverse_bits();
    let mut name = format!("hvc1.{space}{}.{compatibility:X}.{tier}{level_idc}", ptl[0] & 0x1F);
    let constraints = &ptl[5..11];
    let used = constraints.iter().rposition(|b| *b != 0).map_or(0, |last| last + 1);
    for byte in &constraints[..used] {
        name.push_str(&format!(".{byte:X}"));
    }
    name
}

/// The CODECS name for copied AAC: its audio object type, which receivers check before loading
/// (HE-AAC is 5, HE-AACv2 29; LC, 2, is also what Argus's own encoder writes).
fn aac_codec_string(profile: Option<&str>) -> &'static str {
    match profile.unwrap_or("") {
        "HE-AACv2" => "mp4a.40.29",
        "HE-AAC" | "MPEG-2 AAC HE" => "mp4a.40.5",
        "Main" => "mp4a.40.1",
        "SSR" => "mp4a.40.3",
        "LTP" => "mp4a.40.4",
        "LD" => "mp4a.40.23",
        "ELD" => "mp4a.40.39",
        _ => "mp4a.40.2",
    }
}

/// Main 10 for 10-bit (HDR) sources, Main for 8-bit ones, at `level_idc` (Main tier).
fn hevc_codec_string(video: &VideoInfo, level_idc: u32) -> String {
    let profile = if video.pix_fmt.contains("10") || video.pix_fmt.contains("12") || video.hdr { "2.4" } else { "1.6" };
    format!("hvc1.{profile}.L{level_idc}.B0")
}

/// The encoder's peak rate: 1.5 times the target, but never above a limit the receiver declared.
fn peak_kbps(target_kbps: u32, device_kbps: Option<u32>) -> u32 {
    let peak = target_kbps.saturating_mul(3) / 2;
    device_kbps.map_or(peak, |limit| peak.min(limit))
}

/// The picture's average rate: its own reported rate, or else the whole file's less every audio
/// track's known rate (an average too, never a peak). 0 when neither is known.
fn video_average_rate(probe: Option<&MediaProbe>, video: &VideoInfo) -> u64 {
    if video.bitrate > 0 {
        return video.bitrate;
    }
    probe.map_or(0, |p| p.bitrate.saturating_sub(p.audio.iter().map(|a| a.bitrate).sum()))
}

pub fn build_plan(input: &PlanInput, caps: &FfmpegCaps) -> CastPlan {
    let options = input.options;
    let limits = input.limits;
    let (quality_height, quality_kbps) = options.quality();
    let max_height = limits.max_height.map_or(quality_height, |m| m.clamp(240, quality_height));
    let max_width = max_width_for(max_height);
    // The receiver's budget caps what is encoded, even below the quality setting's rate.
    let device_kbps = limits.max_video_kbps.filter(|k| *k > 0);
    let target_kbps = device_kbps.map_or(quality_kbps, |k| k.min(quality_kbps));
    let video = input.probe.and_then(|p| p.video.as_ref());
    // A track number past the source's tracks would send silence: the first track is sent instead.
    let audio_ordinal = match input.probe {
        Some(p) if input.audio_ordinal as usize >= p.audio.len() => 0,
        _ => input.audio_ordinal,
    };
    let audio = input.probe.and_then(|p| p.audio.get(audio_ordinal as usize));
    // The probe found no sound at all (a silent clip): nothing is mapped, encoded or announced.
    let no_audio = input.probe.is_some() && audio.is_none();
    let mut reasons: Vec<String> = Vec::new();
    let mut pre_input: Vec<String> = Vec::new();
    let mut output: Vec<String> = Vec::new();
    let mut video_out_map: Option<String> = None;

    let forced = options.force_conversion;
    let eight_bit = video.is_some_and(|v| matches!(v.pix_fmt.as_str(), "yuv420p" | "yuvj420p"));
    let deinterlace = match options.deinterlace.as_str() {
        "always" => true,
        "none" => false,
        _ => video.is_some_and(|v| v.interlaced),
    };
    let aspect = options.aspect_ratio();
    // The probe found streams but no film picture: a music file, or one whose only picture is its
    // cover art (left out of `video` by `parse_probe`). Nothing is mapped or encoded as video then;
    // mapping "the first video stream" would send the cover art as the film.
    let audio_only = input.probe.is_some() && video.is_none();
    let burning = !audio_only && (input.burn_sub.is_some() || input.burn_bitmap.is_some());
    // Forcing the tone mapper only does something if the picture goes through the encoder.
    let tonemap_forced = !audio_only && options.tonemap == "on";
    let mut encode_video = !audio_only
        && (forced || input.force_video_encode || burning || deinterlace || aspect.is_some() || tonemap_forced);
    if forced {
        reasons.push("forced conversion".into());
    }
    if tonemap_forced {
        reasons.push("tone mapping forced".into());
    }
    if let Some(v) = video {
        let native_hevc = options.hevc_native && v.codec == "hevc";
        if v.codec != "h264" && !native_hevc {
            reasons.push(format!("{} video", v.codec.to_uppercase()));
            encode_video = true;
        }
        if v.height > max_height {
            reasons.push(format!("{}p above {}p", v.height, max_height));
            encode_video = true;
        } else if v.width > max_width {
            // A scope or DCI picture no taller than the limit can still be wider than what a
            // receiver of that class decodes (2560x1080 at 1080p).
            reasons.push(format!("{} px wide above {} px", v.width, max_width));
            encode_video = true;
        }
        // The bit rate budget does not decide between copying and encoding: it caps what Argus
        // encodes. Most files (every MKV) declare no peak rate, so holding a copy to it re-encoded
        // nearly every film the receiver plays as it is, at a cost in quality and GPU or CPU time.
        if v.hdr && !native_hevc {
            reasons.push(if v.dolby_vision.is_some() { "Dolby Vision".into() } else { "HDR".into() });
            encode_video = true;
        }
        if v.codec == "h264" && !eight_bit && !v.pix_fmt.is_empty() {
            // 10-bit or 4:2:2/4:4:4 H.264: receivers decode 8-bit 4:2:0 only.
            reasons.push(format!("H.264 {}", v.pix_fmt));
            encode_video = true;
        }
    } else if input.probe.is_none() {
        // Without a probe there is no way to know the source is TV-safe.
        encode_video = true;
    }
    if burning {
        reasons.push("burned-in subtitles".into());
    }
    if deinterlace {
        reasons.push("interlaced".into());
    }

    // Without a probe nothing is known, so the first video stream is taken if there is one.
    let video_map = match video {
        Some(v) => Some(format!("0:{}", v.index)),
        None if audio_only => None,
        None => Some("0:v:0?".to_string()),
    };
    // The video map is decided below: an overlaid picture subtitle maps a filter graph output.
    let audio_map = format!("0:a:{audio_ordinal}?");

    let mut src_w = video.map(|v| v.width).unwrap_or(0);
    let mut src_h = video.map(|v| v.height).unwrap_or(0);
    let fps = video.map(|v| v.fps).unwrap_or(24.0).clamp(10.0, 120.0);
    let mut pre_filters: Vec<String> = Vec::new();
    if deinterlace {
        pre_filters.push(format!(
            "bwdif=mode=send_frame:deint={}",
            if options.deinterlace == "always" { "all" } else { "interlaced" }
        ));
    }
    if options.aspect == "fill" {
        if let Some((crop, w, h)) = aspect.and_then(|a| fill_crop(src_w, src_h, a)) {
            pre_filters.push(crop);
            src_w = w;
            src_h = h;
        }
    }
    // The output uses square pixels (setsar=1), so a non-square source is widened to its display
    // shape first: a 720x576 PAL DVD at 16:15 is 768 wide, not 720.
    let display_w = match video.and_then(|v| v.sar) {
        Some((n, d)) if options.aspect == "default" => src_w as f64 * n as f64 / d as f64,
        _ => src_w as f64,
    };
    // The picture fits inside max_width x max_height without growing: a 3840x2076 scope film is
    // 1920x1038 at 1080p, not 1998x1080, which a 1080p decoder may refuse.
    let (out_w, out_h) = if src_w > 0 && src_h > 0 && display_w > 0.0 {
        let scale = (f64::from(max_height) / f64::from(src_h)).min(f64::from(max_width) / display_w).min(1.0);
        (even(display_w * scale), even(f64::from(src_h) * scale))
    } else {
        (max_width.min(1920), max_height.min(1080))
    };

    let mut summary = PlanSummary {
        video: "copy".into(),
        audio: "copy".into(),
        source_video: video
            .map(|v| {
                let range = if v.dolby_vision.is_some() { " DV" } else if v.hdr { " HDR" } else { "" };
                format!("{} {}p{}", v.codec.to_uppercase(), v.height, range)
            })
            .unwrap_or_default(),
        source_audio: audio.map(|a| format!("{} {}ch", a.codec.to_uppercase(), a.channels)).unwrap_or_default(),
        output_width: if encode_video { out_w } else { src_w },
        output_height: if encode_video { out_h } else { src_h },
        tonemap: None,
        hardware: None,
        burned_subtitles: burning,
        deinterlaced: deinterlace,
        reasons,
    };
    let mut hls_video_codec = h264_codec_string(41);
    let mut hls_fmp4 = false;

    if encode_video {
        let encoder = if options.hardware_encoding && caps.nvenc {
            "h264_nvenc"
        } else if options.hardware_encoding && caps.qsv {
            "h264_qsv"
        } else if options.hardware_encoding && caps.amf {
            "h264_amf"
        } else if options.hardware_encoding && caps.videotoolbox {
            "h264_videotoolbox"
        } else {
            "libx264"
        };
        let wants_tonemap = video.is_some_and(|v| v.hdr) && options.tonemap != "off" || options.tonemap == "on";
        // Dolby Vision profile 5 has no picture of its own: its colours exist only through the
        // reshaping metadata, which libplacebo applies and the CPU tone mapper cannot.
        let reshaping = video.is_some_and(|v| v.dolby_vision == Some(5));
        // libplacebo runs on the GPU; with both GPU switches off the CPU tone mapper is used,
        // except for a picture only libplacebo can show.
        let placebo = wants_tonemap && caps.libplacebo && (options.hardware_decoding || options.hardware_encoding || reshaping);
        if reshaping && wants_tonemap && !placebo {
            summary.reasons.push("Dolby Vision profile 5 colours need libplacebo".into());
        }
        if placebo {
            pre_input.extend(["-init_hw_device".into(), "vulkan".into()]);
        }
        // Frames are copied back to system memory for the filters, and FFmpeg falls back to
        // software decoding by itself when the GPU cannot decode the codec.
        let any_hw_encoder = caps.nvenc || caps.qsv || caps.amf || caps.videotoolbox;
        if options.hardware_decoding && any_hw_encoder {
            pre_input.extend(["-hwaccel".into(), if caps.nvenc { "cuda".into() } else { "auto".into() }]);
        }
        let mut vf: Vec<String> = pre_filters;
        if placebo {
            vf.push(format!(
                "libplacebo=w={out_w}:h={out_h}:tonemapping=bt.2390:colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv:format=yuv420p"
            ));
            summary.tonemap = Some("libplacebo".into());
        } else if wants_tonemap && caps.zscale_tonemap {
            vf.extend(declare_input_colours(video));
            // FFmpeg's own scaler shrinks the picture before zimg converts its colours: zimg
            // scaling a 4K frame was the slowest step of the CPU conversion, with the same result
            // (SSIM 0.998 against scaling in zimg). The move to linear light and to BT.709
            // primaries is one zimg pass.
            vf.push(format!(
                "scale={out_w}:{out_h}:flags=bilinear,zscale=t=linear:npl=100:p=bt709,format=gbrpf32le,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p"
            ));
            summary.tonemap = Some("zscale".into());
        } else if src_w > 0 && src_h > 0 {
            vf.push(format!("scale={out_w}:{out_h}"));
        } else {
            vf.push(format!(
                "scale=w='min(iw,{max_width})':h='min(ih,{max_height})':force_original_aspect_ratio=decrease:force_divisible_by=2"
            ));
        }
        // Square pixels: some TVs mis-scale the slightly anamorphic sizes even dimensions leave.
        vf.push("setsar=1".into());
        if let Some((n, d)) = aspect.filter(|_| options.aspect != "fill") {
            vf.push(format!("setdar={n}/{d}"));
        }
        if let Some((path, style)) = input.burn_sub {
            vf.push(crate::cast_subs::burn_filter(path, style));
        }
        let maxrate = peak_kbps(target_kbps, device_kbps);
        let bufsize = target_kbps * 2;
        let gop = (fps * 2.0).round() as u32;
        if let Some(sub_index) = input.burn_bitmap {
            // Picture subtitles are drawn on a canvas of their own; fit it to the output frame and
            // keep it at the bottom, where the canvas places its text. They carry the stream's own
            // timestamps, so the subtitle delay moves them here (text subtitles are shifted in
            // their file instead).
            let shift = match options.sub_delay_ms {
                0 => String::new(),
                d if d > 0 => format!("setpts=PTS+{}/TB,", ffmpeg_number(d as f64 / 1000.0)),
                d => format!("setpts=PTS-{}/TB,", ffmpeg_number(-d as f64 / 1000.0)),
            };
            output.extend([
                "-filter_complex".into(),
                format!(
                    "[{}]{}[base];[0:{sub_index}]{shift}scale={out_w}:{out_h}:force_original_aspect_ratio=decrease[sub];[base][sub]overlay=x=(W-w)/2:y=H-h:eof_action=pass,format=yuv420p[vout]",
                    video_map.as_deref().unwrap_or("0:v:0?"),
                    vf.join(",")
                ),
            ]);
            video_out_map = Some("[vout]".into());
        } else {
            vf.push("format=yuv420p".into());
            output.extend(["-vf".into(), vf.join(",")]);
        }
        output.extend(["-c:v".into(), encoder.into()]);
        match encoder {
            "h264_nvenc" => output.extend(
                ["-preset", "p4", "-tune", "hq", "-rc", "vbr", "-cq", "21", "-spatial-aq", "1", "-bf", "2", "-forced-idr", "1"]
                    .map(String::from),
            ),
            "h264_qsv" => output.extend(["-preset", "faster", "-look_ahead", "0"].map(String::from)),
            "h264_amf" => output.extend(["-quality", "balanced", "-rc", "vbr_peak"].map(String::from)),
            "h264_videotoolbox" => output.extend(["-allow_sw", "1", "-realtime", "1"].map(String::from)),
            _ => output.extend(
                ["-preset", "veryfast", "-crf", "21", "-sc_threshold", "0", "-x264-params", "scenecut=0:open_gop=0"]
                    .map(String::from),
            ),
        }
        if encoder != "libx264" {
            output.extend(["-b:v".into(), format!("{target_kbps}k")]);
        }
        output.extend([
            "-maxrate".into(),
            format!("{maxrate}k"),
            "-bufsize".into(),
            format!("{bufsize}k"),
            "-profile:v".into(),
            "high".into(),
            "-g".into(),
            gop.to_string(),
            "-force_key_frames".into(),
            "expr:gte(t,n_forced*2)".into(),
        ]);
        // One level, from the output size, frame rate, peak rate and buffer, for both the encoder
        // and the playlist. The hardware encoders not listed pick a fitting level themselves.
        let level = h264_level(out_w, out_h, fps, Some(maxrate), Some(bufsize));
        if matches!(encoder, "libx264" | "h264_nvenc") {
            output.extend(["-level".into(), level_arg(level)]);
        }
        if encoder == "libx264" {
            output.extend(["-keyint_min".into(), gop.to_string()]);
        }
        hls_video_codec = h264_codec_string(level);
        summary.video = encoder.into();
        summary.hardware = (encoder != "libx264").then(|| caps.hardware_label().unwrap_or("GPU").to_string());
        summary.output_width = out_w;
        summary.output_height = out_h;
    } else if audio_only {
        output.push("-vn".into());
        summary.video = "none".into();
    } else {
        output.extend(["-c:v".into(), "copy".into()]);
        // A copied stream keeps its own profile and level: announce its profile, and the level it
        // declares or what its size and frame rate need, whichever is higher.
        let rate_kbps = video.map(|v| v.bitrate / 1000).filter(|k| *k > 0).and_then(|k| u32::try_from(k).ok());
        if let Some(v) = video.filter(|v| v.codec == "h264") {
            output.extend(["-bsf:v".into(), "h264_mp4toannexb".into()]);
            let needed = h264_level(v.width, v.height, fps, rate_kbps, None);
            hls_video_codec = copied_h264_codec_string(v, needed.max(v.level.unwrap_or(0)));
        } else if let Some(v) = video.filter(|v| v.codec == "hevc") {
            // No Annex B filter here: copied H.265 goes into fragmented MP4 over HLS, where the
            // `hvc1` sample entry keeps the parameter sets in its hvcC record and the samples
            // length-prefixed (ISO/IEC 14496-15 8.3.2). The MPEG-TS muxer (the continuous DLNA
            // stream) inserts the Annex B conversion it needs by itself.
            let needed = hevc_level(v.width, v.height, fps);
            hls_video_codec = copied_hevc_codec_string(v, needed.max(v.level.unwrap_or(0)));
            hls_fmp4 = true;
        }
    }

    let channels = audio.map(|a| a.channels).unwrap_or(2);
    let codec = audio.map(|a| a.codec.as_str()).unwrap_or("");
    let ts_safe = matches!(codec, "aac" | "ac3" | "eac3" | "mp3");
    let device_takes_it = (!limits.force_aac || codec == "aac") && (!limits.force_stereo || channels <= 2);
    let copy_audio = !options.audio_filters_requested()
        && device_takes_it
        && !forced
        && ts_safe
        && match options.audio_mode.as_str() {
            "original" => true,
            "surround" => channels >= 6 && codec == "ac3",
            _ => channels <= 2 && codec == "aac",
        };
    let hls_audio_codec;
    let audio_bps: u64;
    if no_audio {
        output.push("-an".into());
        audio_bps = 0;
        hls_audio_codec = "";
        summary.audio = "none".into();
    } else if copy_audio {
        audio_bps = audio.map_or(192_000, AudioInfo::copied_bitrate);
        output.extend(["-c:a".into(), "copy".into()]);
        hls_audio_codec = match codec {
            "ac3" => "ac-3",
            "eac3" => "ec-3",
            "mp3" => "mp4a.40.34",
            _ => aac_codec_string(audio.and_then(|a| a.profile.as_deref())),
        };
        summary.audio = format!("{} (original)", codec.to_uppercase());
    } else {
        let surround =
            !limits.force_stereo && matches!(options.audio_mode.as_str(), "surround" | "original") && channels >= 6;
        let filters = audio_filters(options, channels, !surround);
        if !filters.is_empty() {
            output.extend(["-af".into(), filters.join(",")]);
        }
        if surround {
            output.extend(["-c:a", "ac3", "-b:a", "640k", "-ac", "6"].map(String::from));
            audio_bps = 640_000;
            hls_audio_codec = "ac-3";
            summary.audio = "AC-3 5.1".into();
        } else {
            output.extend(["-c:a", "aac", "-b:a", "192k", "-ac", "2"].map(String::from));
            audio_bps = 192_000;
            hls_audio_codec = "mp4a.40.2";
            summary.audio = "AAC 2.0".into();
        }
    }

    if let Some(map) = video_out_map.or(video_map) {
        output.extend(["-map".into(), map]);
    }
    if !no_audio {
        output.extend(["-map".into(), audio_map]);
    }
    output.extend(["-map_metadata", "-1", "-map_chapters", "-1", "-sn", "-dn"].map(String::from));

    // BANDWIDTH is the peak rate of the variant: the video's (the encoder's maxrate, or what a
    // copied stream reaches), plus the audio actually sent, plus about 10% for the container.
    let video_bps = if audio_only {
        0
    } else if encode_video {
        u64::from(peak_kbps(target_kbps, device_kbps)) * 1000
    } else {
        // The declared peak when there is one; otherwise the average is the best estimate known.
        video
            .map(|v| if v.max_bitrate > 0 { v.max_bitrate } else { video_average_rate(input.probe, v) })
            .filter(|b| *b > 0)
            .unwrap_or(8_000_000)
    };
    let bandwidth = video_bps.saturating_add(audio_bps).saturating_mul(11) / 10;
    CastPlan {
        pre_input,
        output,
        summary,
        hls_codecs: if audio_only {
            hls_audio_codec.to_string()
        } else if no_audio {
            hls_video_codec
        } else {
            format!("{hls_video_codec},{hls_audio_codec}")
        },
        hls_fmp4,
        // No picture, no size: the master playlist then leaves RESOLUTION and FRAME-RATE out.
        width: if audio_only { 0 } else if encode_video { out_w } else { src_w.max(2) },
        height: if audio_only { 0 } else if encode_video { out_h } else { src_h.max(2) },
        fps,
        bandwidth,
    }
}

/// Live transcode statistics read from FFmpeg's `-progress` output.
#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscodeStats {
    pub speed: f64,
    pub out_time_sec: f64,
    pub running: bool,
    pub error: Option<String>,
}

pub type SharedStats = Arc<Mutex<TranscodeStats>>;

/// Feeds one line of FFmpeg stderr into `stats`. `-progress pipe:2` interleaves key=value lines
/// with the warnings the log level lets through. Returns whether the line was progress data.
pub fn note_progress_line(stats: &SharedStats, line: &str) -> bool {
    let Ok(mut s) = stats.lock() else { return false };
    if let Some(v) = line.strip_prefix("speed=") {
        if let Ok(speed) = v.trim().trim_end_matches('x').parse::<f64>() {
            s.speed = speed;
        }
        return true;
    }
    if let Some(v) = line.strip_prefix("out_time_us=") {
        if let Ok(us) = v.trim().parse::<f64>() {
            s.out_time_sec = (us / 1e6).max(0.0);
        }
        return true;
    }
    if line.starts_with("progress=") {
        s.running = line.trim() != "progress=end";
        return true;
    }
    let is_progress_key = line
        .split_once('=')
        .is_some_and(|(k, _)| !k.is_empty() && k.chars().all(|c| c.is_ascii_alphanumeric() || c == '_'));
    if is_progress_key {
        return true;
    }
    // Only failures that stop the picture reach the viewer. FFmpeg also prints harmless notes
    // with alarming words ("UDTA parsing failed retrying raw" on many MP4 files).
    const FATAL: &[&str] = &[
        "error opening",
        "error while",
        "error initializing",
        "conversion failed",
        "invalid data found",
        "no such file",
        "server returned",
        "connection refused",
        "unable to open",
        "could not open",
        "invalid argument",
        "device creation failed",
    ];
    let lower = line.to_ascii_lowercase();
    if FATAL.iter().any(|f| lower.contains(f)) {
        s.error = Some(line.trim().chars().take(240).collect());
    }
    false
}

/// A transcode the proxy can (re)start: the source, where to start, and the plan.
#[derive(Clone, Debug)]
pub struct CastJob {
    pub url: String,
    pub headers: HashMap<String, String>,
    pub seek_sec: f64,
    pub fast_seek: bool,
    pub plan: CastPlan,
    pub stats: SharedStats,
}

impl CastJob {
    /// FFmpeg arguments up to and including the input.
    pub fn input_args(&self, throttle: bool, caps: &FfmpegCaps) -> Vec<String> {
        let mut args: Vec<String> = ["-hide_banner", "-nostdin", "-loglevel", "warning", "-progress", "pipe:2", "-stats_period", "1"]
            .map(String::from)
            .to_vec();
        args.extend(["-fflags".into(), "+genpts+discardcorrupt".into()]);
        args.extend(self.plan.pre_input.iter().cloned());
        args.extend(http_input_args(&self.url, &self.headers, true));
        if throttle && caps.readrate {
            // Stay a few minutes ahead of the receiver instead of filling the disk with the film.
            args.extend(["-readrate", "1.5", "-readrate_initial_burst", "45"].map(String::from));
        }
        if self.seek_sec > 0.5 {
            if self.fast_seek {
                args.push("-noaccurate_seek".into());
            }
            args.extend(["-ss".into(), format!("{:.3}", self.seek_sec)]);
        }
        args.extend(["-i".into(), self.url.clone()]);
        args
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mario() -> MediaProbe {
        // The 4K Dolby Vision MP4 that hung: cover art after the film, two E-AC-3 tracks.
        parse_probe(
            r#"{"streams":[
              {"index":0,"codec_type":"video","codec_name":"hevc","pix_fmt":"yuv420p10le","width":3840,"height":1606,"avg_frame_rate":"24000/1001","color_transfer":"smpte2084","field_order":"progressive","side_data_list":[{"side_data_type":"DOVI configuration record","dv_profile":8}]},
              {"index":1,"codec_type":"audio","codec_name":"eac3","channels":6,"tags":{"language":"eng"}},
              {"index":2,"codec_type":"audio","codec_name":"eac3","channels":6,"tags":{"language":"eng"}},
              {"index":5,"codec_type":"video","codec_name":"mjpeg","width":600,"height":900,"disposition":{"attached_pic":1}}],
              "format":{"duration":"5893.44","format_name":"mov,mp4,m4a,3gp,3g2,mj2"}}"#,
        )
        .expect("probe")
    }

    fn plan(probe: Option<&MediaProbe>, options: &CastOptions, caps: &FfmpegCaps) -> CastPlan {
        build_plan(
            &PlanInput {
                probe,
                options,
                audio_ordinal: 1,
                burn_sub: None,
                burn_bitmap: None,
                force_video_encode: false,
                limits: DeviceLimits::default(),
            },
            caps,
        )
    }

    #[test]
    fn picture_subtitles_are_overlaid_through_a_filter_graph() {
        let probe = parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"hevc","pix_fmt":"yuv420p10le","width":3840,"height":2076,"avg_frame_rate":"24000/1001"},
               {"index":1,"codec_type":"audio","codec_name":"truehd","channels":8},
               {"index":3,"codec_type":"subtitle","codec_name":"hdmv_pgs_subtitle","tags":{"language":"eng"}}],"format":{"duration":"5529.9"}}"#,
        )
        .unwrap();
        assert!(probe.subtitles[0].is_bitmap());
        let options = CastOptions::default();
        let p = build_plan(
            &PlanInput {
                probe: Some(&probe),
                options: &options,
                audio_ordinal: 0,
                burn_sub: None,
                burn_bitmap: Some(3),
                force_video_encode: false,
                limits: DeviceLimits::default(),
            },
            &FfmpegCaps::default(),
        );
        let args = p.output.join(" ");
        // A 3840x2076 scope film fits 1080p by its width: 1920x1038, not 1998x1080.
        assert!(args.contains("-filter_complex [0:0]scale=1920:1038,setsar=1[base];[0:3]scale=1920:1038:force_original_aspect_ratio=decrease[sub];[base][sub]overlay=x=(W-w)/2:y=H-h:eof_action=pass,format=yuv420p[vout]"), "{args}");
        assert_eq!((p.width, p.height, p.summary.output_height), (1920, 1038, 1038));
        assert!(args.contains("-map [vout] -map 0:a:0?"), "{args}");
        assert!(!args.contains("-vf "));
        assert!(p.summary.burned_subtitles);
    }

    #[test]
    fn hdr_hevc_is_tonemapped_and_scaled_with_the_gpu() {
        let probe = mario();
        let v = probe.video.as_ref().unwrap();
        assert_eq!((v.index, v.dolby_vision, v.hdr, v.interlaced), (0, Some(8), true, false));
        let caps = FfmpegCaps { available: true, nvenc: true, libplacebo: true, zscale_tonemap: true, ..Default::default() };
        let plan = plan(Some(&probe), &CastOptions::default(), &caps);
        let args = plan.output.join(" ");
        assert!(args.contains("-map 0:0 -map 0:a:1?"), "{args}");
        // 2.39:1 at 1080p is 1920x804, the size a 1080p decoder takes (level 4.0); filling the
        // height instead made 2582x1080, which needs level 5.0.
        assert!(args.contains("libplacebo=w=1920:h=804"), "{args}");
        assert!(args.contains("-c:v h264_nvenc"));
        assert!(args.contains("-b:v 14000k"), "1080p HQ is the default quality: {args}");
        assert!(args.contains("-c:a aac -b:a 192k -ac 2"));
        assert_eq!(plan.pre_input, ["-init_hw_device", "vulkan", "-hwaccel", "cuda"]);
        assert_eq!(plan.summary.tonemap.as_deref(), Some("libplacebo"));
        assert_eq!(plan.summary.source_video, "HEVC 1606p DV");
        assert_eq!(plan.hls_codecs, "avc1.640028,mp4a.40.2");
        assert!(args.contains("-level 4.0"), "{args}");
        assert_eq!((plan.width, plan.height), (1920, 804));
    }

    #[test]
    fn hardware_switches_and_cpu_fallback() {
        let probe = mario();
        let caps = FfmpegCaps { available: true, nvenc: true, zscale_tonemap: true, ..Default::default() };
        let options = CastOptions { audio_mode: "surround".into(), hardware_encoding: false, hardware_decoding: false, ..Default::default() };
        let plan = plan(Some(&probe), &options, &caps);
        let args = plan.output.join(" ");
        // The probe names the transfer but not the primaries or matrix, which zscale needs.
        assert!(
            args.contains("-vf setparams=color_primaries=bt2020:colorspace=bt2020nc,scale=1920:804:flags=bilinear,zscale=t=linear:npl=100:p=bt709,format=gbrpf32le,tonemap=tonemap=hable"),
            "{args}"
        );
        assert!(args.contains("-c:v libx264"));
        assert!(args.contains("-c:a ac3 -b:a 640k -ac 6"));
        assert!(plan.pre_input.is_empty());
        assert_eq!(plan.hls_codecs, "avc1.640028,ac-3");
        assert!(args.contains("-level 4.0"), "{args}");
        // Decoding on the GPU while encoding on the CPU stays available.
        let options = CastOptions { hardware_encoding: false, ..Default::default() };
        let plan = self::plan(Some(&probe), &options, &caps);
        assert_eq!(plan.pre_input, ["-hwaccel", "cuda"]);
        assert!(plan.output.join(" ").contains("-c:v libx264"));
    }

    fn video_probe(stream: &str) -> MediaProbe {
        parse_probe(&format!(
            r#"{{"streams":[{stream},{{"index":1,"codec_type":"audio","codec_name":"aac","channels":2}}],"format":{{"duration":"100"}}}}"#
        ))
        .unwrap()
    }

    #[test]
    fn pictures_fit_the_width_a_receiver_of_that_height_decodes() {
        assert_eq!([max_width_for(720), max_width_for(1080), max_width_for(2160), max_width_for(4320)], [1280, 1920, 4096, 8192]);
        let caps = FfmpegCaps { available: true, nvenc: true, ..Default::default() };
        let at = |probe: &MediaProbe, quality: &str| {
            build_plan(
                &PlanInput {
                    probe: Some(probe),
                    options: &CastOptions { quality: quality.into(), ..Default::default() },
                    audio_ordinal: 0,
                    burn_sub: None,
                    burn_bitmap: None,
                    force_video_encode: false,
                    limits: DeviceLimits::default(),
                },
                &caps,
            )
        };
        // The UHD Blu-ray scope film: 1080p and 720p both keep its shape inside the 16:9 frame.
        let scope = video_probe(r#"{"index":0,"codec_type":"video","codec_name":"hevc","pix_fmt":"yuv420p10le","width":3840,"height":2076,"color_transfer":"smpte2084"}"#);
        let p = at(&scope, "1080p-hq");
        assert_eq!((p.width, p.height), (1920, 1038));
        assert!(p.hls_codecs.starts_with("avc1.640028"), "level 4.0, not 4.2: {}", p.hls_codecs);
        let p = at(&scope, "720p");
        assert_eq!((p.width, p.height, p.summary.output_height), (1280, 692, 692));
        // An H.264 picture no taller than 1080 but wider than 1920 is converted, not copied.
        let ultrawide = video_probe(r#"{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":2560,"height":1080}"#);
        let p = at(&ultrawide, "1080p");
        assert_eq!(p.summary.video, "h264_nvenc");
        assert!(p.summary.reasons.contains(&"2560 px wide above 1920 px".to_string()), "{:?}", p.summary.reasons);
        assert_eq!((p.width, p.height), (1920, 810));
        // DCI 4K is within a 4K receiver's width and stays untouched.
        let dci = video_probe(r#"{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":4096,"height":2160}"#);
        assert_eq!(at(&dci, "4k").summary.video, "copy");
        // A source smaller than the limit is never enlarged.
        let small = video_probe(r#"{"index":0,"codec_type":"video","codec_name":"mpeg4","pix_fmt":"yuv420p","width":640,"height":272}"#);
        assert_eq!((at(&small, "1080p").width, at(&small, "1080p").height), (640, 272));
    }

    #[test]
    fn dolby_vision_profile_5_is_shown_in_its_own_colours_or_at_least_shown() {
        // Profile 5 (Netflix and Disney+ WEB-DLs) declares no colours of its own.
        let p5 = video_probe(
            r#"{"index":0,"codec_type":"video","codec_name":"hevc","pix_fmt":"yuv420p10le","width":3840,"height":2160,"color_transfer":"unknown","color_primaries":"unknown","color_space":"unknown","side_data_list":[{"side_data_type":"DOVI configuration record","dv_profile":5}]}"#,
        );
        let v = p5.video.as_ref().unwrap();
        assert_eq!((v.hdr, v.dolby_vision, v.transfer.as_str(), v.matrix.as_str()), (true, Some(5), "", ""));
        let cpu = CastOptions { hardware_decoding: false, hardware_encoding: false, ..Default::default() };
        // Only libplacebo applies the reshaping, so it stays even with both GPU switches off.
        let caps = FfmpegCaps { available: true, nvenc: true, libplacebo: true, zscale_tonemap: true, ..Default::default() };
        let p = plan(Some(&p5), &cpu, &caps);
        assert_eq!(p.summary.tonemap.as_deref(), Some("libplacebo"));
        assert_eq!(p.pre_input, ["-init_hw_device", "vulkan"], "no GPU decoding was asked for");
        assert!(p.output.join(" ").contains("-c:v libx264"));
        // Without libplacebo the CPU tone mapper gets the colours declared, or zscale stops the
        // cast with "no path between colorspaces".
        let caps = FfmpegCaps { available: true, zscale_tonemap: true, ..Default::default() };
        let p = plan(Some(&p5), &cpu, &caps);
        let args = p.output.join(" ");
        assert!(args.contains("-vf setparams=color_trc=smpte2084:color_primaries=bt2020:colorspace=bt2020nc,scale=1920:1080:flags=bilinear,zscale="), "{args}");
        assert!(p.summary.reasons.contains(&"Dolby Vision profile 5 colours need libplacebo".to_string()));
        // An HDR10 film that declares its colours gets none added.
        let hdr10 = video_probe(
            r#"{"index":0,"codec_type":"video","codec_name":"hevc","pix_fmt":"yuv420p10le","width":3840,"height":2160,"color_transfer":"smpte2084","color_primaries":"bt2020","color_space":"bt2020nc"}"#,
        );
        let args = plan(Some(&hdr10), &cpu, &caps).output.join(" ");
        assert!(args.contains("-vf scale=1920:1080:flags=bilinear,zscale=") && !args.contains("setparams"), "{args}");
        // Forced tone mapping on an untagged SDR file names BT.709 instead of failing.
        let sdr = video_probe(r#"{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":1920,"height":1080}"#);
        let forced = CastOptions { tonemap: "on".into(), ..cpu };
        let args = plan(Some(&sdr), &forced, &caps).output.join(" ");
        assert!(args.contains("-vf setparams=color_trc=bt709:color_primaries=bt709:colorspace=bt709,scale=1920:1080:flags=bilinear,zscale="), "{args}");
    }

    #[test]
    fn native_hevc_sends_the_film_untouched_unless_conversion_is_forced() {
        let probe = mario();
        let caps = FfmpegCaps { available: true, nvenc: true, ..Default::default() };
        let options = CastOptions { hevc_native: true, quality: "4k".into(), audio_mode: "original".into(), ..Default::default() };
        let plan = plan(Some(&probe), &options, &caps);
        let args = plan.output.join(" ");
        assert!(args.contains("-c:v copy") && !args.contains("hevc_mp4toannexb"), "fMP4 keeps hvcC samples: {args}");
        assert!(args.contains("-c:a copy"), "{args}");
        assert_eq!(plan.hls_codecs, "hvc1.2.4.L150.B0,ec-3", "3840x1606 at 23.976 fits level 5");
        assert!(plan.hls_fmp4, "H.265 travels in fragmented MP4 over HLS");
        let forced = CastOptions { force_conversion: true, ..options };
        let args = self::plan(Some(&probe), &forced, &caps).output.join(" ");
        assert!(args.contains("-c:v h264_nvenc") && args.contains("-c:a ac3"), "{args}");
    }

    #[test]
    fn tv_safe_h264_is_copied_and_audio_filters_force_an_audio_encode() {
        let probe = parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":1920,"height":1080,"avg_frame_rate":"24/1"},
               {"index":1,"codec_type":"audio","codec_name":"aac","channels":2}],"format":{"duration":"100"}}"#,
        )
        .unwrap();
        let caps = FfmpegCaps::default();
        let build = |options: &CastOptions| {
            build_plan(
                &PlanInput { probe: Some(&probe), options, audio_ordinal: 0, burn_sub: None, burn_bitmap: None, force_video_encode: false, limits: DeviceLimits::default() },
                &caps,
            )
        };
        let copied = build(&CastOptions::default());
        assert_eq!(copied.hls_codecs, "avc1.640028,mp4a.40.2", "1080p24 fits level 4.0");
        assert!(!copied.hls_fmp4);
        let args = copied.output.join(" ");
        assert!(args.contains("-c:v copy -bsf:v h264_mp4toannexb"), "{args}");
        assert!(args.contains("-c:a copy"), "{args}");
        let louder = CastOptions { volume_boost: 50, night_mode: true, audio_delay_ms: -250, ..Default::default() };
        let args = build(&louder).output.join(" ");
        assert!(
            args.contains("-af dynaudnorm=f=200:g=15:p=0.9:m=10,volume=1.5,alimiter=limit=0.95:level=disabled,atrim=start=0.25,asetpts=PTS-STARTPTS"),
            "{args}"
        );
        assert!(args.contains("-c:a aac"));
        // Aspect and deinterlacing need the picture re-encoded.
        let wide = CastOptions { aspect: "4:3".into(), deinterlace: "always".into(), ..Default::default() };
        let args = build(&wide).output.join(" ");
        assert!(args.contains("-vf bwdif=mode=send_frame:deint=all,scale=1920:1080,setsar=1,setdar=4/3,format=yuv420p"), "{args}");
        let fill = CastOptions { aspect: "fill".into(), ..Default::default() };
        let scope = parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":1920,"height":800}],"format":{}}"#,
        )
        .unwrap();
        let p = build_plan(
            &PlanInput { probe: Some(&scope), options: &fill, audio_ordinal: 0, burn_sub: None, burn_bitmap: None, force_video_encode: false, limits: DeviceLimits::default() },
            &caps,
        );
        assert!(p.output.join(" ").contains("-vf crop=1422:800,scale=1422:800"), "{:?}", p.output);
    }

    #[test]
    fn dialogue_boost_only_applies_when_folding_surround_to_stereo() {
        let o = CastOptions { dialogue_boost: true, ..Default::default() };
        assert!(audio_filters(&o, 6, true)[0].starts_with("pan=stereo|FL<"));
        assert!(audio_filters(&o, 2, true).is_empty());
        assert!(audio_filters(&o, 6, false).is_empty());
    }

    #[test]
    fn local_inputs_never_get_http_options_and_seek_follows_the_session() {
        let job = CastJob {
            url: "C:/Films/movie.mp4".into(),
            headers: HashMap::new(),
            seek_sec: 754.2,
            fast_seek: true,
            plan: plan(None, &CastOptions::default(), &FfmpegCaps::default()),
            stats: SharedStats::default(),
        };
        let args = job.input_args(true, &FfmpegCaps::default()).join(" ");
        assert!(!args.contains("-user_agent") && !args.contains("-reconnect"), "{args}");
        assert!(args.ends_with("-noaccurate_seek -ss 754.200 -i C:/Films/movie.mp4"), "{args}");
        assert_eq!(http_input_args("https://a/b.mkv", &HashMap::new(), true)[0], "-user_agent");
    }

    #[test]
    fn header_values_cannot_add_lines_to_ffmpeg_requests() {
        let headers = HashMap::from([
            ("User-Agent".to_string(), "x\r\nX-Evil: 1".to_string()),
            ("Referer".to_string(), "https://site/\r\nCookie: stolen".to_string()),
            ("Origin".to_string(), "https://site".to_string()),
        ]);
        let args = http_input_args("https://a/b.mkv", &headers, false);
        assert!(args.iter().all(|a| !a.contains("X-Evil") && !a.contains("Cookie")), "{args:?}");
        assert!(args.contains(&"Origin: https://site\r\n".to_string()), "{args:?}");
        assert!(args[1].starts_with("Mozilla/5.0"), "the default agent replaces a broken one: {args:?}");
    }

    #[test]
    fn anamorphic_sources_keep_their_display_shape() {
        let probe = parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"mpeg2video","pix_fmt":"yuv420p","width":720,"height":576,"sample_aspect_ratio":"16:15","avg_frame_rate":"25/1"},
               {"index":1,"codec_type":"audio","codec_name":"ac3","channels":2}],"format":{"duration":"100"}}"#,
        )
        .unwrap();
        assert_eq!(probe.video.as_ref().and_then(|v| v.sar), Some((16, 15)));
        let options = CastOptions::default();
        let plan = build_plan(
            &PlanInput { probe: Some(&probe), options: &options, audio_ordinal: 0, burn_sub: None, burn_bitmap: None, force_video_encode: false, limits: DeviceLimits::default() },
            &FfmpegCaps::default(),
        );
        let args = plan.output.join(" ");
        // 720x576 at 16:15 shows as 4:3, so square pixels need 768x576, not 720x576 (5:4).
        assert!(args.contains("scale=768:576,setsar=1"), "{args}");
    }

    #[test]
    fn hls_announces_the_profile_and_level_actually_sent() {
        // H.264: size, frame rate, peak rate and buffer each pick a minimum level.
        assert_eq!(h264_level(1920, 1080, 30.0, None, None), 40);
        assert_eq!(h264_level(1920, 1080, 60.0, None, None), 42, "1080p60 needs 4.2");
        assert_eq!(h264_level(1920, 1080, 24.0, Some(30_000), None), 41, "above 4.0's 25 Mbit/s");
        assert_eq!(h264_level(1920, 1080, 24.0, Some(60_000), Some(80_000)), 50, "a buffer above 4.1's");
        assert_eq!(h264_level(1280, 720, 30.0, None, None), 31);
        assert_eq!(h264_level(1280, 720, 60.0, None, None), 32);
        assert_eq!(h264_level(3840, 2160, 30.0, None, None), 51);
        assert_eq!(h264_level(3840, 2160, 60.0, None, None), 52, "4K60 needs 5.2");
        assert_eq!(h264_codec_string(42), "avc1.64002A");
        assert_eq!(h264_codec_string(52), "avc1.640034");
        assert_eq!(level_arg(42), "4.2");
        assert_eq!(level_arg(50), "5.0");
        // H.265 has no level 4.2: 1080p60 fits 4.1 (L123), 4K60 needs 5.1.
        assert_eq!(hevc_level(1920, 1080, 30.0), 120);
        assert_eq!(hevc_level(1920, 1080, 60.0), 123);
        assert_eq!(hevc_level(3840, 2160, 24.0), 150);
        assert_eq!(hevc_level(3840, 2160, 60.0), 153);
        assert_eq!(hevc_level(3840, 2160, 120.0), 156);
        let mut v = VideoInfo { codec: "hevc".into(), pix_fmt: "yuv420p".into(), ..Default::default() };
        assert_eq!(hevc_codec_string(&v, 123), "hvc1.1.6.L123.B0");
        v.pix_fmt = "yuv420p10le".into();
        assert_eq!(hevc_codec_string(&v, 153), "hvc1.2.4.L153.B0");
    }

    fn copy_probe(codec: &str, width: u32, height: u32, rate: &str, level: Option<u32>) -> MediaProbe {
        let level = level.map(|l| format!(",\"level\":{l}")).unwrap_or_default();
        parse_probe(&format!(
            r#"{{"streams":[{{"index":0,"codec_type":"video","codec_name":"{codec}","pix_fmt":"yuv420p","width":{width},"height":{height},"avg_frame_rate":"{rate}"{level}}},
               {{"index":1,"codec_type":"audio","codec_name":"aac","channels":2}}],"format":{{"duration":"100"}}}}"#
        ))
        .unwrap()
    }

    #[test]
    fn a_copied_h264_stream_announces_its_own_profile() {
        // ffprobe's dumps of real parameter sets: x264 Constrained Baseline in MPEG-TS (Annex B),
        // Main in Matroska and High in MP4 (avcC records).
        let baseline_ts = "\n00000000: 0000 0001 6742 c01e d900 a02f f970 1100  ....gB...../.p..\n00000010: 0003 0001 0000 0300 300f 162e 4800 0000  ........0...H...\n00000020: 0001 68cb 83cb 20                        ..h... \n";
        let main_mkv = "\n00000000: 014d 401e ffe1 0018 674d 401e eca0 5017  .M@.....gM@...P.\n00000010: fcb8 0880 0000 0300 8000 0018 078b 16cb  ................\n00000020: 0100 0568 ebe3 cb20                      ...h... \n";
        let high_mp4 = "\n00000000: 0164 001e ffe1 001a 6764 001e acd9 40a0  .d......gd....@.\n00000010: 2ff9 7011 0000 0300 0100 0003 0030 0f16  /.p..........0..\n00000020: 2d96 0100 0668 ebe3 cb22 c0fd f8f8 00    -....h...\".....\n";
        let cases = [
            (baseline_ts, "Constrained Baseline", [0x42, 0xC0, 0x1E], "avc1.42C01E"),
            (main_mkv, "Main", [0x4D, 0x40, 0x1E], "avc1.4D401E"),
            (high_mp4, "High", [0x64, 0x00, 0x1E], "avc1.64001E"),
        ];
        for (dump, name, header, codecs) in cases {
            let bytes = parse_hex_dump(dump).unwrap();
            assert_eq!(avc_header(&bytes), Some(header), "{name}");
            // Copied 360p24 at level 3.0: CODECS carries the stream's own three bytes.
            let mut probe = copy_probe("h264", 640, 360, "24/1", Some(30));
            let video = probe.video.as_mut().unwrap();
            video.profile = Some(name.into());
            video.avc_header = Some(header);
            let p = plan_with(&probe, &CastOptions::default(), DeviceLimits::default());
            assert_eq!(p.summary.video, "copy", "{name}");
            assert_eq!(p.hls_codecs, format!("{codecs},mp4a.40.2"), "{name}");
            // Without the parameter sets, the profile's name still gives the right profile.
            probe.video.as_mut().unwrap().avc_header = None;
            let p = plan_with(&probe, &CastOptions::default(), DeviceLimits::default());
            assert_eq!(&p.hls_codecs[..7], &codecs[..7], "{name}: {}", p.hls_codecs);
        }
        assert_eq!(h264_profile_bytes(Some("Constrained Baseline")), (0x42, 0x40));
        assert_eq!(h264_profile_bytes(Some("High 10 Intra")), (0x6E, 0x10));
        assert_eq!(h264_profile_bytes(None), (0x64, 0));
        // The probe reads the profile's name.
        let named = parse_probe(r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"h264","profile":"Main","width":640,"height":360}],"format":{}}"#).unwrap();
        assert_eq!(named.video.unwrap().profile.as_deref(), Some("Main"));
        // Malformed or missing parameter sets give nothing rather than a guess.
        assert_eq!(avc_header(&[0, 0, 0, 1, 0x68, 0xCB]), None, "a PPS is not an SPS");
        assert_eq!(avc_header(&[1, 0x64]), None);
        assert_eq!(avc_header(&[]), None);
        assert_eq!(parse_hex_dump("garbage"), None);
        assert_eq!(parse_hex_dump("\n00000000: 01zz                                     ..\n"), None);
        // Re-encoded, the playlist names what the encoder writes (-profile:v high), not the source.
        let mut probe = copy_probe("h264", 640, 360, "24/1", Some(30));
        probe.video.as_mut().unwrap().avc_header = Some([0x42, 0xC0, 0x1E]);
        let p = build_plan(
            &PlanInput { probe: Some(&probe), options: &CastOptions::default(), audio_ordinal: 0, burn_sub: None, burn_bitmap: None, force_video_encode: true, limits: DeviceLimits::default() },
            &FfmpegCaps::default(),
        );
        assert!(p.output.join(" ").contains("-profile:v high"), "{:?}", p.output);
        assert!(p.hls_codecs.starts_with("avc1.6400"), "{}", p.hls_codecs);
    }

    #[test]
    fn a_copied_hevc_stream_announces_its_own_profile_tier_and_constraints() {
        // ffprobe's dumps of x265 output: Main in Matroska and Main 10 High tier in MP4 (hvcC
        // records, cut after their first line), Main 10 in MPEG-TS (Annex B, whose SPS carries
        // emulation prevention bytes inside the flags).
        let main_mkv = "\n00000000: 0101 6000 0000 9000 0000 0000 3ff0 00fc  ..`.........?...\n";
        let main10_high_mp4 = "\n00000000: 0122 2000 0000 9000 0000 0000 99f0 00fc  .\" .............\n";
        let main10_ts = "\n00000000: 0000 0001 4001 0c01 ffff 0220 0000 0300  ....@...... ....\n00000010: 9000 0003 0000 0300 3f95 9809 0000 0000  ........?.......\n00000020: 0142 0101 0220 0000 0300 9000 0003 0000  .B... ..........\n00000030: 0300 3fa0 0502 0169 3659 59a4 932b c05a  ..?....i6YY..+.Z\n00000040: 0200 0003 0002 0000 0300 3010 0000 0000  ..........0.....\n00000050: 0144 01c1 72b4 6240                      .D..r.b@\n";
        let cases = [
            (main_mkv, "yuv420p", 63, "hvc1.1.6.L63.90"),
            (main10_high_mp4, "yuv420p10le", 153, "hvc1.2.4.H153.90"),
            (main10_ts, "yuv420p10le", 63, "hvc1.2.4.L63.90"),
        ];
        let options = CastOptions { hevc_native: true, ..Default::default() };
        for (dump, pix_fmt, level, codecs) in cases {
            let ptl = hevc_ptl(&parse_hex_dump(dump).unwrap());
            assert!(ptl.is_some(), "{codecs}");
            let mut probe = copy_probe("hevc", 640, 360, "24/1", Some(level));
            let video = probe.video.as_mut().unwrap();
            video.pix_fmt = pix_fmt.into();
            video.hevc_ptl = ptl;
            let p = plan_with(&probe, &options, DeviceLimits::default());
            assert_eq!(p.summary.video, "copy", "{codecs}");
            assert!(p.hls_fmp4);
            assert_eq!(p.hls_codecs, format!("{codecs},mp4a.40.2"));
            // Without the parameter sets, the profile still follows the bit depth.
            probe.video.as_mut().unwrap().hevc_ptl = None;
            let guess = plan_with(&probe, &options, DeviceLimits::default()).hls_codecs;
            assert_eq!(&guess[..9], &codecs[..9], "{guess}");
        }
        // A profile space letter, and no constraint field when every constraint byte is zero.
        let mut probe = copy_probe("hevc", 640, 360, "24/1", Some(93));
        probe.video.as_mut().unwrap().hevc_ptl = Some([0x41, 0x60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 93]);
        assert!(plan_with(&probe, &options, DeviceLimits::default()).hls_codecs.starts_with("hvc1.A1.6.L93,"));
        // The level is never announced below what the picture needs: 4K60 needs 5.1 (L153).
        let mut probe = copy_probe("hevc", 3840, 2160, "60/1", Some(150));
        probe.video.as_mut().unwrap().hevc_ptl = Some([0x02, 0x20, 0, 0, 0, 0x90, 0, 0, 0, 0, 0, 150]);
        let options_4k = CastOptions { hevc_native: true, quality: "4k".into(), ..Default::default() };
        assert!(plan_with(&probe, &options_4k, DeviceLimits::default()).hls_codecs.starts_with("hvc1.2.4.L153.90,"));
        // Malformed parameter sets give nothing rather than a guess.
        assert_eq!(hevc_ptl(&[1, 0x01, 0x60]), None);
        assert_eq!(hevc_ptl(&[0, 0, 1, 0x40, 0x01, 0x0C]), None, "a VPS is not an SPS");
        assert_eq!(hevc_ptl(&[]), None);
    }

    #[test]
    fn copied_aac_announces_its_object_type() {
        let probe_with = |profile: &str| {
            parse_probe(&format!(
                r#"{{"streams":[{{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":1280,"height":720,"avg_frame_rate":"24/1"}},
                   {{"index":1,"codec_type":"audio","codec_name":"aac","profile":"{profile}","channels":2,"sample_rate":"48000"}}],"format":{{"duration":"100"}}}}"#
            ))
            .unwrap()
        };
        for (profile, codec) in [("LC", "mp4a.40.2"), ("HE-AAC", "mp4a.40.5"), ("HE-AACv2", "mp4a.40.29"), ("", "mp4a.40.2")] {
            let p = plan_with(&probe_with(profile), &CastOptions::default(), DeviceLimits::default());
            assert_eq!(p.summary.audio, "AAC (original)", "{profile}");
            assert!(p.hls_codecs.ends_with(&format!(",{codec}")), "{profile}: {}", p.hls_codecs);
        }
        // Re-encoded, it is Argus's own AAC-LC whatever the source was.
        let boosted = CastOptions { volume_boost: 25, ..Default::default() };
        let p = plan_with(&probe_with("HE-AAC"), &boosted, DeviceLimits::default());
        assert!(p.hls_codecs.ends_with(",mp4a.40.2"), "{}", p.hls_codecs);
    }

    #[test]
    fn a_silent_source_announces_and_maps_no_audio() {
        let silent = parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":1280,"height":720,"avg_frame_rate":"24/1","max_bit_rate":"3000000"}],"format":{"duration":"10"}}"#,
        )
        .unwrap();
        for options in [CastOptions::default(), CastOptions { force_conversion: true, volume_boost: 50, ..Default::default() }] {
            let p = plan_with(&silent, &options, DeviceLimits::default());
            let args = p.output.join(" ");
            assert!(args.contains("-an") && !args.contains("0:a:") && !args.contains("-c:a"), "{args}");
            assert!(!p.hls_codecs.contains(','), "only the picture is announced: {}", p.hls_codecs);
            assert_eq!(p.summary.audio, "none");
        }
        // Copied, BANDWIDTH counts the picture's declared peak and the container, no audio.
        assert_eq!(plan_with(&silent, &CastOptions::default(), DeviceLimits::default()).bandwidth, 3_300_000);
        // Without a probe nothing is known, so the first audio track is still taken if there is one.
        let unknown = build_plan(
            &PlanInput { probe: None, options: &CastOptions::default(), audio_ordinal: 0, burn_sub: None, burn_bitmap: None, force_video_encode: false, limits: DeviceLimits::default() },
            &FfmpegCaps::default(),
        );
        assert!(unknown.output.join(" ").contains("-map 0:a:0?"));
    }

    #[test]
    fn a_track_number_past_the_sources_tracks_sends_the_first_track() {
        let probe = copy_probe("h264", 1280, 720, "24/1", Some(31));
        let p = build_plan(
            &PlanInput { probe: Some(&probe), options: &CastOptions::default(), audio_ordinal: 3, burn_sub: None, burn_bitmap: None, force_video_encode: false, limits: DeviceLimits::default() },
            &FfmpegCaps::default(),
        );
        let args = p.output.join(" ");
        assert!(args.contains("-map 0:a:0?") && !args.contains("0:a:3"), "{args}");
        assert!(p.hls_codecs.ends_with(",mp4a.40.2"));
    }

    #[test]
    fn h264_beyond_8_bit_420_is_converted_and_named() {
        for pix_fmt in ["yuv420p10le", "yuv422p", "yuv444p"] {
            let mut probe = copy_probe("h264", 1280, 720, "24/1", Some(31));
            probe.video.as_mut().unwrap().pix_fmt = pix_fmt.into();
            let p = plan_with(&probe, &CastOptions::default(), DeviceLimits::default());
            assert_ne!(p.summary.video, "copy", "{pix_fmt}");
            assert!(p.summary.reasons.contains(&format!("H.264 {pix_fmt}")), "{:?}", p.summary.reasons);
        }
        let probe = copy_probe("h264", 1280, 720, "24/1", Some(31));
        assert_eq!(plan_with(&probe, &CastOptions::default(), DeviceLimits::default()).summary.video, "copy");
    }

    fn plan_with(probe: &MediaProbe, options: &CastOptions, limits: DeviceLimits) -> CastPlan {
        build_plan(
            &PlanInput { probe: Some(probe), options, audio_ordinal: 0, burn_sub: None, burn_bitmap: None, force_video_encode: false, limits },
            &FfmpegCaps::default(),
        )
    }

    #[test]
    fn the_encoder_level_and_the_playlist_agree_at_high_frame_rates() {
        // A 1080p60 source re-encoded: -level and CODECS both say 4.2.
        let probe = copy_probe("hevc", 1920, 1080, "60/1", None);
        let p = plan_with(&probe, &CastOptions::default(), DeviceLimits::default());
        let args = p.output.join(" ");
        assert!(args.contains("-c:v libx264") && args.contains("-level 4.2"), "{args}");
        assert!(p.hls_codecs.starts_with("avc1.64002A,"), "{}", p.hls_codecs);
        // A copied 1080p60 H.264 stream announces what its size and frame rate need ...
        let probe = copy_probe("h264", 1920, 1080, "60000/1001", None);
        assert!(plan_with(&probe, &CastOptions::default(), DeviceLimits::default()).hls_codecs.starts_with("avc1.64002A,"));
        // ... or the level it declares, when that is higher.
        let probe = copy_probe("h264", 1920, 1080, "24/1", Some(51));
        assert!(plan_with(&probe, &CastOptions::default(), DeviceLimits::default()).hls_codecs.starts_with("avc1.640033,"));
        let probe = copy_probe("hevc", 3840, 2160, "60/1", Some(150));
        let options = CastOptions { hevc_native: true, quality: "4k".into(), ..Default::default() };
        assert!(plan_with(&probe, &options, DeviceLimits::default()).hls_codecs.starts_with("hvc1.1.6.L153.B0,"));
    }

    #[test]
    fn device_limits_cap_resolution_rate_and_audio() {
        // A 720p receiver (Nest Hub) gets 720p, within its bit rate, in stereo AAC.
        let probe = parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":1920,"height":1080,"avg_frame_rate":"24/1"},
               {"index":1,"codec_type":"audio","codec_name":"ac3","channels":6}],"format":{"duration":"100"}}"#,
        )
        .unwrap();
        let limits = DeviceLimits { max_height: Some(720), max_video_kbps: Some(3_000), force_aac: true, force_stereo: true };
        let options = CastOptions { audio_mode: "surround".into(), ..Default::default() };
        let p = plan_with(&probe, &options, limits);
        let args = p.output.join(" ");
        assert!(args.contains("scale=1280:720"), "{args}");
        // The receiver's 3000 kbit/s is the ceiling of the peak too, not only of the average.
        assert!(args.contains("-maxrate 3000k -bufsize 6000k"), "{args}");
        assert!(!args.contains("-maxrate 4500k"), "{args}");
        assert!(args.contains("-c:a aac -b:a 192k -ac 2"), "{args}");
        assert_eq!(p.summary.output_height, 720);
        assert_eq!(p.bandwidth, (3_000_000 + 192_000) * 11 / 10, "BANDWIDTH announces the capped peak");
        // The hardware encoders get the same ceiling next to their target.
        let gpu = FfmpegCaps { available: true, nvenc: true, ..Default::default() };
        let nvenc = build_plan(
            &PlanInput { probe: Some(&probe), options: &options, audio_ordinal: 0, burn_sub: None, burn_bitmap: None, force_video_encode: false, limits },
            &gpu,
        );
        assert!(nvenc.output.join(" ").contains("-b:v 3000k -maxrate 3000k"), "{:?}", nvenc.output);
        // A 720p H.264 file the receiver plays as it is, is copied: the budget caps encoding only.
        let fast = parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":1280,"height":720,"avg_frame_rate":"24/1","bit_rate":"20000000"},
               {"index":1,"codec_type":"audio","codec_name":"aac","channels":2}],"format":{"duration":"100"}}"#,
        )
        .unwrap();
        let p = plan_with(&fast, &CastOptions::default(), limits);
        assert_eq!(p.summary.video, "copy", "{:?}", p.summary.reasons);
        // Encoded anyway (subtitles, a forced conversion), it keeps to the budget.
        let p = plan_with(&fast, &CastOptions { force_conversion: true, ..Default::default() }, limits);
        assert!(p.output.join(" ").contains("-maxrate 3000k"), "{:?}", p.output);
        // Without a device limit the 1.5x peak allowance stays: 720p's 4000 kbit/s peaks at 6000.
        let free = plan_with(&probe, &CastOptions { quality: "720p".into(), force_conversion: true, ..Default::default() }, DeviceLimits::default());
        assert!(free.output.join(" ").contains("-maxrate 6000k -bufsize 8000k"), "{:?}", free.output);
        // Without limits the same film is copied and keeps its surround track.
        let free = plan_with(&probe, &CastOptions { audio_mode: "original".into(), ..Default::default() }, DeviceLimits::default());
        assert!(free.output.join(" ").contains("-c:v copy") && free.output.join(" ").contains("-c:a copy"));
    }

    #[test]
    fn a_limit_below_one_megabit_is_honoured_not_raised() {
        let probe = copy_probe("hevc", 1280, 720, "24/1", None);
        let limits = DeviceLimits { max_video_kbps: Some(800), ..Default::default() };
        let p = plan_with(&probe, &CastOptions::default(), limits);
        let args = p.output.join(" ");
        assert!(args.contains("-maxrate 800k -bufsize 1600k"), "{args}");
        // The copied stereo AAC reports no rate, so it counts at its ceiling (6 x 2 x 96 kHz).
        assert_eq!(p.bandwidth, (800_000 + 1_152_000) * 11 / 10);
    }

    #[test]
    fn a_picture_the_receiver_plays_is_copied_whatever_its_rate() {
        let limits = DeviceLimits { max_height: Some(1080), max_video_kbps: Some(3_000), ..Default::default() };
        let film = |video_extra: &str, format_extra: &str| {
            parse_probe(&format!(
                r#"{{"streams":[{{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":1280,"height":720,"avg_frame_rate":"24/1"{video_extra}}},
                   {{"index":1,"codec_type":"audio","codec_name":"aac","channels":2,"bit_rate":"192000"}}],"format":{{"duration":"100"{format_extra}}}}}"#
            ))
            .unwrap()
        };
        // Declared peak, average only (the stream's rate, MKV's statistics tag under either name,
        // the file's rate less its audio), above or below the budget, or nothing known: copied.
        let cases = [
            (r#","bit_rate":"2500000","max_bit_rate":"2800000""#, "", 2_800_000),
            (r#","bit_rate":"2500000","max_bit_rate":"6000000""#, "", 6_000_000),
            (r#","bit_rate":"2500000""#, "", 2_500_000),
            (r#","tags":{"BPS-eng":"2500000"}"#, "", 2_500_000),
            (r#","tags":{"BPS":"2500000"}"#, "", 2_500_000),
            ("", r#","bit_rate":"9000000""#, 8_808_000),
            ("", "", 8_000_000),
        ];
        for (video, format, video_bps) in cases {
            let p = plan_with(&film(video, format), &CastOptions::default(), limits);
            assert_eq!(p.summary.video, "copy", "{video} {format}: {:?}", p.summary.reasons);
            // BANDWIDTH announces the declared peak when there is one, else the best estimate.
            assert_eq!(p.bandwidth, (video_bps + 192_000) * 11 / 10, "{video} {format}");
        }
        assert_eq!(film(r#","tags":{"BPS-eng":"2500000"}"#, "").video.unwrap().bitrate, 2_500_000);
        // What the receiver cannot take as it is still converts, within the budget.
        let tall = parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":1920,"height":1080,"avg_frame_rate":"24/1"}],"format":{"duration":"100"}}"#,
        )
        .unwrap();
        let p = plan_with(&tall, &CastOptions::default(), DeviceLimits { max_height: Some(720), ..limits });
        assert_ne!(p.summary.video, "copy");
        assert!(p.output.join(" ").contains("-maxrate 3000k"), "{:?}", p.output);
    }

    #[test]
    fn an_audio_file_never_sends_its_cover_art_as_video() {
        // A music file whose only picture is its cover: no video map, no video codec in CODECS.
        let probe = parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"audio","codec_name":"flac","channels":2},
               {"index":1,"codec_type":"video","codec_name":"mjpeg","width":600,"height":600,"disposition":{"attached_pic":1}}],"format":{"duration":"240"}}"#,
        )
        .unwrap();
        assert!(probe.video.is_none());
        // Settings that would otherwise send the picture through the encoder change nothing.
        let options = CastOptions { force_conversion: true, tonemap: "on".into(), aspect: "16:9".into(), ..Default::default() };
        let p = build_plan(
            &PlanInput { probe: Some(&probe), options: &options, audio_ordinal: 0, burn_sub: None, burn_bitmap: Some(3), force_video_encode: true, limits: DeviceLimits::default() },
            &FfmpegCaps::default(),
        );
        let args = p.output.join(" ");
        assert!(args.contains("-vn") && !args.contains("-c:v") && !args.contains("0:v"), "{args}");
        assert!(args.contains("-map 0:a:0?") && !args.contains("-filter_complex"), "{args}");
        assert_eq!(p.hls_codecs, "mp4a.40.2");
        assert_eq!((p.width, p.height, p.summary.video.as_str()), (0, 0, "none"));
        assert_eq!(p.bandwidth, 192_000 * 11 / 10, "re-encoded to AAC 192k");
        // Without a probe nothing is known, so the first video stream, if any, is still taken.
        let unknown = plan(None, &CastOptions::default(), &FfmpegCaps::default());
        assert!(unknown.output.join(" ").contains("0:v:0?"), "{:?}", unknown.output);
    }

    #[test]
    fn bandwidth_counts_the_audio_actually_sent() {
        let music = |codec: &str, rate: &str| {
            parse_probe(&format!(
                r#"{{"streams":[{{"index":0,"codec_type":"audio","codec_name":"{codec}","channels":6{rate}}}],"format":{{"duration":"240"}}}}"#
            ))
            .unwrap()
        };
        let original = CastOptions { audio_mode: "original".into(), ..Default::default() };
        // A copied 1536 kbit/s E-AC-3 track is announced at its own rate.
        let p = plan_with(&music("eac3", r#","bit_rate":"1536000""#), &original, DeviceLimits::default());
        assert!(p.output.join(" ").contains("-c:a copy"), "{:?}", p.output);
        assert_eq!(p.bandwidth, 1_536_000 * 11 / 10);
        // One whose rate is unknown is announced at its codec's ceiling, never below it.
        let p = plan_with(&music("eac3", ""), &original, DeviceLimits::default());
        assert_eq!(p.bandwidth, 6_144_000 * 11 / 10);
        // Six-channel AAC at 48 kHz with no reported rate (it may be 768 kbit/s or more) counts at
        // 6 bits per sample per channel: 1728 kbit/s.
        let p = plan_with(&music("aac", r#","sample_rate":"48000""#), &original, DeviceLimits::default());
        assert!(p.output.join(" ").contains("-c:a copy"), "{:?}", p.output);
        assert_eq!(p.bandwidth, 1_728_000 * 11 / 10);
        assert!(p.bandwidth > 768_000);
        // Without a sample rate either, the highest one (96 kHz) is assumed.
        let p = plan_with(&music("aac", ""), &original, DeviceLimits::default());
        assert_eq!(p.bandwidth, 3_456_000 * 11 / 10);
        // Re-encoded audio counts what the encoder makes: AC-3 5.1 at 640k.
        let surround = CastOptions { audio_mode: "surround".into(), ..Default::default() };
        let p = plan_with(&music("truehd", ""), &surround, DeviceLimits::default());
        assert_eq!(p.bandwidth, 640_000 * 11 / 10);
        // With a copied picture, its reported rate and the copied audio add up.
        let film = parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":1920,"height":1080,"avg_frame_rate":"24/1","bit_rate":"9000000"},
               {"index":1,"codec_type":"audio","codec_name":"eac3","channels":6,"bit_rate":"1536000"}],"format":{"duration":"100"}}"#,
        )
        .unwrap();
        let p = plan_with(&film, &original, DeviceLimits::default());
        assert_eq!(p.bandwidth, (9_000_000 + 1_536_000) * 11 / 10);
    }

    #[test]
    fn forcing_tone_mapping_converts_a_copyable_source() {
        let probe = copy_probe("h264", 1920, 1080, "24/1", None);
        let p = plan_with(&probe, &CastOptions { tonemap: "on".into(), ..Default::default() }, DeviceLimits::default());
        assert_ne!(p.summary.video, "copy");
        assert!(p.summary.reasons.iter().any(|r| r == "tone mapping forced"), "{:?}", p.summary.reasons);
        let p = plan_with(&probe, &CastOptions::default(), DeviceLimits::default());
        assert_eq!(p.summary.video, "copy");
    }

    #[test]
    fn picture_subtitles_follow_the_subtitle_delay() {
        let probe = parse_probe(
            r#"{"streams":[{"index":0,"codec_type":"video","codec_name":"h264","pix_fmt":"yuv420p","width":1920,"height":1080,"avg_frame_rate":"24/1"},
               {"index":2,"codec_type":"subtitle","codec_name":"hdmv_pgs_subtitle"}],"format":{"duration":"100"}}"#,
        )
        .unwrap();
        let plan_for = |delay: i32| {
            let options = CastOptions { sub_delay_ms: delay, ..Default::default() };
            build_plan(
                &PlanInput { probe: Some(&probe), options: &options, audio_ordinal: 0, burn_sub: None, burn_bitmap: Some(2), force_video_encode: false, limits: DeviceLimits::default() },
                &FfmpegCaps::default(),
            )
            .output
            .join(" ")
        };
        assert!(plan_for(1500).contains("[0:2]setpts=PTS+1.5/TB,scale="), "{}", plan_for(1500));
        assert!(plan_for(-250).contains("[0:2]setpts=PTS-0.25/TB,scale="), "{}", plan_for(-250));
        assert!(plan_for(0).contains("[0:2]scale="), "{}", plan_for(0));
    }

    #[test]
    fn unknown_option_values_fall_back_instead_of_failing() {
        let o: CastOptions = serde_json::from_str(r#"{"quality":"8k","audioMode":"weird","volumeBoost":25}"#).unwrap();
        assert_eq!(o.quality(), (1080, 14_000));
        assert!(o.hardware_encoding && o.hardware_decoding);
        assert_eq!(o.volume_boost, 25);
    }

    #[test]
    fn progress_lines_update_stats_and_errors_are_kept() {
        let stats = SharedStats::default();
        assert!(note_progress_line(&stats, "speed=3.91x"));
        assert!(note_progress_line(&stats, "out_time_us=12500000"));
        assert!(note_progress_line(&stats, "progress=continue"));
        assert!(!note_progress_line(&stats, "[in#0 @ 0x1] UDTA parsing failed retrying raw"));
        assert!(stats.lock().unwrap().error.is_none(), "a harmless note is not an error");
        assert!(!note_progress_line(&stats, "[in#0] Error opening input file"));
        let s = stats.lock().unwrap().clone();
        assert!((s.speed - 3.91).abs() < 1e-9 && (s.out_time_sec - 12.5).abs() < 1e-9 && s.running);
        assert!(s.error.as_deref().unwrap().contains("Error opening input"));
    }
}
