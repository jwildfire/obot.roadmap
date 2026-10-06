#!/usr/bin/env bash
# Install (or reinstall) the nightly usage refresh as a launchd agent on this Mac.
#
# Copies this checkout's scripts/usage/refresh_local.sh to ~/.obot/bin/ and writes
# ~/Library/LaunchAgents/com.obot.usage-refresh.plist pointing at the copy,
# scheduled for 02:30 local time every day, logging to
# ~/Library/Logs/obot-usage-refresh.log, and loads it.
#
# The copy is the fix for the job's first three weeks (2026-09-12 to 2026-10-05),
# in which it never ran once: the plist pointed into the checkout under
# ~/Documents, macOS privacy protection (TCC) refuses a launchd job access to
# that folder, and every night ended at "Operation not permitted", exit 126,
# before the script's first line. ~/.obot is not a protected folder. The copy
# keeps itself current by handing over to the script in its own clone.
#
# Remove with:
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
SOURCE="$HERE/refresh_local.sh"
SCRIPT="$HOME/.obot/bin/obot-usage-refresh.sh"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/obot-usage-refresh.log"
HOUR=${OBOT_USAGE_REFRESH_HOUR:-2}
MINUTE=${OBOT_USAGE_REFRESH_MINUTE:-30}

[ "$(uname)" = Darwin ] || { echo "launchd is macOS only; on another OS schedule $SCRIPT with cron" >&2; exit 1; }
[ -f "$SOURCE" ] || { echo "missing $SOURCE" >&2; exit 1; }

mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")" "$(dirname "$SCRIPT")"
cp "$SOURCE" "$SCRIPT"
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
echo "then check it ran: tail -5 $LOG   (a line ending 'Operation not permitted' means launchd could not read the script)"
