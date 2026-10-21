//! Shared data model. Field names follow the Stremio addon protocol so addon
//! responses deserialize directly, and every other source maps into these.

use serde::{Deserialize, Serialize};

/// Content kind. Unknown addon types are kept instead of failing the parse.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MediaType {
    Movie,
    Series,
    Channel,
    Tv,
    #[serde(untagged)]
    Other(String),
}

impl MediaType {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Movie => "movie",
            Self::Series => "series",
            Self::Channel => "channel",
            Self::Tv => "tv",
            Self::Other(s) => s,
        }
    }
}

/// Lightweight item used in catalog rows and search results.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetaPreview {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: MediaType,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub poster: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logo: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub release_info: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub imdb_rating: Option<String>,
    #[serde(
        default,
        deserialize_with = "null_default",
        skip_serializing_if = "Vec::is_empty"
    )]
    pub genres: Vec<String>,
}

/// One episode (series) or one video entry (channel).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Video {
    pub id: String,
    #[serde(default, alias = "name")]
    pub title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub released: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub season: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub episode: Option<u32>,
    /// Older addons send the episode number here instead of `episode`.
    #[serde(default, skip_serializing)]
    pub number: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thumbnail: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub overview: Option<String>,
}

/// Addons send `null` where they mean "empty"; treat both the same.
fn null_default<'de, D, T>(d: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Default + Deserialize<'de>,
{
    Ok(Option::<T>::deserialize(d)?.unwrap_or_default())
}

/// Full detail page item.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Meta {
    #[serde(flatten)]
    pub preview: MetaPreview,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub runtime: Option<String>,
    #[serde(
        default,
        deserialize_with = "null_default",
        skip_serializing_if = "Vec::is_empty"
    )]
    pub cast: Vec<String>,
    #[serde(
        default,
        deserialize_with = "null_default",
        skip_serializing_if = "Vec::is_empty"
    )]
    pub director: Vec<String>,
    #[serde(
        default,
        deserialize_with = "null_default",
        skip_serializing_if = "Vec::is_empty"
    )]
    pub videos: Vec<Video>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamHints {
    #[serde(default)]
    pub not_web_ready: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub binge_group: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_size: Option<u64>,
}

/// A playable source for an item. Exactly one locator should be set.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stream {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub info_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_idx: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub yt_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub external_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, alias = "title", skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default)]
    pub behavior_hints: StreamHints,
    /// Which Argus source produced this stream (set by Argus, not by addons).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub origin: Option<String>,
}

impl Stream {
    /// Directly playable by a media player without extra resolution steps.
    pub fn is_direct(&self) -> bool {
        self.url.is_some()
    }
}

/// External subtitle track from an addon (`subtitles` resource).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subtitle {
    #[serde(default)]
    pub id: String,
    pub url: String,
    /// ISO 639-2 code as sent by the addon (e.g. "eng").
    pub lang: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub origin: Option<String>,
}

impl Meta {
    /// Fills `episode` from legacy `number` so the UI reads one field.
    pub fn normalized(mut self) -> Self {
        for v in &mut self.videos {
            v.episode = v.episode.or(v.number.take());
        }
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tolerates_nulls_and_duplicate_episode_fields() {
        let m: Meta = serde_json::from_str(
            r#"{"id":"tt1","type":"series","name":"X","director":null,
                "videos":[{"id":"tt1:1:1","name":"Pilot","season":1,"number":1,"episode":1},
                          {"id":"tt1:1:2","title":"Two","season":1,"number":2}]}"#,
        )
        .unwrap();
        let m = m.normalized();
        assert!(m.director.is_empty());
        assert_eq!(m.videos[0].title, "Pilot");
        assert_eq!(m.videos[1].episode, Some(2));
    }

    #[test]
    fn unknown_media_type_is_kept() {
        let t: MediaType = serde_json::from_str("\"anime\"").unwrap();
        assert_eq!(t, MediaType::Other("anime".into()));
        assert_eq!(t.as_str(), "anime");
    }

    #[test]
    fn stream_title_alias() {
        let s: Stream =
            serde_json::from_str(r#"{"url":"http://x","name":"Src","title":"Movie 2160p"}"#)
                .unwrap();
        assert!(s.is_direct());
        assert_eq!(s.description.as_deref(), Some("Movie 2160p"));
    }
}
