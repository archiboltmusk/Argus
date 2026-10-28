# Argus Developer & Automation Specification

This specification provides developer-facing documentation for integrating **Argus** with external automation systems, including **Apple Shortcuts**, **Siri**, **Home Assistant**, **Android Tasker / Scriptable**, and custom local network scripts (curl, Python, Node.js).

---

## 1. Deep-Link Specification

Argus registers and accepts URL invocations under `argus://`, `nuvio://`, and `stremio://`, as well as universal web links under `https://argus.app/`.

### 1.1 URI Schemas

| Action | Format | Example |
| :--- | :--- | :--- |
| **Open Movie Detail** | `argus://movie/{id}` | `argus://movie/tt1375666` |
| **Open Series Episode** | `argus://series/{id}/{season}/{episode}` | `argus://series/tt0944947/1/1` |
| **Open Generic Detail** | `argus://detail/{type}/{id}` | `argus://detail/movie/tt1375666` |
| **Direct Autoplay Movie** | `argus://play/{id}` or `?autoplay=1` | `argus://movie/tt1375666?autoplay=1` |
| **Direct Autoplay Episode** | `argus://series/{id}/{s}/{e}?autoplay=1` | `argus://series/tt0944947/1/1?autoplay=1` |
| **Nuvio Compatibility** | `nuvio://movie/{id}` | `nuvio://movie/tt1375666` |
| **Universal Web Link** | `https://argus.app/movie/{id}` | `https://argus.app/movie/tt1375666` |

### 1.2 Identifier Formats
* **IMDb ID**: Standard alphanumeric identifier (e.g. `tt1375666`, `tt0944947`).
* **TMDB ID**: Prefix format `tmdb:{id}` (e.g. `tmdb:27205` or `tmdb:1399`).
* **Cinemeta ID**: Stremio / Cinemeta compound identifiers.

### 1.3 Query Parameters
* `autoplay=1` or `autoplay=true` or `action=play`: Bypasses detail inspection and immediately resolves the optimal stream using the user's stream priority and playback preferences.
* `resume=1` or `resume=0`: Controls whether to resume from the last saved watch timestamp.

---

## 2. Android Intents & ADB Integration

On Android devices, Android TV, Google TV, and Android Smart Projectors (XGIMI, Nebula, Dangbei, Formovie), Argus exports standard `android.intent.action.VIEW` filters.

### Launch and Play via ADB:
```bash
# 1. Open and immediately play a movie (Inception)
adb shell am start -a android.intent.action.VIEW -d "argus://movie/tt1375666?autoplay=1"

# 2. Open a TV series episode (Game of Thrones S01E01)
adb shell am start -a android.intent.action.VIEW -d "argus://series/tt0944947/1/1?autoplay=1"

# 3. Open a movie detail page
adb shell am start -a android.intent.action.VIEW -d "argus://movie/tt1375666"

# 4. Nuvio compatibility invocation
adb shell am start -a android.intent.action.VIEW -d "nuvio://movie/tt1375666?autoplay=1"
```

---

## 3. Local Network REST API (Port 11471)

Argus hosts an embedded, lightweight HTTP control server on local port `11471` (or custom configured port). It allows local home automation systems to command the player without ADB or cloud reliance.

### Authentication
If an API key is configured in Argus Settings, supply it in either header:
```http
X-Argus-Key: your_secret_key
# or
Authorization: Bearer your_secret_key
```

### 3.1 Device & Playback Status
```http
GET http://<tv-ip>:11471/api/v1/status
```
**Response**:
```json
{
  "ok": true,
  "app": "Argus",
  "version": "1.0.0",
  "platform": "android-tv",
  "bigPicture": true,
  "profile": {
    "id": "profile_default",
    "name": "Family",
    "slot": 0
  }
}
```

### 3.2 Remotely Open or Play Content
```http
POST http://<tv-ip>:11471/api/v1/open
Content-Type: application/json

{
  "id": "tt1375666",
  "type": "movie",
  "name": "Inception",
  "autoplay": true
}
```

### 3.3 Add Title Directly to Library (Browser / Shortcut Share Sheet)
```http
POST http://<tv-ip>:11471/api/v1/library
Content-Type: application/json

{
  "id": "tt1375666",
  "type": "movie",
  "name": "Inception",
  "poster": "https://image.tmdb.org/t/p/w500/..."
}
```

### 3.4 Read Library Entries
```http
GET http://<tv-ip>:11471/api/v1/library
```

### 3.5 Remove Title from Library
```http
DELETE http://<tv-ip>:11471/api/v1/library
Content-Type: application/json

{
  "id": "tt1375666",
  "type": "movie"
}
```

---

## 4. Integration Recipes

### 4.1 Apple Shortcuts (Siri: "Play Inception on Argus")
1. In the **Shortcuts** app on iOS/macOS, create a new shortcut titled **Play Inception on TV**.
2. Add action **Get Contents of URL**:
   * **URL**: `http://192.168.1.150:11471/api/v1/open`
   * **Method**: `POST`
   * **Headers**: `Content-Type: application/json`
   * **Request Body (JSON)**:
     ```json
     {
       "id": "tt1375666",
       "type": "movie",
       "autoplay": true
     }
     ```
3. Trigger via Siri: *"Hey Siri, Play Inception on TV."*

### 4.2 Home Assistant Integration (`configuration.yaml`)
```yaml
rest_command:
  argus_play_movie:
    url: "http://192.168.1.150:11471/api/v1/open"
    method: POST
    content_type: "application/json"
    payload: >-
      {"id": "{{ imdb_id }}", "type": "movie", "autoplay": true}

  argus_add_to_library:
    url: "http://192.168.1.150:11471/api/v1/library"
    method: POST
    content_type: "application/json"
    payload: >-
      {"id": "{{ imdb_id }}", "type": "movie"}
```

---

## 5. Library Synchronization API

For cloud-based tools that sync when the TV is powered off, Argus shares the Nuvio profile-isolated cloud synchronization protocol:
* `POST /rest/v1/rpc/sync_pull_library` — Retrieve paginated library snapshot with rich metadata.
* `POST /rest/v1/rpc/sync_pull_library_delta` — Retrieve incremental additions and deletions since event cursor.
* `POST /rest/v1/rpc/sync_push_library_items` — Push idempotent additions/updates.
* `POST /rest/v1/rpc/sync_delete_library_items` — Push deletions with client tombstones to prevent resurrecting deleted titles.
