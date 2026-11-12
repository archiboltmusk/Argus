package app.argus.player

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.view.View
import android.widget.ImageView
import java.net.HttpURLConnection
import java.net.URI
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.Future

/** Small decoded posters and bounded background work for low-memory projectors. */
class NativePosterLoader {
    private val workers = Executors.newFixedThreadPool(2)
    private val handler = Handler(Looper.getMainLooper())
    private val jobs = ConcurrentHashMap<ImageView, Future<*>>()
    private val cache = object : LruCache<String, Bitmap>(6 * 1024 * 1024) {
        override fun sizeOf(key: String, bitmap: Bitmap) = bitmap.byteCount
    }
    fun load(view: ImageView, url: String) {
        if (url.isBlank()) return
        cache.get(url)?.let { view.setImageBitmap(it); return }
        val detach = object : View.OnAttachStateChangeListener {
            override fun onViewAttachedToWindow(v: View) {}
            override fun onViewDetachedFromWindow(v: View) { jobs.remove(view)?.cancel(true) }
        }
        view.addOnAttachStateChangeListener(detach)
        jobs[view] = workers.submit {
            var connection: HttpURLConnection? = null
            try {
                if (Thread.currentThread().isInterrupted) return@submit
                val uri = URI(url)
                if (uri.scheme != "https" && !(uri.scheme == "http" && uri.host in listOf("localhost", "127.0.0.1"))) return@submit
                connection = uri.toURL().openConnection() as HttpURLConnection
                connection.connectTimeout = 6000
                connection.readTimeout = 6000
                val bytes = connection.inputStream.use { input ->
                    val output = java.io.ByteArrayOutputStream()
                    val buffer = ByteArray(8192)
                    while (!Thread.currentThread().isInterrupted) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        if (output.size() + count > 3 * 1024 * 1024) return@submit
                        output.write(buffer, 0, count)
                    }
                    output.toByteArray()
                }
                val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
                if (options.outWidth <= 0 || options.outHeight <= 0) return@submit
                options.inSampleSize = 1
                while (options.outWidth / options.inSampleSize > 256 || options.outHeight / options.inSampleSize > 384) options.inSampleSize *= 2
                options.inJustDecodeBounds = false
                val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options) ?: return@submit
                cache.put(url, bitmap)
                handler.post { if (view.isAttachedToWindow) view.setImageBitmap(bitmap) }
            } catch (_: Exception) { /* Keep the Argus placeholder when artwork is unavailable. */ }
            finally {
                connection?.disconnect()
                jobs.remove(view)
                handler.post { view.removeOnAttachStateChangeListener(detach) }
            }
        }
    }
    fun close() {
        jobs.values.forEach { it.cancel(true) }
        jobs.clear()
        workers.shutdownNow()
        cache.evictAll()
    }
}
