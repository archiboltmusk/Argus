use super::super::{
    bootstrap, db::MusicDb, library, store, MusicBootstrap, MusicMigration, MusicState,
    MusicStream, MusicTrack,
};
use tauri::Manager;

fn music_db_file(profile: Option<&str>) -> String {
    let id = profile.unwrap_or("").trim();
    if id.is_empty() || id == "default" {
        return "music.db".to_string();
    }
    let safe: String = id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' { c } else { '_' })
        .take(48)
        .collect();
    format!("music-{safe}.db")
}

async fn run_db<T, F>(state: &tauri::State<'_, MusicState>, op: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce(&MusicDb) -> Result<T, String> + Send + 'static,
{
    let db = state.db.clone();
    tauri::async_runtime::spawn_blocking(move || op(&db))
        .await
        .map_err(|error| format!("Music database task failed: {error}"))?
}

#[tauri::command]
pub async fn music_db_init(
    app: tauri::AppHandle,
    state: tauri::State<'_, MusicState>,
    migration: Option<MusicMigration>,
    profile: Option<String>,
) -> Result<MusicBootstrap, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let db_path = directory.join(music_db_file(profile.as_deref()));
    run_db(&state, move |db| {
        db.initialize(&db_path)?;
        if let Some(migration) = migration {
            store::migrate(db, &migration)?;
        }
        bootstrap(db)
    })
    .await
}

#[tauri::command]
pub async fn music_track_upsert(
    state: tauri::State<'_, MusicState>,
    track: MusicTrack,
) -> Result<(), String> {
    run_db(&state, move |db| db.upsert_track(&track)).await
}

#[tauri::command]
pub async fn music_track_get(
    state: tauri::State<'_, MusicState>,
    id: String,
) -> Result<Option<MusicTrack>, String> {
    run_db(&state, move |db| db.get_track(&id)).await
}

#[tauri::command]
pub async fn music_resolve_cached(
    state: tauri::State<'_, MusicState>,
    id: String,
) -> Result<Option<MusicStream>, String> {
    run_db(&state, move |db| db.cached_stream(&id)).await
}

#[tauri::command]
pub async fn music_get_liked(
    state: tauri::State<'_, MusicState>,
) -> Result<Vec<MusicTrack>, String> {
    run_db(&state, store::liked_tracks).await
}

#[tauri::command]
pub async fn music_set_liked(
    state: tauri::State<'_, MusicState>,
    track: MusicTrack,
    liked: bool,
) -> Result<(), String> {
    run_db(&state, move |db| store::set_liked(db, &track, liked)).await
}

#[tauri::command]
pub async fn music_get_recents(
    state: tauri::State<'_, MusicState>,
) -> Result<Vec<MusicTrack>, String> {
    run_db(&state, store::recents).await
}

#[tauri::command]
pub async fn music_add_recent(
    state: tauri::State<'_, MusicState>,
    track: MusicTrack,
) -> Result<(), String> {
    run_db(&state, move |db| store::add_recent(db, &track)).await
}

#[tauri::command]
pub async fn music_get_queue(
    state: tauri::State<'_, MusicState>,
) -> Result<Vec<MusicTrack>, String> {
    run_db(&state, store::queue).await
}

#[tauri::command]
pub async fn music_set_queue(
    state: tauri::State<'_, MusicState>,
    tracks: Vec<MusicTrack>,
) -> Result<(), String> {
    run_db(&state, move |db| store::set_queue(db, &tracks)).await
}

#[tauri::command]
pub async fn music_list_albums(
    state: tauri::State<'_, MusicState>,
) -> Result<Vec<library::MusicAlbum>, String> {
    run_db(&state, library::list_albums).await
}

#[tauri::command]
pub async fn music_list_artists(
    state: tauri::State<'_, MusicState>,
) -> Result<Vec<library::MusicArtist>, String> {
    run_db(&state, library::list_artists).await
}

#[tauri::command]
pub async fn music_list_playlists(
    state: tauri::State<'_, MusicState>,
) -> Result<Vec<library::MusicPlaylist>, String> {
    run_db(&state, library::list_playlists).await
}

#[tauri::command]
pub async fn music_create_playlist(
    state: tauri::State<'_, MusicState>,
    name: String,
) -> Result<library::MusicPlaylist, String> {
    run_db(&state, move |db| library::create_playlist(db, &name)).await
}

#[tauri::command]
pub async fn music_create_playlist_with_tracks(
    state: tauri::State<'_, MusicState>,
    name: String,
    tracks: Vec<MusicTrack>,
) -> Result<library::MusicPlaylist, String> {
    run_db(&state, move |db| {
        library::create_playlist_with_tracks(db, &name, &tracks)
    })
    .await
}

#[tauri::command]
pub async fn music_add_to_playlist(
    state: tauri::State<'_, MusicState>,
    playlist_id: String,
    track: MusicTrack,
) -> Result<library::MusicPlaylist, String> {
    run_db(&state, move |db| {
        library::add_to_playlist(db, &playlist_id, &track)
    })
    .await
}

#[tauri::command]
pub async fn music_add_tracks_to_playlist(
    state: tauri::State<'_, MusicState>,
    playlist_id: String,
    tracks: Vec<MusicTrack>,
) -> Result<library::MusicPlaylist, String> {
    run_db(&state, move |db| {
        library::add_tracks_to_playlist(db, &playlist_id, &tracks)
    })
    .await
}

#[tauri::command]
pub async fn music_rename_playlist(
    state: tauri::State<'_, MusicState>,
    playlist_id: String,
    name: String,
) -> Result<library::MusicPlaylist, String> {
    run_db(&state, move |db| {
        library::rename_playlist(db, &playlist_id, &name)
    })
    .await
}

#[tauri::command]
pub async fn music_delete_playlist(
    state: tauri::State<'_, MusicState>,
    playlist_id: String,
) -> Result<(), String> {
    run_db(&state, move |db| library::delete_playlist(db, &playlist_id)).await
}

#[tauri::command]
pub async fn music_reorder_playlist(
    state: tauri::State<'_, MusicState>,
    playlist_id: String,
    track_id: String,
    to_index: usize,
) -> Result<library::MusicPlaylist, String> {
    run_db(&state, move |db| {
        library::reorder_playlist(db, &playlist_id, &track_id, to_index)
    })
    .await
}

#[tauri::command]
pub async fn music_remove_from_playlist(
    state: tauri::State<'_, MusicState>,
    playlist_id: String,
    track_id: String,
) -> Result<library::MusicPlaylist, String> {
    run_db(&state, move |db| {
        library::remove_from_playlist(db, &playlist_id, &track_id)
    })
    .await
}
