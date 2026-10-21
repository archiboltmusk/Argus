//! Picking which addon subtitles to attach: no duplicates, preferred
//! languages first, and a cap per language so the menu stays usable.

use std::collections::{HashMap, HashSet};

use crate::model::Subtitle;

/// The built-in subtitle source (the public OpenSubtitles Stremio addon).
pub const OPENSUBTITLES_URL: &str = "https://opensubtitles-v3.strem.io";
pub const OPENSUBTITLES_SETTING: &str = "subs.opensubtitles";

pub fn select(subs: Vec<Subtitle>, preferred: &str, per_lang: usize) -> Vec<Subtitle> {
    let prefs: Vec<String> = preferred
        .split(',')
        .map(|l| l.trim().to_ascii_lowercase())
        .filter(|l| !l.is_empty())
        .collect();
    let mut seen = HashSet::new();
    let mut count: HashMap<String, usize> = HashMap::new();
    let mut out: Vec<Subtitle> = subs
        .into_iter()
        .filter(|s| seen.insert(s.url.clone()))
        .filter(|s| {
            let n = count.entry(s.lang.to_ascii_lowercase()).or_default();
            *n += 1;
            *n <= per_lang.max(1)
        })
        .collect();
    out.sort_by_key(|s| {
        prefs
            .iter()
            .position(|p| *p == s.lang.to_ascii_lowercase())
            .unwrap_or(prefs.len())
    });
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sub(url: &str, lang: &str) -> Subtitle {
        Subtitle {
            id: url.into(),
            url: url.into(),
            lang: lang.into(),
            origin: None,
        }
    }

    #[test]
    fn dedupes_caps_and_puts_preferred_first() {
        let list = vec![
            sub("a", "fre"),
            sub("b", "eng"),
            sub("b", "eng"),
            sub("c", "eng"),
            sub("d", "eng"),
        ];
        let out = select(list, "eng", 2);
        let urls: Vec<_> = out.iter().map(|s| s.url.as_str()).collect();
        assert_eq!(urls, ["b", "c", "a"]);
    }
}
