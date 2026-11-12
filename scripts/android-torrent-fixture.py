"""Seed synthetic video through the real BitTorrent protocol for emulator acceptance.

Start with --seeder pointing to the built android-p2p-probe binary. Forward
ADB ports 8879 and 16881, then install http://127.0.0.1:8879/manifest.json.
Only synthetic local media is seeded. No public media is downloaded.
"""
import argparse
import hashlib
import json
import os
import pathlib
import shutil
import socket
import struct
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

parser = argparse.ArgumentParser()
parser.add_argument("--seeder", required=True)
parser.add_argument("--video", default=str(pathlib.Path(tempfile.gettempdir()) / "argus-native-acceptance" / "native-test.mp4"))
args = parser.parse_args()

def bencode(value):
    if isinstance(value, int):
        return b"i" + str(value).encode() + b"e"
    if isinstance(value, str):
        value = value.encode()
    if isinstance(value, bytes):
        return str(len(value)).encode() + b":" + value
    if isinstance(value, dict):
        return b"d" + b"".join(bencode(key) + bencode(value[key]) for key in sorted(value)) + b"e"
    return b"l" + b"".join(bencode(item) for item in value) + b"e"

root = pathlib.Path(tempfile.gettempdir()) / "argus-torrent-fixture"
(root / "engine").mkdir(parents=True, exist_ok=True)
video = root / "engine" / "fixture.mp4"
shutil.copyfile(args.video, video)
payload = video.read_bytes()
piece_size = 256 * 1024
info = {"name": video.name, "length": len(payload), "piece length": piece_size,
        "pieces": b"".join(hashlib.sha1(payload[offset:offset + piece_size]).digest() for offset in range(0, len(payload), piece_size))}
info_hash = hashlib.sha1(bencode(info)).hexdigest()
torrent = root / "fixture.torrent"
torrent.write_bytes(bencode({"announce": "http://127.0.0.1:8879/announce", "info": info}))
seed_log = (root / "seed.log").open("w")
seeder = subprocess.Popen([args.seeder, str(torrent), str(root), "8878"], env={**os.environ, "ARGUS_LOCAL_SEED": "1"}, stdout=seed_log, stderr=subprocess.STDOUT)

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        meta = {"id": "argus-torrent-fixture", "type": "movie", "name": "Native Torrent Playback Test"}
        if path == "/announce":
            data = bencode({"interval": 30, "complete": 1, "incomplete": 0,
                            "peers": socket.inet_aton("127.0.0.1") + struct.pack("!H", 16881)})
            kind = "text/plain"
        else:
            kind = "application/json"
            if path == "/manifest.json":
                result = {"id": "argus.local.torrent", "version": "1.0.0", "name": "Local torrent test", "types": ["movie"], "resources": ["catalog", "meta", "stream"], "catalogs": [{"id": "local", "type": "movie"}]}
            elif path.startswith("/catalog/"):
                result = {"metas": [meta]}
            elif path.startswith("/meta/"):
                result = {"meta": meta}
            elif path.startswith("/stream/"):
                streams = [{"name": "Local torrent video", "infoHash": info_hash, "fileIdx": 0, "sources": ["tracker:http://127.0.0.1:8879/announce"]}] if path == "/stream/movie/argus-torrent-fixture.json" else []
                result = {"streams": streams}
            else:
                self.send_error(404)
                return
            data = json.dumps(result).encode()
        self.send_response(200)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

print(f"Torrent fixture add-on: http://127.0.0.1:8879/manifest.json; info hash {info_hash}", flush=True)
try:
    ThreadingHTTPServer(("127.0.0.1", 8879), Handler).serve_forever()
finally:
    seeder.terminate()
    seed_log.close()
