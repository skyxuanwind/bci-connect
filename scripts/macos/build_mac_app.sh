#!/usr/bin/env bash
set -euo pipefail

# Build a macOS .app wrapper for the BCI NFC Gateway Launcher
# Output: dist/BCI-NFC-Gateway-Launcher.app and zipped dist/BCI-NFC-Gateway-Launcher-macOS.zip

ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)
DIST_DIR="$ROOT_DIR/dist"
APP_NAME="BCI-NFC-Gateway-Launcher"
APP_DIR="$DIST_DIR/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RES_DIR="$CONTENTS_DIR/Resources"

mkdir -p "$DIST_DIR"
rm -rf "$APP_DIR"
mkdir -p "$MACOS_DIR" "$RES_DIR"

# Write minimal Info.plist
cat > "$CONTENTS_DIR/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>BCI NFC Gateway Launcher</string>
  <key>CFBundleDisplayName</key><string>BCI NFC Gateway Launcher</string>
  <key>CFBundleIdentifier</key><string>com.bci.gateway.launcher</string>
  <key>CFBundleVersion</key><string>1.0.0</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>10.15</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.utilities</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST

# Bundle the existing .command into Resources
cp "$ROOT_DIR/client/public/BCI-NFC-Gateway-Launcher.command" "$RES_DIR/BCI-NFC-Gateway-Launcher.command"

# Main executable wrapper that opens Terminal to run the command
cat > "$MACOS_DIR/$APP_NAME" <<'SH'
#!/bin/bash
set -euo pipefail
THIS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CMD="$THIS_DIR/Resources/BCI-NFC-Gateway-Launcher.command"
# Remove quarantine and ensure executable
if command -v xattr >/dev/null 2>&1; then
  xattr -dr com.apple.quarantine "$CMD" || true
fi
chmod +x "$CMD"
# Prefer to open in Terminal to show progress; fallback to bash
open -a Terminal "$CMD" || bash "$CMD"
SH

chmod +x "$MACOS_DIR/$APP_NAME"

# Optionally codesign if SIGN_IDENTITY is provided (skip if not set)
if [[ -n "${SIGN_IDENTITY:-}" ]]; then
  echo "Signing app with identity: $SIGN_IDENTITY"
  codesign --deep --force --options runtime --sign "$SIGN_IDENTITY" "$APP_DIR"
fi

# Zip the app for distribution
( cd "$DIST_DIR" && rm -f "$APP_NAME-macOS.zip" && zip -r "$APP_NAME-macOS.zip" "$APP_NAME.app" )

echo "Built: $DIST_DIR/$APP_NAME-macOS.zip"