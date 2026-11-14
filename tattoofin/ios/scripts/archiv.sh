#!/bin/bash
# Release-Archiv der Tattoofin-App bauen und als .ipa für App Store Connect exportieren.
# Voraussetzung: In Xcode → Einstellungen → Accounts ist die Apple-ID des Teams DSX Media Solutions UG (5WPPC8669J) angemeldet.
# Lädt NICHTS hoch. Hochladen erst nach Domenics OK (Xcode Organizer → Distribute App, oder Transporter).
set -euo pipefail
cd "$(dirname "$0")/.."
AUS="${1:-$HOME/Desktop/Tattoofin-Archiv}"
mkdir -p "$AUS"
xcodebuild -project Tattoofin.xcodeproj -scheme Tattoofin -configuration Release \
  -destination "generic/platform=iOS" -archivePath "$AUS/Tattoofin.xcarchive" \
  -allowProvisioningUpdates archive
xcodebuild -exportArchive -archivePath "$AUS/Tattoofin.xcarchive" \
  -exportOptionsPlist Config/ExportOptions.plist -exportPath "$AUS/export" -allowProvisioningUpdates
echo "Fertig: $AUS/export/Tattoofin.ipa"
