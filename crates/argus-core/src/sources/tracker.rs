//! Trakt and Simkl (spec feature 8): device sign-in, scrobbling, and
//! two-way history sync where the latest timestamp wins.
//!
//! Both services expose a Trakt-shaped scrobble API, so one client covers
//! both with a different base URL and sign-in flow.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::json;

use super::debrid::{now, DeviceCode, OAuthToken};
use crate::{Error, Result};

/// Mark as watched (and send `stop`) at this fraction of runtime.
pub const SCROBBLE_WATCHED_AT: f64 = 0.80;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Service {
    Trakt,
    Simkl,
}

impl Service {
    fn api(self) -> &'static str {
        match self {
            Self::Trakt => "https://api.trakt.tv",
            Self::Simkl => "https://api.simkl.com",
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Self::Trakt => "Trakt",
            Self::Simkl => "Simkl",
        }
    }
}

/// An IMDb-keyed movie or episode, parsed from Argus/Stremio ids
/// (`tt0133093`, `tt0903747:1:2`).
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct WatchKey {
    pub imdb: String,
    pub season: Option<u32>,
    pub episode: Option<u32>,
}

impl WatchKey {
    pub fn parse(video_id: &str) -> Option<Self> {
        let mut parts = video_id.split(':');
        let imdb = parts.next().filter(|p| p.starts_with("tt"))?.to_string();
        let season = parts.next().and_then(|p| p.parse().ok());
        let episode = parts.next().and_then(|p| p.parse().ok());
        Some(Self {
            imdb,
            season,
            episode,
        })
    }

    /// Trakt/Simkl scrobble body (without `progress`).
    fn body(&self) -> serde_json::Value {
        match (self.season, self.episode) {
            (Some(season), Some(number)) => json!({
                "show": { "ids": { "imdb": self.imdb } },
                "episode": { "season": season, "number": number }
            }),
            _ => json!({ "movie": { "ids": { "imdb": self.imdb } } }),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScrobbleAction {
    Start,
    Pause,
    Stop,
}

/// What the player should send for a progress update.
pub fn scrobble_action(playing: bool, fraction: f64) -> ScrobbleAction {
    if fraction >= SCROBBLE_WATCHED_AT {
        ScrobbleAction::Stop
    } else if playing {
        ScrobbleAction::Start
    } else {
        ScrobbleAction::Pause
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub key: WatchKey,
    /// Unix seconds when it was watched (or unwatched, when `watched` is false).
    pub at: i64,
    pub watched: bool,
}

#[derive(Debug, Default, PartialEq)]
pub struct SyncPlan {
    /// Newer locally: send to the service.
    pub push: Vec<HistoryEntry>,
    /// Newer remotely: write to the local library.
    pub apply: Vec<HistoryEntry>,
}

fn latest(list: &[HistoryEntry]) -> HashMap<&WatchKey, &HistoryEntry> {
    let mut map: HashMap<&WatchKey, &HistoryEntry> = HashMap::new();
    for e in list {
        map.entry(&e.key)
            .and_modify(|cur| {
                if e.at > cur.at {
                    *cur = e
                }
            })
            .or_insert(e);
    }
    map
}

/// Two-way merge, latest timestamp wins (spec conflict rule). Ties keep local.
pub fn plan_sync(local: &[HistoryEntry], remote: &[HistoryEntry]) -> SyncPlan {
    let (l, r) = (latest(local), latest(remote));
    let mut plan = SyncPlan::default();
    for (k, le) in &l {
        match r.get(k) {
            Some(re) if re.at > le.at => {
                if re.watched != le.watched {
                    plan.apply.push((*re).clone());
                }
            }
            Some(re) if re.watched == le.watched => {}
            _ => plan.push.push((*le).clone()),
        }
    }
    for (k, re) in &r {
        if !l.contains_key(k) {
            plan.apply.push((*re).clone());
        }
    }
    plan.push.sort_by_key(|e| e.at);
    plan.apply.sort_by_key(|e| e.at);
    plan
}

#[derive(Clone)]
pub struct Tracker {
    http: reqwest::Client,
    service: Service,
    client_id: String,
    access_token: String,
}

impl Tracker {
    pub fn new(
        http: reqwest::Client,
        service: Service,
        client_id: &str,
        access_token: &str,
    ) -> Self {
        Self {
            http,
            service,
            client_id: client_id.into(),
            access_token: access_token.into(),
        }
    }

    fn post(&self, path: &str) -> reqwest::RequestBuilder {
        let req = self
            .http
            .post(format!("{}{}", self.service.api(), path))
            .bearer_auth(&self.access_token);
        match self.service {
            Service::Trakt => req
                .header("trakt-api-version", "2")
                .header("trakt-api-key", &self.client_id),
            Service::Simkl => req.header("simkl-api-key", &self.client_id),
        }
    }

    pub async fn scrobble(
        &self,
        action: ScrobbleAction,
        key: &WatchKey,
        fraction: f64,
    ) -> Result<()> {
        let path = match action {
            ScrobbleAction::Start => "/scrobble/start",
            ScrobbleAction::Pause => "/scrobble/pause",
            ScrobbleAction::Stop => "/scrobble/stop",
        };
        let mut body = key.body();
        body["progress"] = json!((fraction * 100.0).clamp(0.0, 100.0));
        let resp = self.post(path).json(&body).send().await?;
        // 409 = already scrobbled recently; not an error for us.
        if resp.status().is_success() || resp.status().as_u16() == 409 {
            Ok(())
        } else {
            Err(Error::source(
                self.service.name(),
                format!("scrobble failed: {}", resp.status()),
            ))
        }
    }

    /// Sends watched/unwatched entries in one batch each.
    pub async fn push_history(&self, entries: &[HistoryEntry]) -> Result<()> {
        for (watched, path) in [(true, "/sync/history"), (false, "/sync/history/remove")] {
            let (mut movies, mut episodes) = (Vec::new(), Vec::new());
            for e in entries.iter().filter(|e| e.watched == watched) {
                let at = crate::episodes::days_to_date(e.at.div_euclid(86_400));
                match (e.key.season, e.key.episode) {
                    (Some(s), Some(n)) => episodes.push(json!({
                        "ids": {}, "watched_at": at,
                        "show": { "ids": { "imdb": e.key.imdb } }, "season": s, "number": n
                    })),
                    _ => movies.push(json!({ "ids": { "imdb": e.key.imdb }, "watched_at": at })),
                }
            }
            if movies.is_empty() && episodes.is_empty() {
                continue;
            }
            let body = json!({ "movies": movies, "episodes": episodes });
            self.post(path)
                .json(&body)
                .send()
                .await?
                .error_for_status()?;
        }
        Ok(())
    }
}

/// Trakt device sign-in. `client_id`/`client_secret` come from the app's
/// Trakt registration (build-time config), never from the user.
pub mod trakt_auth {
    use super::*;

    #[derive(Deserialize)]
    struct Code {
        device_code: String,
        user_code: String,
        verification_url: String,
        expires_in: u64,
        interval: u64,
    }

    #[derive(Deserialize)]
    struct Token {
        access_token: String,
        refresh_token: String,
        expires_in: i64,
    }

    /// Trakt tokens last ~90 days; swap the refresh token for a new pair.
    pub async fn refresh(
        http: &reqwest::Client,
        client_id: &str,
        secret: &str,
        token: &OAuthToken,
    ) -> Result<OAuthToken> {
        let t: Token = http
            .post("https://api.trakt.tv/oauth/token")
            .json(&json!({
                "refresh_token": token.refresh_token,
                "client_id": client_id,
                "client_secret": secret,
                "grant_type": "refresh_token",
                "redirect_uri": "urn:ietf:wg:oauth:2.0:oob",
            }))
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(OAuthToken {
            access_token: t.access_token,
            refresh_token: t.refresh_token,
            expires_at: now() + t.expires_in,
            client_id: None,
            client_secret: None,
        })
    }

    pub async fn start(http: &reqwest::Client, client_id: &str) -> Result<DeviceCode> {
        let c: Code = http
            .post("https://api.trakt.tv/oauth/device/code")
            .json(&json!({ "client_id": client_id }))
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(DeviceCode {
            device_code: c.device_code,
            user_code: c.user_code,
            verification_url: c.verification_url,
            interval_s: c.interval,
            expires_in_s: c.expires_in,
        })
    }

    /// `Ok(None)` while pending (HTTP 400).
    pub async fn poll(
        http: &reqwest::Client,
        client_id: &str,
        secret: &str,
        code: &DeviceCode,
    ) -> Result<Option<OAuthToken>> {
        let resp = http
            .post("https://api.trakt.tv/oauth/device/token")
            .json(&json!({ "code": code.device_code, "client_id": client_id, "client_secret": secret }))
            .send()
            .await?;
        if resp.status().as_u16() == 400 {
            return Ok(None);
        }
        let t: Token = resp.error_for_status()?.json().await?;
        Ok(Some(OAuthToken {
            access_token: t.access_token,
            refresh_token: t.refresh_token,
            expires_at: now() + t.expires_in,
            client_id: None,
            client_secret: None,
        }))
    }
}

/// Simkl PIN sign-in.
pub mod simkl_auth {
    use super::*;

    #[derive(Deserialize)]
    struct Pin {
        user_code: String,
        verification_url: String,
        expires_in: u64,
        interval: u64,
    }

    #[derive(Deserialize)]
    struct Check {
        result: String,
        access_token: Option<String>,
    }

    pub async fn start(http: &reqwest::Client, client_id: &str) -> Result<DeviceCode> {
        let p: Pin = http
            .get("https://api.simkl.com/oauth/pin")
            .query(&[("client_id", client_id)])
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(DeviceCode {
            device_code: p.user_code.clone(),
            user_code: p.user_code,
            verification_url: p.verification_url,
            interval_s: p.interval,
            expires_in_s: p.expires_in,
        })
    }

    pub async fn poll(
        http: &reqwest::Client,
        client_id: &str,
        code: &DeviceCode,
    ) -> Result<Option<String>> {
        let c: Check = http
            .get(format!(
                "https://api.simkl.com/oauth/pin/{}",
                code.device_code
            ))
            .query(&[("client_id", client_id)])
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok((c.result == "OK").then_some(c.access_token).flatten())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn e(id: &str, at: i64, watched: bool) -> HistoryEntry {
        HistoryEntry {
            key: WatchKey::parse(id).unwrap(),
            at,
            watched,
        }
    }

    #[test]
    fn parses_ids() {
        assert_eq!(WatchKey::parse("tt1:2:3").unwrap().episode, Some(3));
        assert_eq!(WatchKey::parse("tt1").unwrap().season, None);
        assert!(WatchKey::parse("jellyfin:abc").is_none());
        let b = WatchKey::parse("tt1:2:3").unwrap().body();
        assert_eq!(b["episode"]["number"], 3);
    }

    #[test]
    fn scrobbles_stop_at_80_percent() {
        assert_eq!(scrobble_action(true, 0.5), ScrobbleAction::Start);
        assert_eq!(scrobble_action(false, 0.5), ScrobbleAction::Pause);
        assert_eq!(scrobble_action(true, 0.8), ScrobbleAction::Stop);
    }

    #[test]
    fn latest_timestamp_wins() {
        let local = [
            e("tt1", 100, true),
            e("tt2", 300, false),
            e("tt3", 50, true),
        ];
        let remote = [
            e("tt1", 200, false),
            e("tt2", 250, true),
            e("tt4", 10, true),
            e("tt3", 60, true),
        ];
        let plan = plan_sync(&local, &remote);
        assert_eq!(plan.apply, vec![e("tt4", 10, true), e("tt1", 200, false)]);
        assert_eq!(plan.push, vec![e("tt2", 300, false)]);
    }
}
