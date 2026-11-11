package __PACKAGE_NAME__

import android.app.Activity
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * WebView JavaScriptInterface ("ArgusNativePlayer") exposed to TypeScript inside
 * Tauri's Android WebView so Argus can invoke embedded native Media3 ExoPlayer & LibVLC.
 */
class ArgusNativePlayerBridge(
    private val hostActivity: Activity,
    private val webView: WebView
) {
    init {
        ArgusNativePlayerState.webViewRef = WeakReference(webView)
    }

    @JavascriptInterface
    fun isAvailable(): Boolean = true

    @JavascriptInterface
    fun supportedEngines(): String = "[\"exoplayer\",\"libvlc\"]"

    @JavascriptInterface
    fun play(optionsJson: String): Boolean {
        val opts = try {
            JSONObject(optionsJson)
        } catch (_: Throwable) {
            return false
        }
        val url = opts.optString("url", "")
        if (url.isBlank()) return false

        val title = opts.optString("title", "Argus")
        val subtitleUrl = opts.optString("subtitleUrl", "")
        val startMs = opts.optLong("startPositionMs", 0L).coerceAtLeast(0L)
        val engine = opts.optString("engine", "auto")
        val headersJson = opts.optJSONObject("headers")?.toString() ?: "{}"
        val projectorMode = opts.optBoolean("projectorMode", true)
        val lowRam = opts.optBoolean("lowRam", false)

        val intent = ArgusNativePlayerActivity.createIntent(
            context = hostActivity,
            url = url,
            title = title,
            subtitleUrl = subtitleUrl,
            startPositionMs = startMs,
            preferredEngine = engine,
            headersJson = headersJson,
            projectorMode = projectorMode,
            lowRam = lowRam
        )
        hostActivity.runOnUiThread {
            hostActivity.startActivity(intent)
        }
        return true
    }

    @JavascriptInterface
    fun pause() {
        val act = ArgusNativePlayerState.activityRef?.get() ?: return
        act.runOnUiThread { act.pausePlayback() }
    }

    @JavascriptInterface
    fun resume() {
        val act = ArgusNativePlayerState.activityRef?.get() ?: return
        act.runOnUiThread { act.resumePlayback() }
    }

    @JavascriptInterface
    fun seekTo(positionMs: Long) {
        val act = ArgusNativePlayerState.activityRef?.get() ?: return
        act.runOnUiThread { act.seekToPositionMs(positionMs) }
    }

    @JavascriptInterface
    fun setRate(rate: Float) {
        val act = ArgusNativePlayerState.activityRef?.get() ?: return
        act.runOnUiThread { act.setPlaybackRate(rate) }
    }

    @JavascriptInterface
    fun setAudioTrack(trackId: String) {
        val act = ArgusNativePlayerState.activityRef?.get() ?: return
        act.runOnUiThread { act.selectAudioTrack(trackId) }
    }

    @JavascriptInterface
    fun setSubtitleTrack(trackId: String) {
        val act = ArgusNativePlayerState.activityRef?.get() ?: return
        act.runOnUiThread { act.selectSubtitleTrack(trackId.takeIf { it.isNotBlank() }) }
    }

    @JavascriptInterface
    fun addSubtitle(url: String) {
        val act = ArgusNativePlayerState.activityRef?.get() ?: return
        act.addExternalSubtitleUrl(url)
    }

    @JavascriptInterface
    fun stop() {
        val act = ArgusNativePlayerState.activityRef?.get() ?: return
        act.runOnUiThread { act.finishPlayback() }
    }

    @JavascriptInterface
    fun getStateJson(): String {
        return ArgusNativePlayerState.toJsonString()
    }
}
