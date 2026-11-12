package app.argus.player

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

data class CloudEndpoints(val nuvio: String = "https://api.nuvio.tv", val stremio: String = "https://api.strem.io/api",
    val supabase: String = "https://oxdgdatcomqpoccpcnli.supabase.co")

class NativeCloudAccount(private val context: Context, private val endpoints: CloudEndpoints = CloudEndpoints()) {
    private val vault = NativeAccountVault(context)
    private val lock = vault.lock
    private val unlocked = mutableSetOf<String>()
    fun clientId(): String = synchronized(lock) {
        val prefs = context.getSharedPreferences("argus_native_device", Context.MODE_PRIVATE)
        prefs.getString("syncClientId", null) ?: ("argus-android-" + java.util.UUID.randomUUID()).also {
            check(prefs.edit().putString("syncClientId", it).commit())
        }
    }
    companion object {
        const val SUPABASE_KEY = "sb_publishable_6KgtrznnWSw_CE8fxd1AMg_pdKj94pO"
        const val NUVIO_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgxNTIxMzQ2LCJleHAiOjE5MzkyMDEzNDZ9.tmQaj682pwzehpqlgCDMnySOqiUvpgRbrE43T4VJpDI"
        fun scope(account: JSONObject): String = "_" + MessageDigest.getInstance("SHA-256")
            .digest((account.getString("provider") + ":" + account.getString("id") + ":" + account.optInt("profile", 1)).toByteArray())
            .joinToString("") { "%02x".format(it) }
    }
    fun accounts(): List<JSONObject> = synchronized(lock) { vault.read().optJSONArray("accounts")?.objects() ?: emptyList() }
    fun current(): JSONObject? = synchronized(lock) {
        val state = vault.read()
        state.optJSONArray("accounts")?.objects()?.firstOrNull { it.getString("key") == state.optString("active") }
            ?.takeUnless { it.optBoolean("pin") && !unlocked.contains(it.getString("key")) }
    }
    fun needsUnlock(): Boolean = synchronized(lock) {
        val state = vault.read()
        state.optJSONArray("accounts")?.objects()?.any { it.getString("key") == state.optString("active") && it.optBoolean("pin") && !unlocked.contains(it.getString("key")) } == true
    }
    fun activate(account: JSONObject): Unit = synchronized(lock) {
        check(!account.optBoolean("pin") || unlocked.contains(account.getString("key"))) { "Unlock this profile first." }
        val state = vault.read()
        state.put("active", account.getString("key")); vault.write(state)
    }
    fun useGuest(): Unit = synchronized(lock) { val state = vault.read(); state.remove("active"); vault.write(state) }
    fun forget(account: JSONObject): Unit = synchronized(lock) {
        val state = vault.read()
        val removed = accounts().filter { it.getString("provider") == account.getString("provider") && it.getString("id") == account.getString("id") }
        state.put("accounts", JSONArray(accounts().filterNot { entry -> removed.any { it.getString("key") == entry.getString("key") } }))
        if (removed.any { it.getString("key") == state.optString("active") }) state.remove("active")
        removed.forEach { unlocked.remove(it.getString("key")) }; vault.write(state)
    }
    private fun save(account: JSONObject): Unit = synchronized(lock) {
        val state = vault.read()
        state.put("accounts", JSONArray(accounts().filterNot { it.getString("key") == account.getString("key") } + account))
        vault.write(state)
    }
    fun signIn(provider: String, email: String, password: String): List<JSONObject> {
        require(email.isNotBlank() && password.isNotEmpty()) { "Enter your email and password." }
        val session: JSONObject
        val id: String
        if (provider == "Stremio") {
            session = stremio("login", JSONObject().put("email", email.trim()).put("password", password)) as JSONObject
            id = session.getJSONObject("user").getString("_id")
            require(session.getString("authKey").isNotBlank())
        } else {
            require(provider in listOf("Nuvio", "Argus Supabase"))
            val base = if (provider == "Nuvio") endpoints.nuvio else endpoints.supabase
            val key = if (provider == "Nuvio") NUVIO_KEY else SUPABASE_KEY
            session = NativeCloudHttp.call("$base/auth/v1/token?grant_type=password", "POST",
                JSONObject().put("email", email.trim()).put("password", password), mapOf("apikey" to key)) as JSONObject
            id = session.getJSONObject("user").getString("id")
            require(session.getString("access_token").isNotBlank() && session.getString("refresh_token").isNotBlank())
        }
        val seed = JSONObject().put("provider", provider).put("id", id).put("email", email.trim()).put("session", session)
        val profiles = if (provider == "Nuvio") (authorized(seed, "/rest/v1/rpc/sync_pull_profiles", "POST", JSONObject()) as JSONArray).objects()
            else listOf(JSONObject().put("profile_index", 1).put("name", email.trim()))
        require(profiles.isNotEmpty()) { "No account profiles are available." }
        return profiles.map { profile -> JSONObject(seed.toString()).apply {
            val slot = profile.getInt("profile_index")
            require(slot in 1..6)
            put("profile", slot); put("name", profile.optString("name", "Profile $slot"))
            put("pin", profile.optBoolean("pin_enabled")); put("primaryAddons", profile.optBoolean("uses_primary_addons"))
            put("key", "$provider:$id:$slot")
            save(this)
        } }
    }
    fun unlock(account: JSONObject, pin: String) {
        val result = authorized(account, "/rest/v1/rpc/verify_profile_pin", "POST",
            JSONObject().put("p_profile_id", account.getInt("profile")).put("p_pin", pin))
        val row = if (result is JSONArray) result.optJSONObject(0) else result as? JSONObject
        check(row?.optBoolean("unlocked") == true || result == true) { "Profile PIN was rejected." }
        synchronized(lock) { unlocked.add(account.getString("key")) }
    }
    fun stremio(path: String, body: JSONObject): Any {
        val response = NativeCloudHttp.call("${endpoints.stremio}/$path", "POST", body) as JSONObject
        check(!response.has("error")) { "Stremio rejected the request. Check your account and retry." }
        return response.get("result")
    }
    fun authorized(account: JSONObject, path: String, method: String = "GET", body: Any? = null, extra: Map<String, String> = emptyMap()): Any {
        val nuvio = account.getString("provider") == "Nuvio"
        val base = if (nuvio) endpoints.nuvio else endpoints.supabase
        val key = if (nuvio) NUVIO_KEY else SUPABASE_KEY
        synchronized(lock) { accounts().firstOrNull { account.has("key") && it.getString("id") == account.getString("id") && it.getString("provider") == account.getString("provider") }
            ?.let { account.put("session", it.getJSONObject("session")) } }
        fun request(): Any = NativeCloudHttp.call(base + path, method, body,
            mapOf("apikey" to key, "Authorization" to "Bearer ${account.getJSONObject("session").getString("access_token")}") + extra)
        try { return request() } catch (error: CloudFailure) {
            if (error.status != 401) throw error
            val session = account.getJSONObject("session")
            val refresh = NativeCloudHttp.call("$base/auth/v1/token?grant_type=refresh_token", "POST",
                JSONObject().put("refresh_token", session.getString("refresh_token")), mapOf("apikey" to key)) as JSONObject
            check(refresh.getJSONObject("user").getString("id") == account.getString("id")) { "Account changed during refresh." }
            account.put("session", refresh)
            // Do not recreate a session that was signed out while this request ran.
            synchronized(lock) {
                accounts().filter { it.getString("id") == account.getString("id") && it.getString("provider") == account.getString("provider") }
                    .forEach { save(it.put("session", refresh)) }
            }
            return request()
        }
    }
}

internal fun JSONArray.objects(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }
