//! TMDB metadata matching for local files (spec feature 12) and episode
//! lists that are more complete than Cinemeta's (spec bug table).
//! The API token is build-time config, never user-supplied.

use serde::Deserialize;

use super::local::ParsedName;
use crate::model::{MediaType, MetaPreview};
use crate::Result;

const BASE: &str = "https://api.themoviedb.org/3";
const IMG: &str = "https://image.tmdb.org/t/p";

#[derive(Deserialize)]
struct Search {
    #[serde(default)]
    results: Vec<Hit>,
}

#[derive(Debug, Clone, Deserialize)]
struct Hit {
    id: u64,
    #[serde(alias = "name")]
    title: String,
    #[serde(default, alias = "first_air_date")]
    release_date: Option<String>,
    #[serde(default)]
    overview: Option<String>,
    #[serde(default)]
    poster_path: Option<String>,
    #[serde(default)]
    backdrop_path: Option<String>,
    #[serde(default)]
    popularity: f64,
}

#[derive(Deserialize)]
struct ExternalIds {
    imdb_id: Option<String>,
}

#[derive(Clone)]
pub struct Tmdb {
    http: reqwest::Client,
    token: String,
}

impl Tmdb {
    pub fn new(http: reqwest::Client, token: &str) -> Self {
        Self {
            http,
            token: token.into(),
        }
    }

    async fn get<T: for<'de> Deserialize<'de>>(
        &self,
        path: &str,
        query: &[(&str, &str)],
    ) -> Result<T> {
        Ok(self
            .http
            .get(format!("{BASE}{path}"))
            .bearer_auth(&self.token)
            .query(query)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?)
    }

    /// Best match for a parsed filename. Returns an IMDb-keyed preview when
    /// possible so addons can supply streams/subtitles for local files too.
    pub async fn match_file(&self, parsed: &ParsedName) -> Result<Option<MetaPreview>> {
        let is_series = parsed.season.is_some();
        let kind = if is_series { "tv" } else { "movie" };
        let year = parsed.year.map(|y| y.to_string());
        let mut query = vec![("query", parsed.title.as_str())];
        if let Some(y) = year.as_deref() {
            query.push((
                if is_series {
                    "first_air_date_year"
                } else {
                    "year"
                },
                y,
            ));
        }
        let search: Search = self.get(&format!("/search/{kind}"), &query).await?;
        let Some(hit) = best_hit(search.results, &parsed.title, parsed.year) else {
            return Ok(None);
        };
        let ext: ExternalIds = self
            .get(&format!("/{kind}/{}/external_ids", hit.id), &[])
            .await?;
        Ok(Some(MetaPreview {
            id: ext
                .imdb_id
                .filter(|i| !i.is_empty())
                .unwrap_or_else(|| format!("tmdb:{kind}:{}", hit.id)),
            kind: if is_series {
                MediaType::Series
            } else {
                MediaType::Movie
            },
            name: hit.title,
            poster: hit.poster_path.map(|p| format!("{IMG}/w342{p}")),
            background: hit.backdrop_path.map(|p| format!("{IMG}/w1280{p}")),
            logo: None,
            description: hit.overview,
            release_info: hit
                .release_date
                .and_then(|d| d.get(..4).map(str::to_string)),
            imdb_rating: None,
            genres: vec![],
        }))
    }
}

fn normalize(s: &str) -> String {
    s.chars()
        .filter(|c| c.is_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect()
}

/// Exact normalized title + year beats popularity; avoids matching
/// "Dune (1984)" to the 2021 film.
fn best_hit(hits: Vec<Hit>, title: &str, year: Option<u16>) -> Option<Hit> {
    let want = normalize(title);
    hits.into_iter().max_by(|a, b| {
        let score = |h: &Hit| {
            let title_ok = normalize(&h.title) == want;
            let y: Option<u16> = h
                .release_date
                .as_deref()
                .and_then(|d| d.get(..4)?.parse().ok());
            let year_ok = year.is_some() && y == year;
            (
                title_ok as u8 + year_ok as u8,
                (h.popularity * 100.0) as i64,
            )
        };
        score(a).cmp(&score(b))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hit(id: u64, title: &str, date: &str, pop: f64) -> Hit {
        Hit {
            id,
            title: title.into(),
            release_date: Some(date.into()),
            overview: None,
            poster_path: None,
            backdrop_path: None,
            popularity: pop,
        }
    }

    #[test]
    fn year_breaks_title_ties() {
        let hits = vec![
            hit(1, "Dune", "2021-09-15", 300.0),
            hit(2, "Dune", "1984-12-14", 40.0),
        ];
        assert_eq!(best_hit(hits.clone(), "Dune", Some(1984)).unwrap().id, 2);
        assert_eq!(best_hit(hits, "Dune", None).unwrap().id, 1);
    }
}
