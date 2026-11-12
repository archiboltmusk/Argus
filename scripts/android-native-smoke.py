"""Exercise the installed native Argus APK on a dedicated emulator through ADB.

Start android-native-fixture.py and forward its port before running this.
Adds the local test add-on and a test library entry; does not clear app data.
"""
import argparse
import json
import pathlib
import re
import shlex
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument("--serial", required=True)
parser.add_argument("--adb", default="adb")
parser.add_argument("--port", type=int, default=8766)
args = parser.parse_args()
prefix = [args.adb, "-s", args.serial]
proof = pathlib.Path(tempfile.gettempdir()) / "argus-native-proof"
proof.mkdir(exist_ok=True)
checks = []

def adb(*command):
    return subprocess.check_output(prefix + list(command), timeout=40, stderr=subprocess.STDOUT).decode()

def shell(*command):
    return adb("shell", shlex.join(command))

def tree():
    for _ in range(3):
        result = shell("uiautomator", "dump", "/sdcard/argus-native-test.xml")
        if "ERROR:" not in result:
            return ET.fromstring(adb("exec-out", "cat", "/sdcard/argus-native-test.xml"))
        time.sleep(0.3)
    raise AssertionError("Android did not return an accessibility hierarchy")

def find(text=None, contains=None, cls=None, desc=None, timeout=25):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            root = tree()
        except AssertionError:
            time.sleep(0.5)
            continue
        assert not any(n.get("class") == "android.webkit.WebView" for n in root.iter("node")), "Native route created a WebView"
        for node in root.iter("node"):
            if text is not None and node.get("text", "").casefold() != text.casefold():
                continue
            if contains is not None and contains not in node.get("text", ""):
                continue
            if cls is not None and node.get("class") != cls:
                continue
            if desc is not None and node.get("content-desc", "").casefold() != desc.casefold():
                continue
            return node
        time.sleep(0.3)
    raise AssertionError(f"Missing native control: {text or contains or desc or cls}")

def tap(node):
    left, top, right, bottom = map(int, re.findall(r"\d+", node.get("bounds", "")))
    shell("input", "tap", str((left + right) // 2), str((top + bottom) // 2))

def click(text=None, contains=None, desc=None):
    tap(find(text=text, contains=contains, desc=desc))

def enter(node, value):
    tap(node)
    shell("input", "text", value)
    shell("input", "keyevent", "4")  # close the keyboard

def mark(name):
    checks.append(name)
    print("PASS", name, flush=True)

def screenshot(name):
    with (proof / (name + ".png")).open("wb") as output:
        subprocess.run(prefix + ["exec-out", "screencap", "-p"], stdout=output, check=True, timeout=30)

assert shell("getprop", "ro.kernel.qemu").strip() == "1", "Use a dedicated Android emulator for this test"
launcher = shell("cmd", "package", "resolve-activity", "--brief", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.LEANBACK_LAUNCHER", "app.argus.desktop")
assert "app.argus.player.NativeTvActivity" in launcher
for action, categories, uri in [
    ("android.intent.action.MAIN", ["android.intent.category.HOME", "android.intent.category.DEFAULT"], None),
    ("android.intent.action.VIEW", ["android.intent.category.BROWSABLE"], "stremio://example.org/manifest.json"),
]:
    command = ["cmd", "package", "resolve-activity", "--brief", "-a", action]
    for category in categories:
        command += ["-c", category]
    if uri:
        command += ["-d", uri]
    assert "app.argus.player.NativeTvActivity" in shell(*command, "app.argus.desktop")
shell("am", "force-stop", "app.argus.desktop")
shell("am", "start", "-W", "-n", "app.argus.desktop/app.argus.player.NativeTvActivity")
find(text="Browse movies")
shell("input", "keyevent", "20")
shell("input", "keyevent", "19")
assert any(n.get("focused") == "true" for n in tree().iter("node"))
mark("cold native launcher and D-pad focus")
screenshot("home-android9")

click(text="Add-ons")
enter(find(cls="android.widget.EditText"), f"http://127.0.0.1:{args.port}/manifest.json")
click(text="Install add-on")
find(text="Add-on installed")
mark("install Stremio add-on")
click(text="Settings")
fields = [n for n in tree().iter("node") if n.get("class") == "android.widget.EditText"]
for node, value in zip(fields, ("hi", "en")):
    # Select existing text before entering, so the check can be rerun.
    tap(node)
    shell("input", "keyevent", "123")
    shell("input", "keyevent", *(["67"] * max(1, min(64, len(node.get("text", ""))))))
    shell("input", "text", value)
    shell("input", "keyevent", "4")
click(text="Save playback preferences")
find(text="Playback preferences saved")
mark("native playback settings")
click(text="Installed apps")
find(text="Installed apps")
mark("native installed-apps screen")

click(text="Home")
click(text="Browse movies")
find(contains="Native Playback Test")
shell("input", "keyevent", "23")
find(text="Choose source")
root = tree()
if any(n.get("text") == "Save to Library" for n in root.iter("node")):
    click(text="Save to Library")
find(text="Remove from Library")
shell("input", "keyevent", "23")
find(contains="Playable HD")
shell("input", "keyevent", "23")
time.sleep(5)
shell("input", "keyevent", "127")
# Android 9's accessibility bridge intermittently omits SurfaceView windows.
# Verify the real Android media-session state rather than a transient icon.
deadline = time.monotonic() + 15
while time.monotonic() < deadline:
    session = shell("dumpsys", "media_session")
    if "Media button session is app.argus.desktop/" in session and re.search(r"state=PlaybackState \{state=2, position=[1-9]", session):
        break
    time.sleep(0.3)
else:
    raise AssertionError("The projector media key did not pause native playback")
screenshot("native-player-android9")
mark("catalog to details to native playback and pause")
shell("input", "keyevent", "4")
click(text="Library")
find(contains="Native Playback Test")
assert any(" · " in n.get("text", "") and "Native Playback Test" in n.get("text", "") for n in tree().iter("node")), "Resume history was not saved"
mark("library and resume history")

click(text="Search")
enter(find(cls="android.widget.EditText"), "Native")
click(text="Search titles")
find(contains="Native Playback Test")
find(contains="Native Series Test")
mark("native multi-catalog search")
click(contains="Native Series Test")
click(text="Season 1")
click(contains="Native episode")
find(contains="Playable HD")
click(contains="Broken 4K test source")
find(text="Couldn't play this source", timeout=35)
click(text="Choose another source")
find(contains="Playable HD")
mark("series, episodes and failed-source recovery")

click(contains="Torrent-only test source")
find(text="Choose a direct stream")
click(text="Choose another source")
mark("unsupported source has an actionable message")
shell("am", "force-stop", "app.argus.desktop")
shell("am", "start", "-W", "-n", "app.argus.desktop/app.argus.player.NativeTvActivity")
find(contains="Resume at")
click(text="Library")
find(contains="Native Playback Test")
screenshot("library-after-restart-android9")
mark("library and resume survive process restart")
print(json.dumps({"checks": checks, "screenshots": str(proof)}, indent=2))
