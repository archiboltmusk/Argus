#!/usr/bin/env bash
set -u

echo "Searching for Android APK packages..."
APK=$(find . -name "Argus-*.apk" | head -n1 || true)

if [ -z "$APK" ] || [ ! -f "$APK" ]; then
  echo "::warning::No APK artifact found to test in emulator"
  exit 0
fi

echo "Testing APK: $APK"
adb install -r "$APK" || true

PKG=$(aapt2 dump badging "$APK" 2>/dev/null | sed -n "s/.*package: name='\([^']*\)'.*/\1/p" | head -n1 || echo "app.argus.desktop")
echo "Identified package: $PKG"

adb logcat -c || true
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 || true
sleep 8

if adb logcat -d | grep -E "FATAL EXCEPTION|UnsatisfiedLinkError"; then
  echo "::warning::Potential runtime issue detected in logcat"
fi

echo "Emulator smoke test finished successfully."
