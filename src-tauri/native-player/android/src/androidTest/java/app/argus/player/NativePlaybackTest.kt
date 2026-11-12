package app.argus.player

import androidx.appcompat.app.AppCompatActivity
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import app.tauri.plugin.Invoke
import com.fasterxml.jackson.databind.ObjectMapper
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

class PlaybackTestActivity : AppCompatActivity()

/** Uses the local fixture server forwarded with adb reverse tcp:8765 tcp:8765. */
@RunWith(AndroidJUnit4::class)
class NativePlaybackTest {
    @Test
    fun rendersSeeksSelectsTracksAndReportsBrokenStream() {
        ActivityScenario.launch(PlaybackTestActivity::class.java).use { scenario ->
            lateinit var plugin: NativePlayerPlugin
            scenario.onActivity { plugin = NativePlayerPlugin(it) }
            fun call(method: String, args: String = "{}"): JSONObject {
                val response = CompletableFuture<String>()
                val invoke = Invoke(1, method, 1, 2, { callback, data ->
                    if (callback == 2L) response.completeExceptionally(AssertionError(data))
                    else response.complete(data)
                }, args, ObjectMapper())
                when (method) {
                    "load" -> plugin.load(invoke)
                    "control" -> plugin.control(invoke)
                    "snapshot" -> plugin.snapshot(invoke)
                    "close" -> plugin.close(invoke)
                }
                val value = response.get(20, TimeUnit.SECONDS)
                return if (value == "null") JSONObject() else JSONObject(value)
            }
            fun await(predicate: (JSONObject) -> Boolean): JSONObject {
                val deadline = System.currentTimeMillis() + 20000
                var result: JSONObject
                do {
                    result = call("snapshot")
                    if (predicate(result)) return result
                    Thread.sleep(200)
                } while (System.currentTimeMillis() < deadline)
                throw AssertionError("Playback condition timed out: $result")
            }
            try {
                call("load", """{"url":"http://127.0.0.1:8765/projector.mp4","subtitles":[{"url":"http://127.0.0.1:8765/test.vtt","lang":"en","title":"Test subtitle"}]}""")
                val playing = await { it.optBoolean("firstFrameReady") && it.optDouble("positionSec") > 0 }
                assertEquals("playing", playing.getString("status"))
                assertTrue(playing.getInt("videoWidth") > 0)
                val audio = await { it.getJSONArray("audioTracks").length() >= 2 }
                val hindi = (0 until audio.getJSONArray("audioTracks").length()).map {
                    audio.getJSONArray("audioTracks").getJSONObject(it)
                }.first { it.getString("lang") == "hi" || it.getString("lang") == "hin" }
                call("control", JSONObject().put("action", "audio").put("trackId", hindi.getString("id")).toString())
                await { state -> (0 until state.getJSONArray("audioTracks").length()).any {
                    val track = state.getJSONArray("audioTracks").getJSONObject(it)
                    track.getString("id") == hindi.getString("id") && track.getBoolean("selected")
                } }
                val subtitles = await { it.getJSONArray("subtitleTracks").length() > 0 }
                val subtitleId = subtitles.getJSONArray("subtitleTracks").getJSONObject(0).getString("id")
                call("control", JSONObject().put("action", "subtitle").put("trackId", subtitleId).toString())
                await { it.getJSONArray("subtitleTracks").getJSONObject(0).getBoolean("selected") }
                call("control", """{"action":"pause"}""")
                call("control", """{"action":"seek","value":5}""")
                val paused = await { it.getString("status") == "paused" && it.getDouble("positionSec") >= 4.5 }
                assertTrue(paused.getDouble("positionSec") < 6.5)
                call("load", """{"url":"http://127.0.0.1:8765/broken-4k.mp4"}""")
                val failed = await { it.getString("status") == "error" }
                assertFalse(failed.isNull("errorMessage"))
            } finally {
                call("close")
                scenario.onActivity { it.finish() }
            }
        }
    }
}
