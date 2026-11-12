package app.argus.player

import org.json.JSONTokener
import java.net.HttpURLConnection
import java.net.URI

class CloudFailure(val status: Int) : Exception(when (status) {
    400, 401, 403 -> "Sign-in expired or credentials were rejected. Sign in again."
    404 -> "This server's sync storage isn't set up yet."
    429 -> "Too many requests. Wait a minute and retry."
    else -> "Cloud service couldn't complete the request. Your local changes are saved."
})

object NativeCloudHttp {
    fun call(url: String, method: String = "GET", body: Any? = null, headers: Map<String, String> = emptyMap()): Any {
        val uri = URI(url)
        require(uri.scheme == "https" || (uri.scheme == "http" && uri.host == "127.0.0.1"))
        require(uri.userInfo == null)
        val connection = uri.toURL().openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.connectTimeout = 15000; connection.readTimeout = 20000
        connection.instanceFollowRedirects = false // Never forward account tokens to redirects.
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("Content-Type", "application/json")
        headers.forEach { (key, value) -> connection.setRequestProperty(key, value) }
        try {
            if (body != null) {
                val bytes = body.toString().toByteArray(Charsets.UTF_8)
                require(bytes.size <= 2 * 1024 * 1024) { "Cloud changes are too large." }
                connection.doOutput = true; connection.setFixedLengthStreamingMode(bytes.size)
                connection.outputStream.use { it.write(bytes) }
            }
            val status = connection.responseCode
            if (status !in 200..299) throw CloudFailure(status)
            val result = connection.inputStream.use { stream ->
                val output = java.io.ByteArrayOutputStream()
                val buffer = ByteArray(8192)
                while (true) {
                    val count = stream.read(buffer)
                    if (count < 0) break
                    require(output.size() + count <= 4 * 1024 * 1024) { "Cloud response is too large." }
                    output.write(buffer, 0, count)
                }
                String(output.toByteArray(), Charsets.UTF_8)
            }
            return if (result.isBlank()) org.json.JSONObject() else JSONTokener(result).nextValue()
        } finally { connection.disconnect() }
    }
}
