package app.argus.player

import android.content.Context
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Synthetic providers only; never signs into or changes a real user's account. */
class NativeAccountSyncTest {
    @Test fun unavailableAddonsDoNotBlockCloudLibrary() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val base = "http://127.0.0.1:8770"
        val client = NativeCloudAccount(context, CloudEndpoints("$base/nuvio", "$base/stremio/api", "$base/supabase"))
        for ((provider, service) in listOf("Nuvio" to "nuvio", "Stremio" to "stremio", "Argus Supabase" to "supabase")) {
            val account = client.signIn(provider, "offline-${System.nanoTime()}@example.invalid", "fixture-password").first()
            val scope = NativeCloudAccount.scope(account)
            val store = NativeMediaStore(context, scope)
            val title = JSONObject().put("id", "tt-offline").put("type", "movie").put("name", "Still synced")
            store.toggleLibrary(title)
            NativeAccountSync(client).sync(account, store)
            NativeCloudHttp.call("$base/control/offline-addon", "POST", JSONObject().put("provider", service).put("user", account.getString("id")))
            NativeAccountSync(client).sync(account, store)
            assertTrue(store.inLibrary(title))
            assertEquals(0, store.pending().length())
            assertTrue(store.installed().single().manifest.optBoolean("_unavailable"))
            client.forget(account)
            context.getSharedPreferences("argus_native_media_v1$scope", Context.MODE_PRIVATE).edit().clear().commit()
        }
    }
    @Test fun recreatedAccountManagersDoNotLoseConcurrentSignIns() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val endpoints = CloudEndpoints("http://127.0.0.1:8770/nuvio", "http://127.0.0.1:8770/stremio/api", "http://127.0.0.1:8770/supabase")
        val clients = listOf(NativeCloudAccount(context, endpoints), NativeCloudAccount(context, endpoints))
        val workers = java.util.concurrent.Executors.newFixedThreadPool(2)
        val start = java.util.concurrent.CountDownLatch(1)
        try {
            val stamp = System.currentTimeMillis()
            val jobs = clients.mapIndexed { index, client -> workers.submit<List<JSONObject>> {
                start.await(); client.signIn("Argus Supabase", "concurrent-$stamp-$index@example.invalid", "fixture-password")
            } }
            start.countDown()
            val accounts = jobs.flatMap { it.get(10, java.util.concurrent.TimeUnit.SECONDS) }
            assertTrue(accounts.all { saved -> clients[0].accounts().any { it.getString("key") == saved.getString("key") } })
            accounts.forEach { clients[0].forget(it) }
        } finally { workers.shutdownNow() }
    }
    @Test fun allProvidersRoundTripRetryIsolateAccountsAndPreserveNewEdits() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val base = "http://127.0.0.1:8770"
        val client = NativeCloudAccount(context, CloudEndpoints("$base/nuvio", "$base/stremio/api", "$base/supabase"))
        for (provider in listOf("Nuvio", "Stremio", "Argus Supabase")) {
            val nonce = System.currentTimeMillis().toString()
            val account = client.signIn(provider, "fixture-$nonce@example.invalid", "fixture-password").first()
            client.activate(account)
            val scope = NativeCloudAccount.scope(account)
            val store = NativeMediaStore(context, scope)
            val meta = JSONObject().put("id", "tt-fixture").put("type", "movie").put("name", "Cloud Test")
            store.toggleLibrary(meta)
            store.saveProgress(meta, "tt-fixture", 10.0, 120.0)
            store.install("http://127.0.0.1:8767/manifest.json")
            NativeCloudHttp.call("$base/control/fail", "POST", JSONObject())
            assertTrue(runCatching { NativeAccountSync(client).sync(account, store) }.isFailure)
            assertTrue(store.pending().length() > 0)
            NativeAccountSync(client).sync(account, store)
            assertEquals(0, store.pending().length())
            assertEquals(10.0, store.resume("tt-fixture"), 0.01)
            assertTrue(store.inLibrary(meta))
            assertEquals(1, store.installed().size)
            // A second device starts empty and pulls the same provider state.
            val second = NativeMediaStore(context, scope + "_second")
            NativeAccountSync(client).sync(account, second)
            assertTrue(second.inLibrary(meta))
            assertEquals(10.0, second.resume("tt-fixture"), 0.01)
            assertEquals(1, second.installed().size)
            store.toggleLibrary(meta)
            store.removeAddon("http://127.0.0.1:8767/manifest.json")
            NativeAccountSync(client).sync(account, store)
            NativeAccountSync(client).sync(account, second)
            assertFalse(second.inLibrary(meta))
            assertTrue(second.installed().isEmpty())
            // An edit made while an older snapshot is in flight must remain queued.
            store.toggleLibrary(meta)
            val sent = store.pending()
            store.toggleLibrary(meta)
            store.applyCloud(JSONObject().put("library", org.json.JSONArray().put(meta)).put("history", org.json.JSONArray()).put("addons", org.json.JSONArray()), sent)
            assertFalse(store.inLibrary(meta))
            assertTrue(store.pending().length() > 0)
            if (provider != "Stremio") {
                NativeCloudHttp.call("$base/control/expire", "POST", JSONObject())
                NativeAccountSync(client).sync(account, store)
            }
            if (provider == "Nuvio") {
                val locked = client.accounts().first { it.optBoolean("pin") && it.getString("id") == account.getString("id") }
                assertTrue(runCatching { client.activate(locked) }.isFailure)
                assertTrue(runCatching { client.unlock(locked, "0000") }.isFailure)
                client.unlock(locked, "1234"); client.activate(locked)
                assertTrue(NativeMediaStore(context, NativeCloudAccount.scope(locked)).library().isEmpty())
                val recreated = NativeCloudAccount(context, CloudEndpoints("$base/nuvio", "$base/stremio/api", "$base/supabase"))
                assertTrue(recreated.needsUnlock())
                assertNull(recreated.current())
            }
            val other = client.signIn(provider, "other-$nonce@example.invalid", "fixture-password").first()
            client.activate(other)
            val isolated = NativeMediaStore(context, NativeCloudAccount.scope(other))
            NativeAccountSync(client).sync(other, isolated)
            assertTrue(isolated.library().isEmpty())
            assertTrue(isolated.history().isEmpty())
            assertTrue(isolated.installed().isEmpty())
            // The vault must not persist raw access or refresh tokens.
            val raw = context.getSharedPreferences("argus_native_accounts_v1", Context.MODE_PRIVATE).all.toString()
            assertFalse(raw.contains("fixture-access")); assertFalse(raw.contains("fixture-refresh")); assertFalse(raw.contains("fixture-password"))
            client.forget(other); client.forget(account)
            for (name in listOf(scope, scope + "_second", NativeCloudAccount.scope(other))) context.getSharedPreferences("argus_native_media_v1$name", Context.MODE_PRIVATE).edit().clear().commit()
        }
        client.useGuest()
    }
}
