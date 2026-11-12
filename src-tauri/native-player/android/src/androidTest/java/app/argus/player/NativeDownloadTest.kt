package app.argus.player

import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

class NativeDownloadTest {
    @Test fun downloadsPlayLocallyAndStayProfileScoped() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val downloads = NativeDownloads(context, "_test")
        val id = downloads.enqueue("Offline test", "https://samplelib.com/preview/mp4/sample-5s.mp4", emptyMap())
        try {
            val deadline = System.currentTimeMillis() + 60000
            while (System.currentTimeMillis() < deadline && downloads.items().none { it.getLong("id") == id && it.optBoolean("ready") }) Thread.sleep(300)
            assertTrue("Download never completed: ${downloads.items()}", downloads.items().any { it.getLong("id") == id && it.optBoolean("ready") })
            assertTrue(NativeDownloads(context, "_other").items().isEmpty())
            val uri = downloads.uri(id)
            assertEquals("content", uri.scheme)
            ActivityScenario.launch(PlaybackTestActivity::class.java).use { scenario ->
                lateinit var player: NativePlaybackSession
                val opened = CompletableFuture<Boolean>()
                scenario.onActivity { activity ->
                    player = NativePlaybackSession(activity)
                    player.open(LoadArgs().apply { url = uri.toString(); title = "Offline test" }, { opened.complete(true) }, { opened.completeExceptionally(AssertionError(it)) })
                }
                assertTrue(opened.get(10, TimeUnit.SECONDS))
                var rendered = false
                val playbackDeadline = System.currentTimeMillis() + 30000
                while (!rendered && System.currentTimeMillis() < playbackDeadline) {
                    val state = CompletableFuture<Boolean>()
                    player.snapshot { state.complete(it.optBoolean("firstFrameReady") && it.optDouble("positionSec") > 0) }
                    rendered = state.get(5, TimeUnit.SECONDS)
                    Thread.sleep(200)
                }
                scenario.onActivity { player.close(); it.finish() }
                assertTrue("Saved video didn't render through its local content URI", rendered)
            }
        } finally { downloads.remove(id) }
        assertTrue(downloads.items().isEmpty())
    }
}
