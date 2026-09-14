#!/usr/bin/env bash
# Install (or reinstall) the nightly usage refresh as a launchd agent on this Mac.
#
# Writes ~/Library/LaunchAgents/com.obot.usage-refresh.plist pointing at this
# checkout's scripts/usage/refresh_local.sh, scheduled for 02:30 local time every
# day, logging to ~/Library/Logs/obot-usage-refresh.log, and loads it. Run it
# again after moving the checkout. Remove with:
#
#     launchctl bootout gui/$(id -u)/com.obot.usage-refresh
#     rm ~/Library/LaunchAgents/com.obot.usage-refresh.plist
#
# The job runs unattended on this machine, which is the one thing the program's
# cloud-environments doc otherwise avoids; it is here because the local
# transcripts exist nowhere else. The refresh script itself commits one file to
# main only when the numbers moved.
set -euo pipefail

LABEL=com.obot.usage-refresh
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SCRIPT="$HERE/refresh_local.sh"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/obot-usage-refresh.log"
HOUR=${OBOT_USAGE_REFRESH_HOUR:-2}
MINUTE=${OBOT_USAGE_REFRESH_MINUTE:-30}

[ "$(uname)" = Darwin ] || { echo "launchd is macOS only; on another OS schedule $SCRIPT with cron" >&2; exit 1; }
[ -f "$SCRIPT" ] || { echo "missing $SCRIPT" >&2; exit 1; }

mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SCRIPT</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>$HOUR</integer>
    <key>Minute</key><integer>$MINUTE</integer>
  </dict>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "installed $LABEL — runs $SCRIPT daily at $(printf '%02d:%02d' "$HOUR" "$MINUTE"), log at $LOG"
echo "run it now with: launchctl kickstart gui/$(id -u)/$LABEL"
