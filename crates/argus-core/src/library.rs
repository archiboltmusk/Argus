//! Local persistence: profiles, installed addons, watch progress, settings.
//! One SQLite file in WAL mode; schema versioned with `PRAGMA user_version`.

use std::path::Path;
use std::sync::Mutex;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::sources::addon::{Addon, Manifest};
use crate::{Error, Result};

const MIGRATIONS: &[&str] = &[
    // v1
    r#"
    CREATE TABLE profiles (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE addons (
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        base_url TEXT NOT NULL,
        position INTEGER NOT NULL,
        manifest TEXT NOT NULL,
        PRIMARY KEY (profile_id, base_url)
    );
    CREATE TABLE progress (
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        video_id TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        poster TEXT,
        position_s REAL NOT NULL,
        duration_s REAL NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (profile_id, item_id)
    );
    CREATE INDEX progress_recent ON progress(profile_id, updated_at DESC);
    CREATE TABLE settings (
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (profile_id, key)
    );
    INSERT INTO profiles (name) VALUES ('Default');
    "#,
    // v2: profile PIN + kids mode, saved library, app-wide feature toggles
    r#"
    ALTER TABLE profiles ADD COLUMN pin_hash TEXT;
    ALTER TABLE profiles ADD COLUMN kids INTEGER NOT NULL DEFAULT 0;
    CREATE TABLE library_items (
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        poster TEXT,
        added_at INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (profile_id, item_id)
    );
    CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    "#,
    // v3: per-episode watched marks (progress keeps only the latest episode)
    r#"
    CREATE TABLE watched (
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        watched_at INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (profile_id, video_id)
    );
    CREATE INDEX watched_item ON watched(profile_id, item_id);
    "#,
];

/// Spec feature 9: "up to 8 profiles".
pub const MAX_PROFILES: usize = 8;

/// Items past this fraction count as watched and leave Continue Watching.
pub const WATCHED_THRESHOLD: f64 = 0.92;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Profile {
    pub id: i64,
    pub name: String,
    #[serde(default)]
    pub has_pin: bool,
    #[serde(default)]
    pub kids: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LibraryItem {
    pub item_id: String,
    pub kind: String,
    pub name: String,
    pub poster: Option<String>,
    pub added_at: i64,
}

/// PINs are a parental gate, not account security: 4 digits can't resist
/// brute force whatever the hash. Hashing just keeps them out of plain view.
fn hash_pin(profile_id: i64, pin: &str) -> String {
    use sha2::{Digest, Sha256};
    let digest = Sha256::digest(format!("argus-pin:{profile_id}:{pin}").as_bytes());
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

fn valid_pin(pin: &str) -> bool {
    pin.len() == 4 && pin.bytes().all(|b| b.is_ascii_digit())
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Progress {
    pub item_id: String,
    pub video_id: String,
    pub kind: String,
    pub name: String,
    pub poster: Option<String>,
    pub position_s: f64,
    pub duration_s: f64,
    pub updated_at: i64,
}

impl Progress {
    pub fn fraction(&self) -> f64 {
        if self.duration_s <= 0.0 {
            0.0
        } else {
            (self.position_s / self.duration_s).clamp(0.0, 1.0)
        }
    }
}

pub struct Library {
    conn: Mutex<Connection>,
}

impl Library {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        Self::init(Connection::open(path)?)
    }

    pub fn in_memory() -> Result<Self> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(conn: Connection) -> Result<Self> {
        conn.execute_batch(
            "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=NORMAL;",
        )?;
        let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
        for (i, sql) in MIGRATIONS.iter().enumerate().skip(version as usize) {
            conn.execute_batch(&format!(
                "BEGIN; {sql}; PRAGMA user_version = {}; COMMIT;",
                i + 1
            ))?;
        }
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn db(&self) -> std::sync::MutexGuard<'_, Connection> {
        // A panic while holding the lock leaves SQLite consistent; keep going.
        self.conn.lock().unwrap_or_else(|e| e.into_inner())
    }

    pub fn profiles(&self) -> Result<Vec<Profile>> {
        let db = self.db();
        let mut stmt = db.prepare_cached(
            "SELECT id, name, pin_hash IS NOT NULL, kids FROM profiles ORDER BY id",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(Profile {
                id: r.get(0)?,
                name: r.get(1)?,
                has_pin: r.get(2)?,
                kids: r.get(3)?,
            })
        })?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    pub fn create_profile(&self, name: &str, kids: bool) -> Result<Profile> {
        let name = name.trim();
        if name.is_empty() || name.chars().count() > 32 {
            return Err(Error::Invalid(
                "Profile name must be 1-32 characters".into(),
            ));
        }
        if self.profiles()?.len() >= MAX_PROFILES {
            return Err(Error::Invalid(format!("At most {MAX_PROFILES} profiles")));
        }
        let db = self.db();
        db.execute(
            "INSERT INTO profiles (name, kids) VALUES (?1, ?2)",
            params![name, kids],
        )?;
        Ok(Profile {
            id: db.last_insert_rowid(),
            name: name.to_string(),
            has_pin: false,
            kids,
        })
    }

    pub fn rename_profile(&self, id: i64, name: &str) -> Result<()> {
        self.db().execute(
            "UPDATE profiles SET name = ?1 WHERE id = ?2",
            params![name.trim(), id],
        )?;
        Ok(())
    }

    /// `None` removes the PIN.
    pub fn set_pin(&self, id: i64, pin: Option<&str>) -> Result<()> {
        let hash = match pin {
            Some(p) if !valid_pin(p) => return Err(Error::Invalid("PIN must be 4 digits".into())),
            Some(p) => Some(hash_pin(id, p)),
            None => None,
        };
        self.db().execute(
            "UPDATE profiles SET pin_hash = ?1 WHERE id = ?2",
            params![hash, id],
        )?;
        Ok(())
    }

    /// True when the profile has no PIN or the PIN matches.
    pub fn check_pin(&self, id: i64, pin: &str) -> Result<bool> {
        let stored: Option<String> = self
            .db()
            .query_row("SELECT pin_hash FROM profiles WHERE id = ?1", [id], |r| {
                r.get(0)
            })
            .optional()?
            .flatten();
        Ok(stored.is_none_or(|h| h == hash_pin(id, pin)))
    }

    /// The last profile can't be deleted; the app always needs one.
    pub fn delete_profile(&self, id: i64) -> Result<()> {
        if self.profiles()?.len() <= 1 {
            return Err(Error::Invalid("Can't delete the only profile".into()));
        }
        self.db()
            .execute("DELETE FROM profiles WHERE id = ?1", [id])?;
        Ok(())
    }

    /// Adds or refreshes an addon; new addons go to the end of the priority list.
    pub fn save_addon(&self, profile: i64, addon: &Addon) -> Result<()> {
        let manifest = serde_json::to_string(&addon.manifest)?;
        self.db().execute(
            "INSERT INTO addons (profile_id, base_url, position, manifest)
             VALUES (?1, ?2, (SELECT COALESCE(MAX(position) + 1, 0) FROM addons WHERE profile_id = ?1), ?3)
             ON CONFLICT (profile_id, base_url) DO UPDATE SET manifest = excluded.manifest",
            params![profile, addon.base_url, manifest],
        )?;
        Ok(())
    }

    pub fn remove_addon(&self, profile: i64, base_url: &str) -> Result<()> {
        self.db().execute(
            "DELETE FROM addons WHERE profile_id = ?1 AND base_url = ?2",
            params![profile, base_url],
        )?;
        Ok(())
    }

    /// Rewrites priority order to match `base_urls`.
    pub fn reorder_addons(&self, profile: i64, base_urls: &[String]) -> Result<()> {
        let mut db = self.db();
        let tx = db.transaction()?;
        for (i, url) in base_urls.iter().enumerate() {
            tx.execute(
                "UPDATE addons SET position = ?1 WHERE profile_id = ?2 AND base_url = ?3",
                params![i as i64, profile, url],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn addons(&self, profile: i64) -> Result<Vec<Addon>> {
        let db = self.db();
        let mut stmt = db.prepare_cached(
            "SELECT base_url, manifest FROM addons WHERE profile_id = ?1 ORDER BY position",
        )?;
        let rows = stmt.query_map([profile], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        })?;
        let mut out = Vec::new();
        for row in rows {
            let (base_url, manifest) = row?;
            let manifest: Manifest = serde_json::from_str(&manifest)?;
            out.push(Addon { base_url, manifest });
        }
        Ok(out)
    }

    pub fn save_progress(&self, profile: i64, p: &Progress) -> Result<()> {
        self.db().execute(
            "INSERT INTO progress (profile_id, item_id, video_id, kind, name, poster, position_s, duration_s, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, unixepoch())
             ON CONFLICT (profile_id, item_id) DO UPDATE SET
               video_id = excluded.video_id, position_s = excluded.position_s,
               duration_s = excluded.duration_s, poster = COALESCE(excluded.poster, poster),
               updated_at = excluded.updated_at",
            params![profile, p.item_id, p.video_id, p.kind, p.name, p.poster, p.position_s, p.duration_s],
        )?;
        // Finishing an episode marks it watched, so season lists stay accurate
        // even after the next episode replaces it in `progress`.
        if p.duration_s > 0.0 && p.position_s >= p.duration_s * WATCHED_THRESHOLD {
            self.set_watched(profile, &p.item_id, &p.video_id, true)?;
        }
        Ok(())
    }

    /// Manual or automatic watched mark for one episode or movie.
    pub fn set_watched(
        &self,
        profile: i64,
        item_id: &str,
        video_id: &str,
        watched: bool,
    ) -> Result<()> {
        let db = self.db();
        if watched {
            db.execute(
                "INSERT OR IGNORE INTO watched (profile_id, item_id, video_id) VALUES (?1, ?2, ?3)",
                params![profile, item_id, video_id],
            )?;
        } else {
            db.execute(
                "DELETE FROM watched WHERE profile_id = ?1 AND video_id = ?2",
                params![profile, video_id],
            )?;
            // An unwatched mark must also drop it from Continue Watching.
            db.execute(
                "DELETE FROM progress WHERE profile_id = ?1 AND item_id = ?2 AND video_id = ?3",
                params![profile, item_id, video_id],
            )?;
        }
        Ok(())
    }

    /// Video ids of this title the profile has finished.
    pub fn watched_videos(&self, profile: i64, item_id: &str) -> Result<Vec<String>> {
        let db = self.db();
        let mut stmt = db.prepare_cached(
            "SELECT video_id FROM watched WHERE profile_id = ?1 AND item_id = ?2",
        )?;
        let rows = stmt.query_map(params![profile, item_id], |r| r.get(0))?;
        Ok(rows.collect::<std::result::Result<_, _>>()?)
    }

    pub fn progress(&self, profile: i64, item_id: &str) -> Result<Option<Progress>> {
        let db = self.db();
        let mut stmt = db.prepare_cached(&format!(
            "{PROGRESS_SELECT} WHERE profile_id = ?1 AND item_id = ?2"
        ))?;
        Ok(stmt
            .query_row(params![profile, item_id], row_to_progress)
            .optional()?)
    }

    /// Recently watched items that are started but not finished.
    pub fn continue_watching(&self, profile: i64, limit: u32) -> Result<Vec<Progress>> {
        let db = self.db();
        let mut stmt = db.prepare_cached(&format!(
            "{PROGRESS_SELECT} WHERE profile_id = ?1 AND position_s > 30 AND position_s < duration_s * ?2
             ORDER BY updated_at DESC LIMIT ?3"
        ))?;
        let rows = stmt.query_map(params![profile, WATCHED_THRESHOLD, limit], row_to_progress)?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    pub fn set_setting(&self, profile: i64, key: &str, value: &str) -> Result<()> {
        self.db().execute(
            "INSERT INTO settings (profile_id, key, value) VALUES (?1, ?2, ?3)
             ON CONFLICT (profile_id, key) DO UPDATE SET value = excluded.value",
            params![profile, key, value],
        )?;
        Ok(())
    }

    pub fn setting(&self, profile: i64, key: &str) -> Result<Option<String>> {
        Ok(self
            .db()
            .query_row(
                "SELECT value FROM settings WHERE profile_id = ?1 AND key = ?2",
                params![profile, key],
                |r| r.get(0),
            )
            .optional()?)
    }
}

impl Library {
    pub fn add_to_library(&self, profile: i64, item: &LibraryItem) -> Result<()> {
        self.db().execute(
            "INSERT INTO library_items (profile_id, item_id, kind, name, poster) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT (profile_id, item_id) DO UPDATE SET name = excluded.name, poster = excluded.poster",
            params![profile, item.item_id, item.kind, item.name, item.poster],
        )?;
        Ok(())
    }

    pub fn remove_from_library(&self, profile: i64, item_id: &str) -> Result<()> {
        self.db().execute(
            "DELETE FROM library_items WHERE profile_id = ?1 AND item_id = ?2",
            params![profile, item_id],
        )?;
        Ok(())
    }

    pub fn library(&self, profile: i64) -> Result<Vec<LibraryItem>> {
        let db = self.db();
        let mut stmt = db.prepare_cached(
            "SELECT item_id, kind, name, poster, added_at FROM library_items
             WHERE profile_id = ?1 ORDER BY added_at DESC",
        )?;
        let rows = stmt.query_map([profile], |r| {
            Ok(LibraryItem {
                item_id: r.get(0)?,
                kind: r.get(1)?,
                name: r.get(2)?,
                poster: r.get(3)?,
                added_at: r.get(4)?,
            })
        })?;
        Ok(rows.collect::<Result<_, _>>()?)
    }

    /// App-wide settings (feature toggles, window state), not per profile.
    pub fn app_setting(&self, key: &str) -> Result<Option<String>> {
        Ok(self
            .db()
            .query_row(
                "SELECT value FROM app_settings WHERE key = ?1",
                [key],
                |r| r.get(0),
            )
            .optional()?)
    }

    pub fn set_app_setting(&self, key: &str, value: &str) -> Result<()> {
        self.db().execute(
            "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
             ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }
}

const PROGRESS_SELECT: &str =
    "SELECT item_id, video_id, kind, name, poster, position_s, duration_s, updated_at FROM progress";

fn row_to_progress(r: &rusqlite::Row<'_>) -> rusqlite::Result<Progress> {
    Ok(Progress {
        item_id: r.get(0)?,
        video_id: r.get(1)?,
        kind: r.get(2)?,
        name: r.get(3)?,
        poster: r.get(4)?,
        position_s: r.get(5)?,
        duration_s: r.get(6)?,
        updated_at: r.get(7)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn addon(url: &str) -> Addon {
        let manifest: Manifest =
            serde_json::from_value(serde_json::json!({"id": url, "name": url})).unwrap();
        Addon {
            base_url: url.into(),
            manifest,
        }
    }

    fn prog(id: &str, pos: f64) -> Progress {
        Progress {
            item_id: id.into(),
            video_id: String::new(),
            kind: "movie".into(),
            name: id.into(),
            poster: None,
            position_s: pos,
            duration_s: 1000.0,
            updated_at: 0,
        }
    }

    #[test]
    fn finished_episodes_stay_watched_after_the_next_one_starts() {
        let lib = Library::in_memory().unwrap();
        let p = lib.profiles().unwrap()[0].id;
        let prog = |video: &str, pos: f64| Progress {
            item_id: "tt1".into(),
            video_id: video.into(),
            kind: "series".into(),
            name: "Show".into(),
            poster: None,
            position_s: pos,
            duration_s: 100.0,
            updated_at: 0,
        };
        lib.save_progress(p, &prog("tt1:1:1", 95.0)).unwrap();
        lib.save_progress(p, &prog("tt1:1:2", 40.0)).unwrap();
        assert_eq!(lib.watched_videos(p, "tt1").unwrap(), vec!["tt1:1:1"]);
        lib.set_watched(p, "tt1", "tt1:1:2", true).unwrap();
        lib.set_watched(p, "tt1", "tt1:1:1", false).unwrap();
        assert_eq!(lib.watched_videos(p, "tt1").unwrap(), vec!["tt1:1:2"]);
    }

    #[test]
    fn default_profile_and_addon_order() {
        let lib = Library::in_memory().unwrap();
        let p = lib.profiles().unwrap()[0].id;
        lib.save_addon(p, &addon("a")).unwrap();
        lib.save_addon(p, &addon("b")).unwrap();
        lib.save_addon(p, &addon("a")).unwrap(); // refresh keeps position
        let urls = |l: &Library| {
            l.addons(p)
                .unwrap()
                .into_iter()
                .map(|a| a.base_url)
                .collect::<Vec<_>>()
        };
        assert_eq!(urls(&lib), ["a", "b"]);
        lib.reorder_addons(p, &["b".into(), "a".into()]).unwrap();
        assert_eq!(urls(&lib), ["b", "a"]);
    }

    #[test]
    fn continue_watching_filters_unstarted_and_finished() {
        let lib = Library::in_memory().unwrap();
        let p = lib.profiles().unwrap()[0].id;
        lib.save_progress(p, &prog("started", 400.0)).unwrap();
        lib.save_progress(p, &prog("barely", 10.0)).unwrap();
        lib.save_progress(p, &prog("done", 990.0)).unwrap();
        let ids: Vec<_> = lib
            .continue_watching(p, 10)
            .unwrap()
            .into_iter()
            .map(|x| x.item_id)
            .collect();
        assert_eq!(ids, ["started"]);
    }

    #[test]
    fn profile_limits_and_pins() {
        let lib = Library::in_memory().unwrap();
        let first = lib.profiles().unwrap()[0].id;
        assert!(lib.delete_profile(first).is_err(), "last profile stays");
        for i in 1..MAX_PROFILES {
            lib.create_profile(&format!("P{i}"), false).unwrap();
        }
        assert!(lib.create_profile("one too many", false).is_err());

        assert!(lib.set_pin(first, Some("12a4")).is_err());
        lib.set_pin(first, Some("1234")).unwrap();
        assert!(lib.profiles().unwrap()[0].has_pin);
        assert!(lib.check_pin(first, "1234").unwrap());
        assert!(!lib.check_pin(first, "0000").unwrap());
        lib.set_pin(first, None).unwrap();
        assert!(lib.check_pin(first, "anything").unwrap());
    }

    #[test]
    fn library_and_app_settings() {
        let lib = Library::in_memory().unwrap();
        let p = lib.profiles().unwrap()[0].id;
        let item = LibraryItem {
            item_id: "tt1".into(),
            kind: "series".into(),
            name: "Show".into(),
            poster: None,
            added_at: 0,
        };
        lib.add_to_library(p, &item).unwrap();
        lib.add_to_library(p, &item).unwrap();
        assert_eq!(lib.library(p).unwrap().len(), 1);
        lib.remove_from_library(p, "tt1").unwrap();
        assert!(lib.library(p).unwrap().is_empty());
        lib.set_app_setting("feature.watch_party", "off").unwrap();
        assert_eq!(
            lib.app_setting("feature.watch_party").unwrap().as_deref(),
            Some("off")
        );
    }

    #[test]
    fn profiles_are_isolated_and_migrations_rerun_safely() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("argus.db");
        {
            let lib = Library::open(&path).unwrap();
            let kid = lib.create_profile("Kids", true).unwrap();
            lib.set_setting(kid.id, "subs.lang", "en").unwrap();
        }
        let lib = Library::open(&path).unwrap();
        let profiles = lib.profiles().unwrap();
        assert_eq!(profiles.len(), 2);
        assert_eq!(
            lib.setting(profiles[1].id, "subs.lang").unwrap().as_deref(),
            Some("en")
        );
        assert_eq!(lib.setting(profiles[0].id, "subs.lang").unwrap(), None);
    }
}
