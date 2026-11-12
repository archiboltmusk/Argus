package app.argus.player

import org.json.JSONArray
import org.json.JSONObject

/** Uses the same provider contracts as the desktop client. Failures retain the local journal. */
class NativeAccountSync(private val client: NativeCloudAccount) {
    private val originId = client.clientId()
    private var cachedAddons = emptyMap<String, JSONObject>()
    fun sync(account: JSONObject, store: NativeMediaStore) {
        cachedAddons = store.installed().associate { it.url to it.manifest }
        val sent = store.pending()
        val provider = account.getString("provider")
        when (provider) {
            "Stremio" -> syncStremio(account, sent)
            "Nuvio" -> syncNuvio(account, sent)
            "Argus Supabase" -> syncSupabase(account, sent)
            else -> error("Unsupported account")
        }
        // Pull again after writes; never acknowledge a partial or failed sync.
        val snapshot = when (provider) {
            "Stremio" -> pullStremio(account)
            "Nuvio" -> pullNuvio(account)
            else -> pullSupabase(account)
        }
        store.applyCloud(snapshot, sent)
    }
    private fun snapshot() = JSONObject().put("library", JSONArray()).put("history", JSONArray()).put("addons", JSONArray())
    private fun iso(time: Long = System.currentTimeMillis()): String = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.ROOT)
        .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }.format(java.util.Date(time))
    private fun ops(pending: JSONObject) = pending.keys().asSequence().map { pending.getJSONObject(it) }.toList()
    private fun rpc(account: JSONObject, path: String, body: JSONObject): Any = client.authorized(account, "/rest/v1/rpc/$path", "POST", body)
    private fun slot(account: JSONObject) = JSONObject().put("p_profile_id", account.getInt("profile"))
    private fun meta(row: JSONObject, nuvio: Boolean): JSONObject = JSONObject()
        .put("id", row.getString(if (nuvio) "content_id" else "_id"))
        .put("type", row.optString(if (nuvio) "content_type" else "type", "movie"))
        .put("name", row.optString("name", row.optString("title", "Untitled")))
        .put("poster", row.optString("poster"))
        .put("background", row.optString("background"))
        .put("releaseInfo", row.optString("release_info"))
        .put("_addon", row.optString("addon_base_url"))
    private fun addon(url: String, manifest: JSONObject? = null): JSONObject {
        val normalized = runCatching { NativeMediaStore.manifestUrl(url) }.getOrElse { url }
        val data = runCatching {
            val value = manifest ?: cachedAddons[normalized]?.takeUnless { it.optBoolean("_unavailable") }
                ?: NativeMediaStore.fetch(NativeMediaStore.manifestUrl(url))
            require(value.optJSONArray("resources") != null && value.optString("id").isNotBlank())
            value
        }.getOrElse {
            JSONObject(cachedAddons[normalized]?.toString() ?: JSONObject()
                .put("id", "argus.unavailable").put("name", "Unavailable add-on").put("version", "0.0.0")
                .put("resources", JSONArray()).put("catalogs", JSONArray()).toString()).put("_unavailable", true)
        }
        return JSONObject().put("url", normalized).put("manifest", data)
    }
    private fun stremio(account: JSONObject, path: String, body: JSONObject = JSONObject()): Any =
        client.stremio(path, body.put("authKey", account.getJSONObject("session").getString("authKey")))
    private fun stremioRows(account: JSONObject): List<JSONObject> {
        val ids = stremio(account, "datastoreMeta", JSONObject().put("collection", "libraryItem")) as JSONArray
        val all = mutableListOf<JSONObject>()
        (0 until ids.length()).map { ids.getJSONArray(it).getString(0) }.chunked(100).forEach { batch ->
            all += (stremio(account, "datastoreGet", JSONObject().put("collection", "libraryItem").put("ids", JSONArray(batch)).put("all", true)) as JSONArray).objects()
        }
        return all
    }
    private fun stremioAddons(account: JSONObject) = (stremio(account, "addonCollectionGet", JSONObject().put("type", "user").put("update", false)) as JSONObject).getJSONArray("addons").objects()
    private fun pullStremio(account: JSONObject): JSONObject = snapshot().apply {
        for (row in stremioRows(account)) {
            val title = meta(row, false)
            if (!row.optBoolean("removed") && !row.optBoolean("temp")) getJSONArray("library").put(title)
            val state = row.optJSONObject("state") ?: continue
            if (!row.optBoolean("removed") && state.optDouble("timeOffset") > 0) getJSONArray("history").put(JSONObject()
                .put("meta", title).put("videoId", state.optString("video_id", title.getString("id")))
                .put("position", state.optDouble("timeOffset") / 1000).put("duration", state.optDouble("duration") / 1000))
        }
        for (row in stremioAddons(account)) getJSONArray("addons").put(addon(row.getString("transportUrl"), row.optJSONObject("manifest")))
    }
    private fun syncStremio(account: JSONObject, pending: JSONObject) {
        val changes = ops(pending)
        if (changes.isEmpty()) return
        val remote = stremioRows(account).associateBy { it.getString("_id") }.toMutableMap()
        val edited = linkedSetOf<String>()
        for (op in changes.filter { it.getString("kind") != "addon" }) {
            val value = op.getJSONObject("value")
            val title = if (op.getString("kind") == "history") value.getJSONObject("meta") else value
            val id = title.getString("id")
            val row = remote.getOrPut(id) { JSONObject().put("_id", id).put("type", title.getString("type")).put("name", title.optString("name"))
                .put("poster", title.optString("poster")).put("removed", false).put("temp", true).put("_ctime", iso()) }
            if (op.getString("kind") == "library") {
                row.put("removed", op.optBoolean("removed")).put("temp", false)
            } else {
                val state = row.optJSONObject("state") ?: JSONObject()
                state.put("video_id", value.getString("videoId")).put("timeOffset", if (op.optBoolean("removed")) 0 else value.optDouble("position") * 1000)
                    .put("duration", value.optDouble("duration") * 1000).put("lastWatched", iso(value.optLong("updatedAt", op.optLong("at", System.currentTimeMillis()))))
                if (op.optBoolean("removed")) state.put("flaggedWatched", 1)
                row.put("state", state)
            }
            row.put("_mtime", iso(op.optLong("at", System.currentTimeMillis()))); edited.add(id)
        }
        edited.chunked(50).forEach { ids -> stremio(account, "datastorePut", JSONObject().put("collection", "libraryItem").put("changes", JSONArray(ids.map { remote.getValue(it) }))) }
        val addonOps = changes.filter { it.getString("kind") == "addon" }
        if (addonOps.isNotEmpty()) {
            val addons = stremioAddons(account).associateBy { it.getString("transportUrl") }.toMutableMap()
            for (op in addonOps) {
                val url = op.getString("id")
                if (op.optBoolean("removed")) addons.remove(url) else addons[url] = JSONObject().put("transportUrl", url)
                    .put("transportName", "http").put("manifest", op.getJSONObject("value").getJSONObject("manifest")).put("flags", JSONObject())
            }
            val result = stremio(account, "addonCollectionSet", JSONObject().put("type", "user").put("addons", JSONArray(addons.values.toList()))) as JSONObject
            check(result.optBoolean("success")) { "Stremio add-on sync was rejected." }
        }
    }
    private fun nuvioLibrary(account: JSONObject): List<JSONObject> {
        val rows = mutableListOf<JSONObject>()
        for (page in 0 until 100) {
            val batch = (rpc(account, "sync_pull_library", slot(account).put("p_limit", 100).put("p_offset", page * 100)) as JSONArray).objects()
            rows += batch
            if (batch.size < 100) return rows
        }
        error("Library is too large for this sync. Local changes are preserved.")
    }
    private fun nuvioAddons(account: JSONObject): List<JSONObject> = (client.authorized(account,
        "/rest/v1/addons?profile_id=eq.${if (account.optBoolean("primaryAddons")) 1 else account.getInt("profile")}&order=sort_order.asc") as JSONArray).objects()
    private fun pullNuvio(account: JSONObject): JSONObject = snapshot().apply {
        nuvioLibrary(account).forEach { getJSONArray("library").put(meta(it, true)) }
        val history = (rpc(account, "sync_pull_watch_progress", slot(account).put("p_limit", 100)) as JSONArray).objects()
        history.forEach { row ->
            val position = if (row.has("position")) row.optDouble("position") / 1000 else row.optDouble("progress_seconds")
            val duration = if (row.has("duration")) row.optDouble("duration") / 1000 else row.optDouble("duration_seconds")
            if (position > 0 && !(duration > 0 && position / duration >= 0.95)) getJSONArray("history").put(JSONObject().put("meta", meta(row, true))
                .put("videoId", row.optString("video_id").takeIf { it.isNotBlank() } ?: row.getString("content_id"))
                .put("position", position).put("duration", duration))
        }
        nuvioAddons(account).filter { it.optBoolean("enabled", true) }.forEach { getJSONArray("addons").put(addon(it.getString("url"))) }
    }
    private fun syncNuvio(account: JSONObject, pending: JSONObject) {
        val changes = ops(pending)
        for (op in changes) {
            val value = op.getJSONObject("value")
            when (op.getString("kind")) {
                "library" -> {
                    val item = JSONObject().put("content_id", value.getString("id")).put("content_type", value.getString("type"))
                    if (op.optBoolean("removed")) rpc(account, "sync_delete_library_items", slot(account).put("p_keys", JSONArray().put(item)).put("p_origin_client_id", originId))
                    else rpc(account, "sync_push_library_items", slot(account).put("p_items", JSONArray().put(item.put("name", value.optString("name"))
                        .put("poster", value.optString("poster")).put("addon_base_url", value.optString("_addon")).put("added_at", op.optLong("at", System.currentTimeMillis()))))
                        .put("p_origin_client_id", originId))
                }
                "history" -> {
                    val title = value.getJSONObject("meta")
                    val video = value.getString("videoId")
                    val parts = video.removePrefix(title.getString("id") + ":").split(":")
                    val season = if (parts.size == 2) parts[0].toIntOrNull() else null
                    val episode = if (parts.size == 2) parts[1].toIntOrNull() else null
                    val entry = JSONObject().put("content_id", title.getString("id")).put("content_type", title.getString("type"))
                        .put("video_id", video).put("season", season ?: JSONObject.NULL).put("episode", episode ?: JSONObject.NULL)
                        .put("progress_key", if (season != null && episode != null) "${title.getString("id")}_s${season}e$episode" else title.getString("id"))
                        .put("position", value.optDouble("position") * 1000).put("duration", value.optDouble("duration") * 1000).put("last_watched", value.optLong("updatedAt", op.optLong("at", System.currentTimeMillis())))
                    if (op.optBoolean("removed")) rpc(account, "sync_delete_watch_progress", slot(account).put("p_keys", JSONArray()
                        .put(entry.getString("progress_key")).put(video))
                        .put("p_origin_client_id", originId))
                    else rpc(account, "sync_push_watch_progress", slot(account).put("p_entries", JSONArray().put(entry)).put("p_origin_client_id", originId))
                }
            }
        }
        val addonOps = changes.filter { it.getString("kind") == "addon" }
        if (addonOps.isNotEmpty()) {
            val target = JSONObject(account.toString()).put("profile", if (account.optBoolean("primaryAddons")) 1 else account.getInt("profile"))
            val rows = nuvioAddons(account).associateBy { it.getString("url") }.toMutableMap()
            for (op in addonOps) if (op.optBoolean("removed")) rows.remove(op.getString("id")) else rows[op.getString("id")] = JSONObject()
                .put("url", op.getString("id")).put("name", op.getJSONObject("value").getJSONObject("manifest").optString("name")).put("enabled", true).put("sort_order", rows.size)
            rpc(target, "sync_push_addons", slot(target).put("p_addons", JSONArray(rows.values.toList())).put("p_origin_client_id", originId))
        }
    }
    private fun syncSupabase(account: JSONObject, pending: JSONObject) {
        ops(pending).chunked(50).forEach { batch ->
            val rows = batch.map { op ->
                val digest = java.security.MessageDigest.getInstance("SHA-256").digest(op.getString("id").toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
                JSONObject().put("user_id", account.getString("id")).put("key", op.getString("kind") + ":" + digest)
                .put("kind", op.getString("kind")).put("value", if (op.getString("kind") == "addon") JSONObject().put("url", op.getString("id")) else op.getJSONObject("value"))
                .put("deleted", op.optBoolean("removed")) }
            client.authorized(account, "/rest/v1/argus_media_sync?on_conflict=user_id,key", "POST", JSONArray(rows), mapOf("Prefer" to "resolution=merge-duplicates,return=minimal"))
        }
    }
    private fun pullSupabase(account: JSONObject): JSONObject = snapshot().apply {
        for (page in 0 until 100) {
            val rows = (client.authorized(account, "/rest/v1/argus_media_sync?user_id=eq.${NativeMediaStore.segment(account.getString("id"))}&select=kind,value,deleted&order=key&limit=100&offset=${page * 100}") as JSONArray).objects()
            rows.filterNot { it.optBoolean("deleted") }.forEach { row ->
                val kind = row.getString("kind")
                require(kind in listOf("library", "history", "addon"))
                val value = row.getJSONObject("value")
                getJSONArray(if (kind == "addon") "addons" else kind).put(if (kind == "addon") addon(value.getString("url")) else value)
            }
            if (rows.size < 100) return@apply
        }
        error("Cloud data is too large. Local changes are preserved.")
    }
}
