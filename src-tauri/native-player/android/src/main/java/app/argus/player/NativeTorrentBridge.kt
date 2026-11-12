package app.argus.player

import android.content.Context
import androidx.annotation.Keep
import org.json.JSONObject
import java.io.File
import java.util.concurrent.Executors

/** Calls the shipped Rust engine on a worker, never on Android's UI thread. */
@Keep
object NativeTorrentBridge {
    private val worker = Executors.newSingleThreadExecutor()
    @Volatile private var initialized = false
    @JvmStatic private external fun request(directory: String, payload: String): String

    internal fun normalized(source: JSONObject): JSONObject {
        val result = JSONObject(source.toString())
        val url = source.optString("url")
        if (url.startsWith("magnet:?", true)) {
            val uri = android.net.Uri.parse("https://magnet.invalid/?" + url.substringAfter('?'))
            var hash = uri.getQueryParameters("xt").firstOrNull { it.startsWith("urn:btih:", true) }?.substring(9) ?: ""
            if (hash.matches(Regex("[A-Z2-7]{32}", RegexOption.IGNORE_CASE))) {
                var buffer = 0; var bits = 0
                val bytes = java.io.ByteArrayOutputStream()
                for (char in hash.uppercase(java.util.Locale.ROOT)) {
                    buffer = (buffer shl 5) or "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(char); bits += 5
                    if (bits >= 8) { bits -= 8; bytes.write((buffer shr bits) and 255) }
                }
                hash = bytes.toByteArray().joinToString("") { "%02x".format(it) }
            }
            result.put("infoHash", hash)
            val trackers = org.json.JSONArray(source.optJSONArray("sources")?.toString() ?: "[]")
            uri.getQueryParameters("tr").take(32).forEach { trackers.put("tracker:$it") }
            result.put("sources", trackers)
            uri.getQueryParameter("so")?.toIntOrNull()?.takeIf { it >= 0 }?.let { result.put("fileIdx", it) }
        }
        return result
    }

    @android.annotation.SuppressLint("UsableSpace") // API 24 fallback; only spend bytes already free, without evicting other caches.
    fun resolve(context: Context, source: JSONObject, callback: (Result<String>) -> Unit) {
        val directory = File(context.cacheDir, "native-torrents").absolutePath
        worker.execute {
            callback(runCatching {
                if (!initialized) { System.loadLibrary("argus_lib"); initialized = true }
                val response = JSONObject(request(directory, normalized(source).toString()))
                check(!response.has("error")) { response.optString("error") }
                val remaining = File(context.cacheDir.absolutePath).usableSpace
                check(response.optLong("length") <= remaining) { "Not enough free storage for this torrent. Choose a smaller source." }
                response.getString("url")
            })
        }
    }

    fun stop(context: Context) {
        worker.execute {
            runCatching {
                if (initialized) request(File(context.cacheDir, "native-torrents").absolutePath, "{\"action\":\"stop\"}")
            }
        }
    }
}
