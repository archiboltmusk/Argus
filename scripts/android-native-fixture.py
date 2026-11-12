"""Local-only Stremio fixture for native Android acceptance testing.

Run with python3 scripts/android-native-fixture.py --port 8766, then
adb reverse tcp:8766 tcp:8766 and install http://127.0.0.1:8766/manifest.json.
Requires ffmpeg. Serves synthetic video, two audio languages, a subtitle,
movie/episode catalogs, and a deliberately broken source; no remote media.
"""
import argparse
import json
import pathlib
import re
import shutil
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=8766)
args = parser.parse_args()
folder = pathlib.Path(tempfile.gettempdir()) / "argus-native-acceptance"
folder.mkdir(exist_ok=True)
video = folder / "native-test.mp4"
if not video.exists():
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("ffmpeg is required to generate the local video fixture")
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=24",
                    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-f", "lavfi", "-i", "sine=frequency=660:sample_rate=48000",
                    "-t", "120", "-map", "0:v", "-map", "1:a", "-map", "2:a", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-metadata:s:a:0", "language=eng", "-metadata:s:a:1", "language=hin", "-movflags", "+faststart", "-y", str(video)], check=True)
base = f"http://127.0.0.1:{args.port}"
poster = folder / "native-test-poster.png"
if not poster.exists():
    subprocess.run([shutil.which("ffmpeg") or "ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", "1", "-i", str(video),
                    "-frames:v", "1", "-vf", "scale=256:384:force_original_aspect_ratio=increase,crop=256:384", "-y", str(poster)], check=True)

def meta(kind):
    result = {"id": f"argus-native-{kind}", "type": kind,
              "name": "Native Playback Test" if kind == "movie" else "Native Series Test",
              "releaseInfo": "2026", "description": "Local synthetic acceptance fixture. No external media is used.", "poster": base + "/poster.png"}
    if kind == "series":
        result["videos"] = [{"id": "argus-native-series:1:1", "season": 1, "episode": 1, "title": "Native episode"},
                            {"id": "argus-native-series:2:1", "season": 2, "episode": 1, "title": "Second season"}]
    return result

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == "/manifest.json":
            return self.respond({"id": "org.argus.native.fixture", "version": "1.0.0", "name": "Native Test Add-on",
                                 "types": ["movie", "series"], "resources": ["catalog", "meta", "stream"],
                                 "catalogs": [{"type": t, "id": "test", "name": "Native movies" if t == "movie" else "Native series",
                                               "extra": [{"name": "search"}, {"name": "skip"}]} for t in ("movie", "series")]})
        match = re.fullmatch(r"/catalog/(movie|series)/test(?:/[^/]+)?\.json", path)
        if match:
            return self.respond({"metas": [meta(match[1])]})
        match = re.fullmatch(r"/meta/(movie|series)/[^/]+\.json", path)
        if match:
            return self.respond({"meta": meta(match[1])})
        if re.fullmatch(r"/stream/(movie|series)/[^/]+\.json", path):
            return self.respond({"streams": [
                {"name": "Playable HD", "title": "Local video · English / Hindi · test subtitle", "url": base + "/native-test.mp4",
                 "subtitles": [{"id": "test-sub", "lang": "en", "title": "Test subtitle", "url": base + "/test.vtt"}]},
                {"name": "Broken 4K test source", "url": base + "/broken-4k.mp4"},
                {"name": "Torrent-only test source", "infoHash": "0" * 40, "fileIdx": 0}]})
        if path == "/test.vtt":
            return self.respond(b"WEBVTT\n\n00:00:00.000 --> 00:02:00.000\nArgus native subtitle test\n", "text/vtt")
        if path == "/poster.png":
            return self.respond(poster.read_bytes(), "image/png")
        if path in ("/native-test.mp4", "/projector.mp4"):
            size = video.stat().st_size
            start, end = 0, size - 1
            range_header = self.headers.get("Range")
            if range_header:
                match = re.fullmatch(r"bytes=(\d+)-(\d*)", range_header)
                if not match:
                    self.send_error(416)
                    return
                start = int(match[1])
                end = min(int(match[2]) if match[2] else end, end)
                if start > end:
                    self.send_error(416)
                    return
            self.send_response(206 if range_header else 200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(end - start + 1))
            if range_header:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.end_headers()
            try:
                with video.open("rb") as stream:
                    stream.seek(start)
                    remaining = end - start + 1
                    while remaining > 0:
                        block = stream.read(min(65536, remaining))
                        if not block:
                            break
                        self.wfile.write(block)
                        remaining -= len(block)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        self.send_error(404)

    def respond(self, value, kind="application/json"):
        data = json.dumps(value).encode() if not isinstance(value, bytes) else value
        self.send_response(200)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

print(f"Native acceptance add-on: {base}/manifest.json", flush=True)
ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
