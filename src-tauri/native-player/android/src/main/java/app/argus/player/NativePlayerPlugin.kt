package app.argus.player

import android.app.Activity
import android.app.Dialog
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import android.graphics.Color
import android.view.Gravity
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import androidx.media3.ui.DefaultTimeBar
import androidx.media3.ui.CaptionStyleCompat
import androidx.media3.common.MediaMetadata
import androidx.media3.session.MediaSession
import app.tauri.plugin.JSObject
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin

@InvokeArg
class SubtitleArgs {
    var url: String = ""
    var lang: String? = null
    var title: String? = null
}

@InvokeArg
class LoadArgs {
    var url: String = ""
    var title: String = ""
    var startAtSec: Double = 0.0
    var startPaused: Boolean = false
    var headers: Map<String, String> = emptyMap()
    var subtitles: List<SubtitleArgs> = emptyList()
    var projector: Boolean = false
    var audioLanguage: String = ""
    var subtitleLanguage: String = ""
}

@InvokeArg
class ControlArgs {
    var action: String = ""
    var value: Double = 0.0
    var trackId: String? = null
}

/** A native surface and remote-friendly controls; video never passes through WebView. */
@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class NativePlaybackSession(private val host: Activity) {
    private var player: ExoPlayer? = null
    private var dialog: Dialog? = null
    private var mediaSession: MediaSession? = null
    private var firstFrame = false
    private var error: String? = null
    var onClosed: (() -> Unit)? = null
    var onChooseSource: (() -> Unit)? = null
    var onNextEpisode: (() -> Unit)? = null
    var onEnded: (() -> Unit)? = null
    var onDownload: (() -> Unit)? = null
    var onExternal: (() -> Unit)? = null
    private val timers = android.os.Handler(android.os.Looper.getMainLooper())

    fun open(args: LoadArgs, ready: () -> Unit, failed: (String) -> Unit) {
        host.runOnUiThread {
            try {
                require(args.url.startsWith("https://") || args.url.startsWith("http://") || args.url.startsWith("content://downloads/")) {
                    "Native playback requires a stream or a saved Argus download"
                }
                release()
                firstFrame = false
                error = null
                val http = DefaultHttpDataSource.Factory().setDefaultRequestProperties(args.headers)
                    .setConnectTimeoutMs(15000).setReadTimeoutMs(20000)
                val sources = DefaultMediaSourceFactory(DefaultDataSource.Factory(host, http))
                val buffers = DefaultLoadControl.Builder()
                    .setBufferDurationsMs(15000, 50000, 1000, 2000)
                    .setTargetBufferBytes(if (args.projector) 32 * 1024 * 1024 else 64 * 1024 * 1024)
                    .setPrioritizeTimeOverSizeThresholds(false).build()
                val p = ExoPlayer.Builder(host).setMediaSourceFactory(sources).setLoadControl(buffers).build()
                player = p
                mediaSession = MediaSession.Builder(host, p).setId(java.util.UUID.randomUUID().toString()).build()
                p.trackSelectionParameters = p.trackSelectionParameters.buildUpon()
                    .setPreferredAudioLanguage(args.audioLanguage.takeIf { it.isNotBlank() })
                    .setPreferredTextLanguage(args.subtitleLanguage.takeIf { it.isNotBlank() })
                    .setSelectUndeterminedTextLanguage(args.subtitleLanguage.equals("und", true))
                    .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, args.subtitleLanguage.isBlank()).build()
                p.setAudioAttributes(androidx.media3.common.AudioAttributes.DEFAULT, true)
                p.setHandleAudioBecomingNoisy(true)
                p.addListener(object : Player.Listener {
                    override fun onRenderedFirstFrame() { firstFrame = true }
                    override fun onPlaybackStateChanged(state: Int) { if (state == Player.STATE_ENDED) onEnded?.invoke() }
                    override fun onPlayerError(e: PlaybackException) {
                        error = e.errorCodeName
                        dialog?.dismiss()
                    }
                })
                val view = PlayerView(host).apply {
                    player = p
                    setShowSubtitleButton(true)
                    setShowNextButton(false)
                    setShowPreviousButton(false)
                    controllerAutoShow = true
                    val captions = host.getSystemService(android.content.Context.CAPTIONING_SERVICE) as? android.view.accessibility.CaptioningManager
                    if (captions?.isEnabled != true) subtitleView?.setStyle(CaptionStyleCompat(
                        Color.WHITE, Color.TRANSPARENT, Color.TRANSPARENT,
                        CaptionStyleCompat.EDGE_TYPE_OUTLINE, Color.BLACK, null))
                }
                val d = Dialog(host, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
                dialog = d
                val frame = FrameLayout(host)
                frame.addView(view, FrameLayout.LayoutParams(-1, -1))
                val titleView = TextView(host).apply {
                    text = args.title
                    textSize = 22f
                    setTextColor(Color.rgb(244, 245, 247))
                    setShadowLayer(3f, 0f, 1f, Color.BLACK)
                    maxLines = 1
                    ellipsize = android.text.TextUtils.TruncateAt.END
                    val padding = (24 * host.resources.displayMetrics.density).toInt()
                    setPadding(padding, padding, padding, padding)
                }
                val heading = android.widget.LinearLayout(host).apply { gravity = Gravity.CENTER_VERTICAL }
                heading.addView(titleView, android.widget.LinearLayout.LayoutParams(0, -2, 1f))
                heading.addView(android.widget.Button(host).apply {
                    text = "More"; contentDescription = "More playback options"
                    setOnClickListener { more(view) }
                }, android.widget.LinearLayout.LayoutParams(-2, -2))
                frame.addView(heading, FrameLayout.LayoutParams(-1, -2, Gravity.TOP))
                view.setControllerVisibilityListener(PlayerView.ControllerVisibilityListener {
                    heading.visibility = it
                    view.subtitleView?.setBottomPaddingFraction(if (it == View.VISIBLE) 0.22f else 0.08f)
                })
                (view.findViewById<View>(androidx.media3.ui.R.id.exo_progress) as? DefaultTimeBar)?.apply {
                    setPlayedColor(Color.rgb(244, 162, 92))
                    setScrubberColor(Color.rgb(244, 162, 92))
                }
                d.setContentView(frame, FrameLayout.LayoutParams(-1, -1))
                d.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                d.setOnDismissListener { p.pause(); onClosed?.invoke() }
                d.show()
                view.requestFocus()
                val subtitles = args.subtitles.filter { it.url.startsWith("https://") || it.url.startsWith("http://") }.map {
                    val mime = if (it.url.substringBefore('?').endsWith(".srt", true)) "application/x-subrip" else "text/vtt"
                    MediaItem.SubtitleConfiguration.Builder(android.net.Uri.parse(it.url))
                        .setMimeType(mime).setLanguage(it.lang).setLabel(it.title).build()
                }
                p.setMediaItem(MediaItem.Builder().setUri(args.url)
                    .setMediaMetadata(MediaMetadata.Builder().setTitle(args.title).build())
                    .setSubtitleConfigurations(subtitles).build())
                p.seekTo((args.startAtSec * 1000).toLong().coerceAtLeast(0))
                p.prepare()
                p.playWhenReady = !args.startPaused
                ready()
            } catch (e: Exception) {
                release()
                failed(e.message ?: "Unable to open native player")
            }
        }
    }

    fun control(args: ControlArgs, ready: () -> Unit, failed: (String) -> Unit) {
        host.runOnUiThread {
            val p = player
            if (p == null) { failed("Player is closed"); return@runOnUiThread }
            when (args.action) {
                "play" -> { dialog?.show(); p.play() }
                "pause" -> p.pause()
                "seek" -> p.seekTo((args.value * 1000).toLong().coerceAtLeast(0))
                "volume" -> p.volume = args.value.toFloat().coerceIn(0f, 1f)
                "rate" -> p.setPlaybackSpeed(args.value.toFloat().coerceIn(0.25f, 3f))
                "audio", "subtitle" -> {
                    val type = if (args.action == "audio") C.TRACK_TYPE_AUDIO else C.TRACK_TYPE_TEXT
                    val builder = p.trackSelectionParameters.buildUpon().clearOverridesOfType(type)
                        .setTrackTypeDisabled(type, args.trackId == null)
                    p.currentTracks.groups.forEachIndexed { groupIndex, group ->
                        for (i in 0 until group.length) {
                            if (group.type == type && args.trackId == "$groupIndex:$i") {
                                builder.setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, i))
                            }
                        }
                    }
                    p.trackSelectionParameters = builder.build()
                }
                else -> { failed("Unsupported player control"); return@runOnUiThread }
            }
            ready()
        }
    }

    fun snapshot(receive: (JSObject) -> Unit) {
        host.runOnUiThread {
            val p = player
            val result = JSObject()
            result.put("status", when {
                p == null -> "idle"
                error != null -> "error"
                p.playbackState == Player.STATE_ENDED -> "ended"
                p.playbackState == Player.STATE_BUFFERING -> "loading"
                p.isPlaying -> "playing"
                else -> "paused"
            })
            result.put("positionSec", (p?.currentPosition ?: 0) / 1000.0)
            result.put("durationSec", (p?.duration ?: 0).coerceAtLeast(0) / 1000.0)
            result.put("bufferedSec", (p?.bufferedPosition ?: 0) / 1000.0)
            result.put("speed", p?.playbackParameters?.speed ?: 1f)
            result.put("buffering", p?.playbackState == Player.STATE_BUFFERING)
            result.put("firstFrameReady", firstFrame)
            result.put("videoWidth", p?.videoSize?.width ?: 0)
            result.put("videoHeight", p?.videoSize?.height ?: 0)
            result.put("errorMessage", error ?: org.json.JSONObject.NULL)
            for ((type, key) in listOf(C.TRACK_TYPE_AUDIO to "audioTracks", C.TRACK_TYPE_TEXT to "subtitleTracks")) {
                val tracks = org.json.JSONArray()
                p?.currentTracks?.groups?.forEachIndexed { groupIndex, group ->
                    if (group.type == type) for (i in 0 until group.length) {
                        val format = group.getTrackFormat(i)
                        tracks.put(JSObject().apply {
                            put("id", "$groupIndex:$i")
                            put("label", format.label ?: format.language ?: "Track ${i + 1}")
                            put("lang", format.language ?: "und")
                            put("kind", if (type == C.TRACK_TYPE_AUDIO) "audio" else "subtitle")
                            put("selected", group.isTrackSelected(i))
                        })
                    }
                }
                result.put(key, tracks)
            }
            receive(result)
        }
    }

    fun pause() { player?.pause() }
    fun close() { host.runOnUiThread { release() } }

    private fun more(view: PlayerView) {
        val p = player ?: return
        val options = mutableListOf("Playback speed", "Picture fit", "Sleep timer", "Copy playback diagnostics")
        if (onChooseSource != null) options.add("Choose another source")
        if (onNextEpisode != null) options.add("Next episode")
        if (onDownload != null) options.add("Download for offline")
        if (onExternal != null) options.add("Open in another player")
        android.app.AlertDialog.Builder(host).setTitle("Playback options").setItems(options.toTypedArray()) { _, which ->
            when (options[which]) {
                "Playback speed" -> {
                    val speeds = floatArrayOf(0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f)
                    android.app.AlertDialog.Builder(host).setTitle("Playback speed")
                        .setSingleChoiceItems(speeds.map { "${it}×" }.toTypedArray(), speeds.indexOfFirst { it == p.playbackParameters.speed }) { dialog, index ->
                            p.setPlaybackSpeed(speeds[index]); dialog.dismiss()
                        }.show()
                }
                "Picture fit" -> android.app.AlertDialog.Builder(host).setTitle("Picture fit")
                    .setItems(arrayOf("Fit", "Fill", "Stretch")) { _, index -> view.resizeMode = intArrayOf(0, 4, 3)[index] }.show()
                "Sleep timer" -> android.app.AlertDialog.Builder(host).setTitle("Sleep timer")
                    .setItems(arrayOf("Off", "15 minutes", "30 minutes", "60 minutes")) { _, index ->
                        timers.removeCallbacksAndMessages(null)
                        if (index > 0) timers.postDelayed({ player?.pause() }, longArrayOf(0, 15, 30, 60)[index] * 60000)
                    }.show()
                "Copy playback diagnostics" -> snapshot { state ->
                    // Snapshot contains no source URL, headers or account credentials.
                    (host.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager)
                        .setPrimaryClip(android.content.ClipData.newPlainText("Argus playback diagnostics", state.toString()))
                    android.widget.Toast.makeText(host, "Playback diagnostics copied", android.widget.Toast.LENGTH_SHORT).show()
                }
                "Choose another source" -> onChooseSource?.invoke()
                "Next episode" -> onNextEpisode?.invoke()
                "Download for offline" -> onDownload?.invoke()
                "Open in another player" -> onExternal?.invoke()
            }
        }.show()
    }

    private fun release() {
        timers.removeCallbacksAndMessages(null)
        dialog?.setOnDismissListener(null)
        dialog?.dismiss()
        dialog = null
        mediaSession?.release()
        mediaSession = null
        player?.release()
        player = null
    }
}

/** Compatibility adapter for the optional web interface. Native screens use the session directly. */
@TauriPlugin
class NativePlayerPlugin(host: Activity) : Plugin(host) {
    private val session = NativePlaybackSession(host)
    @Command
    fun load(invoke: Invoke) = session.open(invoke.parseArgs(LoadArgs::class.java), { invoke.resolve() }, { invoke.reject(it) })
    @Command
    fun control(invoke: Invoke) = session.control(invoke.parseArgs(ControlArgs::class.java), { invoke.resolve() }, { invoke.reject(it) })
    @Command
    fun snapshot(invoke: Invoke) = session.snapshot { invoke.resolve(it) }
    @Command
    fun close(invoke: Invoke) { session.close(); invoke.resolve() }
    override fun onPause(activity: AppCompatActivity) = session.pause()
    override fun onDestroy(activity: AppCompatActivity) = session.close()
}
