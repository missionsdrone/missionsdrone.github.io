#!/bin/bash
# Installe une tâche macOS qui lance la mise à jour AIP tous les jours à 7h (et au démarrage du Mac).
# La tâche ne télécharge quelque chose que lorsqu'un nouveau cycle AIRAC est paru (tous les 28 jours).
# Désinstaller : bash tools/install_macos_task.sh --uninstall
set -e
LABEL="com.missionsdrone.aip-update"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$1" = "--uninstall" ]; then
  launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true; rm -f "$PLIST"; echo "Tâche supprimée."; exit 0
fi
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/usr/bin/python3</string><string>$ROOT/tools/update_aip.py</string></array>
  <key>WorkingDirectory</key><string>$ROOT</string>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$ROOT/tools/update_aip.log</string>
  <key>StandardErrorPath</key><string>$ROOT/tools/update_aip.log</string>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Tâche installée : mise à jour AIP quotidienne (journal : $ROOT/tools/update_aip.log)"
