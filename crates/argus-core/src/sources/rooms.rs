//! Movies and Shows rooms plus ratings, from the user's own free TMDB and
//! OMDB keys (Harbor parity). Keys live in settings and never leave the device.

use futures::future::join_all;
use serde::{Deserialize, Serialize};

use crate::model::{MediaType, MetaPreview};
use crate::Result;

const TMDB: &str = "https://api.themoviedb.org/3";
const IMG: &str = "https://image.tmdb.org/t/p";

pub const TMDB_KEY_SETTING: &str = "meta.tmdb.key";
pub const OMDB_KEY_SETTING: &str = "meta.omdb.key";
pub const RPDB_KEY_SETTING: &str = "meta.rpdb.key";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Room {
    Movies,
    Shows,
}

/// One titled row: a TMDB path plus extra query pairs.
pub struct RowSpec {
    pub title: String,
    pub path: String,
    pub query: Vec<(String, String)>,
}

const NETWORKS: [(&str, &str); 8] = [
    ("Netflix", "213"),
    ("Disney+", "2739"),
    ("Prime Video", "1024"),
    ("Apple TV+", "2552"),
    ("Max", "3186"),
    ("Hulu", "453"),
    ("Paramount+", "4330"),
    ("Peacock", "3353"),
];

fn spec(title: &str, path: &str, query: &[(&str, &str)]) -> RowSpec {
    RowSpec {
        title: title.into(),
        path: path.into(),
        query: query
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect(),
    }
}

pub fn rows_for(room: Room) -> Vec<RowSpec> {
    match room {
        Room::Movies => vec![
            spec("Trending this week", "trending/movie/week", &[]),
            spec("In theaters", "movie/now_playing", &[]),
            spec("Popular", "movie/popular", &[]),
            spec("Top rated", "movie/top_rated", &[]),
            spec(
                "Hidden gems",
                "discover/movie",
                &[
                    ("sort_by", "vote_average.desc"),
                    ("vote_count.gte", "300"),
                    ("vote_count.lte", "2000"),
                ],
            ),
            spec(
                "Quick watches (under 90 min)",
                "discover/movie",
                &[
                    ("with_runtime.lte", "90"),
                    ("sort_by", "popularity.desc"),
                    ("vote_count.gte", "200"),
                ],
            ),
            spec(
                "Documentaries",
                "discover/movie",
                &[("with_genres", "99"), ("sort_by", "popularity.desc")],
            ),
        ],
        Room::Shows => {
            let mut v = vec![
                spec("Trending this week", "trending/tv/week", &[]),
                spec("On the air", "tv/on_the_air", &[]),
                spec("Popular", "tv/popular", &[]),
                spec("Top rated", "tv/top_rated", &[]),
            ];
            v.extend(NETWORKS.iter().map(|(name, id)| {
                spec(
                    name,
                    "discover/tv",
                    &[("with_networks", id), ("sort_by", "popularity.desc")],
                )
            }));
            v
        }
    }
}

#[derive(Deserialize)]
struct Page {
    #[serde(default)]
    results: Vec<Hit>,
}

#[derive(Deserialize)]
struct Hit {
    id: u64,
    #[serde(default, alias = "name")]
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
    vote_average: Option<f64>,
}

#[derive(Deserialize)]
struct ExternalIds {
    imdb_id: Option<String>,
}

pub struct Tmdb {
    http: reqwest::Client,
    key: String,
}

impl Tmdb {
    pub fn new(http: reqwest::Client, key: &str) -> Self {
        Self {
            http,
            key: key.trim().to_string(),
        }
    }

    async fn get<T: for<'de> Deserialize<'de>>(
        &self,
        path: &str,
        query: &[(&str, &str)],
    ) -> Result<T> {
        Ok(self
            .http
            .get(format!("{TMDB}/{path}"))
            .query(&[("api_key", self.key.as_str())])
            .query(query)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?)
    }

    /// Titles for a row, keyed by IMDb id so addon streams work. Items TMDB
    /// has no IMDb id for are dropped.
    pub async fn row(&self, room: Room, spec: &RowSpec) -> Result<Vec<MetaPreview>> {
        let kind = match room {
            Room::Movies => MediaType::Movie,
            Room::Shows => MediaType::Series,
        };
        let query: Vec<(&str, &str)> = spec
            .query
            .iter()
            .map(|(k, v)| (k.as_str(), v.as_str()))
            .collect();
        let page: Page = self.get(&spec.path, &query).await?;
        let ext = match room {
            Room::Movies => "movie",
            Room::Shows => "tv",
        };
        let calls = page.results.into_iter().take(20).map(|h| {
            let kind = kind.clone();
            async move {
                let ids: ExternalIds = self
                    .get(&format!("{ext}/{}/external_ids", h.id), &[])
                    .await
                    .ok()?;
                Some(to_preview(h, ids.imdb_id?, kind))
            }
        });
        Ok(join_all(calls).await.into_iter().flatten().collect())
    }

    /// Cheap key check for the settings screen.
    pub async fn validate(&self) -> bool {
        self.get::<serde_json::Value>("configuration", &[])
            .await
            .is_ok()
    }
}

fn to_preview(h: Hit, imdb: String, kind: MediaType) -> MetaPreview {
    MetaPreview {
        id: imdb,
        kind,
        name: h.title,
        poster: h.poster_path.map(|p| format!("{IMG}/w342{p}")),
        background: h.backdrop_path.map(|p| format!("{IMG}/w1280{p}")),
        logo: None,
        description: h.overview.filter(|o| !o.is_empty()),
        release_info: h
            .release_date
            .as_deref()
            .and_then(|d| d.get(..4))
            .map(str::to_string),
        imdb_rating: h
            .vote_average
            .filter(|v| *v > 0.0)
            .map(|v| format!("{v:.1}")),
        genres: Vec::new(),
    }
}

/// Ratings shown on the detail page.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ratings {
    pub imdb: Option<String>,
    pub rotten_tomatoes: Option<String>,
    pub metascore: Option<String>,
    pub awards: Option<String>,
}

pub fn parse_omdb(json: &serde_json::Value) -> Option<Ratings> {
    if json.get("Response")?.as_str()? != "True" {
        return None;
    }
    let clean = |v: &serde_json::Value| {
        v.as_str()
            .filter(|s| !s.is_empty() && *s != "N/A")
            .map(str::to_string)
    };
    let rt = json
        .get("Ratings")?
        .as_array()?
        .iter()
        .find(|r| r["Source"] == "Rotten Tomatoes")
        .and_then(|r| clean(&r["Value"]));
    Some(Ratings {
        imdb: clean(&json["imdbRating"]),
        rotten_tomatoes: rt,
        metascore: clean(&json["Metascore"]),
        awards: clean(&json["Awards"]),
    })
}

pub async fn omdb(http: &reqwest::Client, key: &str, imdb: &str) -> Result<Option<Ratings>> {
    let json: serde_json::Value = http
        .get("https://www.omdbapi.com/")
        .query(&[("apikey", key.trim()), ("i", imdb)])
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    Ok(parse_omdb(&json))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_omdb_ratings_and_skips_na() {
        let r = parse_omdb(&json!({
            "Response": "True", "imdbRating": "8.8", "Metascore": "N/A",
            "Awards": "Won 4 Oscars.",
            "Ratings": [{"Source": "Internet Movie Database", "Value": "8.8/10"},
                        {"Source": "Rotten Tomatoes", "Value": "87%"}]
        }))
        .unwrap();
        assert_eq!(r.rotten_tomatoes.as_deref(), Some("87%"));
        assert_eq!(r.metascore, None);
        assert_eq!(r.awards.as_deref(), Some("Won 4 Oscars."));
        assert!(parse_omdb(&json!({"Response": "False"})).is_none());
    }

    #[test]
    fn shows_room_has_network_rows() {
        assert!(rows_for(Room::Shows).iter().any(|r| r.title == "Netflix"));
        assert!(rows_for(Room::Movies).iter().all(|r| !r.path.is_empty()));
    }

    #[test]
    fn maps_a_hit_to_a_preview() {
        let h = Hit {
            id: 1,
            title: "Heat".into(),
            release_date: Some("1995-12-15".into()),
            overview: Some(String::new()),
            poster_path: Some("/p.jpg".into()),
            backdrop_path: None,
            vote_average: Some(8.2),
        };
        let m = to_preview(h, "tt0113277".into(), MediaType::Movie);
        assert_eq!(m.release_info.as_deref(), Some("1995"));
        assert_eq!(
            m.poster.as_deref(),
            Some("https://image.tmdb.org/t/p/w342/p.jpg")
        );
        assert_eq!(m.description, None);
    }
}
