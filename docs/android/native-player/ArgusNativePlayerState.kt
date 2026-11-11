package __PACKAGE_NAME__

import android.webkit.WebView
import org.json.JSONArray
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * Shared thread-safe playback bridge between Tauri's WebView (JavaScriptInterface)
 * and the embedded native full-screen ArgusNativePlayerActivity (Media3 ExoPlayer + LibVLC).
 */
object ArgusNativePlayerState {
    @Volatile
    var status: String = "idle" // idle | loading | ready | playing | paused | ended | error

    @Volatile
    var activeEngine: String = "exoplayer" // exoplayer | libvlc

    @Volatile
    var positionMs: Long = 0L

    @Volatile
    var durationMs: Long = 0L

    @Volatile
    var bufferedMs: Long = 0L

    @Volatile
    var errorMessage: String? = null

    @Volatile
    var audioTracksJson: String = "[]"

    @Volatile
    var subtitleTracksJson: String = "[]"

    @Volatile
    var currentAudioTrackId: String = ""

    @Volatile
    var currentSubtitleTrackId: String = ""

    @Volatile
    var playbackRate: Float = 1.0f

    @Volatile
    var volumeBoostEnabled: Boolean = false

    @Volatile
    var activityRef: WeakReference<ArgusNativePlayerActivity>? = null

    @Volatile
    var webViewRef: WeakReference<WebView>? = null

    fun resetForLoad(engine: String, startPositionMs: Long) {
        status = "loading"
        activeEngine = engine
        positionMs = startPositionMs.coerceAtLeast(0L)
        durationMs = 0L
        bufferedMs = 0L
        errorMessage = null
        audioTracksJson = "[]"
        subtitleTracksJson = "[]"
        currentAudioTrackId = ""
        currentSubtitleTrackId = ""
        playbackRate = 1.0f
    }

    fun toJsonString(): String {
        val obj = JSONObject()
        obj.put("status", status)
        obj.put("engine", activeEngine)
        obj.put("positionMs", positionMs)
        obj.put("durationMs", durationMs)
        obj.put("bufferedMs", bufferedMs)
        obj.put("rate", playbackRate.toDouble())
        obj.put("volumeBoost", volumeBoostEnabled)
        if (errorMessage != null) obj.put("errorMessage", errorMessage) else obj.put("errorMessage", JSONObject.NULL)
        obj.put("currentAudioTrackId", currentAudioTrackId)
        obj.put("currentSubtitleTrackId", currentSubtitleTrackId)
        try {
            obj.put("audioTracks", JSONArray(audioTracksJson))
        } catch (_: Throwable) {
            obj.put("audioTracks", JSONArray())
        }
        try {
            obj.put("subtitleTracks", JSONArray(subtitleTracksJson))
        } catch (_: Throwable) {
            obj.put("subtitleTracks", JSONArray())
        }
        return obj.toString()
    }

    fun notifyWebView() {
        val wv = webViewRef?.get() ?: return
        val json = toJsonString()
        wv.post {
            try {
                wv.evaluateJavascript(
                    "window.__argusNativePlayerUpdate && window.__argusNativePlayerUpdate($json);",
                    null
                )
            } catch (_: Throwable) {
            }
        }
    }
}
