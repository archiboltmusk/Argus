//! User-tunable limits for the built-in torrent engine (setting `torrent.prefs`).

use serde::{Deserialize, Serialize};

pub const SETTING_KEY: &str = "torrent.prefs";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TorrentPrefs {
    /// 0 = unlimited.
    pub download_kbps: u32,
    /// 0 = unlimited. Uploading helps the swarm; a cap keeps your uplink free.
    pub upload_kbps: u32,
    /// Streamed data kept on disk before older torrents are dropped, in GB.
    pub cache_gb: u32,
}

impl Default for TorrentPrefs {
    fn default() -> Self {
        Self {
            download_kbps: 0,
            upload_kbps: 0,
            cache_gb: 10,
        }
    }
}

impl TorrentPrefs {
    pub fn parse(json: Option<&str>) -> Self {
        json.and_then(|j| serde_json::from_str(j).ok())
            .unwrap_or_default()
    }

    /// Bytes per second for librqbit's limiter; `None` when unlimited.
    pub fn download_bps(&self) -> Option<u32> {
        kbps_to_bps(self.download_kbps)
    }

    pub fn upload_bps(&self) -> Option<u32> {
        kbps_to_bps(self.upload_kbps)
    }

    pub fn cache_bytes(&self) -> u64 {
        u64::from(self.cache_gb.clamp(1, 500)) * 1_000_000_000
    }
}

fn kbps_to_bps(kbps: u32) -> Option<u32> {
    (kbps > 0).then(|| kbps.saturating_mul(1000))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zero_means_unlimited() {
        let p = TorrentPrefs::default();
        assert_eq!((p.download_bps(), p.upload_bps()), (None, None));
        let p = TorrentPrefs {
            download_kbps: 500,
            ..Default::default()
        };
        assert_eq!(p.download_bps(), Some(500_000));
    }

    #[test]
    fn bad_json_falls_back_and_cache_is_clamped() {
        assert_eq!(TorrentPrefs::parse(Some("nope")), TorrentPrefs::default());
        let p = TorrentPrefs::parse(Some(r#"{"cacheGb":0}"#));
        assert_eq!(p.cache_bytes(), 1_000_000_000);
    }
}
