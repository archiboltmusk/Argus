//! Plays a video that sits inside an archive the user already has on disk.
//!
//! The archive is read, never unpacked wholesale: the largest playable video is streamed into the
//! cache under a name this module chooses, so no path inside an archive ever decides where a file
//! lands. RAR data is received through UnRAR's test mode and written by us, the same way the games
//! module does it, so UnRAR never opens a destination file.

use std::collections::hash_map::DefaultHasher;
use std::fs::{self, File};
use std::hash::{Hash, Hasher};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use unrar_sys as rar;

type Result<T> = std::result::Result<T, &'static str>;

/// Refuses to fill a disk from one archive entry.
const MAX_VIDEO_BYTES: u64 = 100 * 1024 * 1024 * 1024;
const MAX_ENTRIES: usize = 100_000;

const VIDEO_EXTENSIONS: &[&str] = &[
    "mkv", "mp4", "m4v", "mov", "avi", "wmv", "webm", "ts", "m2ts", "mts", "mpg", "mpeg", "flv",
    "ogv", "3gp", "vob", "divx", "asf", "rmvb", "wtv",
];

#[derive(Debug)]
pub struct Extracted {
    pub path: PathBuf,
    pub name: String,
    pub bytes: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Kind {
    Zip,
    SevenZip,
    Rar,
    Tar,
    TarGz,
}

#[derive(Clone, Debug)]
struct Candidate {
    /// Position of the entry in archive order. Names can repeat; positions cannot.
    index: usize,
    name: String,
    bytes: u64,
}

fn kind_of(path: &Path) -> Option<Kind> {
    let name = path.file_name()?.to_str()?.to_ascii_lowercase();
    if name.ends_with(".tar.gz") || name.ends_with(".tgz") {
        return Some(Kind::TarGz);
    }
    match name.rsplit_once('.')?.1 {
        "zip" => Some(Kind::Zip),
        "7z" => Some(Kind::SevenZip),
        "rar" => Some(Kind::Rar),
        "tar" => Some(Kind::Tar),
        _ => None,
    }
}

fn is_video(name: &str) -> bool {
    name.rsplit_once('.')
        .map(|(_, extension)| {
            VIDEO_EXTENSIONS
                .iter()
                .any(|known| known.eq_ignore_ascii_case(extension))
        })
        .unwrap_or(false)
}

fn base_name(name: &str) -> &str {
    name.rsplit(['/', '\\']).next().unwrap_or(name)
}

/// Picks the biggest video, skipping the samples release groups tuck beside the real file.
fn pick(entries: impl IntoIterator<Item = Candidate>) -> Option<Candidate> {
    let mut videos: Vec<Candidate> = entries
        .into_iter()
        .filter(|entry| entry.bytes > 0 && is_video(&entry.name))
        .collect();
    let is_sample = |entry: &Candidate| {
        base_name(&entry.name)
            .to_ascii_lowercase()
            .contains("sample")
    };
    if videos.iter().any(|entry| !is_sample(entry)) {
        videos.retain(|entry| !is_sample(entry));
    }
    videos.into_iter().max_by_key(|entry| entry.bytes)
}

/// A file name that is safe to create: one path component, no control characters.
fn cache_file_name(name: &str) -> String {
    let cleaned: String = base_name(name)
        .chars()
        .map(|c| {
            if c.is_control() || matches!(c, '<' | '>' | ':' | '"' | '|' | '?' | '*') {
                '_'
            } else {
                c
            }
        })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.');
    if trimmed.is_empty() {
        "video".to_string()
    } else {
        trimmed.to_string()
    }
}

fn cache_key(archive: &Path, candidate: &Candidate) -> Result<String> {
    let meta = fs::metadata(archive).map_err(|_| "archive_read")?;
    let mut hasher = DefaultHasher::new();
    archive.hash(&mut hasher);
    meta.len().hash(&mut hasher);
    meta.modified().ok().hash(&mut hasher);
    candidate.index.hash(&mut hasher);
    candidate.name.hash(&mut hasher);
    Ok(format!("{:016x}", hasher.finish()))
}

/// Copies at most `expected` bytes and fails if the entry is longer or shorter than it declared.
fn copy_exact<R: Read + ?Sized>(
    reader: &mut R,
    writer: &mut impl Write,
    expected: u64,
) -> Result<()> {
    let mut limited = Read::take(&mut *reader, expected.saturating_add(1));
    let copied = io::copy(&mut limited, writer).map_err(|_| "archive_read")?;
    if copied == expected {
        Ok(())
    } else {
        Err("archive_checksum")
    }
}

fn list_zip(path: &Path) -> Result<Vec<Candidate>> {
    let mut archive = zip::ZipArchive::new(File::open(path).map_err(|_| "archive_read")?)
        .map_err(|_| "archive_format")?;
    if archive.len() > MAX_ENTRIES {
        return Err("archive_limit");
    }
    let mut out = Vec::new();
    for index in 0..archive.len() {
        let entry = archive.by_index_raw(index).map_err(|_| "archive_format")?;
        if entry.is_dir() {
            continue;
        }
        if entry.encrypted() && is_video(entry.name()) {
            return Err("archive_encrypted");
        }
        out.push(Candidate {
            index,
            name: entry.name().to_string(),
            bytes: entry.size(),
        });
    }
    Ok(out)
}

fn write_zip(path: &Path, picked: &Candidate, out: &mut impl Write) -> Result<()> {
    let mut archive = zip::ZipArchive::new(File::open(path).map_err(|_| "archive_read")?)
        .map_err(|_| "archive_format")?;
    let mut entry = archive
        .by_index(picked.index)
        .map_err(|_| "archive_format")?;
    copy_exact(&mut entry, out, picked.bytes)
}

fn open_7z(path: &Path) -> Result<sevenz_rust2::ArchiveReader<File>> {
    let archive = sevenz_rust2::ArchiveReader::new(
        File::open(path).map_err(|_| "archive_read")?,
        sevenz_rust2::Password::from(""),
    )
    .map_err(|error| match error {
        sevenz_rust2::Error::PasswordRequired | sevenz_rust2::Error::MaybeBadPassword(_) => {
            "archive_encrypted"
        }
        _ => "archive_format",
    })?;
    if archive.archive().files.len() > MAX_ENTRIES {
        return Err("archive_limit");
    }
    let encrypted = archive
        .archive()
        .blocks
        .iter()
        .flat_map(|block| &block.coders)
        .any(|coder| coder.encoder_method_id() == sevenz_rust2::EncoderMethod::ID_AES256_SHA256);
    if encrypted {
        return Err("archive_encrypted");
    }
    Ok(archive)
}

fn list_7z(path: &Path) -> Result<Vec<Candidate>> {
    let archive = open_7z(path)?;
    Ok(archive
        .archive()
        .files
        .iter()
        .enumerate()
        .filter(|(_, item)| !item.is_directory() && item.has_stream())
        .map(|(index, item)| Candidate {
            index,
            name: item.name().to_string(),
            bytes: item.size,
        })
        .collect())
}

fn write_7z(path: &Path, picked: &Candidate, out: &mut impl Write) -> Result<()> {
    let mut archive = open_7z(path)?;
    let mut position = 0usize;
    let mut result: Result<()> = Err("archive_format");
    let walked = archive.for_each_entries(|item, reader| {
        let here = position;
        position += 1;
        if here != picked.index {
            // Solid blocks decode in order, so earlier entries have to be read through.
            if item.has_stream() {
                io::copy(reader, &mut io::sink())?;
            }
            return Ok(true);
        }
        result = copy_exact(reader, out, picked.bytes);
        Ok(false)
    });
    if walked.is_err() && result.is_err() {
        return Err("archive_checksum");
    }
    result
}

fn open_tar(path: &Path, gzip: bool) -> Result<tar::Archive<Box<dyn Read>>> {
    let file = File::open(path).map_err(|_| "archive_read")?;
    let reader: Box<dyn Read> = if gzip {
        Box::new(flate2::read::GzDecoder::new(file))
    } else {
        Box::new(file)
    };
    Ok(tar::Archive::new(reader))
}

fn list_tar(path: &Path, gzip: bool) -> Result<Vec<Candidate>> {
    let mut archive = open_tar(path, gzip)?;
    let mut out = Vec::new();
    for (index, entry) in archive.entries().map_err(|_| "archive_format")?.enumerate() {
        if index >= MAX_ENTRIES {
            return Err("archive_limit");
        }
        let entry = entry.map_err(|_| "archive_format")?;
        if !entry.header().entry_type().is_file() {
            continue;
        }
        let name = entry
            .path()
            .map_err(|_| "archive_format")?
            .to_string_lossy()
            .into_owned();
        out.push(Candidate {
            index,
            name,
            bytes: entry.size(),
        });
    }
    Ok(out)
}

fn write_tar(path: &Path, gzip: bool, picked: &Candidate, out: &mut impl Write) -> Result<()> {
    let mut archive = open_tar(path, gzip)?;
    for (index, entry) in archive.entries().map_err(|_| "archive_format")?.enumerate() {
        let mut entry = entry.map_err(|_| "archive_format")?;
        if index == picked.index {
            return copy_exact(&mut entry, out, picked.bytes);
        }
    }
    Err("archive_format")
}

fn wide(value: &[rar::WCHAR]) -> Result<String> {
    let end = value.iter().position(|v| *v == 0).ok_or("archive_path")?;
    // The legacy field truncates at 1023 characters; a cut-off name is not an identity.
    if end == 0 || end >= value.len() - 1 {
        return Err("archive_path");
    }
    #[cfg(windows)]
    let text = String::from_utf16(&value[..end]).map_err(|_| "archive_path")?;
    #[cfg(not(windows))]
    let text = value[..end]
        .iter()
        .map(|v| char::from_u32(*v as u32).ok_or("archive_path"))
        .collect::<Result<String>>()?;
    Ok(text.replace('\\', "/"))
}

struct RarState<'a> {
    sink: Option<&'a mut dyn Write>,
    remaining: u64,
    failure: Option<&'static str>,
}

extern "C" fn rar_callback(
    message: rar::UINT,
    user: rar::LPARAM,
    first: rar::LPARAM,
    second: rar::LPARAM,
) -> i32 {
    if user == 0 {
        return -1;
    }
    // The call into UnRAR is synchronous, so this stack frame outlives every callback.
    let state = unsafe { &mut *(user as *mut RarState<'_>) };
    if state.failure.is_some() {
        return -1;
    }
    let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| match message {
        rar::UCM_PROCESSDATA => {
            let Some(sink) = state.sink.as_mut() else {
                return Err("archive_format");
            };
            if second < 0 || first == 0 {
                return Err("archive_format");
            }
            let length = second as usize;
            state.remaining = state
                .remaining
                .checked_sub(length as u64)
                .ok_or("archive_limit")?;
            // UnRAR owns this buffer for the duration of the call; it is written, never kept.
            let bytes = unsafe { std::slice::from_raw_parts(first as *const u8, length) };
            sink.write_all(bytes).map_err(|_| "archive_write")
        }
        // Parts of a split set sit beside the first one. Asking for a part that is not there fails.
        rar::UCM_CHANGEVOLUME | rar::UCM_CHANGEVOLUMEW => {
            if second == rar::RAR_VOL_ASK {
                Err("archive_missing_part")
            } else {
                Ok(())
            }
        }
        rar::UCM_NEEDPASSWORD | rar::UCM_NEEDPASSWORDW => Err("archive_encrypted"),
        _ => Err("archive_format"),
    }));
    match outcome {
        Ok(Ok(())) => 1,
        Ok(Err(error)) => {
            state.failure = Some(error);
            -1
        }
        Err(_) => {
            state.failure = Some("archive_format");
            -1
        }
    }
}

/// UnRAR keeps global state, so two walks at once corrupt each other.
static RAR_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

struct RarHandle(*const rar::Handle);
impl Drop for RarHandle {
    fn drop(&mut self) {
        if !self.0.is_null() {
            unsafe {
                rar::RARCloseArchive(self.0);
            }
        }
    }
}

fn rar_code(value: i32) -> &'static str {
    match value {
        rar::ERAR_MISSING_PASSWORD | rar::ERAR_BAD_PASSWORD => "archive_encrypted",
        rar::ERAR_BAD_DATA => "archive_checksum",
        rar::ERAR_UNKNOWN_FORMAT => "archive_compression",
        rar::ERAR_EOPEN | rar::ERAR_EREAD => "archive_read",
        rar::ERAR_NO_MEMORY => "archive_limit",
        _ => "archive_format",
    }
}

/// Walks a RAR set. With `picked` set, that entry's data goes to `sink`; every other entry is skipped.
fn walk_rar(
    path: &Path,
    picked: Option<&Candidate>,
    mut sink: Option<&mut dyn Write>,
) -> Result<Vec<Candidate>> {
    let _serial = RAR_LOCK
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    let mut state = RarState {
        sink: None,
        remaining: 0,
        failure: None,
    };
    #[cfg(any(target_os = "linux", target_os = "netbsd"))]
    let source =
        std::ffi::CString::new(path.to_str().ok_or("archive_path")?).map_err(|_| "archive_path")?;
    #[cfg(not(any(target_os = "linux", target_os = "netbsd")))]
    let source = {
        let text = path.to_str().ok_or("archive_path")?;
        #[cfg(windows)]
        let mut v: Vec<rar::WCHAR> = text.encode_utf16().map(|c| c as rar::WCHAR).collect();
        #[cfg(not(windows))]
        let mut v: Vec<rar::WCHAR> = text.chars().map(|c| c as rar::WCHAR).collect();
        v.push(0);
        v
    };
    let mut options = rar::OpenArchiveDataEx::new(
        source.as_ptr(),
        if picked.is_some() {
            rar::RAR_OM_EXTRACT
        } else {
            rar::RAR_OM_LIST
        },
    );
    options.callback = Some(rar_callback);
    options.user_data = (&mut state as *mut RarState<'_>) as rar::LPARAM;
    let handle = RarHandle(unsafe { rar::RAROpenArchiveEx(&options) });
    if let Some(error) = state.failure {
        return Err(error);
    }
    if options.open_result != 0 {
        return Err(rar_code(options.open_result as i32));
    }
    if handle.0.is_null() {
        return Err("archive_format");
    }
    if options.flags & rar::ROADF_ENCHEADERS != 0 {
        return Err("archive_encrypted");
    }
    let mut out = Vec::new();
    let mut index = 0usize;
    loop {
        let header = rar::HeaderDataEx::default();
        let read = unsafe { rar::RARReadHeaderEx(handle.0, &header) };
        if read == rar::ERAR_END_ARCHIVE && state.failure.is_none() {
            break;
        }
        if let Some(error) = state.failure {
            return Err(error);
        }
        if read != rar::ERAR_SUCCESS {
            return Err(rar_code(read));
        }
        if index >= MAX_ENTRIES {
            return Err("archive_limit");
        }
        let directory = header.flags & rar::RHDF_DIRECTORY != 0;
        let bytes = (u64::from(header.unp_size_high) << 32) | u64::from(header.unp_size);
        let filename = header.filename_w;
        let name = wide(&filename)?;
        let encrypted = header.flags & rar::RHDF_ENCRYPTED != 0;
        let wanted = picked.is_some_and(|p| p.index == index);
        if wanted && encrypted {
            return Err("archive_encrypted");
        }
        if !directory {
            out.push(Candidate { index, name, bytes });
        }
        if wanted {
            state.sink = sink.take();
            state.remaining = bytes;
        }
        // Test mode decodes and checks the CRC and hands the data to the callback; nothing is
        // written by UnRAR itself.
        let operation = if wanted { rar::RAR_TEST } else { rar::RAR_SKIP };
        let result = unsafe {
            rar::RARProcessFileW(handle.0, operation, std::ptr::null(), std::ptr::null())
        };
        if let Some(error) = state.failure {
            return Err(error);
        }
        if result != rar::ERAR_SUCCESS {
            return Err(rar_code(result));
        }
        if wanted {
            if state.remaining != 0 {
                return Err("archive_checksum");
            }
            return Ok(out);
        }
        index += 1;
    }
    Ok(out)
}

fn list(path: &Path, kind: Kind) -> Result<Vec<Candidate>> {
    match kind {
        Kind::Zip => list_zip(path),
        Kind::SevenZip => list_7z(path),
        Kind::Rar => walk_rar(path, None, None),
        Kind::Tar => list_tar(path, false),
        Kind::TarGz => list_tar(path, true),
    }
}

fn write(path: &Path, kind: Kind, picked: &Candidate, out: &mut impl Write) -> Result<()> {
    match kind {
        Kind::Zip => write_zip(path, picked, out),
        Kind::SevenZip => write_7z(path, picked, out),
        Kind::Rar => walk_rar(path, Some(picked), Some(out)).map(|_| ()),
        Kind::Tar => write_tar(path, false, picked, out),
        Kind::TarGz => write_tar(path, true, picked, out),
    }
}

/// Extracts the video to `cache_root` and returns where it is. A finished earlier extraction of
/// the same archive is reused.
pub fn extract_video(archive: &Path, cache_root: &Path) -> Result<Extracted> {
    let kind = kind_of(archive).ok_or("archive_format")?;
    let picked = pick(list(archive, kind)?).ok_or("archive_no_video")?;
    if picked.bytes > MAX_VIDEO_BYTES {
        return Err("archive_limit");
    }
    let directory = cache_root.join(cache_key(archive, &picked)?);
    let name = cache_file_name(&picked.name);
    let target = directory.join(&name);
    if fs::metadata(&target)
        .map(|meta| meta.len() == picked.bytes)
        .unwrap_or(false)
    {
        return Ok(Extracted {
            path: target,
            name,
            bytes: picked.bytes,
        });
    }
    fs::create_dir_all(&directory).map_err(|_| "archive_write")?;
    let partial = directory.join(format!("{name}.part"));
    let result = (|| {
        let mut file = io::BufWriter::with_capacity(
            1 << 20,
            File::create(&partial).map_err(|_| "archive_write")?,
        );
        write(archive, kind, &picked, &mut file)?;
        file.flush().map_err(|_| "archive_write")
    })();
    if let Err(error) = result {
        let _ = fs::remove_file(&partial);
        return Err(error);
    }
    fs::rename(&partial, &target).map_err(|_| "archive_write")?;
    Ok(Extracted {
        path: target,
        name,
        bytes: picked.bytes,
    })
}

/// Deletes extractions that have not been touched for `max_age`. Returns how many folders went.
pub fn prune_cache(cache_root: &Path, max_age: std::time::Duration) -> usize {
    let Ok(entries) = fs::read_dir(cache_root) else {
        return 0;
    };
    let mut removed = 0;
    for entry in entries.flatten() {
        let old = entry
            .metadata()
            .and_then(|meta| meta.modified())
            .ok()
            .and_then(|modified| modified.elapsed().ok())
            .is_some_and(|age| age > max_age);
        if old && fs::remove_dir_all(entry.path()).is_ok() {
            removed += 1;
        }
    }
    removed
}

pub fn is_supported_archive(path: &Path) -> bool {
    kind_of(path).is_some()
}

pub fn message(code: &str) -> String {
    match code {
        "archive_no_video" => "No video file found in this archive.",
        "archive_encrypted" => "This archive is password protected, which is not supported.",
        "archive_missing_part" => {
            "A part of this multi-part archive is missing. Keep all parts in one folder."
        }
        "archive_limit" => "This archive is too large to play.",
        "archive_checksum" => "The video in this archive is damaged or incomplete.",
        "archive_write" => "Could not write the video to the cache folder.",
        "archive_compression" => "This archive uses a compression method that is not supported.",
        _ => "Could not read this archive.",
    }
    .to_string()
}

#[cfg(test)]
#[path = "video_archive_tests.rs"]
mod tests;
