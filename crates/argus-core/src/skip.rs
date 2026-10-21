//! Intro, recap and outro segments from the file's own chapter markers.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Intro,
    Recap,
    Outro,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Chapter {
    #[serde(default)]
    pub title: String,
    pub time: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Segment {
    pub kind: Kind,
    pub start: f64,
    /// `None` for a final chapter that runs to the end of the file.
    pub end: Option<f64>,
}

fn classify(title: &str) -> Option<Kind> {
    let t = title.to_ascii_lowercase();
    let words: Vec<&str> = t.split(|c: char| !c.is_ascii_alphanumeric()).collect();
    let any = |ws: &[&str]| ws.iter().any(|w| words.contains(w));
    if any(&["recap", "previously"]) {
        Some(Kind::Recap)
    } else if any(&["intro", "opening", "op", "title", "titles"]) {
        Some(Kind::Intro)
    } else if any(&["outro", "ending", "ed", "credits", "preview"]) {
        Some(Kind::Outro)
    } else {
        None
    }
}

/// Skippable segments, each ending where the next chapter begins.
pub fn segments(chapters: &[Chapter]) -> Vec<Segment> {
    chapters
        .iter()
        .enumerate()
        .filter_map(|(i, c)| {
            Some(Segment {
                kind: classify(&c.title)?,
                start: c.time,
                end: chapters.get(i + 1).map(|n| n.time),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ch(title: &str, time: f64) -> Chapter {
        Chapter {
            title: title.into(),
            time,
        }
    }

    #[test]
    fn finds_intro_recap_and_outro() {
        let list = [
            ch("Recap", 0.0),
            ch("Opening", 60.0),
            ch("Part A", 150.0),
            ch("Ending Credits", 1300.0),
        ];
        let s = segments(&list);
        assert_eq!(s.len(), 3);
        assert_eq!((s[0].kind, s[0].end), (Kind::Recap, Some(60.0)));
        assert_eq!(
            (s[1].kind, s[1].start, s[1].end),
            (Kind::Intro, 60.0, Some(150.0))
        );
        assert_eq!((s[2].kind, s[2].end), (Kind::Outro, None));
    }

    #[test]
    fn ignores_ordinary_chapters() {
        assert!(segments(&[
            ch("Chapter 1", 0.0),
            ch("Operation Night", 10.0),
            ch("", 20.0)
        ])
        .is_empty());
    }
}
