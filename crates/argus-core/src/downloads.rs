//! Offline downloads (spec feature 14). HTTP only: debrid links, direct
//! URLs, Plex and Jellyfin files. No torrent seeding.
//!
//! Each download writes to `<name>.part` and resumes with a `Range` request,
//! so pause, quit, and crash all resume where they stopped.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tokio::io::AsyncWriteExt;

use crate::{Error, Result};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    pub downloaded: u64,
    pub total: Option<u64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Outcome {
    Completed,
    Paused,
}

/// Cheap to clone; flip it to pause a running download.
#[derive(Clone, Default)]
pub struct PauseHandle(Arc<AtomicBool>);

impl PauseHandle {
    pub fn pause(&self) {
        self.0.store(true, Ordering::Relaxed);
    }

    fn is_paused(&self) -> bool {
        self.0.load(Ordering::Relaxed)
    }
}

/// Total bytes of finished and partial downloads under `dir`.
pub fn used_bytes(dir: &Path) -> u64 {
    std::fs::read_dir(dir)
        .map(|it| {
            it.flatten()
                .filter_map(|e| e.metadata().ok())
                .filter(|m| m.is_file())
                .map(|m| m.len())
                .sum()
        })
        .unwrap_or(0)
}

pub fn part_path(dest: &Path) -> PathBuf {
    let mut name = dest.file_name().unwrap_or_default().to_os_string();
    name.push(".part");
    dest.with_file_name(name)
}

/// Downloads `url` to `dest`, resuming any existing `.part`. Refuses to start
/// or continue past `cap_bytes` of total storage in `dest`'s folder.
pub async fn download(
    http: &reqwest::Client,
    url: &str,
    dest: &Path,
    cap_bytes: Option<u64>,
    pause: &PauseHandle,
    mut on_progress: impl FnMut(Progress),
) -> Result<Outcome> {
    let part = part_path(dest);
    if let Some(dir) = dest.parent() {
        tokio::fs::create_dir_all(dir).await.map_err(io)?;
    }
    let mut have = tokio::fs::metadata(&part)
        .await
        .map(|m| m.len())
        .unwrap_or(0);

    let mut req = http.get(url);
    if have > 0 {
        req = req.header(reqwest::header::RANGE, format!("bytes={have}-"));
    }
    let resp = req.send().await?.error_for_status()?;
    // Server ignored the range: start over rather than corrupt the file.
    if have > 0 && resp.status() != reqwest::StatusCode::PARTIAL_CONTENT {
        have = 0;
    }
    let total = resp.content_length().map(|n| n + have);

    let dir = dest.parent().unwrap_or(Path::new("."));
    if let (Some(cap), Some(total)) = (cap_bytes, total) {
        if used_bytes(dir) - have + total > cap {
            return Err(Error::Invalid(
                "Not enough room under the download storage limit".into(),
            ));
        }
    }

    let mut file = tokio::fs::OpenOptions::new()
        .create(true)
        .append(have > 0)
        .write(true)
        .truncate(have == 0)
        .open(&part)
        .await
        .map_err(io)?;

    let mut body = resp.bytes_stream();
    let mut downloaded = have;
    let mut last_report = 0u64;
    while let Some(chunk) = body.next().await {
        let chunk = chunk?;
        file.write_all(&chunk).await.map_err(io)?;
        downloaded += chunk.len() as u64;
        // Report every ~1 MB so the UI isn't flooded.
        if downloaded - last_report >= 1 << 20 {
            last_report = downloaded;
            on_progress(Progress { downloaded, total });
        }
        if pause.is_paused() {
            file.flush().await.map_err(io)?;
            on_progress(Progress { downloaded, total });
            return Ok(Outcome::Paused);
        }
    }
    file.flush().await.map_err(io)?;
    drop(file);
    tokio::fs::rename(&part, dest).await.map_err(io)?;
    on_progress(Progress { downloaded, total });
    Ok(Outcome::Completed)
}

fn io(e: std::io::Error) -> Error {
    Error::source("Downloads", e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    /// Minimal HTTP/1.1 server with Range support, serving `body`.
    async fn serve(body: Vec<u8>) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            loop {
                let Ok((mut sock, _)) = listener.accept().await else {
                    return;
                };
                let body = body.clone();
                tokio::spawn(async move {
                    let mut buf = vec![0u8; 4096];
                    let n = sock.read(&mut buf).await.unwrap_or(0);
                    let req = String::from_utf8_lossy(&buf[..n]).to_ascii_lowercase();
                    let start = req
                        .lines()
                        .find_map(|l| l.strip_prefix("range: bytes="))
                        .and_then(|r| {
                            r.trim_end_matches('-')
                                .trim()
                                .trim_end_matches('-')
                                .parse::<usize>()
                                .ok()
                        });
                    let (status, slice) = match start {
                        Some(s) => ("206 Partial Content", &body[s..]),
                        None => ("200 OK", &body[..]),
                    };
                    let head = format!(
                        "HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                        slice.len()
                    );
                    let _ = sock.write_all(head.as_bytes()).await;
                    let _ = sock.write_all(slice).await;
                });
            }
        });
        format!("http://{addr}/file.mkv")
    }

    #[tokio::test]
    async fn downloads_and_resumes() {
        let body: Vec<u8> = (0..3_000_000u32).map(|i| (i % 251) as u8).collect();
        let url = serve(body.clone()).await;
        let dir = tempfile::tempdir().unwrap();
        let dest = dir.path().join("movie.mkv");
        let http = reqwest::Client::new();

        // Simulate an interrupted download: first 1 MB already on disk.
        std::fs::write(part_path(&dest), &body[..1_000_000]).unwrap();
        let outcome = download(&http, &url, &dest, None, &PauseHandle::default(), |_| {})
            .await
            .unwrap();
        assert_eq!(outcome, Outcome::Completed);
        assert_eq!(std::fs::read(&dest).unwrap(), body);
        assert!(!part_path(&dest).exists());
    }

    #[tokio::test]
    async fn pauses_and_respects_cap() {
        let body = vec![7u8; 3_000_000];
        let url = serve(body).await;
        let dir = tempfile::tempdir().unwrap();
        let http = reqwest::Client::new();

        let pause = PauseHandle::default();
        pause.pause();
        let dest = dir.path().join("a.mkv");
        let out = download(&http, &url, &dest, None, &pause, |_| {})
            .await
            .unwrap();
        assert_eq!(out, Outcome::Paused);
        assert!(part_path(&dest).exists());

        let err = download(
            &http,
            &url,
            &dir.path().join("b.mkv"),
            Some(1_000),
            &PauseHandle::default(),
            |_| {},
        )
        .await
        .unwrap_err();
        assert!(err.to_string().contains("storage limit"));
    }
}
