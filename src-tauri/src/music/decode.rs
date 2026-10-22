//! Audio file decoding on top of symphonia. Shared by the Music module and any
//! feature that needs raw PCM from a local file (waveforms, DJ deck).

use std::fs::File;
use std::path::Path;

use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{Decoder, DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymError;
use symphonia::core::formats::{FormatOptions, FormatReader, SeekMode, SeekTo};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;

pub struct Decoded {
    pub sample_rate: u32,
    pub channels: u16,
    /// Interleaved f32 samples in -1.0..=1.0.
    pub samples: Vec<f32>,
}

struct Open {
    format: Box<dyn FormatReader>,
    decoder: Box<dyn Decoder>,
    track_id: u32,
}

fn open(path: &Path) -> Result<Open, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
        hint.with_extension(ext);
    }
    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .map_err(|e| e.to_string())?;
    let format = probed.format;
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| "no decodable audio track".to_string())?;
    let track_id = track.id;
    let decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| e.to_string())?;
    Ok(Open { format, decoder, track_id })
}

/// Calls `on_chunk(sample_rate, channels, interleaved)` for each decoded packet.
/// Return `false` from the callback to stop early.
fn walk(
    path: &Path,
    start_ms: u64,
    mut on_chunk: impl FnMut(u32, u16, &[f32]) -> bool,
) -> Result<(), String> {
    let Open { mut format, mut decoder, track_id } = open(path)?;
    if start_ms > 0 {
        let time = Time::new(start_ms / 1000, (start_ms % 1000) as f64 / 1000.0);
        format
            .seek(
                SeekMode::Accurate,
                SeekTo::Time { time, track_id: Some(track_id) },
            )
            .map_err(|e| e.to_string())?;
        decoder.reset();
    }
    let mut buf: Option<SampleBuffer<f32>> = None;
    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(SymError::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(SymError::ResetRequired) => break,
            Err(e) => return Err(e.to_string()),
        };
        if packet.track_id() != track_id {
            continue;
        }
        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(SymError::DecodeError(_)) => continue,
            Err(e) => return Err(e.to_string()),
        };
        let spec = *decoded.spec();
        let sb = buf.get_or_insert_with(|| {
            SampleBuffer::<f32>::new(decoded.capacity() as u64, spec)
        });
        sb.copy_interleaved_ref(decoded);
        if !on_chunk(spec.rate, spec.channels.count() as u16, sb.samples()) {
            break;
        }
    }
    Ok(())
}

/// Decodes up to `max_ms` (all when `None`) starting at `start_ms`.
pub fn decode_file(path: &Path, start_ms: u64, max_ms: Option<u64>) -> Result<Decoded, String> {
    let mut out = Decoded { sample_rate: 0, channels: 0, samples: Vec::new() };
    walk(path, start_ms, |rate, channels, samples| {
        out.sample_rate = rate;
        out.channels = channels;
        out.samples.extend_from_slice(samples);
        match max_ms {
            Some(ms) => {
                let frames = out.samples.len() as u64 / u64::from(channels.max(1));
                frames * 1000 < ms * u64::from(rate)
            }
            None => true,
        }
    })?;
    if out.sample_rate == 0 {
        return Err("file has no audio".into());
    }
    Ok(out)
}

/// Normalised 0..=1 peak envelope with `buckets` entries, streamed without
/// holding the whole file in memory.
pub fn peaks(path: &Path, buckets: usize) -> Result<Vec<f32>, String> {
    let mut chunk_peaks: Vec<f32> = Vec::new();
    walk(path, 0, |_, _, samples| {
        chunk_peaks.push(samples.iter().fold(0.0_f32, |m, s| m.max(s.abs())));
        true
    })?;
    if chunk_peaks.is_empty() || buckets == 0 {
        return Ok(Vec::new());
    }
    let mut out = vec![0.0_f32; buckets];
    for (i, p) in chunk_peaks.iter().enumerate() {
        let b = i * buckets / chunk_peaks.len();
        out[b] = out[b].max(*p);
    }
    let top = out.iter().cloned().fold(0.0_f32, f32::max);
    if top > 0.0 {
        for v in &mut out {
            *v /= top;
        }
    }
    Ok(out)
}

/// Writes 16-bit PCM WAV, used when the webview cannot decode a format itself.
pub fn write_wav(decoded: &Decoded, out: &Path) -> Result<(), String> {
    let spec = hound::WavSpec {
        channels: decoded.channels,
        sample_rate: decoded.sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut w = hound::WavWriter::create(out, spec).map_err(|e| e.to_string())?;
    for s in &decoded.samples {
        w.write_sample((s.clamp(-1.0, 1.0) * f32::from(i16::MAX)) as i16)
            .map_err(|e| e.to_string())?;
    }
    w.finalize().map_err(|e| e.to_string())
}
