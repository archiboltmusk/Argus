#!/bin/bash
# ==============================================================================
# Argus macOS Turnkey Installer & Gatekeeper Bypass
# Downloads latest release, installs to /Applications, removes quarantine,
# and applies ad-hoc codesigning to solve "App is damaged / unverified" warnings.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/archiboltmusk/Argus/main/scripts/install-mac.sh | bash
# ==============================================================================

set -e

REPO="archiboltmusk/Argus"
APP_NAME="Argus.app"
DEST_DIR="/Applications"

echo "=================================================="
echo "  🚀 Argus macOS Seamless Installer"
echo "=================================================="

# 1. Detect Architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    echo "✓ Detected Apple Silicon (M1/M2/M3/M4) - arm64"
    TARGET_SUFFIX="aarch64"
else
    echo "✓ Detected Intel Mac - x86_64"
    TARGET_SUFFIX="x64"
fi

# 2. Fetch Latest Release Tag from GitHub API
echo "→ Fetching latest release info from GitHub..."
LATEST_TAG=$(curl -sSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null | grep '"tag_name":' | head -n 1 | cut -d '"' -f 4 || true)

if [ -z "$LATEST_TAG" ]; then
    LATEST_TAG="v3.17.23"
fi
echo "✓ Target version: ${LATEST_TAG}"

# 3. Download DMG
TEMP_DIR=$(mktemp -d /tmp/argus-install.XXXXXX)
DMG_PATH="${TEMP_DIR}/Argus.dmg"

# Try release assets
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${LATEST_TAG}/Argus_${LATEST_TAG#v}_${TARGET_SUFFIX}.dmg"
echo "→ Downloading Argus (${TARGET_SUFFIX})..."

if ! curl -f -L --progress-bar -o "$DMG_PATH" "$DOWNLOAD_URL"; then
    # Fallback asset naming convention
    FALLBACK_URL="https://github.com/${REPO}/releases/download/${LATEST_TAG}/Argus_${TARGET_SUFFIX}.dmg"
    echo "→ Trying fallback asset URL..."
    if ! curl -f -L --progress-bar -o "$DMG_PATH" "$FALLBACK_URL"; then
        # Check if local app exists
        if [ -d "${DEST_DIR}/${APP_NAME}" ]; then
            echo "! Download failed, but found existing ${DEST_DIR}/${APP_NAME}."
            echo "→ Skipping download and applying Gatekeeper / Signing fix to existing install..."
            DMG_PATH=""
        else
            echo "❌ Error: Could not download release DMG from GitHub."
            echo "   Please download manually from: https://github.com/${REPO}/releases/tag/${LATEST_TAG}"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
    fi
fi

# 4. Mount & Copy (if DMG was downloaded)
if [ -n "$DMG_PATH" ] && [ -f "$DMG_PATH" ]; then
    echo "→ Mounting DMG..."
    MOUNT_POINT=$(mktemp -d /tmp/argus-mount.XXXXXX)
    hdiutil attach "$DMG_PATH" -mountpoint "$MOUNT_POINT" -nobrowse -quiet

    echo "→ Installing to ${DEST_DIR}/${APP_NAME}..."
    if [ -d "${DEST_DIR}/${APP_NAME}" ]; then
        rm -rf "${DEST_DIR}/${APP_NAME}"
    fi

    if [ -d "${MOUNT_POINT}/${APP_NAME}" ]; then
        cp -R "${MOUNT_POINT}/${APP_NAME}" "${DEST_DIR}/"
    else
        echo "❌ Error: Could not find ${APP_NAME} inside mounted image."
        hdiutil detach "$MOUNT_POINT" -quiet || true
        rm -rf "$TEMP_DIR" "$MOUNT_POINT"
        exit 1
    fi

    # Unmount
    hdiutil detach "$MOUNT_POINT" -quiet || true
    rm -rf "$TEMP_DIR" "$MOUNT_POINT"
fi

# 5. Fix Gatekeeper Quarantine & Apply Ad-Hoc Signature
echo "→ Resolving macOS Gatekeeper & Signature checks..."

# Strip quarantine attribute recursively
if [ -e "${DEST_DIR}/${APP_NAME}" ]; then
    xattr -cr "${DEST_DIR}/${APP_NAME}" 2>/dev/null || true
    echo "✓ Stripped quarantine attributes (xattr -cr)"

    # Ad-hoc sign bundle so macOS treats it as locally authorized
    if command -v codesign >/dev/null 2>&1; then
        codesign --force --deep --sign - "${DEST_DIR}/${APP_NAME}" 2>/dev/null || true
        echo "✓ Applied ad-hoc codesign (--force --deep --sign -)"
    fi
else
    echo "⚠️  Could not find ${DEST_DIR}/${APP_NAME} to sign."
    exit 1
fi

echo ""
echo "=================================================="
echo "  🎉 Installation & Signing Complete!"
echo "  Argus is ready to run without security warnings."
echo "=================================================="
echo "You can now open Argus from Applications, Spotlight, or by typing:"
echo "  open /Applications/Argus.app"
echo ""
