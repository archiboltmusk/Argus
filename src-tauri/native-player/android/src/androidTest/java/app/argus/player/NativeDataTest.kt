package app.argus.player

import android.content.Context
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class NativeDataTest {
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
