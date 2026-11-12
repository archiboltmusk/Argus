"""Exercise native account menus, playback More and responsive layouts on a test emulator."""
import argparse
import pathlib
import re
import subprocess
import tempfile
import time
from android_test_device import Device

parser = argparse.ArgumentParser()
parser.add_argument("--adb", default="adb")
parser.add_argument("--serial", required=True)
args = parser.parse_args()
d = Device(args.adb, args.serial)
proof = pathlib.Path(tempfile.gettempdir()) / "argus-native-proof"
proof.mkdir(exist_ok=True)

def launch():
    d.shell("am", "force-stop", "app.argus.desktop")
    d.shell("am", "start", "-W", "-n", "app.argus.desktop/app.argus.player.NativeTvActivity")
    d.find(text="Home")

def capture(name):
    (proof / (name + ".png")).write_bytes(subprocess.check_output(d.prefix + ["exec-out", "screencap", "-p"], timeout=30))

def more():
    size = re.findall(r"(\d+)x(\d+)", d.shell("wm", "size"))[-1]
    # Android 9 omits SurfaceView dialog descendants from accessibility even
    # while the heading is drawn. This button's measured projector bounds are
    # [1752,40][1912,114] at 1920x1080; validate the opened native menu afterward.
    assert size == ("1920", "1080"), size
    d.shell("input", "tap", str(int(size[0]) - 88), "78")
    d.find(text="Playback options")

launch()
d.click(text="Settings")
d.click(text="Accounts and sync", scroll=True)
for provider in ("Nuvio", "Stremio", "Argus Supabase"):
    d.click(text="Sign in to " + provider, scroll=True)
    fields = [n for n in d.tree().iter("node") if n.get("class") == "android.widget.EditText"]
    assert len(fields) == 2 and fields[1].get("password") == "true"
    assert "mInputShown=true" not in d.shell("dumpsys", "input_method"), "Focusing sign-in unexpectedly opened keyboard"
    d.click(text="Back to accounts")
print("PASS three native account sign-in screens and explicit input activation", flush=True)

d.click(text="Home")
d.click(text="Browse movies")
d.click(contains="Native Playback Test", scroll=True)
d.click(text="Choose source")
d.click(contains="Playable HD", scroll=True)
time.sleep(5)
d.shell("input", "keyevent", "127")
d.shell("input", "keyevent", *(["89"] * 30))
d.shell("input", "keyevent", "90")
before = d.shell("dumpsys", "media_session")
position = int(re.search(r"state=PlaybackState \{state=2, position=(\d+)", before).group(1))
more(); d.click(text="Playback speed"); d.click(text="1.5×")
d.shell("input", "keyevent", "126")
time.sleep(0.5)
assert "speed=1.5" in d.shell("dumpsys", "media_session")
d.shell("input", "keyevent", "127")
more(); d.click(text="Picture fit"); d.click(text="Fill")
more(); d.click(text="Sleep timer"); d.click(text="Off")
more(); d.click(text="Copy playback diagnostics")
more(); d.click(text="Choose another source")
d.click(contains="Playable HD", scroll=True)
time.sleep(3)
after = d.shell("dumpsys", "media_session")
resumed = int(re.search(r"state=PlaybackState \{state=3, position=(\d+)", after).group(1))
assert resumed >= max(0, position - 1500), (position, resumed)
d.shell("input", "keyevent", "127")
capture("big-picture-player-3.17.3")
d.shell("input", "keyevent", "4")
print("PASS playback More, speed, fit, sleep, diagnostics and source-switch position", flush=True)

try:
    for name, size, density, minimum, maximum in (
        ("phone", "1080x2400", "420", 0.35, 0.60),
        ("tablet", "1600x2560", "320", 0.15, 0.30),
    ):
        d.shell("wm", "size", size); d.shell("wm", "density", density)
        launch(); d.click(text="Browse movies")
        image = d.find(cls="android.widget.ImageView", scroll=True)
        left, top, right, bottom = map(int, re.findall(r"\d+", image.get("bounds", "")))
        width = int(size.split("x")[0])
        assert minimum < (right - left) / width < maximum, (name, image.get("bounds"))
        assert left >= 0 and right <= width
        capture(name + "-native-3.17.3")
        print("PASS " + name + " native layout and visible poster bounds", flush=True)
finally:
    d.shell("wm", "size", "reset"); d.shell("wm", "density", "reset"); launch()
capture("big-picture-home-3.17.3")
