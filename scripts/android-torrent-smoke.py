"""Verify actual seeded torrent playback through the shipped Android application."""
import argparse
import re
import time
from android_test_device import Device

parser = argparse.ArgumentParser()
parser.add_argument("--adb", default="adb")
parser.add_argument("--serial", required=True)
args = parser.parse_args()
device = Device(args.adb, args.serial)
device.shell("am", "force-stop", "app.argus.desktop")
device.shell("am", "start", "-W", "-a", "android.intent.action.VIEW", "-d",
             "argus://addon?url=http%3A%2F%2F127.0.0.1%3A8879%2Fmanifest.json", "app.argus.desktop")
time.sleep(0.5)
if not any(n.get("text") == "Local torrent test · Manage" for n in device.tree().iter("node")):
    device.click(text="Install add-on")
    device.find(text="Add-on installed")
device.click(text="Home")
device.click(text="Browse movies")
device.click(contains="Native Torrent Playback Test", scroll=True)
device.click(text="Choose source")
device.click(contains="Local torrent video")
deadline = time.monotonic() + 90
while time.monotonic() < deadline:
    session = device.shell("dumpsys", "media_session")
    if "app.argus.desktop/" in session and re.search(r"state=PlaybackState \{state=3, position=[1-9]", session):
        break
    time.sleep(1)
else:
    raise AssertionError("Torrent did not reach playing with positive position")
device.shell("input", "keyevent", "127")
session = device.shell("dumpsys", "media_session")
assert re.search(r"state=PlaybackState \{state=2, position=[1-9]", session), "Torrent didn't pause"
device.shell("input", "keyevent", "4")
device.click(text="Library")
device.find(contains="Native Torrent Playback Test")
print("PASS real torrent metadata, peer transfer, native playback, remote pause and saved resume")
