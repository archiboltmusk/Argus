//! In-process torrent streaming (librqbit), for users without debrid. No
//! separate server process: the engine starts on the first torrent play and
//! serves files over a loopback-only HTTP endpoint that mpv reads with seeks.

use std::collections::HashSet;
use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use argus_core::model::Stream;
use argus_core::torrent::TorrentPrefs;
use librqbit::http_api::{HttpApi, HttpApiOptions};
use librqbit::{AddTorrent, AddTorrentOptions, AddTorrentResponse, Api, Session, SessionOptions};
use librqbit_dualstack_sockets::socket::MaybeDualstackSocket;
use librqbit_dualstack_sockets::BindOpts;
use tokio::sync::OnceCell;

const VIDEO_EXT: [&str; 8] = ["mkv", "mp4", "avi", "m4v", "mov", "ts", "webm", "wmv"];
/// How long to wait for torrent metadata from peers before giving up.
const METADATA_TIMEOUT: Duration = Duration::from_secs(45);

pub struct TorrentEngine {
    dir: PathBuf,
    inner: OnceCell<(Arc<Session>, u16)>,
}

impl TorrentEngine {
    pub fn new(dir: PathBuf) -> Self {
        Self {
            dir,
            inner: OnceCell::new(),
        }
    }

    async fn start(&self) -> Result<&(Arc<Session>, u16), String> {
        self.inner
            .get_or_try_init(|| async {
                // Streams are cache, not downloads: start each run empty.
                let _ = tokio::fs::remove_dir_all(&self.dir).await;
                tokio::fs::create_dir_all(&self.dir)
                    .await
                    .map_err(|e| e.to_string())?;
                let session = Session::new_with_opts(
                    self.dir.clone(),
                    SessionOptions {
                        fastresume: false,
                        persistence: None,
                        ..Default::default()
                    },
                )
                .await
                .map_err(|e| format!("Couldn't start the torrent engine: {e:#}"))?;
                let loopback = BindOpts {
                    request_dualstack: false,
                    ..Default::default()
                };
                let listener = MaybeDualstackSocket::bind_tcp(([127, 0, 0, 1], 0).into(), loopback)
                    .map_err(|e| e.to_string())?;
                let port = listener.bind_addr().port();
                let api = Api::new(session.clone(), None, None);
                let http = HttpApi::new(
                    api,
                    Some(HttpApiOptions {
                        read_only: true,
                        ..Default::default()
                    }),
                );
                tokio::spawn(http.make_http_api_and_run(listener, None));
                Ok((session, port))
            })
            .await
    }

    /// Adds the torrent (only the chosen file downloads) and returns a
    /// loopback URL that supports Range requests.
    pub async fn stream_url(
        &self,
        stream: &Stream,
        prefs: &TorrentPrefs,
    ) -> Result<String, String> {
        let magnet = stream.magnet().ok_or("Not a torrent stream")?;
        let (session, port) = self.start().await?;
        session
            .ratelimits
            .set_download_bps(prefs.download_bps().and_then(NonZeroU32::new));
        session
            .ratelimits
            .set_upload_bps(prefs.upload_bps().and_then(NonZeroU32::new));
        self.trim_cache(session, prefs.cache_bytes()).await;
        let opts = AddTorrentOptions {
            overwrite: true,
            ..Default::default()
        };
        let added = tokio::time::timeout(
            METADATA_TIMEOUT,
            session.add_torrent(AddTorrent::from_url(magnet), Some(opts)),
        )
        .await
        .map_err(|_| "No peers answered for this torrent. Try another stream.".to_string())?
        .map_err(|e| format!("Torrent failed: {e:#}"))?;
        let (id, handle) = match added {
            AddTorrentResponse::Added(id, h) | AddTorrentResponse::AlreadyManaged(id, h) => (id, h),
            AddTorrentResponse::ListOnly(_) => return Err("Torrent failed to start".into()),
        };
        let files: Vec<(String, u64)> = handle
            .with_metadata(|m| {
                m.file_infos
                    .iter()
                    .map(|f| (f.relative_filename.to_string_lossy().into_owned(), f.len))
                    .collect()
            })
            .map_err(|e| e.to_string())?;
        let idx = stream
            .file_idx
            .map(|i| i as usize)
            .filter(|i| *i < files.len())
            .or_else(|| pick_video(&files))
            .ok_or("This torrent has no video file")?;
        session
            .update_only_files(&handle, &HashSet::from([idx]))
            .await
            .map_err(|e| e.to_string())?;
        Ok(format!(
            "http://127.0.0.1:{port}/torrents/{id}/stream/{idx}"
        ))
    }
}

impl TorrentEngine {
    /// Drops every earlier torrent (and its files) once the cache outgrows
    /// the user's limit, so streaming never fills the disk.
    async fn trim_cache(&self, session: &Arc<Session>, limit: u64) {
        if dir_size(&self.dir).await <= limit {
            return;
        }
        let ids: Vec<usize> = session.with_torrents(|it| it.map(|(id, _)| id).collect());
        for id in ids {
            let _ = session.delete(id.into(), true).await;
        }
    }
}

async fn dir_size(dir: &std::path::Path) -> u64 {
    let mut total = 0;
    let mut stack = vec![dir.to_path_buf()];
    while let Some(d) = stack.pop() {
        let Ok(mut rd) = tokio::fs::read_dir(&d).await else {
            continue;
        };
        while let Ok(Some(e)) = rd.next_entry().await {
            match e.metadata().await {
                Ok(m) if m.is_dir() => stack.push(e.path()),
                Ok(m) => total += m.len(),
                Err(_) => {}
            }
        }
    }
    total
}

/// Largest video file, falling back to the largest file.
fn pick_video(files: &[(String, u64)]) -> Option<usize> {
    let is_video = |name: &str| {
        name.rsplit_once('.')
            .is_some_and(|(_, ext)| VIDEO_EXT.contains(&ext.to_ascii_lowercase().as_str()))
    };
    let best = |only_video: bool| {
        files
            .iter()
            .enumerate()
            .filter(|(_, (n, _))| !only_video || is_video(n))
            .max_by_key(|(_, (_, len))| *len)
            .map(|(i, _)| i)
    };
    best(true).or_else(|| best(false))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_largest_video_over_bigger_extras() {
        let files = vec![
            ("Show/sample.mkv".to_string(), 50),
            ("Show/episode.MKV".to_string(), 900),
            ("Show/extras.iso".to_string(), 5000),
        ];
        assert_eq!(pick_video(&files), Some(1));
        assert_eq!(pick_video(&[("a.iso".into(), 1)]), Some(0));
        assert_eq!(pick_video(&[]), None);
    }
}
