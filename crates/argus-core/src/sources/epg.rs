//! XMLTV electronic programme guide (spec feature 13). Streams the XML so
//! multi-hundred-MB guides parse without loading the whole DOM.

use std::collections::HashMap;
use std::io::BufRead;

use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};

use crate::{Error, Result};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Programme {
    pub channel: String,
    /// Unix seconds.
    pub start: i64,
    pub stop: i64,
    pub title: String,
    pub desc: Option<String>,
    pub category: Option<String>,
    /// Provider supports catch-up for this slot (`catchup-id` present).
    pub catchup: bool,
}

#[derive(Debug, Default)]
pub struct Guide {
    /// tvg-id → display name.
    pub channels: HashMap<String, String>,
    /// tvg-id → programmes sorted by start.
    pub programmes: HashMap<String, Vec<Programme>>,
}

impl Guide {
    /// Programmes overlapping `[from, to)` for one channel.
    pub fn window(&self, channel: &str, from: i64, to: i64) -> &[Programme] {
        let Some(list) = self.programmes.get(channel) else {
            return &[];
        };
        let start = list.partition_point(|p| p.stop <= from);
        let end = list.partition_point(|p| p.start < to);
        &list[start..end.max(start)]
    }

    pub fn now_playing(&self, channel: &str, now: i64) -> Option<&Programme> {
        self.window(channel, now, now + 1).first()
    }
}

/// XMLTV time: `20261021183000 +0100` → unix seconds.
pub fn parse_time(s: &str) -> Option<i64> {
    let s = s.trim();
    let digits = s.get(..14)?;
    let n = |a: usize, b: usize| digits.get(a..b)?.parse::<i64>().ok();
    let (y, mo, d, h, mi, se) = (
        n(0, 4)?,
        n(4, 6)?,
        n(6, 8)?,
        n(8, 10)?,
        n(10, 12)?,
        n(12, 14)?,
    );
    let offset = match s[14..].trim() {
        "" => 0,
        tz => {
            let sign = if tz.starts_with('-') { -1 } else { 1 };
            let t = tz.trim_start_matches(['+', '-']);
            let oh: i64 = t.get(..2)?.parse().ok()?;
            let om: i64 = t.get(2..4)?.parse().ok()?;
            sign * (oh * 3600 + om * 60)
        }
    };
    Some(days_from_civil(y, mo, d) * 86_400 + h * 3600 + mi * 60 + se - offset)
}

/// Inverse of [`crate::episodes::days_to_date`].
fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let mp = (m + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

pub fn parse<R: BufRead>(input: R) -> Result<Guide> {
    let mut reader = Reader::from_reader(input);
    reader.config_mut().trim_text(true);
    let mut buf = Vec::new();
    let mut guide = Guide::default();

    let mut cur_channel: Option<String> = None;
    let mut cur_prog: Option<Programme> = None;
    let mut field: Option<&'static str> = None;

    let attr = |e: &quick_xml::events::BytesStart<'_>, name: &[u8]| -> Option<String> {
        e.attributes()
            .flatten()
            .find(|a| a.key.as_ref() == name)
            .and_then(|a| a.unescape_value().ok().map(|v| v.into_owned()))
    };

    loop {
        match reader
            .read_event_into(&mut buf)
            .map_err(|e| Error::source("EPG", e.to_string()))?
        {
            Event::Start(e) => match e.name().as_ref() {
                b"channel" => cur_channel = attr(&e, b"id"),
                b"display-name" if cur_channel.is_some() => field = Some("display-name"),
                b"programme" => {
                    let start = attr(&e, b"start").and_then(|t| parse_time(&t));
                    let stop = attr(&e, b"stop").and_then(|t| parse_time(&t));
                    cur_prog = match (attr(&e, b"channel"), start) {
                        (Some(channel), Some(start)) => Some(Programme {
                            channel,
                            start,
                            stop: stop.unwrap_or(start + 1800),
                            title: String::new(),
                            desc: None,
                            category: None,
                            catchup: attr(&e, b"catchup-id").is_some(),
                        }),
                        _ => None,
                    };
                }
                b"title" if cur_prog.is_some() => field = Some("title"),
                b"desc" if cur_prog.is_some() => field = Some("desc"),
                b"category" if cur_prog.is_some() => field = Some("category"),
                _ => {}
            },
            Event::Text(t) => {
                let text = t
                    .unescape()
                    .map_err(|e| Error::source("EPG", e.to_string()))?
                    .into_owned();
                match (field, &mut cur_prog, &cur_channel) {
                    (Some("display-name"), _, Some(id)) => {
                        guide.channels.entry(id.clone()).or_insert(text);
                    }
                    (Some("title"), Some(p), _) if p.title.is_empty() => p.title = text,
                    (Some("desc"), Some(p), _) if p.desc.is_none() => p.desc = Some(text),
                    (Some("category"), Some(p), _) if p.category.is_none() => {
                        p.category = Some(text)
                    }
                    _ => {}
                }
            }
            Event::End(e) => match e.name().as_ref() {
                b"channel" => cur_channel = None,
                b"programme" => {
                    if let Some(p) = cur_prog.take() {
                        guide
                            .programmes
                            .entry(p.channel.clone())
                            .or_default()
                            .push(p);
                    }
                }
                _ => field = None,
            },
            Event::Eof => break,
            _ => {}
        }
        buf.clear();
    }
    for list in guide.programmes.values_mut() {
        list.sort_by_key(|p| p.start);
    }
    Ok(guide)
}

/// Downloads and parses a guide; `.gz` guides are common and decompressed.
pub async fn fetch(http: &reqwest::Client, url: &str) -> Result<Guide> {
    let bytes = http
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .bytes()
        .await?;
    tokio::task::spawn_blocking(move || {
        if bytes.starts_with(&[0x1f, 0x8b]) {
            parse(std::io::BufReader::new(flate2::read::GzDecoder::new(
                &bytes[..],
            )))
        } else {
            parse(&bytes[..])
        }
    })
    .await
    .map_err(|e| Error::source("EPG", e.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::*;

    const XML: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<tv>
  <channel id="bbc1.uk"><display-name>BBC One</display-name><display-name>BBC1</display-name></channel>
  <programme start="20261021190000 +0100" stop="20261021193000 +0100" channel="bbc1.uk" catchup-id="x1">
    <title lang="en">News &amp; Weather</title><desc>Headlines.</desc><category>News</category>
  </programme>
  <programme start="20261021180000 +0100" stop="20261021190000 +0100" channel="bbc1.uk">
    <title>Quiz</title>
  </programme>
</tv>"#;

    #[test]
    fn parses_xmltv() {
        let g = parse(XML.as_bytes()).unwrap();
        assert_eq!(g.channels["bbc1.uk"], "BBC One");
        let progs = &g.programmes["bbc1.uk"];
        assert_eq!(progs.len(), 2);
        assert_eq!(progs[0].title, "Quiz", "sorted by start");
        assert_eq!(progs[1].title, "News & Weather");
        assert!(progs[1].catchup);
        assert_eq!(progs[1].category.as_deref(), Some("News"));
    }

    #[test]
    fn time_and_window() {
        // 2026-10-21 18:00 UTC
        assert_eq!(parse_time("20261021190000 +0100"), Some(1_792_605_600));
        assert_eq!(parse_time("20261021180000"), Some(1_792_605_600));
        let g = parse(XML.as_bytes()).unwrap();
        let now = 1_792_605_600 + 5 * 60; // 18:05 UTC = 19:05 local
        assert_eq!(
            g.now_playing("bbc1.uk", now).unwrap().title,
            "News & Weather"
        );
        assert_eq!(g.window("bbc1.uk", 0, i64::MAX).len(), 2);
        assert!(g.window("nope", 0, 1).is_empty());
    }
}
