//! Device-code sign-in for debrid services and trackers, so users approve
//! on the provider's site instead of pasting API keys.

use argus_core::sources::debrid::{alldebrid, now, realdebrid, DeviceCode, OAuthToken, Provider};
use argus_core::sources::tracker::{simkl_auth, trakt_auth};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::{err, AppState, CmdResult};

/// Trakt/Simkl app credentials are baked in at build time (CI secrets), so
/// forks and local builds without them show a clear message instead.
const TRAKT_ID: Option<&str> = option_env!("ARGUS_TRAKT_CLIENT_ID");
const TRAKT_SECRET: Option<&str> = option_env!("ARGUS_TRAKT_CLIENT_SECRET");
const SIMKL_ID: Option<&str> = option_env!("ARGUS_SIMKL_CLIENT_ID");

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Service {
    RealDebrid,
    AllDebrid,
    Trakt,
    Simkl,
}

impl Service {
    fn token_key(self) -> &'static str {
        match self {
            Self::RealDebrid => "debrid.realdebrid.oauth",
            Self::AllDebrid => "debrid.alldebrid.key",
            Self::Trakt => "tracker.trakt.token",
            Self::Simkl => "tracker.simkl.token",
        }
    }
}

fn configured(id: Option<&'static str>, name: &str) -> CmdResult<&'static str> {
    id.filter(|s| !s.is_empty())
        .ok_or_else(|| format!("{name} sign-in isn't available in this build"))
}

/// Which services have a stored sign-in for this profile.
#[tauri::command]
pub fn signins(s: State<'_, AppState>, profile: i64) -> CmdResult<Vec<Service>> {
    let mut out = Vec::new();
    for svc in [
        Service::RealDebrid,
        Service::AllDebrid,
        Service::Trakt,
        Service::Simkl,
    ] {
        let has = s
            .lib
            .setting(profile, svc.token_key())
            .map_err(err)?
            .is_some_and(|v| !v.is_empty());
        if has {
            out.push(svc);
        }
    }
    Ok(out)
}

#[tauri::command]
pub async fn signin_start(s: State<'_, AppState>, service: Service) -> CmdResult<DeviceCode> {
    match service {
        Service::RealDebrid => realdebrid::oauth::start(&s.http).await,
        Service::AllDebrid => alldebrid::pin::start(&s.http).await,
        Service::Trakt => trakt_auth::start(&s.http, configured(TRAKT_ID, "Trakt")?).await,
        Service::Simkl => simkl_auth::start(&s.http, configured(SIMKL_ID, "Simkl")?).await,
    }
    .map_err(err)
}

/// One poll; returns true once approved and the token is stored.
#[tauri::command]
pub async fn signin_poll(
    s: State<'_, AppState>,
    profile: i64,
    service: Service,
    code: DeviceCode,
) -> CmdResult<bool> {
    let value = match service {
        Service::RealDebrid => realdebrid::oauth::poll(&s.http, &code)
            .await
            .map_err(err)?
            .map(|t| serde_json::to_string(&t).map_err(err))
            .transpose()?,
        Service::AllDebrid => alldebrid::pin::poll(&s.http, &code).await.map_err(err)?,
        Service::Trakt => {
            let id = configured(TRAKT_ID, "Trakt")?;
            let secret = configured(TRAKT_SECRET, "Trakt")?;
            trakt_auth::poll(&s.http, id, secret, &code)
                .await
                .map_err(err)?
                .map(|t| serde_json::to_string(&t).map_err(err))
                .transpose()?
        }
        Service::Simkl => simkl_auth::poll(&s.http, configured(SIMKL_ID, "Simkl")?, &code)
            .await
            .map_err(err)?,
    };
    let Some(value) = value else { return Ok(false) };
    s.lib
        .set_setting(profile, service.token_key(), &value)
        .map_err(err)?;
    if service == Service::RealDebrid {
        // The OAuth token supersedes a pasted API key.
        s.lib
            .set_setting(profile, &Provider::RealDebrid.setting_key(), "")
            .map_err(err)?;
    }
    Ok(true)
}

#[tauri::command]
pub fn signout(s: State<'_, AppState>, profile: i64, service: Service) -> CmdResult<()> {
    s.lib
        .set_setting(profile, service.token_key(), "")
        .map_err(err)
}

/// Real-Debrid access token from the stored OAuth sign-in, refreshed when
/// it expires within a minute.
pub async fn realdebrid_token(s: &AppState, profile: i64) -> CmdResult<Option<String>> {
    let Some(raw) = s
        .lib
        .setting(profile, Service::RealDebrid.token_key())
        .map_err(err)?
    else {
        return Ok(None);
    };
    let Ok(mut token) = serde_json::from_str::<OAuthToken>(&raw) else {
        return Ok(None);
    };
    if token.expires_at - 60 < now() {
        token = realdebrid::oauth::refresh(&s.http, &token)
            .await
            .map_err(err)?;
        let json = serde_json::to_string(&token).map_err(err)?;
        s.lib
            .set_setting(profile, Service::RealDebrid.token_key(), &json)
            .map_err(err)?;
    }
    Ok(Some(token.access_token))
}
