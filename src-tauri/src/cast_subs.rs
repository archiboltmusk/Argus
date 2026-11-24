use serde::Deserialize;
use std::collections::HashMap;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::Duration;
use uuid::Uuid;

#[derive(Clone, Debug, Deserialize, PartialEq)]
pub struct CastSub {
    pub kind: String,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub src_index: Option<u32>,
    #[serde(default)]
    pub format: Option<String>,
    #[serde(default)]
    pub off: bool,
}

#[derive(Clone, Debug, Deserialize)]
pub struct CastSubStyle {
    #[serde(default = "default_font_size")]
    pub font_size: u32,
    #[serde(default = "default_white")]
    pub font_color: String,
    #[serde(default = "default_black")]
    pub border_color: String,
    #[serde(default)]
    pub border_size: u32,
    #[serde(default = "default_margin")]
    pub margin_y: u32,
    #[serde(default = "default_align")]
    pub align_x: String,
    /// Draw the text on a translucent box instead of an outline.
    #[serde(default)]
    pub background: bool,
}

fn default_font_size() -> u32 {
    28
}

fn default_white() -> String {
    "#FFFFFF".to_string()
}

fn default_black() -> String {
    "#000000".to_string()
}

fn default_margin() -> u32 {
    12
}

fn default_align() -> String {
    "center".to_string()
}

impl Default for CastSubStyle {
    fn default() -> Self {
        CastSubStyle {
            font_size: default_font_size(),
            font_color: default_white(),
            border_color: default_black(),
            border_size: 0,
            margin_y: default_margin(),
            align_x: default_align(),
            background: false,
        }
    }
}

pub struct PreparedSub {
    pub path: PathBuf,
    pub force_style: String,
}

fn hex_to_ass_bgr(hex: &str) -> String {
    let clean = hex.trim().trim_start_matches('#');
    let parsed = if clean.len() == 6 {
        u32::from_str_radix(clean, 16).ok()
    } else if clean.len() == 3 {
        let r = &clean[0..1];
        let g = &clean[1..2];
        let b = &clean[2..3];
        u32::from_str_radix(&format!("{r}{r}{g}{g}{b}{b}"), 16).ok()
    } else {
        None
    };
    match parsed {
        Some(rgb) => {
            let r = (rgb >> 16) & 0xFF;
            let g = (rgb >> 8) & 0xFF;
            let b = rgb & 0xFF;
            format!("&H00{:02X}{:02X}{:02X}", b, g, r)
        }
        None => "&H00FFFFFF".to_string(),
    }
}

fn ass_alignment(align_x: &str) -> u32 {
    match align_x.to_lowercase().as_str() {
        "left" => 1,
        "right" => 3,
        _ => 2,
    }
}

pub fn build_force_style(style: &CastSubStyle) -> String {
    let primary = hex_to_ass_bgr(&style.font_color);
    let outline_color = hex_to_ass_bgr(&style.border_color);
    let outline = if style.border_size == 0 {
        2
    } else {
        style.border_size
    };
    let alignment = ass_alignment(&style.align_x);
    if style.background {
        // BorderStyle 3 paints OutlineColour as an opaque box; the alpha byte makes it translucent.
        return format!(
            "Fontsize={},PrimaryColour={},OutlineColour=&H60000000,BackColour=&H60000000,BorderStyle=3,Outline=2,Shadow=0,Alignment={},MarginV={}",
            style.font_size, primary, alignment, style.margin_y,
        );
    }
    format!(
        "Fontsize={},PrimaryColour={},OutlineColour={},BorderStyle=1,Outline={},Shadow=0,Alignment={},MarginV={}",
        style.font_size, primary, outline_color, outline, alignment, style.margin_y,
    )
}

/// Text subtitles from regional sites are often not UTF-8 (Arabic ones are usually Windows-1256),
/// and libass then draws mojibake. Re-encodes such a file to UTF-8 next to the original.
fn ensure_utf8(path: &Path, declared: &str, dir: &Path) -> PathBuf {
    let Ok(bytes) = std::fs::read(path) else {
        return path.to_path_buf();
    };
    let declared = declared.trim().to_ascii_lowercase();
    let automatic = matches!(declared.as_str(), "" | "auto" | "utf-8");
    // A byte-order mark names the encoding outright. Notepad saves "Unicode" as UTF-16, which
    // every guess below would misread.
    let (encoding, body) = match encoding_rs::Encoding::for_bom(&bytes) {
        Some((encoding, bom)) if automatic && encoding != encoding_rs::UTF_8 => (encoding, &bytes[bom..]),
        _ => {
            let body = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF][..]).unwrap_or(&bytes);
            if automatic && std::str::from_utf8(body).is_ok() {
                return path.to_path_buf();
            }
            let encoding = if automatic {
                guess_legacy_encoding(body)
            } else {
                encoding_rs::Encoding::for_label(declared.as_bytes()).unwrap_or(encoding_rs::WINDOWS_1252)
            };
            (encoding, body)
        }
    };
    if encoding == encoding_rs::UTF_8 {
        return path.to_path_buf();
    }
    let (text, _) = encoding.decode_without_bom_handling(body);
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("srt");
    let out = dir.join(format!("{}.{ext}", Uuid::new_v4()));
    if std::fs::write(&out, text.as_bytes()).is_ok() {
        eprintln!("[argus::cast-subs] re-encoded subtitle from {} to UTF-8", encoding.name());
        out
    } else {
        path.to_path_buf()
    }
}

/// Guesses the code page of a non-UTF-8 subtitle. Single-byte code pages decode any byte, so the
/// test is a pair that only real text produces: the Arabic article "ال" (0xC7 0xE1 in
/// Windows-1256) for Arabic, the most common Cyrillic letters for Windows-1251. Anything else is
/// read as Western European; the panel's encoding choice covers the rest.
fn guess_legacy_encoding(bytes: &[u8]) -> &'static encoding_rs::Encoding {
    let high = bytes.iter().filter(|b| **b >= 0x80).count();
    if high == 0 {
        return encoding_rs::WINDOWS_1252;
    }
    let article = bytes.windows(2).filter(|w| w[0] == 0xC7 && w[1] == 0xE1).count();
    if article * 100 >= high {
        return encoding_rs::WINDOWS_1256;
    }
    // о, е, а, и in Windows-1251, in text whose letters are mostly outside ASCII (French accents
    // share some of these bytes but stay a small part of the text).
    let latin = bytes.iter().filter(|b| b.is_ascii_alphabetic()).count();
    let cyrillic = bytes.iter().filter(|b| matches!(**b, 0xEE | 0xE5 | 0xE0 | 0xE8)).count();
    if high > latin && cyrillic * 4 >= high {
        return encoding_rs::WINDOWS_1251;
    }
    encoding_rs::WINDOWS_1252
}

/// The `subtitles` filter for a file. The path passes two parsers, so it is escaped twice: first
/// as an option value (`\:` keeps a drive colon from starting the next option), then as part of
/// the filter graph (where `,` `[` `]` `;` would end the filter). Unescaped, `C:/…` reached FFmpeg
/// as `filename=C` plus an `original_size` of `/…`, and every burn-in on Windows failed.
pub fn burn_filter(path: &str, force_style: &str) -> String {
    let escaped = escape_subtitles_path(Path::new(path));
    format!("subtitles=filename={}:force_style='{}'", escaped, force_style)
}

pub fn escape_subtitles_path(path: &Path) -> String {
    let path = path.to_string_lossy().replace('\\', "/");
    let mut option_value = String::with_capacity(path.len() + 8);
    for c in path.chars() {
        if matches!(c, '\\' | '\'' | ':') {
            option_value.push('\\');
        }
        option_value.push(c);
    }
    let mut graph = String::with_capacity(option_value.len() + 8);
    for c in option_value.chars() {
        if matches!(c, '\\' | '\'' | '[' | ']' | ',' | ';') {
            graph.push('\\');
        }
        graph.push(c);
    }
    graph
}

#[cfg(test)]
mod filter_tests {
    use super::*;

    #[test]
    fn windows_paths_survive_both_ffmpeg_parsers() {
        assert_eq!(
            burn_filter(r"C:\Users\me\Temp\sub.srt", "Fontsize=27"),
            r"subtitles=filename=C\\:/Users/me/Temp/sub.srt:force_style='Fontsize=27'"
        );
        // Checked against FFmpeg: these names failed with single-level escaping.
        assert_eq!(escape_subtitles_path(Path::new("/tmp/it's.srt")), r"/tmp/it\\\'s.srt");
        assert_eq!(escape_subtitles_path(Path::new("/tmp/a, [b];c.srt")), r"/tmp/a\, \[b\]\;c.srt");
    }
}

fn castsubs_dir() -> PathBuf {
    let dir = std::env::temp_dir().join("argus-castsubs");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn sniff_format(url: &str, content_type: Option<&str>, declared: Option<&str>) -> String {
    if let Some(fmt) = declared {
        let f = fmt.to_lowercase();
        if f == "srt" || f == "ass" || f == "ssa" || f == "vtt" {
            return f;
        }
    }
    let lower = url.to_lowercase();
    if lower.ends_with(".vtt") || content_type.is_some_and(|c| c.contains("vtt")) {
        return "vtt".to_string();
    }
    if lower.ends_with(".ass") || lower.ends_with(".ssa") {
        return "ass".to_string();
    }
    "srt".to_string()
}

/// A film's subtitle file is a few hundred KB. Anything bigger than this, downloaded or unpacked,
/// is not a subtitle, and reading it whole could exhaust memory.
const MAX_SUBTITLE_BYTES: usize = 20 * 1024 * 1024;

/// Unpacks a gzip-compressed subtitle, refusing one that grows past [`MAX_SUBTITLE_BYTES`].
fn gunzip_limited(raw: &[u8]) -> Option<Vec<u8>> {
    let mut decoded = Vec::new();
    flate2::read::GzDecoder::new(raw)
        .take(MAX_SUBTITLE_BYTES as u64 + 1)
        .read_to_end(&mut decoded)
        .ok()?;
    (decoded.len() <= MAX_SUBTITLE_BYTES).then_some(decoded)
}

async fn download_remote(url: &str, declared_format: Option<&str>, encoding: &str, dir: &Path) -> Option<PathBuf> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .gzip(true)
        .build()
        .ok()?;
    let res = client
        .get(url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        )
        .header("Accept", "*/*")
        .send()
        .await
        .ok()?;
    if !res.status().is_success() {
        return None;
    }
    let ct = res
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_lowercase());
    let fmt = sniff_format(url, ct.as_deref(), declared_format);
    if res.content_length().is_some_and(|len| len > MAX_SUBTITLE_BYTES as u64) {
        eprintln!("[argus::cast-subs] subtitle download refused: larger than {MAX_SUBTITLE_BYTES} bytes");
        return None;
    }
    let mut res = res;
    let mut raw: Vec<u8> = Vec::new();
    while let Some(chunk) = res.chunk().await.ok()? {
        if raw.len() + chunk.len() > MAX_SUBTITLE_BYTES {
            eprintln!("[argus::cast-subs] subtitle download stopped: larger than {MAX_SUBTITLE_BYTES} bytes");
            return None;
        }
        raw.extend_from_slice(&chunk);
    }
    let bytes: Vec<u8> = if raw.len() >= 2 && raw[0] == 0x1f && raw[1] == 0x8b {
        gunzip_limited(&raw)?
    } else {
        raw
    };
    let raw_path = dir.join(format!("{}.{}", Uuid::new_v4(), fmt));
    std::fs::write(&raw_path, &bytes).ok()?;
    let raw_path = ensure_utf8(&raw_path, encoding, dir);
    if fmt == "vtt" {
        convert_to_srt(&raw_path, dir).await
    } else {
        Some(raw_path)
    }
}

async fn prepare_local(path: &str, declared_format: Option<&str>, encoding: &str, dir: &Path) -> Option<PathBuf> {
    let src = PathBuf::from(path);
    if !src.is_file() {
        return None;
    }
    let fmt = sniff_format(path, None, declared_format);
    let src = ensure_utf8(&src, encoding, dir);
    if fmt == "vtt" {
        convert_to_srt(&src, dir).await
    } else {
        Some(src)
    }
}

/// Small subtitle files convert in well under a second.
const SUBTITLE_JOB_TIMEOUT: Duration = Duration::from_secs(30);
/// Pulling a track out of a film reads the whole container, which takes minutes over a network.
const EXTRACT_TIMEOUT: Duration = Duration::from_secs(600);

/// Runs one FFmpeg job that writes `out`, within `timeout`. The cast command waiting on it holds
/// the cast controls, so a stalled download or a damaged file must not hold them forever.
async fn run_ffmpeg(args: Vec<std::ffi::OsString>, out: PathBuf, timeout: Duration) -> Option<PathBuf> {
    let ffmpeg = crate::transcode::locate_ffmpeg()?;
    let mut cmd = crate::cast_transcode::quiet_command(&ffmpeg);
    cmd.args(["-hide_banner", "-loglevel", "error", "-nostdin", "-y"]).args(args).arg(&out);
    match crate::process_output::output(cmd, timeout).await {
        Ok(result) if result.status.success() && out.is_file() => Some(out),
        Ok(result) => {
            let detail = String::from_utf8_lossy(&result.stderr);
            eprintln!("[argus::cast-subs] ffmpeg failed: {}", detail.lines().last().unwrap_or("").trim());
            let _ = std::fs::remove_file(&out);
            None
        }
        Err(error) => {
            eprintln!("[argus::cast-subs] ffmpeg did not finish: {error}");
            let _ = std::fs::remove_file(&out);
            None
        }
    }
}

async fn convert_to_srt(input: &Path, dir: &Path) -> Option<PathBuf> {
    let out = dir.join(format!("{}.srt", Uuid::new_v4()));
    run_ffmpeg(vec!["-i".into(), input.into()], out, SUBTITLE_JOB_TIMEOUT).await
}

async fn extract_embedded(
    source_url: &str,
    src_index: u32,
    headers: &HashMap<String, String>,
    dir: &Path,
) -> Option<PathBuf> {
    let out = dir.join(format!("{}.srt", Uuid::new_v4()));
    let mut args: Vec<std::ffi::OsString> = crate::cast_transcode::http_input_args(source_url, headers, true)
        .into_iter()
        .map(Into::into)
        .collect();
    if crate::cast_transcode::is_http(source_url) {
        // A connection that stays open but sends nothing would otherwise stall until the timeout.
        args.extend(["-rw_timeout".into(), "20000000".into()]);
    }
    args.extend(["-i".into(), source_url.into(), "-map".into(), format!("0:s:{src_index}").into()]);
    args.extend(["-c:s".into(), "srt".into()]);
    run_ffmpeg(args, out, EXTRACT_TIMEOUT).await
}

/// Extracted embedded tracks, so a seek or a settings change on the TV does not read a large
/// container from the start again.
fn extracted_cache() -> &'static std::sync::Mutex<HashMap<(String, u32), PathBuf>> {
    static CACHE: std::sync::OnceLock<std::sync::Mutex<HashMap<(String, u32), PathBuf>>> = std::sync::OnceLock::new();
    CACHE.get_or_init(|| std::sync::Mutex::new(HashMap::new()))
}

/// The subtitle as a UTF-8 file on the film's clock, before any seek or delay is applied.
pub async fn prepare_base(
    sub: &CastSub,
    source_url: &str,
    headers: &HashMap<String, String>,
    encoding: &str,
) -> Option<PathBuf> {
    if sub.off {
        return None;
    }
    let dir = castsubs_dir();
    match sub.kind.as_str() {
        "external" => {
            let url = sub.url.as_deref()?;
            if crate::cast_transcode::is_http(url) {
                download_remote(url, sub.format.as_deref(), encoding, &dir).await
            } else {
                prepare_local(url, sub.format.as_deref(), encoding, &dir).await
            }
        }
        "embedded" => {
            let idx = sub.src_index?;
            let key = (source_url.to_string(), idx);
            if let Some(hit) = extracted_cache().lock().ok().and_then(|c| c.get(&key).cloned()) {
                if hit.is_file() {
                    return Some(hit);
                }
            }
            let path = extract_embedded(source_url, idx, headers, &dir).await?;
            if let Ok(mut cache) = extracted_cache().lock() {
                cache.insert(key, path.clone());
            }
            Some(path)
        }
        _ => None,
    }
}

/// Puts a prepared subtitle on the clock of a transcode that starts at `seek_start`, shown
/// `delay` seconds later than the film's own timing.
pub async fn place(base: &Path, style: &CastSubStyle, seek_start: f64, delay: f64) -> PreparedSub {
    let path = if seek_start > 1.0 || delay.abs() > 0.01 {
        shift_subtitle(base, seek_start, delay, &castsubs_dir())
            .await
            .unwrap_or_else(|| base.to_path_buf())
    } else {
        base.to_path_buf()
    };
    PreparedSub { path, force_style: build_force_style(style) }
}

async fn shift_subtitle(input: &Path, seek_start: f64, delay: f64, dir: &Path) -> Option<PathBuf> {
    // ASS keeps its own styling; everything else is re-written as SRT.
    let ass = input
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| e.eq_ignore_ascii_case("ass") || e.eq_ignore_ascii_case("ssa"));
    let (ext, codec) = if ass { ("ass", "ass") } else { ("srt", "srt") };
    let out = dir.join(format!("{}.{ext}", Uuid::new_v4()));
    let mut args: Vec<std::ffi::OsString> = Vec::new();
    if delay.abs() > 0.0005 {
        args.extend(["-itsoffset".into(), format!("{delay:.3}").into()]);
    }
    if seek_start > 0.0 {
        args.extend(["-ss".into(), format!("{seek_start:.3}").into()]);
    }
    args.extend(["-i".into(), input.into(), "-c:s".into(), codec.into()]);
    run_ffmpeg(args, out, SUBTITLE_JOB_TIMEOUT).await
}

pub fn cleanup() {
    if let Ok(mut cache) = extracted_cache().lock() {
        cache.clear();
    }
    let _ = std::fs::remove_dir_all(castsubs_dir());
}

#[cfg(test)]
mod encoding_tests {
    use super::*;

    #[test]
    fn arabic_windows_1256_subtitles_become_utf8() {
        let dir = std::env::temp_dir().join(format!("argus-castsubs-test-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let text = "1\r\n00:00:01,000 --> 00:00:02,000\r\nمرحبا بكم في الفيلم الجديد\r\n";
        let (bytes, _, _) = encoding_rs::WINDOWS_1256.encode(text);
        let src = dir.join("arabic.srt");
        std::fs::write(&src, &bytes).unwrap();
        let out = ensure_utf8(&src, "auto", &dir);
        assert_ne!(out, src);
        assert_eq!(std::fs::read_to_string(&out).unwrap(), text);
        // Already UTF-8: left alone.
        let utf8 = dir.join("utf8.srt");
        std::fs::write(&utf8, text.as_bytes()).unwrap();
        assert_eq!(ensure_utf8(&utf8, "auto", &dir), utf8);
        // An explicit choice wins over the guess.
        let french = "Ça déjà vu à l’été";
        let (latin, _, _) = encoding_rs::WINDOWS_1252.encode(french);
        let fr = dir.join("fr.srt");
        std::fs::write(&fr, &latin).unwrap();
        let out = ensure_utf8(&fr, "windows-1252", &dir);
        assert_eq!(std::fs::read_to_string(out).unwrap(), french);
        assert_eq!(guess_legacy_encoding(&latin).name(), "windows-1252");
        // Notepad's "Unicode" (UTF-16 with a byte-order mark) is read by its mark, not guessed.
        let mut utf16 = vec![0xFF, 0xFE];
        utf16.extend(text.encode_utf16().flat_map(u16::to_le_bytes));
        let wide = dir.join("wide.srt");
        std::fs::write(&wide, &utf16).unwrap();
        let out = ensure_utf8(&wide, "auto", &dir);
        assert_eq!(std::fs::read_to_string(out).unwrap(), text);
        // A UTF-8 file with a mark is already readable.
        let marked = dir.join("marked.srt");
        std::fs::write(&marked, [&[0xEF, 0xBB, 0xBF][..], text.as_bytes()].concat()).unwrap();
        assert_eq!(ensure_utf8(&marked, "auto", &dir), marked);
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn a_gzip_bomb_is_refused_but_a_real_subtitle_unpacks() {
        use std::io::Write;
        let pack = |data: &[u8]| {
            let mut e = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
            e.write_all(data).unwrap();
            e.finish().unwrap()
        };
        let srt = b"1\r\n00:00:01,000 --> 00:00:02,000\r\nHello\r\n".to_vec();
        assert_eq!(gunzip_limited(&pack(&srt)), Some(srt));
        // 40 MB of zeros packs into a few dozen KB; unpacking it stops at the limit.
        let bomb = pack(&vec![0u8; 40 * 1024 * 1024]);
        assert!(bomb.len() < 200_000);
        assert_eq!(gunzip_limited(&bomb), None);
    }

    #[test]
    fn background_box_uses_border_style_three() {
        let boxed = build_force_style(&CastSubStyle { background: true, ..CastSubStyle::default() });
        assert!(boxed.contains("BorderStyle=3"));
        assert!(build_force_style(&CastSubStyle::default()).contains("BorderStyle=1"));
    }
}
