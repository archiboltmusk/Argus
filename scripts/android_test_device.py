"""Small ADB helper for native Android acceptance tests."""
import re
import shlex
import subprocess
import time
import xml.etree.ElementTree as ET

class Device:
    def __init__(self, adb, serial):
        self.prefix = [adb, "-s", serial]
        assert self.shell("getprop", "ro.kernel.qemu").strip() == "1", "Use a dedicated emulator"

    def shell(self, *args):
        return subprocess.check_output(self.prefix + ["shell", shlex.join(args)], timeout=45, stderr=subprocess.STDOUT).decode()

    def tree(self):
        for _ in range(3):
            result = self.shell("uiautomator", "dump", "/sdcard/argus-upgrade-ui.xml")
            if "ERROR:" not in result:
                return ET.fromstring(self.shell("cat", "/sdcard/argus-upgrade-ui.xml"))
            time.sleep(0.4)
        raise AssertionError("Android didn't return an accessibility hierarchy")

    def find(self, text=None, contains=None, cls=None, timeout=30, scroll=False):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                root = self.tree()
            except AssertionError:
                continue
            assert not any(n.get("class") == "android.webkit.WebView" for n in root.iter("node"))
            for node in root.iter("node"):
                if text is not None and node.get("text", "").casefold() != text.casefold():
                    continue
                if contains is not None and contains not in node.get("text", ""):
                    continue
                if cls is not None and node.get("class") != cls:
                    continue
                return node
            if scroll:
                self.shell("input", "keyevent", "20")
            time.sleep(0.3)
        raise AssertionError(f"Missing native control: {text or contains or cls}")

    def tap(self, node):
        left, top, right, bottom = map(int, re.findall(r"\d+", node.get("bounds", "")))
        self.shell("input", "tap", str((left + right) // 2), str((top + bottom) // 2))

    def click(self, **kwargs):
        self.tap(self.find(**kwargs))

    def text(self, node, value):
        self.tap(node)
        self.shell("input", "keyevent", "123")
        self.shell("input", "keyevent", *(["67"] * max(1, min(256, len(node.get("text", ""))))))
        self.shell("input", "text", value)
        self.shell("input", "keyevent", "4")
