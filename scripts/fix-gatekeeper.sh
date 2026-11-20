#!/bin/bash
# ==============================================================================
# Argus macOS Gatekeeper & Signature Fixer
# Removes Apple quarantine flag and applies local ad-hoc signing
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/archiboltmusk/Argus/main/scripts/fix-gatekeeper.sh | bash
#   OR: ./scripts/fix-gatekeeper.sh /path/to/Argus.app
# ==============================================================================

set -e

TARGET="${1:-/Applications/Argus.app}"

if [ ! -e "$TARGET" ]; then
    # Look in current directory or user Applications
    if [ -e "./Argus.app" ]; then
        TARGET="./Argus.app"
    elif [ -e "$HOME/Applications/Argus.app" ]; then
        TARGET="$HOME/Applications/Argus.app"
    else
        echo "❌ Could not find Argus.app at: $TARGET"
        echo "   Please pass the path: $0 /path/to/Argus.app"
        exit 1
    fi
fi

echo "=================================================="
echo "  🛡️ Fixing Gatekeeper on: $TARGET"
echo "=================================================="

echo "→ Stripping com.apple.quarantine attribute..."
xattr -cr "$TARGET" 2>/dev/null || {
    echo "→ Needs sudo permission to remove quarantine..."
    sudo xattr -cr "$TARGET"
}

echo "→ Applying local ad-hoc signature..."
codesign --force --deep --sign - "$TARGET" 2>/dev/null || {
    echo "→ Retrying with sudo..."
    sudo codesign --force --deep --sign - "$TARGET"
}

echo ""
echo "✓ Verification:"
spctl --assess --type execute -v "$TARGET" 2>&1 || true

echo ""
echo "=================================================="
echo "  🎉 Success! Gatekeeper quarantine cleared."
echo "  You can now open Argus without warnings."
echo "=================================================="
