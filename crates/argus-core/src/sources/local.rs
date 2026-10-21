//! Local files and network shares: scan folders, guess title/year/episode
//! from release-style filenames.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

pub const VIDEO_EXT: &[&str] = &[
    "mkv", "mp4", "avi", "mov", "m4v", "webm", "ts", "wmv", "m2ts",
];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ParsedName {
    pub title: String,
    pub year: Option<u16>,
    pub season: Option<u32>,
    pub episode: Option<u32>,
    pub resolution: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LocalFile {
    pub path: PathBuf,
    pub size: u64,
    pub parsed: ParsedName,
}

fn rx(pattern: &str) -> regex::Regex {
    regex::Regex::new(pattern).unwrap()
}

/// `The.Matrix.1999.1080p.BluRay.x264-GRP.mkv` → title "The Matrix", year 1999.
/// `Show.Name.S02E05.720p.mkv` / `Show Name 2x05.mkv` → season 2, episode 5.
pub fn parse_filename(name: &str) -> ParsedName {
    use std::sync::OnceLock;
    static SE: OnceLock<regex::Regex> = OnceLock::new();
    static X: OnceLock<regex::Regex> = OnceLock::new();
    static YEAR: OnceLock<regex::Regex> = OnceLock::new();
    static RES: OnceLock<regex::Regex> = OnceLock::new();
    static JUNK: OnceLock<regex::Regex> = OnceLock::new();

    let stem = Path::new(name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(name);
    let se = SE.get_or_init(|| rx(r"(?i)\bS(\d{1,2})[ ._-]?E(\d{1,3})\b"));
    let x = X.get_or_init(|| rx(r"\b(\d{1,2})x(\d{2,3})\b"));
    let year = YEAR.get_or_init(|| rx(r"[\[(. ]((?:19|20)\d{2})[\])\. ]|[\[(. ]((?:19|20)\d{2})$"));
    let res = RES.get_or_init(|| rx(r"(?i)\b(2160p|1080p|720p|480p|4k)\b"));
    let junk = JUNK
        .get_or_init(|| rx(r"(?i)\b(bluray|web-?dl|webrip|hdtv|x26[45]|hevc|h\.?26[45]|remux)\b"));

    let mut cut = stem.len();
    let (mut season, mut episode, mut yr) = (None, None, None);

    if let Some(c) = se.captures(stem).or_else(|| x.captures(stem)) {
        season = c[1].parse().ok();
        episode = c[2].parse().ok();
        cut = cut.min(c.get(0).unwrap().start());
    }
    if let Some(c) = year.captures(stem) {
        let m = c.get(1).or_else(|| c.get(2)).unwrap();
        // A year at the very start is the title ("2001 A Space Odyssey" aside, rare).
        if m.start() > 1 {
            yr = m.as_str().parse().ok();
            cut = cut.min(m.start());
        }
    }
    let resolution = res.captures(stem).map(|c| c[1].to_ascii_lowercase());
    for m in res.find_iter(stem).chain(junk.find_iter(stem)) {
        cut = cut.min(m.start());
    }

    let title = stem[..cut]
        .replace(['.', '_'], " ")
        .trim_matches(|c: char| c == '-' || c == '(' || c == '[' || c.is_whitespace())
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");

    ParsedName {
        title,
        year: yr,
        season,
        episode,
        resolution,
    }
}

pub fn is_video(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| VIDEO_EXT.contains(&e.to_ascii_lowercase().as_str()))
}

/// Recursive scan, skipping hidden folders and sample clips. Runs on a
/// blocking thread so the UI never stalls on slow network drives.
pub async fn scan(root: PathBuf) -> std::io::Result<Vec<LocalFile>> {
    tokio::task::spawn_blocking(move || {
        let mut out = Vec::new();
        let mut stack = vec![root];
        while let Some(dir) = stack.pop() {
            let Ok(entries) = std::fs::read_dir(&dir) else {
                continue;
            };
            for entry in entries.flatten() {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with('.') {
                    continue;
                }
                let Ok(meta) = entry.metadata() else { continue };
                if meta.is_dir() {
                    stack.push(path);
                } else if is_video(&path) && !name.to_ascii_lowercase().contains("sample") {
                    out.push(LocalFile {
                        parsed: parse_filename(&name),
                        path,
                        size: meta.len(),
                    });
                }
            }
        }
        out.sort_by(|a, b| a.path.cmp(&b.path));
        out
    })
    .await
    .map_err(std::io::Error::other)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_movie() {
        let p = parse_filename("The.Matrix.1999.1080p.BluRay.x264-GRP.mkv");
        assert_eq!(p.title, "The Matrix");
        assert_eq!(p.year, Some(1999));
        assert_eq!(p.resolution.as_deref(), Some("1080p"));
        assert_eq!(p.season, None);
    }

    #[test]
    fn parses_episodes() {
        let p = parse_filename("Show.Name.S02E05.720p.WEB-DL.mkv");
        assert_eq!(
            (p.title.as_str(), p.season, p.episode),
            ("Show Name", Some(2), Some(5))
        );
        let p = parse_filename("Show Name 2x05.mp4");
        assert_eq!(
            (p.title.as_str(), p.season, p.episode),
            ("Show Name", Some(2), Some(5))
        );
    }

    #[test]
    fn parses_bracket_year() {
        let p = parse_filename("Dune Part Two (2024).mkv");
        assert_eq!((p.title.as_str(), p.year), ("Dune Part Two", Some(2024)));
    }

    #[tokio::test]
    async fn scans_folder() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir(dir.path().join("sub")).unwrap();
        std::fs::write(dir.path().join("sub/Movie.2020.mkv"), b"x").unwrap();
        std::fs::write(dir.path().join("sub/movie-sample.mkv"), b"x").unwrap();
        std::fs::write(dir.path().join("notes.txt"), b"x").unwrap();
        let files = scan(dir.path().to_path_buf()).await.unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].parsed.year, Some(2020));
    }
}
