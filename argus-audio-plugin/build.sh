#!/bin/bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="${ARGUS_PLUGIN_OUT:-$here/build}"
bundle="$out/ArgusVirtualMic.driver"
version="${ARGUS_PLUGIN_VERSION:-1.0.0}"
identity="${ARGUS_PLUGIN_IDENTITY:--}"
deployment="${ARGUS_PLUGIN_MIN_MACOS:-10.13}"
strict="${ARGUS_PLUGIN_STRICT:-1}"
werror="-Werror"
if [ "$strict" = "0" ]; then
  werror=""
fi

if [ "$(uname -s)" != "Darwin" ]; then
  echo "argus-audio-plugin builds on macOS only. Current system: $(uname -s)" >&2
  exit 1
fi

rm -rf "$bundle"
mkdir -p "$bundle/Contents/MacOS"
cp "$here/Info.plist" "$bundle/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $version" "$bundle/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $version" "$bundle/Contents/Info.plist"

clang \
  -arch arm64 -arch x86_64 \
  -bundle \
  -mmacosx-version-min="$deployment" \
  -O2 -std=c11 -Wall -Wextra $werror \
  -fvisibility=hidden \
  -framework CoreAudio -framework CoreFoundation \
  -o "$bundle/Contents/MacOS/ArgusVirtualMic" \
  "$here/src/argus_driver.c" \
  "$here/src/argus_format.c" \
  "$here/src/argus_plugin_props.c" \
  "$here/src/argus_device_props.c" \
  "$here/src/argus_stream_props.c" \
  "$here/src/argus_io.c"

if ! nm -gU "$bundle/Contents/MacOS/ArgusVirtualMic" | grep -q "_ArgusVirtualMicCreate"; then
  echo "the factory symbol ArgusVirtualMicCreate is not exported" >&2
  exit 1
fi

if [ "$identity" = "-" ]; then
  codesign --force --sign - "$bundle"
  echo "signed ad hoc. A Developer ID signature is required before distribution."
else
  codesign --force --options runtime --timestamp --sign "$identity" "$bundle"
  codesign --verify --strict --verbose=2 "$bundle"
fi

echo "built $bundle"
