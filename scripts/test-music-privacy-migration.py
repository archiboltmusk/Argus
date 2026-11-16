"""Exercise the exact Rust migration SQL using SQLite, without native dependencies."""
import re
import sqlite3
from pathlib import Path

source = (Path(__file__).resolve().parent.parent / "src-tauri/src/music/migrations.rs").read_text()
def sql(name):
    raw = re.search(r'const ' + name + r': &str = r#"(.*?)"#;', source, re.S)
    if raw:
        return raw.group(1)
    plain = re.search(r'const ' + name + r': &str = "((?:[^"\\]|\\.)*)";', source, re.S)
    assert plain, name
    return bytes(plain.group(1), "utf8").decode("unicode_escape")

connection = sqlite3.connect(":memory:")
connection.execute("PRAGMA foreign_keys = ON")
for name in ["CREATE_SCHEMA", "CREATE_CATALOG", "STREAM_METADATA", "MEDIA_KIND", "TRACK_LABELS", "PLAYLIST_DATES"]:
    connection.executescript(sql(name))
old = "direct:https://fixture.invalid/audio?token=fixture-secret"
connection.execute("INSERT INTO music_tracks(id,connector,source_id,title,artist,resolved_url) VALUES (?,?,?,?,?,?)", (old,"direct",old,"Fixture","Fixture",old.removeprefix("direct:")))
connection.execute("INSERT INTO playlists VALUES ('p','Queue','1','1')")
connection.execute("INSERT INTO music_queue VALUES (0,?)", (old,))
connection.execute("INSERT INTO music_liked VALUES (?, '1')", (old,))
connection.execute("INSERT INTO music_recents VALUES (?, '1')", (old,))
connection.execute("INSERT INTO playlist_tracks VALUES ('p',0,?)", (old,))
connection.execute("INSERT INTO playlist_track_dates VALUES ('p',?,'1')", (old,))
connection.commit()
connection.executescript("BEGIN;\n" + sql("DIRECT_PRIVACY") + "\nCOMMIT;")
new, origin, endpoint = connection.execute("SELECT id,source_id,resolved_url FROM music_tracks").fetchone()
assert new.startswith("direct:") and "?" not in new
assert origin == new and endpoint is None
for table in ["music_queue", "music_liked", "music_recents", "playlist_tracks", "playlist_track_dates"]:
    assert connection.execute(f"SELECT track_id FROM {table}").fetchone()[0] == new, table
assert connection.execute("PRAGMA foreign_key_check").fetchall() == []
assert "fixture-secret" not in "\n".join(connection.iterdump())
connection.executescript("BEGIN;\n" + sql("DIRECT_PRIVACY") + "\nCOMMIT;")
assert connection.execute("SELECT id FROM music_tracks").fetchone()[0] == new
print("Privacy migration passed: references preserved, secrets removed, repeat run safe.")
