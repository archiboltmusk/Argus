//! Local SQLite FTS5 index of open-access metadata. Records only ever come from sources the user
//! added; nothing is seeded.

use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS oa_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL UNIQUE,
  protocol TEXT NOT NULL CHECK(protocol IN ('oai_pmh')),
  last_synced_at TEXT,
  enabled INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS oa_records (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES oa_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors TEXT,
  abstract TEXT,
  subject TEXT,
  media_type TEXT NOT NULL CHECK(media_type IN ('article','lecture_video','audiobook','manuscript')),
  direct_url TEXT NOT NULL,
  published_year INTEGER
);
CREATE INDEX IF NOT EXISTS oa_records_source_idx ON oa_records(source_id);
CREATE VIRTUAL TABLE IF NOT EXISTS fts_oa_records USING fts5(
  title, authors, abstract, subject,
  content='oa_records', content_rowid='rowid',
  tokenize='porter unicode61'
);
CREATE TRIGGER IF NOT EXISTS trg_oa_insert AFTER INSERT ON oa_records BEGIN
  INSERT INTO fts_oa_records(rowid, title, authors, abstract, subject)
  VALUES (new.rowid, new.title, new.authors, new.abstract, new.subject);
END;
CREATE TRIGGER IF NOT EXISTS trg_oa_delete AFTER DELETE ON oa_records BEGIN
  INSERT INTO fts_oa_records(fts_oa_records, rowid, title, authors, abstract, subject)
  VALUES ('delete', old.rowid, old.title, old.authors, old.abstract, old.subject);
END;
CREATE TRIGGER IF NOT EXISTS trg_oa_update AFTER UPDATE ON oa_records BEGIN
  INSERT INTO fts_oa_records(fts_oa_records, rowid, title, authors, abstract, subject)
  VALUES ('delete', old.rowid, old.title, old.authors, old.abstract, old.subject);
  INSERT INTO fts_oa_records(rowid, title, authors, abstract, subject)
  VALUES (new.rowid, new.title, new.authors, new.abstract, new.subject);
END;
"#;

pub const MEDIA_TYPES: [&str; 4] = ["article", "lecture_video", "audiobook", "manuscript"];
const MAX_LIMIT: usize = 100;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Record {
    pub id: String,
    pub title: String,
    pub authors: Option<String>,
    pub abstract_text: Option<String>,
    pub subject: Option<String>,
    pub media_type: &'static str,
    pub direct_url: String,
    pub published_year: Option<i64>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Source {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub protocol: String,
    pub last_synced_at: Option<String>,
    pub enabled: bool,
    pub record_count: i64,
}

/// A run of snippet text. Repository text is data, never markup, so highlights are returned as
/// segments instead of `<b>` tags the interface would have to trust.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct Segment {
    pub text: String,
    pub hit: bool,
}

const MARK_OPEN: char = '\u{1}';
const MARK_CLOSE: char = '\u{2}';

fn segments(snippet: &str) -> Vec<Segment> {
    let mut out = Vec::new();
    let mut hit = false;
    for part in snippet.split_inclusive([MARK_OPEN, MARK_CLOSE]) {
        let (text, marker) = match part.chars().last() {
            Some(c @ (MARK_OPEN | MARK_CLOSE)) => (&part[..part.len() - c.len_utf8()], Some(c)),
            _ => (part, None),
        };
        if !text.is_empty() {
            out.push(Segment {
                text: text.to_string(),
                hit,
            });
        }
        match marker {
            Some(MARK_OPEN) => hit = true,
            Some(_) => hit = false,
            None => {}
        }
    }
    out
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Hit {
    pub id: String,
    pub source_id: String,
    pub title: String,
    pub authors: Option<String>,
    pub snippet: Vec<Segment>,
    pub media_type: String,
    pub direct_url: String,
    pub published_year: Option<i64>,
}

pub fn open(conn: &Connection) -> rusqlite::Result<()> {
    conn.pragma_update(None, "foreign_keys", true)?;
    conn.execute_batch(SCHEMA)
}

pub fn add_source(conn: &Connection, name: &str, base_url: &str) -> Result<Source, &'static str> {
    let name = name.trim();
    if name.is_empty() || name.len() > 120 {
        return Err("name");
    }
    let id = uuid::Uuid::new_v4().to_string();
    match conn.execute(
        "INSERT INTO oa_sources (id, name, base_url, protocol) VALUES (?1, ?2, ?3, 'oai_pmh')",
        params![id, name, base_url],
    ) {
        Ok(_) => Ok(Source {
            id,
            name: name.to_string(),
            base_url: base_url.to_string(),
            protocol: "oai_pmh".into(),
            last_synced_at: None,
            enabled: true,
            record_count: 0,
        }),
        Err(rusqlite::Error::SqliteFailure(error, _))
            if error.code == rusqlite::ErrorCode::ConstraintViolation =>
        {
            Err("duplicate")
        }
        Err(_) => Err("db"),
    }
}

pub fn list_sources(conn: &Connection) -> rusqlite::Result<Vec<Source>> {
    let mut statement = conn.prepare(
        "SELECT s.id, s.name, s.base_url, s.protocol, s.last_synced_at, s.enabled,
                (SELECT COUNT(*) FROM oa_records r WHERE r.source_id = s.id)
         FROM oa_sources s ORDER BY s.name COLLATE NOCASE",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(Source {
            id: row.get(0)?,
            name: row.get(1)?,
            base_url: row.get(2)?,
            protocol: row.get(3)?,
            last_synced_at: row.get(4)?,
            enabled: row.get::<_, i64>(5)? != 0,
            record_count: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn get_source(conn: &Connection, id: &str) -> rusqlite::Result<Option<Source>> {
    Ok(list_sources(conn)?
        .into_iter()
        .find(|source| source.id == id))
}

pub fn set_enabled(conn: &Connection, id: &str, enabled: bool) -> rusqlite::Result<bool> {
    Ok(conn.execute(
        "UPDATE oa_sources SET enabled = ?2 WHERE id = ?1",
        params![id, enabled],
    )? > 0)
}

/// Deleting a source cascades to its records, and the delete trigger drops their FTS rows.
pub fn remove_source(conn: &Connection, id: &str) -> rusqlite::Result<bool> {
    Ok(conn.execute("DELETE FROM oa_sources WHERE id = ?1", [id])? > 0)
}

/// Upserts and deletes in one transaction so a failed page leaves the index as it was.
pub fn apply_page(
    conn: &mut Connection,
    source_id: &str,
    records: &[Record],
    deleted: &[String],
) -> rusqlite::Result<()> {
    let tx = conn.transaction()?;
    {
        let mut upsert = tx.prepare_cached(
            "INSERT INTO oa_records
               (id, source_id, title, authors, abstract, subject, media_type, direct_url, published_year)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
               title = excluded.title, authors = excluded.authors, abstract = excluded.abstract,
               subject = excluded.subject, media_type = excluded.media_type,
               direct_url = excluded.direct_url, published_year = excluded.published_year
             WHERE oa_records.source_id = excluded.source_id",
        )?;
        for record in records {
            upsert.execute(params![
                record.id,
                source_id,
                record.title,
                record.authors,
                record.abstract_text,
                record.subject,
                record.media_type,
                record.direct_url,
                record.published_year,
            ])?;
        }
        let mut remove =
            tx.prepare_cached("DELETE FROM oa_records WHERE id = ?1 AND source_id = ?2")?;
        for id in deleted {
            remove.execute(params![id, source_id])?;
        }
    }
    tx.commit()
}

pub fn mark_synced(conn: &Connection, id: &str, at: &str) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE oa_sources SET last_synced_at = ?2 WHERE id = ?1",
        params![id, at],
    )?;
    Ok(())
}

/// Turns free text into an FTS5 query where every word is a quoted prefix term, so user input can
/// never be read as FTS5 syntax. Returns None when no searchable word remains.
pub fn fts_query(input: &str) -> Option<String> {
    let terms: Vec<String> = input
        .split(|c: char| !c.is_alphanumeric())
        .filter(|word| !word.is_empty())
        .take(12)
        .map(|word| format!("\"{word}\"*"))
        .collect();
    (!terms.is_empty()).then(|| terms.join(" "))
}

pub fn search(
    conn: &Connection,
    query: &str,
    media_type: Option<&str>,
    limit: usize,
) -> rusqlite::Result<Vec<Hit>> {
    let Some(match_query) = fts_query(query) else {
        return Ok(Vec::new());
    };
    if media_type.is_some_and(|kind| !MEDIA_TYPES.contains(&kind)) {
        return Ok(Vec::new());
    }
    let limit = limit.clamp(1, MAX_LIMIT) as i64;
    let mut statement = conn.prepare_cached(
        "SELECT r.id, r.source_id, r.title, r.authors,
                snippet(fts_oa_records, 2, char(1), char(2), '...', 25),
                r.media_type, r.direct_url, r.published_year
         FROM fts_oa_records
         JOIN oa_records r ON r.rowid = fts_oa_records.rowid
         JOIN oa_sources s ON s.id = r.source_id AND s.enabled = 1
         WHERE fts_oa_records MATCH ?1 AND (?2 IS NULL OR r.media_type = ?2)
         ORDER BY bm25(fts_oa_records, 10.0, 4.0, 1.0, 2.0)
         LIMIT ?3",
    )?;
    let rows = statement.query_map(params![match_query, media_type, limit], |row| {
        Ok(Hit {
            id: row.get(0)?,
            source_id: row.get(1)?,
            title: row.get(2)?,
            authors: row.get(3)?,
            snippet: segments(&row.get::<_, String>(4)?),
            media_type: row.get(5)?,
            direct_url: row.get(6)?,
            published_year: row.get(7)?,
        })
    })?;
    rows.collect()
}

pub fn record_count(conn: &Connection) -> rusqlite::Result<i64> {
    conn.query_row("SELECT COUNT(*) FROM oa_records", [], |row| row.get(0))
        .optional()
        .map(|count| count.unwrap_or(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record(id: &str, title: &str, abstract_text: &str) -> Record {
        Record {
            id: id.into(),
            title: title.into(),
            authors: Some("Ada Lovelace".into()),
            abstract_text: Some(abstract_text.into()),
            subject: Some("computing".into()),
            media_type: "article",
            direct_url: format!("https://example.org/{id}"),
            published_year: Some(1843),
        }
    }

    fn setup() -> (Connection, String) {
        let conn = Connection::open_in_memory().unwrap();
        open(&conn).unwrap();
        let source = add_source(&conn, "Test", "https://example.org/oai").unwrap();
        (conn, source.id)
    }

    #[test]
    fn stemmed_prefix_search_with_snippet() {
        let (mut conn, source) = setup();
        let records = [
            record(
                "a",
                "Analytical engines",
                "Notes on computing machines and their programs",
            ),
            record("b", "Gardening", "Growing tomatoes"),
        ];
        apply_page(&mut conn, &source, &records, &[]).unwrap();
        let hits = search(&conn, "computer machine", None, 10).unwrap();
        assert_eq!(hits.len(), 1, "query words are stemmed too");
        let hits = search(&conn, "comput machin", None, 10).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].id, "a");
        assert!(hits[0].snippet.iter().any(|part| part.hit));
        let hits = search(&conn, "programming", None, 10).unwrap();
        assert_eq!(hits.len(), 1, "porter stems programming -> program");
    }

    #[test]
    fn snippet_markup_in_records_stays_plain_text() {
        let (mut conn, source) = setup();
        let text = "intro <script>alert(1)</script> engines <b>bold</b>";
        apply_page(&mut conn, &source, &[record("a", "T", text)], &[]).unwrap();
        let hits = search(&conn, "engines", None, 10).unwrap();
        let joined: String = hits[0]
            .snippet
            .iter()
            .map(|part| part.text.as_str())
            .collect();
        assert!(joined.contains("<script>"), "kept verbatim as text");
        let marked: Vec<_> = hits[0].snippet.iter().filter(|part| part.hit).collect();
        assert_eq!(marked.len(), 1);
        assert_eq!(marked[0].text, "engines");
    }

    #[test]
    fn user_text_cannot_inject_fts_syntax() {
        let (mut conn, source) = setup();
        apply_page(&mut conn, &source, &[record("a", "Engines", "x")], &[]).unwrap();
        for hostile in [
            "\"",
            "engines OR",
            "NEAR(",
            "title:engines*",
            "(",
            "-engines",
            "^ x",
        ] {
            assert!(search(&conn, hostile, None, 10).is_ok(), "{hostile}");
        }
        assert!(search(&conn, "   ", None, 10).unwrap().is_empty());
    }

    #[test]
    fn upsert_updates_fts_and_delete_removes_it() {
        let (mut conn, source) = setup();
        apply_page(
            &mut conn,
            &source,
            &[record("a", "Alpha", "first text")],
            &[],
        )
        .unwrap();
        apply_page(
            &mut conn,
            &source,
            &[record("a", "Beta", "second text")],
            &[],
        )
        .unwrap();
        assert!(search(&conn, "alpha", None, 10).unwrap().is_empty());
        assert_eq!(search(&conn, "beta", None, 10).unwrap().len(), 1);
        apply_page(&mut conn, &source, &[], &["a".into()]).unwrap();
        assert!(search(&conn, "beta", None, 10).unwrap().is_empty());
        assert_eq!(record_count(&conn).unwrap(), 0);
    }

    #[test]
    fn removing_source_drops_records_and_fts_rows() {
        let (mut conn, source) = setup();
        apply_page(&mut conn, &source, &[record("a", "Alpha", "text")], &[]).unwrap();
        assert!(remove_source(&conn, &source).unwrap());
        assert!(search(&conn, "alpha", None, 10).unwrap().is_empty());
        assert_eq!(record_count(&conn).unwrap(), 0);
    }

    #[test]
    fn disabled_sources_and_wrong_type_are_excluded() {
        let (mut conn, source) = setup();
        apply_page(&mut conn, &source, &[record("a", "Alpha", "text")], &[]).unwrap();
        assert!(search(&conn, "alpha", Some("audiobook"), 10)
            .unwrap()
            .is_empty());
        assert!(search(&conn, "alpha", Some("bogus"), 10)
            .unwrap()
            .is_empty());
        assert_eq!(
            search(&conn, "alpha", Some("article"), 10).unwrap().len(),
            1
        );
        set_enabled(&conn, &source, false).unwrap();
        assert!(search(&conn, "alpha", None, 10).unwrap().is_empty());
    }

    #[test]
    fn another_source_cannot_overwrite_or_delete_a_record() {
        let (mut conn, source) = setup();
        let other = add_source(&conn, "Other", "https://other.example/oai")
            .unwrap()
            .id;
        apply_page(&mut conn, &source, &[record("a", "Alpha", "text")], &[]).unwrap();
        apply_page(
            &mut conn,
            &other,
            &[record("a", "Hijack", "text")],
            &["a".into()],
        )
        .unwrap();
        assert_eq!(search(&conn, "alpha", None, 10).unwrap().len(), 1);
    }

    #[test]
    fn duplicate_url_is_rejected() {
        let (conn, _) = setup();
        assert_eq!(
            add_source(&conn, "Dup", "https://example.org/oai").unwrap_err(),
            "duplicate"
        );
    }
}
