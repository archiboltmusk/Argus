package app.argus.player

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import org.json.JSONArray
import org.json.JSONObject

/** Android owns transfer retries; the app keeps only its own download IDs. */
class NativeDownloads(private val context: Context, scope: String = "") {
    private val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    private val prefs = context.getSharedPreferences("argus_native_downloads$scope", Context.MODE_PRIVATE)
    @Synchronized fun enqueue(title: String, url: String, headers: Map<String, String>): Long {
        require(url.startsWith("https://")) { "Offline downloads require a direct HTTPS file." }
        val name = title.replace(Regex("[^\\p{L}\\p{N} _.-]"), "_").take(80).ifBlank { "Argus video" }
        val request = DownloadManager.Request(Uri.parse(url)).setTitle(title).setDescription("Argus offline video")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalFilesDir(context, Environment.DIRECTORY_MOVIES, "$name-${System.currentTimeMillis()}.mp4")
            .setAllowedOverMetered(false)
        headers.forEach { (key, value) -> request.addRequestHeader(key, value) }
        val id = manager.enqueue(request)
        val rows = JSONArray(prefs.getString("items", "[]"))
        rows.put(JSONObject().put("id", id).put("title", title))
        check(prefs.edit().putString("items", rows.toString()).commit())
        return id
    }
    fun items(): List<JSONObject> = JSONArray(prefs.getString("items", "[]")).objects().map { row ->
        manager.query(DownloadManager.Query().setFilterById(row.getLong("id"))).use { cursor ->
            if (cursor != null && cursor.moveToFirst()) {
                val state = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                row.put("status", when (state) {
                    DownloadManager.STATUS_SUCCESSFUL -> "Ready offline"
                    DownloadManager.STATUS_FAILED -> "Download failed"
                    DownloadManager.STATUS_PAUSED -> "Waiting for network or storage"
                    else -> "Downloading"
                })
                row.put("ready", state == DownloadManager.STATUS_SUCCESSFUL)
            } else row.put("status", "File unavailable").put("ready", false)
        }
        row
    }
    fun uri(id: Long): Uri = manager.getUriForDownloadedFile(id) ?: error("Download isn't ready yet.")
    @Synchronized fun remove(id: Long) {
        manager.remove(id)
        prefs.edit().putString("items", JSONArray(items().filterNot { it.getLong("id") == id }).toString()).apply()
    }
}
