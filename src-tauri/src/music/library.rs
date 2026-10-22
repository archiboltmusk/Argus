//! Local audio library: folder scan, tag reading, covers and lyrics sidecars.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use lofty::file::TaggedFile;
use lofty::prelude::*;
use lofty::tag::{ItemKey, Tag};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

pub const AUDIO_EXTS: &[&str] = &[
    "mp3", "m4a", "m4b", "aac", "flac", "ogg", "oga", "opus", "wav", "aif", "aiff", "wv", "ape",
    "mka",
];

const COVER_NAMES: &[&str] = &["cover", "folder", "front", "album", "albumart"];
const COVER_EXTS: &[&str] = &["jpg", "jpeg", "png", "webp"];

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: String,
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: String,
    pub track_no: u32,
    pub disc_no: u32,
    pub year: u32,
    pub genre: String,
    pub duration_ms: u64,
    pub ext: String,
    pub has_lyrics: bool,
    pub size: u64,
    pub mtime: u64,
}

pub fn is_audio(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .map(|e| AUDIO_EXTS.contains(&e.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

/// Stable id derived from the path (FNV-1a), so playlists survive rescans.
pub fn track_id(path: &str) -> String {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in path.as_bytes() {
        h ^= u64::from(*b);
        h = h.wrapping_mul(0x100000001b3);
    }
    format!("{h:016x}")
}

fn sidecar_lrc(path: &Path) -> PathBuf {
    path.with_extension("lrc")
}

fn read_tagged(path: &Path) -> Option<TaggedFile> {
    lofty::read_from_path(path).ok()
}

fn tag_of(file: &TaggedFile) -> Option<&Tag> {
    file.primary_tag().or_else(|| file.first_tag())
}

fn build_track(path: &Path, size: u64, mtime: u64) -> Track {
    let path_str = path.to_string_lossy().to_string();
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or_default()
        .to_string();
    let mut t = Track {
        id: track_id(&path_str),
        path: path_str,
        title: stem,
        artist: String::new(),
        album: String::new(),
        album_artist: String::new(),
        track_no: 0,
        disc_no: 0,
        year: 0,
        genre: String::new(),
        duration_ms: 0,
        ext,
        has_lyrics: sidecar_lrc(path).is_file(),
        size,
        mtime,
    };
    if let Some(file) = read_tagged(path) {
        t.duration_ms = file.properties().duration().as_millis() as u64;
        if let Some(tag) = tag_of(&file) {
            if let Some(v) = tag.title().filter(|s| !s.trim().is_empty()) {
                t.title = v.trim().to_string();
            }
            t.artist = tag
                .artist()
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            t.album = tag
                .album()
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            t.album_artist = tag
                .get_string(&ItemKey::AlbumArtist)
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            t.genre = tag
                .genre()
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            t.track_no = tag.track().unwrap_or(0);
            t.disc_no = tag.disk().unwrap_or(0);
            t.year = tag.year().unwrap_or(0);
            if !t.has_lyrics {
                t.has_lyrics = tag.get_string(&ItemKey::Lyrics).is_some();
            }
        }
    }
    t
}

/// Scans `folders`, reusing entries from `previous` whose size and mtime match.
pub fn scan(
    folders: &[String],
    previous: Vec<Track>,
    mut progress: impl FnMut(usize),
) -> Vec<Track> {
    let prev: HashMap<String, Track> = previous.into_iter().map(|t| (t.path.clone(), t)).collect();
    let mut out: Vec<Track> = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for folder in folders {
        for entry in WalkDir::new(folder)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if !entry.file_type().is_file() || !is_audio(entry.path()) {
                continue;
            }
            let Ok(meta) = entry.metadata() else { continue };
            let path_str = entry.path().to_string_lossy().to_string();
            if !seen.insert(path_str.clone()) {
                continue;
            }
            let mtime = meta
                .modified()
                .ok()
                .and_then(|m| m.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);
            match prev.get(&path_str) {
                Some(old) if old.size == meta.len() && old.mtime == mtime => out.push(old.clone()),
                _ => out.push(build_track(entry.path(), meta.len(), mtime)),
            }
            if out.len() % 50 == 0 {
                progress(out.len());
            }
        }
    }
    progress(out.len());
    out
}

fn mime_of(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("webp") => "image/webp",
        _ => "image/jpeg",
    }
}

/// Embedded picture first, then a cover image next to the file.
pub fn cover_bytes(path: &Path) -> Option<(Vec<u8>, String)> {
    if let Some(file) = read_tagged(path) {
        if let Some(tag) = tag_of(&file) {
            if let Some(pic) = tag.pictures().first() {
                let mime = pic
                    .mime_type()
                    .map(|m| m.as_str().to_string())
                    .unwrap_or_else(|| "image/jpeg".into());
                return Some((pic.data().to_vec(), mime));
            }
        }
    }
    let dir = path.parent()?;
    for entry in std::fs::read_dir(dir).ok()?.filter_map(|e| e.ok()) {
        let p = entry.path();
        let stem = p.file_stem()?.to_str()?.to_ascii_lowercase();
        let ext = p
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.to_ascii_lowercase());
        if COVER_NAMES.contains(&stem.as_str())
            && ext
                .as_deref()
                .map(|e| COVER_EXTS.contains(&e))
                .unwrap_or(false)
        {
            return std::fs::read(&p).ok().map(|b| (b, mime_of(&p).to_string()));
        }
    }
    None
}

/// `.lrc` sidecar first, then lyrics embedded in the tag.
pub fn lyrics_text(path: &Path) -> Option<String> {
    if let Ok(s) = std::fs::read_to_string(sidecar_lrc(path)) {
        if !s.trim().is_empty() {
            return Some(s);
        }
    }
    let file = read_tagged(path)?;
    let tag = tag_of(&file)?;
    tag.get_string(&ItemKey::Lyrics)
        .map(|s| s.to_string())
        .filter(|s| !s.trim().is_empty())
}
