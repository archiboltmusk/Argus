package app.argus.player

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Tokens are encrypted with a device-bound key; passwords are never persisted. */
class NativeAccountVault(context: Context) {
    private val prefs = context.getSharedPreferences("argus_native_accounts_v1", Context.MODE_PRIVATE)
    internal val lock: Any get() = prefs
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey("argus-native-accounts", null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder("argus-native-accounts", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    @Synchronized fun read(): JSONObject = runCatching {
        val encoded = JSONObject(prefs.getString("vault", "{}")!!)
        if (!encoded.has("cipher")) JSONObject() else {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(encoded.getString("iv"), Base64.NO_WRAP)))
            JSONObject(String(cipher.doFinal(Base64.decode(encoded.getString("cipher"), Base64.NO_WRAP)), Charsets.UTF_8))
        }
    }.getOrDefault(JSONObject())
    @Synchronized fun write(value: JSONObject) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val encoded = JSONObject().put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .put("cipher", Base64.encodeToString(cipher.doFinal(value.toString().toByteArray(Charsets.UTF_8)), Base64.NO_WRAP))
        check(prefs.edit().putString("vault", encoded.toString()).commit()) { "Couldn't save account securely." }
    }
}
