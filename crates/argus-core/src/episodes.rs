//! Next-episode queue and release calendar (spec feature 10).

use serde::{Deserialize, Serialize};

use crate::model::{Meta, Video};

/// Episodes in watch order: season 1.. first, specials (season 0) last.
pub fn ordered(meta: &Meta) -> Vec<&Video> {
    let mut eps: Vec<&Video> = meta.videos.iter().collect();
    eps.sort_by_key(|v| {
        let season = v.season.unwrap_or(0);
        (season == 0, season, v.episode.unwrap_or(0))
    });
    eps
}

/// The episode after `current`, skipping specials and anything not yet aired.
pub fn next_episode<'a>(meta: &'a Meta, current: &str, today: &str) -> Option<&'a Video> {
    let eps = ordered(meta);
    let pos = eps.iter().position(|v| v.id == current)?;
    eps.into_iter()
        .skip(pos + 1)
        .find(|v| v.season != Some(0) && is_released(v, today))
}

/// Released on or before `today` (`YYYY-MM-DD`). Unknown dates count as released.
pub fn is_released(v: &Video, today: &str) -> bool {
    v.released.as_deref().is_none_or(|d| date_part(d) <= today)
}

fn date_part(iso: &str) -> &str {
    iso.get(..10).unwrap_or(iso)
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEntry {
    pub date: String,
    pub show_id: String,
    pub show_name: String,
    pub poster: Option<String>,
    pub video_id: String,
    pub season: Option<u32>,
    pub episode: Option<u32>,
    pub title: String,
}

/// Episodes airing between `from` and `to` (inclusive, `YYYY-MM-DD`) across
/// the given shows, sorted by date then show.
pub fn calendar(shows: &[Meta], from: &str, to: &str) -> Vec<CalendarEntry> {
    let mut out: Vec<CalendarEntry> = shows
        .iter()
        .flat_map(|m| {
            m.videos.iter().filter_map(move |v| {
                let date = date_part(v.released.as_deref()?);
                (from <= date && date <= to && v.season != Some(0)).then(|| CalendarEntry {
                    date: date.to_string(),
                    show_id: m.preview.id.clone(),
                    show_name: m.preview.name.clone(),
                    poster: m.preview.poster.clone(),
                    video_id: v.id.clone(),
                    season: v.season,
                    episode: v.episode,
                    title: v.title.clone(),
                })
            })
        })
        .collect();
    out.sort_by(|a, b| {
        (&a.date, &a.show_name, a.season, a.episode).cmp(&(
            &b.date,
            &b.show_name,
            b.season,
            b.episode,
        ))
    });
    out
}

/// Today's date in UTC as `YYYY-MM-DD`, without pulling in a date crate.
pub fn today_utc() -> String {
    days_to_date(crate::sources::debrid::now().div_euclid(86_400))
}

/// `days` since 1970-01-01 → `YYYY-MM-DD` (Howard Hinnant's civil_from_days).
pub fn days_to_date(days: i64) -> String {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn show() -> Meta {
        serde_json::from_value(serde_json::json!({
            "id": "tt1", "type": "series", "name": "Show",
            "videos": [
                {"id": "tt1:2:1", "title": "S2E1", "season": 2, "episode": 1, "released": "2026-11-01T00:00:00.000Z"},
                {"id": "tt1:0:1", "title": "Special", "season": 0, "episode": 1, "released": "2020-01-01"},
                {"id": "tt1:1:2", "title": "S1E2", "season": 1, "episode": 2, "released": "2026-01-08"},
                {"id": "tt1:1:1", "title": "S1E1", "season": 1, "episode": 1, "released": "2026-01-01"}
            ]
        }))
        .unwrap()
    }

    #[test]
    fn next_episode_crosses_seasons_and_waits_for_air_date() {
        let m = show();
        assert_eq!(
            next_episode(&m, "tt1:1:1", "2026-10-21").unwrap().id,
            "tt1:1:2"
        );
        assert!(
            next_episode(&m, "tt1:1:2", "2026-10-21").is_none(),
            "S2 not aired yet"
        );
        assert_eq!(
            next_episode(&m, "tt1:1:2", "2026-11-02").unwrap().id,
            "tt1:2:1"
        );
    }

    #[test]
    fn calendar_window() {
        let cal = calendar(&[show()], "2026-10-21", "2026-11-30");
        assert_eq!(cal.len(), 1);
        assert_eq!(
            (cal[0].date.as_str(), cal[0].episode),
            ("2026-11-01", Some(1))
        );
    }

    #[test]
    fn civil_dates() {
        assert_eq!(days_to_date(0), "1970-01-01");
        assert_eq!(days_to_date(20_747), "2026-10-21");
        assert_eq!(days_to_date(11_016), "2000-02-29");
    }
}
