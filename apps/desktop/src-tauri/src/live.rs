//! Live TV: M3U playlists and Xtream accounts, with an XMLTV guide.
//! Channels and guides are cached in memory; guides refresh every 6 hours.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use argus_core::futures::future::join_all;
use argus_core::sources::debrid::now;
use argus_core::sources::epg::{self, Guide, Programme};
use argus_core::sources::iptv::{self, Channel, Xtream};
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;

use crate::{err, AppState, CmdResult};

const SOURCES_KEY: &str = "iptv.sources";
const GUIDE_TTL: Duration = Duration::from_secs(6 * 3600);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum LiveSource {
    #[serde(rename_all = "camelCase")]
    M3u {
        name: String,
        url: String,
        epg_url: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    Xtream {
        name: String,
        server: String,
        username: String,
        password: String,
    },
}

impl LiveSource {
    fn name(&self) -> &str {
        match self {
            Self::M3u { name, .. } | Self::Xtream { name, .. } => name,
        }
    }

    fn xtream(&self) -> Option<Xtream> {
        match self {
            Self::Xtream {
                server,
                username,
                password,
                ..
            } => Some(Xtream {
                server: server.clone(),
                username: username.clone(),
                password: password.clone(),
            }),
            Self::M3u { .. } => None,
        }
    }

    fn epg_url(&self) -> Option<String> {
        match self {
            Self::M3u { epg_url, .. } => epg_url.clone().filter(|u| !u.is_empty()),
            Self::Xtream { .. } => self.xtream().map(|x| x.epg_url()),
        }
    }

    async fn channels(&self, http: &argus_core::reqwest::Client) -> CmdResult<Vec<Channel>> {
        match self {
            Self::M3u { url, .. } => {
                let text = http
                    .get(url)
                    .send()
                    .await
                    .and_then(|r| r.error_for_status())
                    .map_err(err)?
                    .text()
                    .await
                    .map_err(err)?;
                Ok(iptv::parse_m3u(&text))
            }
            Self::Xtream { .. } => self
                .xtream()
                .unwrap()
                .live_channels(http)
                .await
                .map_err(err),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveChannel {
    id: String,
    name: String,
    url: String,
    group: Option<String>,
    logo: Option<String>,
    tvg_id: Option<String>,
    source: String,
}

#[derive(Default)]
pub struct LiveCache {
    channels: Mutex<HashMap<i64, Vec<LiveChannel>>>,
    guides: Mutex<HashMap<i64, (Instant, Guide)>>,
}

fn sources(s: &AppState, profile: i64) -> CmdResult<Vec<LiveSource>> {
    Ok(s.lib
        .setting(profile, SOURCES_KEY)
        .map_err(err)?
        .and_then(|j| serde_json::from_str(&j).ok())
        .unwrap_or_default())
}

#[tauri::command]
pub fn live_sources(s: State<'_, AppState>, profile: i64) -> CmdResult<Vec<LiveSource>> {
    sources(&s, profile)
}

#[tauri::command]
pub async fn set_live_sources(
    s: State<'_, AppState>,
    profile: i64,
    list: Vec<LiveSource>,
) -> CmdResult<()> {
    s.lib
        .set_setting(
            profile,
            SOURCES_KEY,
            &serde_json::to_string(&list).map_err(err)?,
        )
        .map_err(err)?;
    s.live.channels.lock().await.remove(&profile);
    s.live.guides.lock().await.remove(&profile);
    Ok(())
}

/// All channels across sources. A failing source is skipped, not fatal.
#[tauri::command]
pub async fn live_channels(s: State<'_, AppState>, profile: i64) -> CmdResult<Vec<LiveChannel>> {
    if let Some(c) = s.live.channels.lock().await.get(&profile) {
        return Ok(c.clone());
    }
    let list = sources(&s, profile)?;
    let fetched = join_all(list.iter().map(|src| src.channels(&s.http))).await;
    let mut out = Vec::new();
    for (src, chans) in list.iter().zip(fetched) {
        for (i, c) in chans.unwrap_or_default().into_iter().enumerate() {
            out.push(LiveChannel {
                id: format!("iptv:{}:{i}", src.name()),
                name: c.name,
                url: c.url,
                group: c.group,
                logo: c.logo,
                tvg_id: c.tvg_id,
                source: src.name().to_string(),
            });
        }
    }
    s.live.channels.lock().await.insert(profile, out.clone());
    Ok(out)
}

#[derive(Serialize)]
pub struct NowNext {
    now: Option<Programme>,
    next: Option<Programme>,
}

/// Now and next programme per tvg-id, from every source's guide.
#[tauri::command]
pub async fn live_guide(
    s: State<'_, AppState>,
    profile: i64,
) -> CmdResult<HashMap<String, NowNext>> {
    let mut guides = s.live.guides.lock().await;
    let fresh = guides
        .get(&profile)
        .is_some_and(|(at, _)| at.elapsed() < GUIDE_TTL);
    if !fresh {
        let urls: Vec<String> = sources(&s, profile)?
            .iter()
            .filter_map(|x| x.epg_url())
            .collect();
        let fetched = join_all(urls.iter().map(|u| epg::fetch(&s.http, u))).await;
        let mut merged = Guide::default();
        for g in fetched.into_iter().flatten() {
            merged.channels.extend(g.channels);
            merged.programmes.extend(g.programmes);
        }
        guides.insert(profile, (Instant::now(), merged));
    }
    let guide = &guides[&profile].1;
    let t = now();
    Ok(guide
        .programmes
        .keys()
        .map(|id| {
            let upcoming = guide.window(id, t, t + 12 * 3600);
            (
                id.clone(),
                NowNext {
                    now: upcoming.first().filter(|p| p.start <= t).cloned(),
                    next: upcoming.iter().find(|p| p.start > t).cloned(),
                },
            )
        })
        .collect())
}
