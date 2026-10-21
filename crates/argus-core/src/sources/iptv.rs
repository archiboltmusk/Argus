//! IPTV: M3U/M3U8 playlists and Xtream Codes accounts.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::Result;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Channel {
    pub name: String,
    pub url: String,
    pub group: Option<String>,
    pub logo: Option<String>,
    pub tvg_id: Option<String>,
}

/// Parses `#EXTINF` playlists. Tolerant: skips junk lines instead of failing.
pub fn parse_m3u(text: &str) -> Vec<Channel> {
    let mut out = Vec::new();
    let mut pending: Option<(String, HashMap<String, String>)> = None;
    let mut group_override: Option<String> = None;

    for line in text.lines().map(str::trim).filter(|l| !l.is_empty()) {
        if let Some(rest) = line.strip_prefix("#EXTINF:") {
            pending = Some(parse_extinf(rest));
            group_override = None;
        } else if let Some(g) = line.strip_prefix("#EXTGRP:") {
            group_override = Some(g.trim().to_string());
        } else if line.starts_with('#') {
            continue;
        } else if let Some((name, attrs)) = pending.take() {
            out.push(Channel {
                name: if name.is_empty() {
                    attrs.get("tvg-name").cloned().unwrap_or_default()
                } else {
                    name
                },
                url: line.to_string(),
                group: group_override
                    .take()
                    .or_else(|| attrs.get("group-title").cloned()),
                logo: attrs.get("tvg-logo").cloned(),
                tvg_id: attrs.get("tvg-id").cloned(),
            });
        }
    }
    out
}

/// `-1 tvg-id="x" group-title="News, World",Channel Name` → (name, attrs).
fn parse_extinf(rest: &str) -> (String, HashMap<String, String>) {
    let mut attrs = HashMap::new();
    let bytes = rest.as_bytes();
    let mut i = 0;
    let mut in_quotes = false;
    let mut name_start = None;
    while i < bytes.len() {
        match bytes[i] {
            b'"' => in_quotes = !in_quotes,
            b',' if !in_quotes => {
                name_start = Some(i + 1);
                break;
            }
            _ => {}
        }
        i += 1;
    }
    let head = &rest[..name_start.map_or(rest.len(), |s| s - 1)];
    let name = name_start.map_or("", |s| &rest[s..]).trim().to_string();

    let re = attr_regex();
    for cap in re.captures_iter(head) {
        attrs.insert(cap[1].to_ascii_lowercase(), cap[2].to_string());
    }
    (name, attrs)
}

fn attr_regex() -> &'static regex::Regex {
    static RE: std::sync::OnceLock<regex::Regex> = std::sync::OnceLock::new();
    RE.get_or_init(|| regex::Regex::new(r#"([A-Za-z0-9_-]+)="([^"]*)""#).unwrap())
}

/// Xtream Codes account. Credentials go in the URL by protocol design, so
/// never log these URLs.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Xtream {
    pub server: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct XtreamLive {
    pub stream_id: u64,
    pub name: String,
    #[serde(default)]
    pub stream_icon: Option<String>,
    #[serde(default)]
    pub category_id: Option<String>,
    #[serde(default)]
    pub epg_channel_id: Option<String>,
}

impl Xtream {
    fn server(&self) -> &str {
        self.server.trim_end_matches('/')
    }

    pub fn api_url(&self, action: &str) -> String {
        format!(
            "{}/player_api.php?username={}&password={}&action={}",
            self.server(),
            enc(&self.username),
            enc(&self.password),
            action
        )
    }

    pub fn live_url(&self, stream_id: u64, ext: &str) -> String {
        format!(
            "{}/live/{}/{}/{}.{}",
            self.server(),
            enc(&self.username),
            enc(&self.password),
            stream_id,
            ext
        )
    }

    pub async fn live_channels(&self, http: &reqwest::Client) -> Result<Vec<Channel>> {
        let live: Vec<XtreamLive> = http
            .get(self.api_url("get_live_streams"))
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(live
            .into_iter()
            .map(|l| Channel {
                url: self.live_url(l.stream_id, "m3u8"),
                name: l.name,
                group: l.category_id,
                logo: l.stream_icon.filter(|s| !s.is_empty()),
                tvg_id: l.epg_channel_id,
            })
            .collect())
    }
}

fn enc(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_m3u_with_attrs_and_commas() {
        let text = "#EXTM3U\n\
            #EXTINF:-1 tvg-id=\"bbc1.uk\" tvg-logo=\"http://l/bbc.png\" group-title=\"News, UK\",BBC One\n\
            http://s/bbc1.m3u8\n\
            \n\
            #EXTINF:-1,Plain\n\
            #EXTGRP:Misc\n\
            http://s/plain.ts\n\
            http://orphan-without-extinf\n";
        let ch = parse_m3u(text);
        assert_eq!(ch.len(), 2);
        assert_eq!(ch[0].name, "BBC One");
        assert_eq!(ch[0].group.as_deref(), Some("News, UK"));
        assert_eq!(ch[0].tvg_id.as_deref(), Some("bbc1.uk"));
        assert_eq!(ch[1].group.as_deref(), Some("Misc"));
    }

    #[test]
    fn xtream_urls_escape_credentials() {
        let x = Xtream {
            server: "http://h:8080/".into(),
            username: "u@x".into(),
            password: "p&w".into(),
        };
        assert_eq!(x.live_url(7, "ts"), "http://h:8080/live/u%40x/p%26w/7.ts");
        assert!(x
            .api_url("get_live_categories")
            .ends_with("action=get_live_categories"));
    }
}
