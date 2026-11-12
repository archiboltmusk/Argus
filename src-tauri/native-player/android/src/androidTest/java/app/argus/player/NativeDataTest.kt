package app.argus.player

import android.content.Context
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class NativeDataTest {
    @Test fun recreatedStoresSerializeConcurrentLibraryEdits() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val scope = "_concurrency_test"
        val prefs = context.getSharedPreferences("argus_native_media_v1$scope", Context.MODE_PRIVATE)
        prefs.edit().clear().commit()
        val stores = listOf(NativeMediaStore(context, scope), NativeMediaStore(context, scope))
        val meta = JSONObject().put("id", "same-title").put("type", "movie").put("name", "Test")
        val workers = java.util.concurrent.Executors.newFixedThreadPool(2)
        val start = java.util.concurrent.CountDownLatch(1)
        try {
            val jobs = stores.map { store -> workers.submit { start.await(); repeat(25) { store.toggleLibrary(meta) } } }
            start.countDown()
            jobs.forEach { it.get(10, java.util.concurrent.TimeUnit.SECONDS) }
            assertFalse(stores[0].inLibrary(meta))
            assertEquals(50L, stores[0].pending().getJSONObject("library:movie:same-title").getLong("rev"))
        } finally { workers.shutdownNow(); prefs.edit().clear().commit() }
    }
    @Test fun magnetsKeepTrackersAndZeroFileIndexAndDecodeBase32Hashes() {
        val original = JSONObject().put("url", "magnet:?xt=urn:btih:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&tr=https%3A%2F%2Ftracker.example%2Fannounce&so=0")
            .put("sources", org.json.JSONArray().put("tracker:udp://existing.example:80"))
        val parsed = NativeTorrentBridge.normalized(original)
        assertEquals("0".repeat(40), parsed.getString("infoHash"))
        assertEquals(0, parsed.getInt("fileIdx"))
        assertEquals("tracker:https://tracker.example/announce", parsed.getJSONArray("sources").getString(1))
        assertEquals(1, original.getJSONArray("sources").length())
    }
    @Test
    fun malformedCatalogRowsAreIgnoredAndHistoryStaysCompact() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val prefs = context.getSharedPreferences("argus_native_media_v1", Context.MODE_PRIVATE)
        val old = prefs.all
        try {
            prefs.edit().clear().putString("addons", """[{"url":"https://example.org/manifest.json","manifest":{"name":"Test","catalogs":[null,"invalid",{}, {"id":"valid","type":"movie","extra":[null,"invalid"]}]}}]""").commit()
            val store = NativeMediaStore(context)
            assertEquals(listOf("valid"), store.catalogs().map { it.id })
            val meta = JSONObject().put("id", "test").put("type", "movie").put("name", "Test")
                .put("description", "x".repeat(5000)).put("videos", "large episode metadata")
            store.toggleLibrary(meta)
            store.saveProgress(meta, "test", 5.0, 20.0)
            val saved = store.history().single().getJSONObject("meta")
            assertFalse(saved.has("videos"))
            assertEquals(1500, saved.getString("description").length)
            assertEquals(5.0, store.resume("test"), 0.01)
            assertTrue(store.inLibrary(meta))
        } finally {
            val restore = prefs.edit().clear()
            old.forEach { (key, value) -> if (value is String) restore.putString(key, value) }
            restore.commit()
        }
    }
}
