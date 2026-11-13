package app.argus.player

import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.StateListDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.MotionEvent
import android.view.KeyEvent
import android.view.inputmethod.InputMethodManager
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.Future

/** Android's launcher is independent of Tauri and System WebView. */
class NativeTvActivity : AppCompatActivity() {
    private lateinit var store: NativeMediaStore
    private lateinit var cloud: NativeCloudAccount
    private val syncWorker = Executors.newSingleThreadExecutor()
    private var syncBusy = false
    private var syncQueued = false
    private var lastSyncAttempt = 0L
    private var resolvingTorrent = false
    private var restoreTracksFor: String? = null
    private var restoreAudio = ""
    private var restoreSubtitle = ""
    private val bigPicture: Boolean get() = getSharedPreferences("argus_native_display", MODE_PRIVATE)
        .getBoolean("bigPicture", resources.configuration.screenWidthDp >= 840 ||
            resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_TYPE_MASK == android.content.res.Configuration.UI_MODE_TYPE_TELEVISION)
    private val horizontalPadding: Int get() = if (bigPicture) 28 else 12
    private lateinit var player: NativePlaybackSession
    private val posters = NativePosterLoader()
    private lateinit var root: LinearLayout
    private lateinit var body: LinearLayout
    private lateinit var status: TextView
    private val io = Executors.newFixedThreadPool(4)
    private val tasks = mutableListOf<Future<*>>()
    private val handler = Handler(Looper.getMainLooper())
    private var page = 0
    private var route = "Home"
    private var currentMeta: JSONObject? = null
    private var playingMeta: JSONObject? = null
    private var playingVideo: String? = null
    private var inPlayback = false
    private val progress = object : Runnable {
        override fun run() {
            if (inPlayback) saveProgress()
            handler.postDelayed(this, 3000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).hide(WindowInsetsCompat.Type.systemBars())
        cloud = NativeCloudAccount(this)
        selectAccountStore()
        player = NativePlaybackSession(this)
        player.onClosed = {
            inPlayback = false
            saveProgress()
            NativeTorrentBridge.stop(this)
            player.snapshot { snapshot ->
                if (!snapshot.isNull("errorMessage")) {
                    AlertDialog.Builder(this).setTitle("Couldn't play this source")
                        .setMessage("The source failed or uses an unsupported format. Your progress is saved; choose another source.")
                        .setPositiveButton("Choose another source") { _, _ -> }.show()
                }
            }
        }
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(horizontalPadding), dp(18), dp(horizontalPadding), dp(18))
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(Color.rgb(28, 30, 35), Color.rgb(18, 19, 23)),
            )
        }
        setContentView(root)
        val bar = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        val wordmark = label("ARGUS", if (bigPicture) 25 else 22).apply { setTypeface(null, Typeface.BOLD) }
        if (bigPicture) bar.addView(wordmark, LinearLayout.LayoutParams(dp(140), -2)) else root.addView(wordmark)
        for (name in listOf("Home", "Search", "Library", "Add-ons", "Settings")) {
            bar.addView(button(name) {
                when (name) {
                    "Home" -> home()
                    "Search" -> search()
                    "Library" -> library()
                    "Add-ons" -> addons()
                    else -> settings()
                }
            }, (if (bigPicture) LinearLayout.LayoutParams(0, dp(54), 1f) else LinearLayout.LayoutParams(-2, dp(50))).apply { marginEnd = dp(8) })
        }
        if (bigPicture) root.addView(bar) else root.addView(HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false; addView(bar) })
        status = label("", 16).apply { setPadding(0, dp(10), 0, dp(10)) }
        root.addView(status)
        val scroll = ScrollView(this).apply { isFillViewport = true }
        body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        scroll.addView(body)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        handler.post(progress)
        scheduleSync()
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (route != "Home") home() else finish() }
        })
        if (cloud.needsUnlock()) accounts()
        else if (savedInstanceState?.getString("meta") != null) detail(JSONObject(savedInstanceState.getString("meta")!!))
        else home()
        handleIntent(intent)
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
    private fun label(value: String, size: Int = 18): TextView = TextView(this).apply {
        text = value
        textSize = size.toFloat()
        setTextColor(Color.rgb(244, 245, 247))
        setPadding(0, dp(5), 0, dp(5))
    }
    private fun background(color: Int) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(14).toFloat()
        setStroke(dp(1), Color.argb(28, 255, 255, 255))
    }
    private fun focusBackground() = StateListDrawable().apply {
        addState(intArrayOf(android.R.attr.state_focused), background(Color.rgb(42, 44, 52)).apply { setStroke(dp(2), Color.rgb(235, 175, 108)) })
        addState(intArrayOf(android.R.attr.state_pressed), background(Color.rgb(42, 46, 58)))
        addState(intArrayOf(), background(Color.rgb(18, 20, 26)))
    }
    private fun clipRounded(view: ImageView, radiusDp: Int = 12): ImageView = view.apply {
        clipToOutline = true
        outlineProvider = object : android.view.ViewOutlineProvider() {
            override fun getOutline(v: View, outline: android.graphics.Outline) {
                outline.setRoundRect(0, 0, v.width, v.height, dp(radiusDp).toFloat())
            }
        }
    }

    private fun activate(view: View, action: () -> Unit) {
        view.setOnFocusChangeListener { v, hasFocus ->
            val s = if (hasFocus) 1.035f else 1f
            v.animate().scaleX(s).scaleY(s).setDuration(160).start()
        }
        view.setOnClickListener { action() }
        var touching = false
        view.setOnTouchListener { target, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> { touching = true; false }
                MotionEvent.ACTION_CANCEL -> { touching = false; false }
                MotionEvent.ACTION_UP -> {
                    val click = touching && event.x >= 0 && event.x < target.width && event.y >= 0 && event.y < target.height
                    touching = false
                    if (click) { target.isPressed = false; target.requestFocus(); target.performClick(); true } else false
                }
                else -> false
            }
        }
    }
    private fun button(value: String, action: () -> Unit): Button = Button(this).apply {
        text = value
        textSize = 17f
        isAllCaps = false
        setTextColor(Color.WHITE)
        gravity = Gravity.CENTER_VERTICAL
        setPadding(dp(18), dp(10), dp(18), dp(10))
        minHeight = dp(52)
        isFocusable = true
        isFocusableInTouchMode = true
        background = focusBackground()
        activate(this, action)
    }
    private fun addButton(text: String, action: () -> Unit): Button = button(text, action).also {
        body.addView(it, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) })
    }
    private fun input(hintText: String, value: String = ""): EditText = EditText(this).apply {
        var editing = false
        hint = hintText
        setText(value)
        textSize = 19f
        setTextColor(Color.WHITE)
        setHintTextColor(Color.LTGRAY)
        setSingleLine(true)
        showSoftInputOnFocus = false
        isCursorVisible = false
        isLongClickable = false
        setOnFocusChangeListener { _, focused ->
            if (!focused) { editing = false; isCursorVisible = false; isLongClickable = false; showSoftInputOnFocus = false }
        }
        setOnKeyListener { target, key, event ->
            if (!editing && (key == KeyEvent.KEYCODE_DPAD_CENTER || key == KeyEvent.KEYCODE_ENTER)) {
                if (event.action == KeyEvent.ACTION_UP) target.performClick()
                true
            } else if (!editing && (event.isPrintingKey || key == KeyEvent.KEYCODE_DEL)) true
            else false
        }
        activate(this) {
            editing = true
            isCursorVisible = true
            isLongClickable = true
            showSoftInputOnFocus = true
            requestFocus()
            (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).showSoftInput(this, InputMethodManager.SHOW_IMPLICIT)
        }
        body.addView(this, LinearLayout.LayoutParams(-1, dp(60)))
    }
    private fun begin(name: String): Int {
        if (resolvingTorrent) NativeTorrentBridge.stop(this)
        resolvingTorrent = false
        page++
        tasks.forEach { it.cancel(true) }
        tasks.clear()
        route = name
        body.removeAllViews()
        status.text = name
        currentMeta = null
        return page
    }
    private fun work(epoch: Int = page, run: () -> Unit) {
        tasks.add(io.submit {
            try { run() }
            catch (_: Exception) { ui(epoch) { status.text = "Couldn't connect. Check your connection and try again." } }
        })
    }
    private fun ui(epoch: Int, run: () -> Unit) = runOnUiThread {
        if (!isDestroyed && !isFinishing && epoch == page) run()
    }
    private fun focusContent() {
        fun first(view: View): View? {
            if (view.isFocusable && view.isEnabled && view.visibility == View.VISIBLE) return view
            if (view is ViewGroup) for (i in 0 until view.childCount) first(view.getChildAt(i))?.let { return it }
            return null
        }
        first(body)?.requestFocus()
    }

    private fun home() {
        val epoch = begin("Home")
        val history = store.history()
        continueRail(history)
        addButton("Browse movies") { browse("movie") }
        addButton("Browse series") { browse("series") }
        store.catalogs().map { it.type }.distinct().filter { it == "tv" || it == "channel" }.forEach { type ->
            addButton("Live TV · $type") { browse(type) }
        }
        val catalogs = store.catalogs().filterNot { c ->
            val entries = c.addon.manifest.optJSONArray("catalogs")
            val entry = (0 until (entries?.length() ?: 0)).mapNotNull { entries!!.optJSONObject(it) }.firstOrNull { it.optString("id") == c.id && it.optString("type") == c.type }
            val extras = entry?.optJSONArray("extra")
            (0 until (extras?.length() ?: 0)).any { extras!!.optJSONObject(it)?.let { extra -> extra.optString("name") == "search" && extra.optBoolean("isRequired") } == true }
        }
        catalogs.take(4).forEach { c ->
            val section = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            body.addView(section)
            section.addView(label("${c.name} · ${c.type}", 23))
            section.addView(button("Browse ${c.name}") { browse(c.type, c) })
            work(epoch) {
                val preview = try { store.catalog(c).take(6) } catch (_: Exception) { emptyList() }
                ui(epoch) { cards(preview, section) }
            }
        }
        if (store.installed().isEmpty()) {
            body.addView(label("Welcome. Connect a catalog to discover films and series. Your library is saved on this device."))
            addButton("Set up catalog") { defaultCatalog(epoch) }
            addButton("Install an add-on") { addons() }
        }
        focusContent()
    }
    private fun defaultCatalog(epoch: Int) {
        status.text = "Connecting to Cinemeta…"
        val target = store
        work(epoch) {
            target.install(NativeMediaStore.CINEMETA)
            ui(epoch) { home() }
        }
    }
    private fun browse(type: String, selected: NativeCatalog? = null, skip: Int = 0) {
        val epoch = begin(if (type == "series") "Series" else "Movies")
        val catalogs = if (selected != null) listOf(selected) else store.catalogs().filter { it.type == type }
        if (catalogs.isEmpty()) {
            body.addView(label("No catalog installed for this category."))
            addButton("Set up catalog") { defaultCatalog(epoch) }
            addButton("Manage add-ons") { addons() }
            return
        }
        status.text = "Loading ${selected?.name ?: type}…"
        val retry = addButton("Retry") { browse(type, selected, skip) }
        retry.requestFocus()
        var completed = 0
        var count = 0
        var displayed = 0
        catalogs.take(8).forEach { catalog ->
            work(epoch) {
                val result = try { store.catalog(catalog, skip = skip) } catch (_: Exception) { emptyList() }
                ui(epoch) {
                    completed++
                    if (result.isNotEmpty()) {
                        body.addView(label(catalog.name, 23))
                        val visible = result.take(minOf(24, (60 - displayed).coerceAtLeast(0)))
                        val first = cards(visible)
                        displayed += visible.size
                        if (count == 0 && currentFocus == retry) first?.requestFocus()
                        if (result.size >= 20 || visible.isEmpty()) addButton("More from ${catalog.name}") { browse(type, catalog, if (visible.isEmpty()) 0 else skip + visible.size) }
                    }
                    count += result.size
                    status.text = if (completed == catalogs.take(8).size) {
                        if (count == 0) "No titles returned. Try another catalog or retry." else "${count} titles"
                    } else "Loading catalogs…"
                }
            }
        }
    }
    private fun cards(items: List<JSONObject>, destination: LinearLayout = body): View? {
        var first: View? = null
        val columns = when {
            bigPicture && resources.configuration.screenWidthDp >= 900 -> 5
            resources.configuration.screenWidthDp >= 600 -> 4
            else -> 2
        }
        val width = (resources.configuration.screenWidthDp - horizontalPadding * 2 - columns * 10) / columns
        items.chunked(columns).forEach { row ->
            val layout = LinearLayout(this)
            row.forEach { meta ->
                val tile = LinearLayout(this).apply {
                    tag = meta.optString("type") + ":" + meta.optString("id")
                    orientation = LinearLayout.VERTICAL
                    setPadding(dp(4), dp(4), dp(4), dp(4))
                    isFocusable = true
                    isFocusableInTouchMode = true
                    isClickable = true
                    background = focusBackground()
                    activate(this) { detail(meta) }
                }
                val image = clipRounded(ImageView(this).apply {
                    scaleType = ImageView.ScaleType.CENTER_CROP
                    setImageResource(R.drawable.argus_native_banner)
                })
                tile.addView(image, LinearLayout.LayoutParams(-1, dp((width * 1.5).toInt())))
                tile.addView(label(meta.optString("name", meta.optString("id")), if (bigPicture) 19 else 17).apply {
                    maxLines = 2
                    ellipsize = android.text.TextUtils.TruncateAt.END
                })
                tile.addView(label(meta.optString("releaseInfo", meta.optString("year")), 14).apply { setTextColor(Color.rgb(165, 168, 178)) })
                posters.load(image, meta.optString("poster"))
                if (first == null) first = tile
                layout.addView(tile, LinearLayout.LayoutParams(0, -2, 1f).apply { marginEnd = dp(10); bottomMargin = dp(12) })
            }
            repeat(columns - row.size) { layout.addView(View(this), LinearLayout.LayoutParams(0, 1, 1f).apply { marginEnd = dp(10) }) }
            destination.addView(layout)
        }
        return first
    }
    private fun search() {
        begin("Search")
        val field = input("Search films and series")
        fun submit() {
            val query = field.text.toString().trim()
            if (query.isBlank()) return
            (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(field.windowToken, 0)
            results(query)
        }
        field.imeOptions = android.view.inputmethod.EditorInfo.IME_ACTION_SEARCH
        field.setOnEditorActionListener { _, _, _ -> submit(); true }
        addButton("Search titles") { submit() }
        focusContent()
    }
    private fun results(query: String) {
        val epoch = begin("Search results")
        val changeSearch = addButton("Change search") { search() }
        changeSearch.requestFocus()
        val catalogs = store.catalogs().filter { it.searchable }.take(12)
        if (catalogs.isEmpty()) {
            body.addView(label("Install a searchable catalog to search titles."))
            addButton("Manage add-ons") { addons() }
            return
        }
        status.text = "Searching…"
        var completed = 0
        var count = 0
        val seen = mutableSetOf<String>()
        val matches = mutableListOf<JSONObject>()
        val grid = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        body.addView(grid)
        catalogs.forEach { c -> work(epoch) {
            val result = try { store.catalog(c, query) } catch (_: Exception) { emptyList() }
            ui(epoch) {
                val unique = result.filter { seen.add(it.optString("type") + ":" + it.optString("id")) }
                val focusedTitle = currentFocus?.tag
                val focusResults = currentFocus == changeSearch || focusedTitle is String
                matches.addAll(unique)
                grid.removeAllViews()
                val first = cards(matches.take(60), grid)
                if (focusResults) {
                    (focusedTitle?.let { grid.findViewWithTag<View>(it) } ?: first)?.requestFocus()
                }
                count += unique.size
                completed++
                status.text = if (completed == catalogs.size) "$count results for “$query”" else "Searching…"
            }
        } }
    }
    private fun detail(meta: JSONObject) {
        val epoch = begin("Title details")
        currentMeta = meta
        body.addView(label(meta.optString("name"), 28))
        status.text = "Loading details…"
        work(epoch) {
            val full = store.detail(meta)
            ui(epoch) { renderDetail(full) }
        }
    }
    private fun renderDetail(meta: JSONObject) {
        body.removeAllViews()
        currentMeta = meta
        status.text = "Title details"
        body.addView(label(meta.optString("name"), 28))
        body.addView(label(listOf(meta.optString("releaseInfo"), meta.optString("runtime"), meta.optString("imdbRating").takeIf { it.isNotBlank() }?.let { "Rating $it" } ?: "").filter { it.isNotBlank() }.joinToString(" · ")))
        body.addView(label(meta.optString("description", "No description available.")).apply { maxLines = 8 })
        addButton(if (store.inLibrary(meta)) "Remove from Library" else "Save to Library") {
            store.toggleLibrary(meta)
            renderDetail(meta)
        }
        var primary: View? = null
        if (meta.optString("type") == "series") {
            val videos = meta.optJSONArray("videos")
            if (videos == null || videos.length() == 0) body.addView(label("This catalog did not provide episodes. Try another metadata add-on."))
            else {
                val episodes = (0 until videos.length()).mapNotNull { videos.optJSONObject(it) }.filter { it.optString("id").isNotBlank() }
                    .sortedWith(compareBy({ it.optInt("season") }, { it.optInt("episode") }))
                val seasons = episodes.map { it.optInt("season") }.distinct()
                seasons.forEach { season -> val seasonButton = addButton("Season $season") {
                    val filtered = episodes.filter { it.optInt("season") == season }
                    AlertDialog.Builder(this).setTitle("Season $season")
                        .setItems(filtered.map { "${it.optInt("episode")}. ${it.optString("title", it.optString("name", "Episode"))}" }.toTypedArray()) { _, index ->
                            sources(meta, filtered[index].getString("id"))
                        }.setNegativeButton("Cancel", null).show()
                }; if (primary == null) primary = seasonButton }
            }
        } else primary = addButton("Choose source") { sources(meta, meta.getString("id")) }
        primary?.let { it.requestFocus() } ?: focusContent()
    }
    private fun sources(meta: JSONObject, videoId: String) {
        val epoch = begin("Sources")
        currentMeta = meta
        body.addView(label(meta.optString("name"), 26))
        val resume = store.resume(videoId)
        if (resume > 0) body.addView(label("Resume from ${time(resume)}"))
        val back = addButton("Back to title") { detail(meta) }
        back.requestFocus()
        val addons = store.installed()
        if (addons.isEmpty()) {
            body.addView(label("Install a streaming add-on to find sources."))
            addButton("Manage add-ons") { this.addons() }
            return
        }
        status.text = "Checking sources…"
        var completed = 0
        var count = 0
        addons.forEach { addon -> work(epoch) {
            val streams = try { store.streams(addon, meta.optString("type", "movie"), videoId) } catch (_: Exception) { emptyList() }
            ui(epoch) {
                completed++
                streams.take(100).forEachIndexed { index, source ->
                    val title = listOf(source.addon, source.data.optString("name"), source.data.optString("title", source.data.optString("description"))).filter { it.isNotBlank() }.joinToString(" · ")
                    val sourceButton = addButton(title.ifBlank { "Play source" }) { play(meta, videoId, source) }
                    if (count == 0 && index == 0 && currentFocus == back) sourceButton.requestFocus()
                }
                count += streams.size
                status.text = if (completed == addons.size) {
                    if (count == 0) "No sources found. Check your add-ons and try again." else "$count sources"
                } else "$count sources · checking more add-ons…"
                if (completed == addons.size) {
                    addButton("Retry sources") { sources(meta, videoId) }
                    addButton("Manage add-ons") { this.addons() }
                }
            }
        } }
    }
    private fun play(meta: JSONObject, videoId: String, source: NativeSource) {
        val url = source.data.optString("url")
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            if (source.data.optString("infoHash").isNotBlank() || url.startsWith("magnet:?", true)) {
                if (resolvingTorrent) return
                resolvingTorrent = true
                val epoch = page
                status.text = "Finding torrent peers… You can go back to cancel."
                NativeTorrentBridge.resolve(this, source.data) { result -> ui(epoch) {
                    resolvingTorrent = false
                    result.fold({ resolved ->
                        play(meta, videoId, NativeSource(source.addon, JSONObject(source.data.toString()).put("url", resolved).put("_nativeTorrent", true)))
                    }, {
                        NativeTorrentBridge.stop(this)
                        status.text = "Torrent couldn't start. Try another source."
                        AlertDialog.Builder(this).setTitle("Couldn't start torrent")
                            .setMessage("No peers were reached, the file is unavailable, or storage is insufficient. Choose another source and retry.")
                            .setPositiveButton("Choose another source", null).show()
                    })
                } }
            } else AlertDialog.Builder(this).setTitle("Unsupported source")
                .setMessage("Choose a direct stream or a torrent source with a valid info hash.")
                .setPositiveButton("Choose another source", null).show()
            return
        }
        val args = LoadArgs().apply {
            this.url = url
            title = meta.optString("name")
            projector = bigPicture
            startAtSec = store.resume(videoId)
            audioLanguage = store.audioLanguage()
            subtitleLanguage = store.subtitleLanguage()
            if (restoreTracksFor == videoId) { audioLanguage = restoreAudio; subtitleLanguage = restoreSubtitle }
            val requestHeaders = source.data.optJSONObject("behaviorHints")?.optJSONObject("proxyHeaders")?.optJSONObject("request")
            if (requestHeaders != null) headers = requestHeaders.keys().asSequence().mapNotNull { key ->
                (requestHeaders.opt(key) as? String)?.let { key to it }
            }.toMap()
            val subs = source.data.optJSONArray("subtitles")
            subtitles = (0 until (subs?.length() ?: 0)).mapNotNull { index ->
                val item = subs!!.optJSONObject(index) ?: return@mapNotNull null
                SubtitleArgs().apply { this.url = item.optString("url"); lang = item.optString("lang"); title = item.optString("title", lang ?: "") }
            }
        }
        playingMeta = meta
        playingVideo = videoId
        player.onChooseSource = {
            rememberTracks(videoId); saveProgress(); player.close(); sources(meta, videoId)
        }
        player.onNextEpisode = if (meta.optString("type") == "series") ({ nextEpisode(meta, videoId) }) else null
        player.onEnded = {
            saveProgress()
            if (meta.optString("type") == "series") AlertDialog.Builder(this).setTitle("Episode finished")
                .setPositiveButton("Next episode") { _, _ -> nextEpisode(meta, videoId) }
                .setNegativeButton("Stay here", null).show()
        }
        player.onDownload = if (source.data.optString("infoHash").isBlank() && args.url.startsWith("https://") &&
            !args.url.substringBefore('?').endsWith(".m3u8", true) && !args.url.substringBefore('?').endsWith(".mpd", true)) ({
            try {
                downloadStore().enqueue(args.title, args.url, args.headers)
                Toast.makeText(this, "Download started. View it in Library → Downloads.", Toast.LENGTH_LONG).show()
            } catch (_: Exception) { Toast.makeText(this, "Couldn't start download. Check storage and connection.", Toast.LENGTH_LONG).show() }
        }) else null
        player.onExternal = if (source.data.optString("infoHash").isBlank() && !source.data.optBoolean("_nativeTorrent")) ({
            try {
                val intent = Intent(Intent.ACTION_VIEW).setDataAndType(android.net.Uri.parse(args.url), "video/*")
                if (args.headers.isNotEmpty()) intent.putExtra("headers", args.headers.flatMap { listOf(it.key, it.value) }.toTypedArray())
                startActivity(Intent.createChooser(intent, "Play with"))
            } catch (_: Exception) { Toast.makeText(this, "No compatible video player is installed.", Toast.LENGTH_LONG).show() }
        }) else null
        player.open(args, { inPlayback = true }, { message ->
            inPlayback = false
            AlertDialog.Builder(this).setTitle("Couldn't start playback").setMessage(message).setPositiveButton("Choose another source", null).show()
        })
    }
    private fun nextEpisode(meta: JSONObject, videoId: String) {
        rememberTracks(videoId); saveProgress(); player.close()
        val epoch = page
        status.text = "Finding next episode…"
        work(epoch) {
            val full = store.detail(meta)
            val videos = full.optJSONArray("videos")?.objects()?.sortedWith(compareBy({ it.optInt("season") }, { it.optInt("episode") })) ?: emptyList()
            val current = videos.indexOfFirst { it.optString("id") == videoId }
            val next = videos.getOrNull(if (current >= 0) current + 1 else videos.size)
            ui(epoch) {
                if (next != null) {
                    if (restoreTracksFor == videoId) restoreTracksFor = next.getString("id")
                    sources(full, next.getString("id"))
                }
                else { renderDetail(full); status.text = "No next episode is available." }
            }
        }
    }
    private fun rememberTracks(videoId: String) {
        player.snapshot { state ->
            fun selectedLanguage(key: String): String = state.optJSONArray(key)?.objects()?.firstOrNull { it.optBoolean("selected") }?.optString("lang")?.ifBlank { "und" } ?: ""
            restoreTracksFor = videoId; restoreAudio = selectedLanguage("audioTracks"); restoreSubtitle = selectedLanguage("subtitleTracks")
        }
    }
    private fun saveProgress() {
        val meta = playingMeta ?: return
        if (meta.optString("type") in listOf("channel", "tv")) return
        val video = playingVideo ?: return
        player.snapshot { snapshot ->
            if (snapshot.optBoolean("firstFrameReady")) {
                store.saveProgress(meta, video, snapshot.optDouble("positionSec"), snapshot.optDouble("durationSec"))
            }
        }
    }
    private fun library(offset: Int = 0) {
        begin("Library")
        addButton("Downloads on this device") { downloads() }
        continueRail(store.history())
        body.addView(label("Saved library", 24))
        val items = store.library()
        if (items.isEmpty()) body.addView(label("Save a title to keep it here.")) else cards(items.drop(offset).take(24))
        if (offset > 0) addButton("Previous library page") { library((offset - 24).coerceAtLeast(0)) }
        if (items.size > offset + 24) addButton("Next library page") { library(offset + 24) }
        focusContent()
    }
    private fun continueRail(history: List<JSONObject>) {
        if (history.isEmpty()) return
        body.addView(label("Continue watching", 24))
        val row = LinearLayout(this)
        history.take(8).forEach { entry ->
            val meta = entry.getJSONObject("meta")
            val width = if (bigPicture) 160 else 140
            val tile = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL; setPadding(dp(6), dp(6), dp(6), dp(6))
                isFocusable = true; isFocusableInTouchMode = true; isClickable = true; background = focusBackground()
                contentDescription = "${meta.optString("name")} · Resume at ${time(entry.optDouble("position"))}"
                activate(this) { sources(meta, entry.getString("videoId")) }
            }
            val image = clipRounded(ImageView(this).apply { scaleType = ImageView.ScaleType.CENTER_CROP; setImageResource(R.drawable.argus_native_banner) })
            tile.addView(image, LinearLayout.LayoutParams(-1, dp(width * 9 / 16)))
            posters.load(image, meta.optString("background").ifBlank { meta.optString("poster") })
            tile.addView(label(meta.optString("name"), 18).apply { maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END })
            tile.addView(label("Resume at ${time(entry.optDouble("position"))}", 14))
            tile.addView(ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
                max = 1000
                progress = if (entry.optDouble("duration") > 0) (entry.optDouble("position") / entry.optDouble("duration") * 1000).toInt().coerceIn(0, 1000) else 0
                progressTintList = android.content.res.ColorStateList.valueOf(Color.rgb(235, 175, 108))
            }, LinearLayout.LayoutParams(-1, dp(6)))
            row.addView(tile, LinearLayout.LayoutParams(dp(width), -2).apply { marginEnd = dp(12) })
        }
        body.addView(HorizontalScrollView(this).apply { isFocusable = false; isHorizontalScrollBarEnabled = false; addView(row) })
        if (history.size > 8) addButton("All continue watching") { continueHistory() }
    }
    private fun continueHistory(offset: Int = 0) {
        begin("Continue watching")
        val history = store.history()
        history.drop(offset).take(20).forEach { entry -> addButton("${entry.getJSONObject("meta").optString("name")} · Resume at ${time(entry.optDouble("position"))}") {
            sources(entry.getJSONObject("meta"), entry.getString("videoId"))
        } }
        if (offset > 0) addButton("Previous history page") { continueHistory((offset - 20).coerceAtLeast(0)) }
        if (history.size > offset + 20) addButton("Next history page") { continueHistory(offset + 20) }
        addButton("Back to library") { library() }
        focusContent()
    }
    private fun downloadStore() = NativeDownloads(this, cloud.current()?.let { NativeCloudAccount.scope(it) } ?: "")
    private fun downloads() {
        begin("Downloads")
        val downloads = downloadStore()
        val items = downloads.items()
        body.addView(label("Direct HTTPS video files can be saved here. Downloads wait on metered networks. Live streams and torrent streams aren't downloaded in the background."))
        if (items.isEmpty()) body.addView(label("Choose Download for offline from the player's More menu."))
        items.forEach { item -> addButton("${item.optString("title")} · ${item.optString("status")}") {
            val choices = if (item.optBoolean("ready")) arrayOf("Play offline", "Delete download") else arrayOf("Cancel or remove download")
            AlertDialog.Builder(this).setTitle(item.optString("title")).setItems(choices) { _, which ->
                if (choices[which] == "Play offline") {
                    playingMeta = null; playingVideo = null
                    player.onChooseSource = null; player.onNextEpisode = null; player.onEnded = null; player.onDownload = null; player.onExternal = null
                    val args = LoadArgs().apply { url = downloads.uri(item.getLong("id")).toString(); title = item.optString("title"); projector = bigPicture }
                    player.open(args, { inPlayback = true }, { status.text = "Couldn't open the saved video." })
                } else AlertDialog.Builder(this).setTitle("Delete this download?")
                    .setPositiveButton("Delete") { _, _ -> downloads.remove(item.getLong("id")); downloads() }.setNegativeButton("Cancel", null).show()
            }.show()
        } }
        addButton("Refresh downloads") { downloads() }
        addButton("Back to library") { library() }
        focusContent()
    }
    private fun addons(suggested: String = "") {
        val epoch = begin("Add-ons")
        body.addView(label("Install a Stremio add-on", 24))
        val field = input("https://…/manifest.json", suggested)
        field.inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_URI
        field.imeOptions = android.view.inputmethod.EditorInfo.IME_ACTION_DONE
        addButton("Install add-on") {
            val value = field.text.toString()
            val target = store
            status.text = "Checking add-on…"
            work(epoch) {
                try { target.install(value); ui(epoch) { addons(); status.text = "Add-on installed" } }
                catch (_: Exception) { ui(epoch) { status.text = "Couldn't install. Check the manifest link and connection, then retry." } }
            }
        }
        addButton("Add Cinemeta catalog") { defaultCatalog(epoch) }
        body.addView(label("Installed", 24))
        store.installed().forEach { addon ->
            val target = store
            addButton("${addon.manifest.optString("name")}${if (addon.manifest.optBoolean("_unavailable")) " · Unavailable" else ""} · Manage") {
                AlertDialog.Builder(this).setTitle(addon.manifest.optString("name"))
                    .setItems(arrayOf("Refresh", "Remove")) { _, which ->
                        if (which == 1) { store.removeAddon(addon.url); addons() }
                        else work(epoch) { target.install(addon.url); ui(epoch) { addons() } }
                    }.setNegativeButton("Cancel", null).show()
            }
        }
        focusContent()
    }
    private fun settings() {
        begin("Settings")
        body.addView(label("Playback", 24))
        body.addView(label("Preferred language codes, for example hi for Hindi or en for English. Leave subtitles empty to keep them off by default."))
        val audio = input("Audio language", store.audioLanguage())
        val subtitle = input("Subtitle language", store.subtitleLanguage())
        addButton("Save playback preferences") {
            store.languages(audio.text.toString(), subtitle.text.toString())
            status.text = "Playback preferences saved"
        }
        addButton("Accounts and sync") { accounts() }
        addButton(if (bigPicture) "Use compact layout" else "Use Big Picture layout") {
            getSharedPreferences("argus_native_display", MODE_PRIVATE).edit().putBoolean("bigPicture", !bigPicture).apply()
            recreate()
        }
        body.addView(label("Your library is available offline. Connected accounts sync their own library, progress and add-ons. The previous interface's local data is retained separately."))
        addButton("Open Full Argus UI") {
            runCatching {
                startActivity(Intent().setClassName(packageName, "$packageName.MainActivity"))
            }.onFailure { status.text = "Full UI unavailable on this build" }
        }
        addButton("Installed apps") { installedApps() }
        addButton("Open previous interface") {
            AlertDialog.Builder(this).setTitle("Previous interface")
                .setMessage("Additional Argus features remain in the previous interface. It requires a recent Android System WebView; older projectors may not open it.")
                .setPositiveButton("Open") { _, _ ->
                    try { startActivity(Intent().setClassName(packageName, "$packageName.MainActivity")) }
                    catch (_: Exception) { status.text = "The previous interface isn't available in this build." }
                }.setNegativeButton("Stay here", null).show()
        }
        focusContent()
    }
    private fun selectAccountStore() {
        playingMeta = null; playingVideo = null; inPlayback = false
        restoreTracksFor = null
        if (::player.isInitialized) player.close()
        val account = cloud.current()
        store = NativeMediaStore(this, account?.let { NativeCloudAccount.scope(it) } ?: "") { scheduleSync() }
    }
    private fun scheduleSync() {
        handler.post {
            if (isDestroyed || syncQueued || cloud.current() == null) return@post
            syncQueued = true
            val interval = if (store.pending().length() == 0) 60000 else 30000
            handler.postDelayed({ syncQueued = false; syncAccount() }, (lastSyncAttempt + interval - System.currentTimeMillis()).coerceAtLeast(1000))
        }
    }
    private fun syncAccount() {
        val account = cloud.current() ?: return
        if (syncBusy || isDestroyed) return
        syncBusy = true; lastSyncAttempt = System.currentTimeMillis()
        val target = store
        if (route == "Accounts") status.text = "Syncing…"
        syncWorker.execute {
            val outcome = runCatching { NativeAccountSync(cloud).sync(account, target) }
            runOnUiThread {
                syncBusy = false
                if (!isDestroyed && cloud.current()?.getString("key") == account.getString("key")) {
                    if (route == "Accounts") status.text = outcome.fold({ "Library, progress and add-ons synced" }, {
                        (it as? CloudFailure)?.message ?: "Couldn't sync. Your local changes are saved; check the connection and retry."
                    })
                    if (outcome.isFailure) lastSyncAttempt = System.currentTimeMillis() + 30000
                }
                if (!isDestroyed) scheduleSync()
            }
        }
    }
    private fun accounts() {
        begin("Accounts")
        val current = cloud.current()
        body.addView(label(current?.let { "${it.getString("provider")} · ${it.optString("name")}" }
            ?: if (cloud.needsUnlock()) "Unlock your saved profile to continue" else "Using this device without an account", 24))
        body.addView(label("Each account and profile keeps its own library, progress and add-ons. Titles, progress and configured add-on links sync only to the selected provider. Passwords aren't saved."))
        if (current != null) {
            addButton("Sync now") { syncAccount() }
            if (store.lastSync() > 0) body.addView(label("Last synced: " + java.text.DateFormat.getDateTimeInstance().format(java.util.Date(store.lastSync()))))
            addButton("Use device library") { cloud.useGuest(); selectAccountStore(); accounts() }
            addButton("Sign out of this account") { cloud.forget(current); selectAccountStore(); accounts() }
        }
        cloud.accounts().forEach { account ->
            addButton("${account.getString("provider")} · ${account.optString("email")} · ${account.optString("name")}") {
                fun activate() { cloud.activate(account); selectAccountStore(); accounts(); scheduleSync() }
                if (account.optBoolean("pin")) {
                    val pin = EditText(this).apply { inputType = 18; hint = "Profile PIN" }
                    AlertDialog.Builder(this).setTitle("Unlock profile").setView(pin).setNegativeButton("Cancel", null)
                        .setPositiveButton("Unlock") { _, _ ->
                            val value = pin.text.toString(); pin.text.clear()
                            val epoch = page
                            work(epoch) { cloud.unlock(account, value); ui(epoch) { activate() } }
                        }.show()
                } else activate()
            }
        }
        val savedAccounts = cloud.accounts().distinctBy { it.getString("provider") + ":" + it.getString("id") }
        if (savedAccounts.isNotEmpty()) addButton("Manage saved accounts") {
            AlertDialog.Builder(this).setTitle("Sign out of an account")
                .setItems(savedAccounts.map { "${it.getString("provider")} · ${it.optString("email")}" }.toTypedArray()) { _, index ->
                    cloud.forget(savedAccounts[index]); selectAccountStore(); accounts()
                }.setNegativeButton("Cancel", null).show()
        }
        for (provider in listOf("Nuvio", "Stremio", "Argus Supabase")) addButton("Sign in to $provider") { signIn(provider) }
        focusContent()
    }
    private fun signIn(provider: String) {
        val epoch = begin("Sign in")
        body.addView(label("Sign in to $provider", 24))
        val email = input("Email")
        email.inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
        val password = input("Password")
        password.inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
        password.isSaveEnabled = false
        addButton("Sign in") {
            val address = email.text.toString(); val secret = password.text.toString(); password.text.clear()
            status.text = "Signing in…"
            work(epoch) {
                try {
                    val profiles = cloud.signIn(provider, address, secret)
                    ui(epoch) {
                        val unlocked = profiles.firstOrNull { !it.optBoolean("pin") }
                        if (unlocked != null) { cloud.activate(unlocked); selectAccountStore() }
                        accounts(); scheduleSync()
                    }
                } catch (_: Exception) { ui(epoch) { status.text = "Couldn't sign in. Check your email, password and connection." } }
            }
        }
        addButton("Back to accounts") { accounts() }
        focusContent()
    }
    @Suppress("DEPRECATION") // Keep package queries compatible with API 24 projectors.
    private fun installedApps() {
        begin("Installed apps")
        val apps = listOf(Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER)
            .flatMap { category -> packageManager.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(category), 0) }
            .filter { it.activityInfo.packageName != packageName }
            .distinctBy { it.activityInfo.packageName }
            .sortedBy { it.loadLabel(packageManager).toString().lowercase() }
        if (apps.isEmpty()) body.addView(label("No launchable apps found."))
        apps.forEach { app -> addButton(app.loadLabel(packageManager).toString()) {
            val name = app.activityInfo.packageName
            val launch = packageManager.getLeanbackLaunchIntentForPackage(name) ?: packageManager.getLaunchIntentForPackage(name)
            try { if (launch != null) startActivity(launch) }
            catch (_: Exception) { status.text = "Couldn't open this app." }
        } }
        focusContent()
    }
    private fun handleIntent(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme == "stremio") addons(data.toString())
        else if (data.scheme == "argus" && data.host == "addon") data.getQueryParameter("url")?.let { addons(it) }
    }
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); handleIntent(intent) }
    override fun onSaveInstanceState(outState: Bundle) {
        currentMeta?.let { outState.putString("meta", it.toString()) }
        super.onSaveInstanceState(outState)
    }
    override fun onPause() { saveProgress(); player.pause(); super.onPause() }
    override fun onDestroy() {
        page++
        handler.removeCallbacksAndMessages(null)
        tasks.forEach { it.cancel(true) }
        io.shutdownNow()
        syncWorker.shutdownNow()
        posters.close()
        player.close()
        NativeTorrentBridge.stop(this)
        super.onDestroy()
    }
    private fun time(seconds: Double): String = "%d:%02d".format(seconds.toInt() / 60, seconds.toInt() % 60)
}
