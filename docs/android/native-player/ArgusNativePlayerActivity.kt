package __PACKAGE_NAME__

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.media.audiofx.LoudnessEnhancer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.SeekBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.AudioAttributes as Media3AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.CaptionStyleCompat
import androidx.media3.ui.PlayerView
import org.json.JSONArray
import org.json.JSONObject
import org.videolan.libvlc.LibVLC
import org.videolan.libvlc.Media
import org.videolan.libvlc.MediaPlayer
import org.videolan.libvlc.interfaces.IMedia
import org.videolan.libvlc.util.VLCVideoLayout
import java.lang.ref.WeakReference
import java.util.Locale

/**
 * Full-screen dual-engine native Android video player for Argus.
 * Combines Media3 ExoPlayer (hardware MediaCodec) + LibVLC (full MKV/HEVC/AC3/EAC3/DTS/ASS decode)
 * inside the APK with automatic format fallback, D-Pad TV remote HUD, audio boost, and
 * warm-amber projector subtitles.
 */
@Suppress("UnsafeOptInUsageError")
class ArgusNativePlayerActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_URL = "url"
        const val EXTRA_TITLE = "title"
        const val EXTRA_SUBTITLE_URL = "subtitleUrl"
        const val EXTRA_START_MS = "startPositionMs"
        const val EXTRA_ENGINE = "preferredEngine"
        const val EXTRA_HEADERS = "headersJson"
        const val EXTRA_PROJECTOR = "projectorMode"
        const val EXTRA_LOW_RAM = "lowRam"

        fun createIntent(
            context: Context,
            url: String,
            title: String,
            subtitleUrl: String,
            startPositionMs: Long,
            preferredEngine: String,
            headersJson: String,
            projectorMode: Boolean,
            lowRam: Boolean
        ): Intent {
            return Intent(context, ArgusNativePlayerActivity::class.java).apply {
                putExtra(EXTRA_URL, url)
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_SUBTITLE_URL, subtitleUrl)
                putExtra(EXTRA_START_MS, startPositionMs)
                putExtra(EXTRA_ENGINE, preferredEngine)
                putExtra(EXTRA_HEADERS, headersJson)
                putExtra(EXTRA_PROJECTOR, projectorMode)
                putExtra(EXTRA_LOW_RAM, lowRam)
            }
        }
    }

    private lateinit var rootLayout: FrameLayout
    private lateinit var exoView: PlayerView
    private lateinit var vlcView: VLCVideoLayout
    private lateinit var overlayHud: LinearLayout
    private lateinit var loadingSpinner: ProgressBar
    private lateinit var titleText: TextView
    private lateinit var engineBadge: TextView
    private lateinit var timeText: TextView
    private lateinit var seekBar: SeekBar
    private lateinit var btnPlayPause: Button
    private lateinit var btnAudio: Button
    private lateinit var btnSub: Button
    private lateinit var btnEngine: Button
    private lateinit var btnBoost: Button

    private var exoPlayer: ExoPlayer? = null
    private var libVlc: LibVLC? = null
    private var vlcPlayer: MediaPlayer? = null
    private var loudnessEnhancer: LoudnessEnhancer? = null

    private var streamUrl: String = ""
    private var streamTitle: String = "Argus"
    private var subtitleUrl: String = ""
    private var headersMap: Map<String, String> = emptyMap()
    private var projectorMode: Boolean = true
    private var lowRamMode: Boolean = false
    private var activeEngine: String = "exoplayer"
    private var fallbackAttempted: Boolean = false
    private var pendingStartMs: Long = 0L
    private var boostEnabled: Boolean = false
    private var hudVisible: Boolean = true
    private var isSeekingBar: Boolean = false

    private val uiHandler = Handler(Looper.getMainLooper())
    private val hideHudRunnable = Runnable { setHudVisible(false) }
    private val pollRunnable = object : Runnable {
        override fun run() {
            syncProgressUi()
            uiHandler.postDelayed(this, 400L)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        ArgusNativePlayerState.activityRef = WeakReference(this)

        readExtras(intent)
        buildViews()
        applyImmersiveFullscreen()
        startConfiguredEngine(pendingStartMs)
        uiHandler.post(pollRunnable)
        scheduleHudAutoHide()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        releasePlayers()
        fallbackAttempted = false
        readExtras(intent)
        titleText.text = streamTitle
        startConfiguredEngine(pendingStartMs)
        setHudVisible(true)
    }

    private fun readExtras(srcIntent: Intent) {
        streamUrl = srcIntent.getStringExtra(EXTRA_URL) ?: ""
        streamTitle = srcIntent.getStringExtra(EXTRA_TITLE)?.takeIf { it.isNotBlank() } ?: "Argus"
        subtitleUrl = srcIntent.getStringExtra(EXTRA_SUBTITLE_URL) ?: ""
        pendingStartMs = srcIntent.getLongExtra(EXTRA_START_MS, 0L).coerceAtLeast(0L)
        projectorMode = srcIntent.getBooleanExtra(EXTRA_PROJECTOR, true)
        lowRamMode = srcIntent.getBooleanExtra(EXTRA_LOW_RAM, false)
        boostEnabled = projectorMode
        ArgusNativePlayerState.volumeBoostEnabled = boostEnabled

        val parsedHeaders = LinkedHashMap<String, String>()
        val rawHeaders = srcIntent.getStringExtra(EXTRA_HEADERS) ?: "{}"
        try {
            val obj = JSONObject(rawHeaders)
            val keys = obj.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                val v = obj.optString(k, "")
                if (k.isNotBlank() && v.isNotBlank()) parsedHeaders[k] = v
            }
        } catch (_: Throwable) {
        }
        headersMap = parsedHeaders

        val pref = (srcIntent.getStringExtra(EXTRA_ENGINE) ?: "auto").lowercase(Locale.US)
        activeEngine = when (pref) {
            "libvlc", "vlc" -> "libvlc"
            "exoplayer" -> "exoplayer"
            else -> if (shouldPreferLibVlc(streamUrl, subtitleUrl)) "libvlc" else "exoplayer"
        }
        ArgusNativePlayerState.resetForLoad(activeEngine, pendingStartMs)
    }

    private fun shouldPreferLibVlc(url: String, sub: String): Boolean {
        val lower = url.lowercase(Locale.US)
        val subLower = sub.lowercase(Locale.US)
        return lower.contains(".mkv") ||
            lower.contains(".avi") ||
            lower.contains(".ts") ||
            lower.contains(".flv") ||
            lower.contains(".wmv") ||
            lower.contains("dts") ||
            lower.contains("ac3") ||
            lower.contains("eac3") ||
            lower.contains("truehd") ||
            lower.contains("hevc") ||
            lower.contains("x265") ||
            subLower.endsWith(".ass") ||
            subLower.endsWith(".ssa")
    }

    private fun buildViews() {
        rootLayout = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
        }

        exoView = PlayerView(this).apply {
            useController = false
            setBackgroundColor(Color.BLACK)
            if (projectorMode) {
                subtitleView?.setStyle(
                    CaptionStyleCompat(
                        Color.parseColor("#FFF8E7"),
                        Color.argb(185, 0, 0, 0),
                        Color.TRANSPARENT,
                        CaptionStyleCompat.EDGE_TYPE_OUTLINE,
                        Color.BLACK,
                        null
                    )
                )
            }
        }

        vlcView = VLCVideoLayout(this).apply {
            visibility = View.GONE
        }

        loadingSpinner = ProgressBar(this).apply {
            isIndeterminate = true
            visibility = View.VISIBLE
        }
        val spinnerParams = FrameLayout.LayoutParams(
            dp(54),
            dp(54),
            Gravity.CENTER
        )

        overlayHud = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.argb(195, 10, 12, 16))
            setPadding(dp(28), dp(20), dp(28), dp(22))
        }

        val topRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        titleText = TextView(this).apply {
            text = streamTitle
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            setTypeface(null, Typeface.BOLD)
            maxLines = 1
        }
        val titleLp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)

        engineBadge = TextView(this).apply {
            setTextColor(Color.parseColor("#E8A95C"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setTypeface(null, Typeface.BOLD)
            setPadding(dp(12), dp(4), dp(12), dp(4))
        }
        topRow.addView(titleText, titleLp)
        topRow.addView(engineBadge)

        seekBar = SeekBar(this).apply {
            max = 1000
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(sb: SeekBar?, progress: Int, fromUser: Boolean) {
                    if (fromUser) {
                        val dur = currentDurationMs()
                        if (dur > 0L) {
                            val targetMs = (dur * progress) / 1000L
                            timeText.text = "${formatMs(targetMs)} / ${formatMs(dur)}"
                        }
                    }
                }

                override fun onStartTrackingTouch(sb: SeekBar?) {
                    isSeekingBar = true
                    uiHandler.removeCallbacks(hideHudRunnable)
                }

                override fun onStopTrackingTouch(sb: SeekBar?) {
                    isSeekingBar = false
                    val dur = currentDurationMs()
                    if (dur > 0L) {
                        seekToPositionMs((dur * (sb?.progress ?: 0)) / 1000L)
                    }
                    scheduleHudAutoHide()
                }
            })
        }

        val controlsRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(8), 0, 0)
        }

        val btnRew = makeHudButton("-10s") {
            seekByMs(-10_000L)
        }
        btnPlayPause = makeHudButton("Pause") {
            togglePlayPause()
        }
        val btnFwd = makeHudButton("+10s") {
            seekByMs(10_000L)
        }
        timeText = TextView(this).apply {
            text = "00:00 / 00:00"
            setTextColor(Color.parseColor("#E5E7EB"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            setPadding(dp(14), 0, dp(14), 0)
        }
        btnAudio = makeHudButton("Audio") { showAudioTrackDialog() }
        btnSub = makeHudButton("Subtitles") { showSubtitleTrackDialog() }
        btnBoost = makeHudButton(if (boostEnabled) "Boost On" else "Boost Off") { toggleBoost() }
        btnEngine = makeHudButton("Switch Engine") { switchEngine() }
        val btnClose = makeHudButton("Close") { finishPlayback() }

        controlsRow.addView(btnRew)
        controlsRow.addView(btnPlayPause)
        controlsRow.addView(btnFwd)
        controlsRow.addView(timeText, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        controlsRow.addView(btnAudio)
        controlsRow.addView(btnSub)
        controlsRow.addView(btnBoost)
        controlsRow.addView(btnEngine)
        controlsRow.addView(btnClose)

        overlayHud.addView(topRow)
        overlayHud.addView(seekBar, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        overlayHud.addView(controlsRow)

        val hudParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM
        )

        rootLayout.addView(exoView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        rootLayout.addView(vlcView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        rootLayout.addView(loadingSpinner, spinnerParams)
        rootLayout.addView(overlayHud, hudParams)

        rootLayout.setOnClickListener {
            setHudVisible(!hudVisible)
        }

        setContentView(rootLayout)
        btnPlayPause.requestFocus()
    }

    private fun makeHudButton(label: String, onClick: () -> Unit): Button {
        return Button(this).apply {
            text = label
            isAllCaps = false
            isFocusable = true
            isFocusableInTouchMode = true
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.argb(160, 40, 44, 54))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(38))
            lp.setMargins(dp(4), 0, dp(4), 0)
            layoutParams = lp
            setOnFocusChangeListener { v, hasFocus ->
                v.setBackgroundColor(
                    if (hasFocus) Color.parseColor("#E8A95C") else Color.argb(160, 40, 44, 54)
                )
                (v as? Button)?.setTextColor(if (hasFocus) Color.BLACK else Color.WHITE)
                if (hasFocus) scheduleHudAutoHide()
            }
            setOnClickListener {
                scheduleHudAutoHide()
                onClick()
            }
        }
    }

    private fun startConfiguredEngine(startPosMs: Long) {
        if (streamUrl.isBlank()) {
            ArgusNativePlayerState.status = "error"
            ArgusNativePlayerState.errorMessage = "Empty playback URL"
            ArgusNativePlayerState.notifyWebView()
            finish()
            return
        }

        loadingSpinner.visibility = View.VISIBLE
        if (activeEngine == "libvlc") {
            startLibVlc(startPosMs)
        } else {
            startExoPlayer(startPosMs)
        }
        updateEngineBadge()
    }

    private fun startExoPlayer(startPosMs: Long) {
        activeEngine = "exoplayer"
        ArgusNativePlayerState.activeEngine = "exoplayer"
        ArgusNativePlayerState.status = "loading"
        vlcView.visibility = View.GONE
        exoView.visibility = View.VISIBLE

        val ua = headersMap["User-Agent"] ?: headersMap["user-agent"] ?: "Argus-AndroidTV/3.17"
        val httpFactory = DefaultHttpDataSource.Factory()
            .setUserAgent(ua)
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(12_000)
            .setReadTimeoutMs(18_000)
        if (headersMap.isNotEmpty()) {
            httpFactory.setDefaultRequestProperties(headersMap)
        }
        val dataFactory = DefaultDataSource.Factory(this, httpFactory)

        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                if (lowRamMode) 10_000 else 15_000,
                if (lowRamMode) 25_000 else 45_000,
                1500,
                3000
            )
            .build()

        val renderersFactory = DefaultRenderersFactory(this)
            .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
            .setEnableDecoderFallback(true)

        val player = ExoPlayer.Builder(this, renderersFactory)
            .setMediaSourceFactory(DefaultMediaSourceFactory(dataFactory))
            .setLoadControl(loadControl)
            .build()

        player.setAudioAttributes(
            Media3AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                .build(),
            true
        )

        val itemBuilder = MediaItem.Builder().setUri(Uri.parse(streamUrl))
        if (subtitleUrl.isNotBlank()) {
            val subMime = guessSubtitleMime(subtitleUrl)
            itemBuilder.setSubtitleConfigurations(
                listOf(
                    MediaItem.SubtitleConfiguration.Builder(Uri.parse(subtitleUrl))
                        .setMimeType(subMime)
                        .setLanguage("und")
                        .setLabel("External Subtitle")
                        .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
                        .build()
                )
            )
        }

        player.setMediaItem(itemBuilder.build())
        if (startPosMs > 0L) player.seekTo(startPosMs)

        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                when (playbackState) {
                    Player.STATE_BUFFERING -> {
                        loadingSpinner.visibility = View.VISIBLE
                        ArgusNativePlayerState.status = "loading"
                    }
                    Player.STATE_READY -> {
                        loadingSpinner.visibility = View.GONE
                        applyExoLoudnessBoost(player.audioSessionId)
                        syncExoTracks(player)
                        ArgusNativePlayerState.status = if (player.isPlaying) "playing" else "paused"
                    }
                    Player.STATE_ENDED -> {
                        loadingSpinner.visibility = View.GONE
                        ArgusNativePlayerState.status = "ended"
                        ArgusNativePlayerState.positionMs = player.duration.coerceAtLeast(0L)
                        ArgusNativePlayerState.notifyWebView()
                    }
                }
                syncProgressUi()
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                btnPlayPause.text = if (isPlaying) "Pause" else "Play"
                if (player.playbackState == Player.STATE_READY) {
                    ArgusNativePlayerState.status = if (isPlaying) "playing" else "paused"
                    ArgusNativePlayerState.notifyWebView()
                }
            }

            override fun onTracksChanged(tracks: androidx.media3.common.Tracks) {
                syncExoTracks(player)
            }

            override fun onPlayerError(error: PlaybackException) {
                if (!fallbackAttempted) {
                    fallbackAttempted = true
                    val resumeMs = player.currentPosition.coerceAtLeast(pendingStartMs)
                    releaseExoOnly()
                    startLibVlc(resumeMs)
                    return
                }
                loadingSpinner.visibility = View.GONE
                ArgusNativePlayerState.status = "error"
                ArgusNativePlayerState.errorMessage = error.message ?: "ExoPlayer error (${error.errorCodeName})"
                ArgusNativePlayerState.notifyWebView()
            }
        })

        exoPlayer = player
        exoView.player = player
        player.prepare()
        player.play()
        updateEngineBadge()
    }

    private fun startLibVlc(startPosMs: Long) {
        activeEngine = "libvlc"
        ArgusNativePlayerState.activeEngine = "libvlc"
        ArgusNativePlayerState.status = "loading"
        exoView.visibility = View.GONE
        vlcView.visibility = View.VISIBLE

        val options = ArrayList<String>().apply {
            add("--no-drop-late-frames")
            add("--no-skip-frames")
            add("--avcodec-hw=any")
            add("--network-caching=" + if (lowRamMode) "2000" else "3000")
            if (projectorMode) {
                add("--freetype-color=16775399") // Warm amber #FFF8E7
                add("--freetype-outline-thickness=4")
                add("--sub-text-scale=110")
            }
            val ua = headersMap["User-Agent"] ?: headersMap["user-agent"]
            if (!ua.isNullOrBlank()) {
                add("--http-user-agent=$ua")
            }
            val ref = headersMap["Referer"] ?: headersMap["referer"]
            if (!ref.isNullOrBlank()) {
                add("--http-referrer=$ref")
            }
        }

        val vlc = LibVLC(this, options)
        val mp = MediaPlayer(vlc)
        libVlc = vlc
        vlcPlayer = mp

        mp.attachViews(vlcView, null, true, false)
        mp.setVolume(if (boostEnabled) 160 else 100)

        mp.setEventListener { event ->
            uiHandler.post {
                when (event.type) {
                    MediaPlayer.Event.Opening -> {
                        loadingSpinner.visibility = View.VISIBLE
                        ArgusNativePlayerState.status = "loading"
                    }
                    MediaPlayer.Event.Buffering -> {
                        if (event.buffering >= 99.5f) {
                            loadingSpinner.visibility = View.GONE
                        }
                    }
                    MediaPlayer.Event.Playing -> {
                        loadingSpinner.visibility = View.GONE
                        btnPlayPause.text = "Pause"
                        ArgusNativePlayerState.status = "playing"
                        syncVlcTracks(mp)
                        ArgusNativePlayerState.notifyWebView()
                    }
                    MediaPlayer.Event.Paused -> {
                        btnPlayPause.text = "Play"
                        ArgusNativePlayerState.status = "paused"
                        ArgusNativePlayerState.notifyWebView()
                    }
                    MediaPlayer.Event.EndReached -> {
                        loadingSpinner.visibility = View.GONE
                        ArgusNativePlayerState.status = "ended"
                        ArgusNativePlayerState.positionMs = ArgusNativePlayerState.durationMs
                        ArgusNativePlayerState.notifyWebView()
                    }
                    MediaPlayer.Event.EncounteredError -> {
                        loadingSpinner.visibility = View.GONE
                        ArgusNativePlayerState.status = "error"
                        ArgusNativePlayerState.errorMessage = "LibVLC could not open stream"
                        ArgusNativePlayerState.notifyWebView()
                    }
                    MediaPlayer.Event.TimeChanged -> {
                        ArgusNativePlayerState.positionMs = event.timeChanged.coerceAtLeast(0L)
                    }
                    MediaPlayer.Event.LengthChanged -> {
                        ArgusNativePlayerState.durationMs = event.lengthChanged.coerceAtLeast(0L)
                    }
                }
            }
        }

        val media = Media(vlc, Uri.parse(streamUrl)).apply {
            setHWDecoderEnabled(true, false)
            addOption(":network-caching=" + if (lowRamMode) "2000" else "3000")
            if (startPosMs > 0L) {
                addOption(":start-time=${startPosMs / 1000L}")
            }
        }
        mp.media = media
        media.release()

        if (subtitleUrl.isNotBlank()) {
            try {
                mp.addSlave(IMedia.Slave.Type.Subtitle, Uri.parse(subtitleUrl), true)
            } catch (_: Throwable) {
            }
        }
        mp.play()
        updateEngineBadge()
    }

    private fun applyExoLoudnessBoost(audioSessionId: Int) {
        if (audioSessionId == 0) return
        try {
            loudnessEnhancer?.release()
            loudnessEnhancer = LoudnessEnhancer(audioSessionId).apply {
                setTargetGain(if (boostEnabled) 600 else 0)
                enabled = boostEnabled
            }
        } catch (_: Throwable) {
            loudnessEnhancer = null
        }
    }

    private fun toggleBoost() {
        boostEnabled = !boostEnabled
        ArgusNativePlayerState.volumeBoostEnabled = boostEnabled
        btnBoost.text = if (boostEnabled) "Boost On" else "Boost Off"
        if (activeEngine == "libvlc") {
            vlcPlayer?.setVolume(if (boostEnabled) 160 else 100)
        } else {
            try {
                loudnessEnhancer?.setTargetGain(if (boostEnabled) 600 else 0)
                loudnessEnhancer?.enabled = boostEnabled
            } catch (_: Throwable) {
            }
        }
    }

    private fun switchEngine() {
        val resumeMs = currentPositionMs()
        releasePlayers()
        fallbackAttempted = true
        activeEngine = if (activeEngine == "exoplayer") "libvlc" else "exoplayer"
        startConfiguredEngine(resumeMs)
    }

    private fun updateEngineBadge() {
        engineBadge.text = if (activeEngine == "libvlc") "LIBVLC NATIVE" else "MEDIA3 EXOPLAYER"
    }

    private fun syncExoTracks(player: ExoPlayer) {
        val audioArr = JSONArray()
        val subArr = JSONArray()
        for ((gIdx, group) in player.currentTracks.groups.withIndex()) {
            if (group.type == C.TRACK_TYPE_AUDIO) {
                for (tIdx in 0 until group.length) {
                    val fmt = group.getTrackFormat(tIdx)
                    val label = listOfNotNull(fmt.label, fmt.language, fmt.sampleMimeType)
                        .filter { it.isNotBlank() }
                        .joinToString(" · ")
                        .ifBlank { "Audio #${tIdx + 1}" }
                    val item = JSONObject().apply {
                        put("id", "$gIdx:$tIdx")
                        put("label", label)
                        put("lang", fmt.language ?: "")
                        put("selected", group.isTrackSelected(tIdx))
                    }
                    if (group.isTrackSelected(tIdx)) {
                        ArgusNativePlayerState.currentAudioTrackId = "$gIdx:$tIdx"
                    }
                    audioArr.put(item)
                }
            } else if (group.type == C.TRACK_TYPE_TEXT) {
                for (tIdx in 0 until group.length) {
                    val fmt = group.getTrackFormat(tIdx)
                    val label = listOfNotNull(fmt.label, fmt.language)
                        .filter { it.isNotBlank() }
                        .joinToString(" · ")
                        .ifBlank { "Subtitle #${tIdx + 1}" }
                    val item = JSONObject().apply {
                        put("id", "$gIdx:$tIdx")
                        put("label", label)
                        put("lang", fmt.language ?: "")
                        put("selected", group.isTrackSelected(tIdx))
                    }
                    if (group.isTrackSelected(tIdx)) {
                        ArgusNativePlayerState.currentSubtitleTrackId = "$gIdx:$tIdx"
                    }
                    subArr.put(item)
                }
            }
        }
        ArgusNativePlayerState.audioTracksJson = audioArr.toString()
        ArgusNativePlayerState.subtitleTracksJson = subArr.toString()
    }

    private fun syncVlcTracks(mp: MediaPlayer) {
        val audioArr = JSONArray()
        val currentAudio = mp.audioTrack
        mp.audioTracks?.forEach { t ->
            if (t.id >= 0) {
                audioArr.put(JSONObject().apply {
                    put("id", t.id.toString())
                    put("label", t.name ?: "Audio ${t.id}")
                    put("selected", t.id == currentAudio)
                })
            }
        }
        val subArr = JSONArray()
        val currentSub = mp.spuTrack
        mp.spuTracks?.forEach { t ->
            if (t.id >= 0) {
                subArr.put(JSONObject().apply {
                    put("id", t.id.toString())
                    put("label", t.name ?: "Subtitle ${t.id}")
                    put("selected", t.id == currentSub)
                })
            }
        }
        ArgusNativePlayerState.currentAudioTrackId = currentAudio.toString()
        ArgusNativePlayerState.currentSubtitleTrackId = currentSub.toString()
        ArgusNativePlayerState.audioTracksJson = audioArr.toString()
        ArgusNativePlayerState.subtitleTracksJson = subArr.toString()
    }

    private fun showAudioTrackDialog() {
        val arr = JSONArray(ArgusNativePlayerState.audioTracksJson)
        if (arr.length() == 0) return
        val labels = Array(arr.length()) { i -> arr.getJSONObject(i).optString("label", "Track ${i + 1}") }
        val ids = Array(arr.length()) { i -> arr.getJSONObject(i).optString("id", "") }
        AlertDialog.Builder(this)
            .setTitle("Audio Track")
            .setItems(labels) { _, which -> selectAudioTrack(ids[which]) }
            .show()
    }

    private fun showSubtitleTrackDialog() {
        val arr = JSONArray(ArgusNativePlayerState.subtitleTracksJson)
        val labels = Array(arr.length() + 1) { i ->
            if (i == 0) "Off" else arr.getJSONObject(i - 1).optString("label", "Subtitle $i")
        }
        val ids = Array(arr.length() + 1) { i ->
            if (i == 0) "" else arr.getJSONObject(i - 1).optString("id", "")
        }
        AlertDialog.Builder(this)
            .setTitle("Subtitles")
            .setItems(labels) { _, which -> selectSubtitleTrack(ids[which].takeIf { it.isNotEmpty() }) }
            .show()
    }

    fun selectAudioTrack(trackId: String) {
        if (activeEngine == "libvlc") {
            trackId.toIntOrNull()?.let { vlcPlayer?.setAudioTrack(it) }
            syncVlcTracks(vlcPlayer ?: return)
            return
        }
        val player = exoPlayer ?: return
        val parts = trackId.split(":")
        val gIdx = parts.getOrNull(0)?.toIntOrNull() ?: return
        val tIdx = parts.getOrNull(1)?.toIntOrNull() ?: return
        val group = player.currentTracks.groups.getOrNull(gIdx) ?: return
        player.trackSelectionParameters = player.trackSelectionParameters
            .buildUpon()
            .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, listOf(tIdx)))
            .build()
    }

    fun selectSubtitleTrack(trackId: String?) {
        if (activeEngine == "libvlc") {
            vlcPlayer?.setSpuTrack(trackId?.toIntOrNull() ?: -1)
            syncVlcTracks(vlcPlayer ?: return)
            return
        }
        val player = exoPlayer ?: return
        val builder = player.trackSelectionParameters.buildUpon()
        if (trackId.isNullOrBlank()) {
            builder.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
        } else {
            val parts = trackId.split(":")
            val gIdx = parts.getOrNull(0)?.toIntOrNull() ?: return
            val tIdx = parts.getOrNull(1)?.toIntOrNull() ?: return
            val group = player.currentTracks.groups.getOrNull(gIdx) ?: return
            builder.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
            builder.setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, listOf(tIdx)))
        }
        player.trackSelectionParameters = builder.build()
    }

    fun addExternalSubtitleUrl(url: String) {
        if (url.isBlank()) return
        subtitleUrl = url
        if (activeEngine == "libvlc") {
            uiHandler.post {
                try {
                    vlcPlayer?.addSlave(IMedia.Slave.Type.Subtitle, Uri.parse(url), true)
                } catch (_: Throwable) {
                }
            }
        } else {
            val pos = currentPositionMs()
            uiHandler.post {
                releaseExoOnly()
                startExoPlayer(pos)
            }
        }
    }

    fun togglePlayPause() {
        if (activeEngine == "libvlc") {
            val mp = vlcPlayer ?: return
            if (mp.isPlaying) mp.pause() else mp.play()
        } else {
            val p = exoPlayer ?: return
            if (p.isPlaying) p.pause() else p.play()
        }
        setHudVisible(true)
    }

    fun pausePlayback() {
        if (activeEngine == "libvlc") vlcPlayer?.pause() else exoPlayer?.pause()
    }

    fun resumePlayback() {
        if (activeEngine == "libvlc") vlcPlayer?.play() else exoPlayer?.play()
    }

    fun seekToPositionMs(targetMs: Long) {
        val safeMs = targetMs.coerceAtLeast(0L)
        if (activeEngine == "libvlc") {
            vlcPlayer?.setTime(safeMs)
        } else {
            exoPlayer?.seekTo(safeMs)
        }
        ArgusNativePlayerState.positionMs = safeMs
        syncProgressUi()
    }

    fun setPlaybackRate(rate: Float) {
        val clamped = rate.coerceIn(0.25f, 3.0f)
        ArgusNativePlayerState.playbackRate = clamped
        if (activeEngine == "libvlc") {
            vlcPlayer?.setRate(clamped)
        } else {
            exoPlayer?.playbackParameters = PlaybackParameters(clamped)
        }
    }

    private fun seekByMs(deltaMs: Long) {
        seekToPositionMs(currentPositionMs() + deltaMs)
        setHudVisible(true)
    }

    private fun currentPositionMs(): Long {
        return if (activeEngine == "libvlc") {
            (vlcPlayer?.time ?: 0L).coerceAtLeast(0L)
        } else {
            (exoPlayer?.currentPosition ?: 0L).coerceAtLeast(0L)
        }
    }

    private fun currentDurationMs(): Long {
        val dur = if (activeEngine == "libvlc") {
            vlcPlayer?.length ?: 0L
        } else {
            val d = exoPlayer?.duration ?: C.TIME_UNSET
            if (d == C.TIME_UNSET) 0L else d
        }
        return dur.coerceAtLeast(0L)
    }

    private fun syncProgressUi() {
        val pos = currentPositionMs()
        val dur = currentDurationMs()
        ArgusNativePlayerState.positionMs = pos
        ArgusNativePlayerState.durationMs = dur
        if (activeEngine == "exoplayer") {
            ArgusNativePlayerState.bufferedMs = (exoPlayer?.bufferedPosition ?: 0L).coerceAtLeast(0L)
        }
        if (!isSeekingBar) {
            if (dur > 0L) {
                seekBar.progress = ((pos * 1000L) / dur).toInt().coerceIn(0, 1000)
            }
            timeText.text = "${formatMs(pos)} / ${formatMs(dur)}"
        }
        ArgusNativePlayerState.notifyWebView()
    }

    private fun setHudVisible(show: Boolean) {
        hudVisible = show
        overlayHud.visibility = if (show) View.VISIBLE else View.GONE
        if (show) {
            scheduleHudAutoHide()
        } else {
            uiHandler.removeCallbacks(hideHudRunnable)
        }
    }

    private fun scheduleHudAutoHide() {
        uiHandler.removeCallbacks(hideHudRunnable)
        uiHandler.postDelayed(hideHudRunnable, 5000L)
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
                KeyEvent.KEYCODE_SPACE -> {
                    togglePlayPause()
                    return true
                }
                KeyEvent.KEYCODE_MEDIA_PLAY -> {
                    resumePlayback()
                    return true
                }
                KeyEvent.KEYCODE_MEDIA_PAUSE -> {
                    pausePlayback()
                    return true
                }
                KeyEvent.KEYCODE_DPAD_CENTER,
                KeyEvent.KEYCODE_ENTER -> {
                    if (!hudVisible) {
                        togglePlayPause()
                        return true
                    }
                }
                KeyEvent.KEYCODE_DPAD_LEFT,
                KeyEvent.KEYCODE_MEDIA_REWIND -> {
                    if (!hudVisible) {
                        seekByMs(-10_000L)
                        return true
                    }
                }
                KeyEvent.KEYCODE_DPAD_RIGHT,
                KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> {
                    if (!hudVisible) {
                        seekByMs(10_000L)
                        return true
                    }
                }
                KeyEvent.KEYCODE_DPAD_UP,
                KeyEvent.KEYCODE_DPAD_DOWN,
                KeyEvent.KEYCODE_MENU,
                KeyEvent.KEYCODE_INFO -> {
                    if (!hudVisible) {
                        setHudVisible(true)
                        btnPlayPause.requestFocus()
                        return true
                    }
                }
                KeyEvent.KEYCODE_BACK -> {
                    if (hudVisible) {
                        setHudVisible(false)
                    } else {
                        finishPlayback()
                    }
                    return true
                }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    fun finishPlayback() {
        ArgusNativePlayerState.positionMs = currentPositionMs()
        ArgusNativePlayerState.durationMs = currentDurationMs()
        if (ArgusNativePlayerState.status == "playing" || ArgusNativePlayerState.status == "loading") {
            ArgusNativePlayerState.status = "paused"
        }
        ArgusNativePlayerState.notifyWebView()
        finish()
    }

    private fun releaseExoOnly() {
        try {
            loudnessEnhancer?.release()
        } catch (_: Throwable) {
        }
        loudnessEnhancer = null
        exoView.player = null
        exoPlayer?.release()
        exoPlayer = null
    }

    private fun releaseVlcOnly() {
        try {
            vlcPlayer?.stop()
            vlcPlayer?.detachViews()
            vlcPlayer?.release()
        } catch (_: Throwable) {
        }
        vlcPlayer = null
        try {
            libVlc?.release()
        } catch (_: Throwable) {
        }
        libVlc = null
    }

    private fun releasePlayers() {
        releaseExoOnly()
        releaseVlcOnly()
    }

    override fun onDestroy() {
        uiHandler.removeCallbacksAndMessages(null)
        releasePlayers()
        ArgusNativePlayerState.activityRef = null
        super.onDestroy()
    }

    @Suppress("DEPRECATION")
    private fun applyImmersiveFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
        } else {
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                    View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                )
        }
    }

    private fun guessSubtitleMime(url: String): String {
        val lower = url.lowercase(Locale.US)
        return when {
            lower.contains(".vtt") -> MimeTypes.TEXT_VTT
            lower.contains(".ass") || lower.contains(".ssa") -> MimeTypes.TEXT_SSA
            else -> MimeTypes.APPLICATION_SUBRIP
        }
    }

    private fun formatMs(ms: Long): String {
        val totalSec = (ms / 1000L).coerceAtLeast(0L)
        val hours = totalSec / 3600L
        val mins = (totalSec % 3600L) / 60L
        val secs = totalSec % 60L
        return if (hours > 0L) {
            String.format(Locale.US, "%d:%02d:%02d", hours, mins, secs)
        } else {
            String.format(Locale.US, "%02d:%02d", mins, secs)
        }
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()
    }
}
