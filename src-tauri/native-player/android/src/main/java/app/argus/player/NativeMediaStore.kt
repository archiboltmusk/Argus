package app.argus.player

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder

data class NativeAddon(val url: String, val manifest: JSONObject)
data class NativeCatalog(val addon: NativeAddon, val type: String, val id: String, val name: String, val searchable: Boolean)
data class NativeSource(val addon: String, val data: JSONObject)

/** Device-owned media state. The earlier interface's storage is deliberately left untouched. */
class NativeMediaStore(context: Context) {
    private val prefs = context.getSharedPreferences("argus_native_media_v1", Context.MODE_PRIVATE)
    companion object {
        const val CINEMETA = "https://v3-cinemeta.strem.io/manifest.json"
        fun segment(value: String): String = URLEncoder.encode(value, "UTF-8").replace("+", "%20")
        fun manifestUrl(input: String): String {
            var value = input.trim().replace(Regex("^stremio://", RegexOption.IGNORE_CASE), "https://")
            if (!value.endsWith("/manifest.json")) value = value.trimEnd('/') + "/manifest.json"
            val uri = URI(value)
            require(uri.scheme == "https" || (uri.scheme == "http" && uri.host in listOf("127.0.0.1", "localhost"))) {
                "Use an HTTPS add-on link. Local test servers can use HTTP."
            }
            require(!uri.host.isNullOrBlank() && uri.userInfo == null && uri.fragment == null && uri.query == null) {
                "Use the add-on's manifest.json link."
            }
            return value
        }
        fun fetch(url: String): JSONObject {
            var current = url
            repeat(6) {
                val uri = URI(current)
                require(uri.scheme == "https" || (uri.scheme == "http" && uri.host in listOf("127.0.0.1", "localhost")))
                val connection = uri.toURL().openConnection() as HttpURLConnection
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.instanceFollowRedirects = false
                connection.setRequestProperty("Accept", "application/json")
                try {
                    val code = connection.responseCode
                    if (code in 300..399) {
                        current = uri.resolve(connection.getHeaderField("Location") ?: error("Missing redirect")).toString()
                    } else {
                        require(code in 200..299) { "The service did not respond successfully." }
                        val bytes = connection.inputStream.use { stream ->
                            val result = java.io.ByteArrayOutputStream()
                            val buffer = ByteArray(8192)
                            while (true) {
                                val size = stream.read(buffer)
                                if (size < 0) break
                                require(result.size() + size <= 4 * 1024 * 1024) { "Response is too large." }
                                result.write(buffer, 0, size)
                            }
                            result.toByteArray()
                        }
                        return JSONObject(String(bytes, Charsets.UTF_8))
                    }
                } finally { connection.disconnect() }
            }
            error("Too many redirects")
        }
    }

    fun installed(): List<NativeAddon> {
        val items = JSONArray(prefs.getString("addons", "[]"))
        return (0 until items.length()).map { items.getJSONObject(it) }.map {
            NativeAddon(it.getString("url"), it.getJSONObject("manifest"))
        }
    }

    fun install(input: String): NativeAddon {
        val url = manifestUrl(input)
        val manifest = fetch(url)
        require(manifest.optString("id").isNotBlank() && manifest.optString("name").isNotBlank() && manifest.optJSONArray("resources") != null) {
            "This link does not contain a valid Stremio add-on."
        }
        val addon = NativeAddon(url, manifest)
        synchronized(this) { saveAddons(installed().filter { it.url != url } + addon) }
        return addon
    }

    private fun saveAddons(addons: List<NativeAddon>) {
        prefs.edit().putString("addons", JSONArray(addons.map {
            JSONObject().put("url", it.url).put("manifest", it.manifest)
        }).toString()).commit()
    }

    @Synchronized fun removeAddon(url: String) = saveAddons(installed().filter { it.url != url })

    fun catalogs(): List<NativeCatalog> = installed().flatMap { addon ->
        val catalogs = addon.manifest.optJSONArray("catalogs") ?: JSONArray()
        (0 until catalogs.length()).mapNotNull { index ->
            val c = catalogs.optJSONObject(index) ?: return@mapNotNull null
            if (c.optString("type").isBlank() || c.optString("id").isBlank()) return@mapNotNull null
            val extra = c.optJSONArray("extra") ?: JSONArray()
            val requirements = (0 until extra.length()).mapNotNull { extra.optJSONObject(it) }
            if (requirements.any { it.optBoolean("isRequired") && it.optString("name") != "search" }) null
            else NativeCatalog(addon, c.optString("type"), c.optString("id"), c.optString("name", addon.manifest.optString("name")), requirements.any { it.optString("name") == "search" })
        }
    }

    fun catalog(catalog: NativeCatalog, query: String? = null, skip: Int = 0): List<JSONObject> {
        val extra = when {
            query != null -> "/search=${segment(query)}"
            skip > 0 -> "/skip=$skip"
            else -> ""
        }
        val url = catalog.addon.url.removeSuffix("/manifest.json") + "/catalog/${segment(catalog.type)}/${segment(catalog.id)}$extra.json"
        val result = fetch(url).optJSONArray("metas") ?: JSONArray()
        return (0 until result.length()).mapNotNull { result.optJSONObject(it)?.put("type", catalog.type)?.put("_addon", catalog.addon.url) }
            .filter { it.optString("id").isNotBlank() }
    }

    fun detail(meta: JSONObject): JSONObject {
        val type = meta.optString("type", "movie")
        val id = meta.getString("id")
        val bases = listOfNotNull(meta.optString("_addon").takeIf { it.isNotBlank() }) + installed().map { it.url }
        for (base in bases.distinct()) {
            try {
                val result = fetch(base.removeSuffix("/manifest.json") + "/meta/${segment(type)}/${segment(id)}.json").optJSONObject("meta")
                if (result != null && result.optString("id").isNotBlank()) return result.put("type", type).put("_addon", base)
            } catch (_: Exception) { }
        }
        return meta
    }

    fun streams(addon: NativeAddon, type: String, id: String): List<NativeSource> {
        val resources = addon.manifest.optJSONArray("resources") ?: JSONArray()
        val supports = (0 until resources.length()).any { index ->
            val entry = resources.get(index)
            entry == "stream" || (entry is JSONObject && entry.optString("name") == "stream")
        }
        if (!supports) return emptyList()
        val result = fetch(addon.url.removeSuffix("/manifest.json") + "/stream/${segment(type)}/${segment(id)}.json").optJSONArray("streams") ?: JSONArray()
        return (0 until result.length()).mapNotNull { result.optJSONObject(it)?.let { stream -> NativeSource(addon.manifest.optString("name"), stream) } }
    }

    private fun saved(key: String): JSONArray = JSONArray(prefs.getString(key, "[]"))
    fun library(): List<JSONObject> = saved("library").let { array -> (0 until array.length()).map { array.getJSONObject(it) } }
    @Synchronized fun toggleLibrary(meta: JSONObject) {
        val items = library()
        val exists = items.any { it.optString("id") == meta.optString("id") && it.optString("type") == meta.optString("type") }
        val result = items.filterNot { it.optString("id") == meta.optString("id") && it.optString("type") == meta.optString("type") }
        prefs.edit().putString("library", JSONArray(if (exists) result else result + savedMeta(meta)).toString()).commit()
    }
    fun inLibrary(meta: JSONObject) = library().any { it.optString("id") == meta.optString("id") && it.optString("type") == meta.optString("type") }
    fun history(): List<JSONObject> = saved("history").let { array -> (0 until array.length()).map { array.getJSONObject(it) } }
    fun resume(id: String): Double = history().firstOrNull { it.optString("videoId") == id }?.optDouble("position", 0.0) ?: 0.0
    @Synchronized fun saveProgress(meta: JSONObject, videoId: String, position: Double, duration: Double) {
        if (position < 1) return
        val other = history().filterNot { it.optString("videoId") == videoId }
        val next = if (duration > 0 && position >= duration * 0.95 && duration - position < 30) other else listOf(JSONObject().put("meta", savedMeta(meta)).put("videoId", videoId).put("position", position).put("duration", duration)) + other
        prefs.edit().putString("history", JSONArray(next.take(100)).toString()).apply()
    }
    fun audioLanguage(): String = prefs.getString("audioLanguage", "") ?: ""
    fun subtitleLanguage(): String = prefs.getString("subtitleLanguage", "") ?: ""
    fun languages(audio: String, subtitle: String) = prefs.edit().putString("audioLanguage", audio.trim()).putString("subtitleLanguage", subtitle.trim()).apply()
    private fun savedMeta(meta: JSONObject): JSONObject = JSONObject().apply {
        for (key in listOf("id", "type", "name", "poster", "releaseInfo", "_addon", "description")) {
            if (meta.has(key)) put(key, if (key == "description") meta.optString(key).take(1500) else meta.get(key))
        }
    }
}
