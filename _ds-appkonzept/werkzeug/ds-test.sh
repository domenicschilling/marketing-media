#!/bin/bash
# DS-Test: bauen, testen, Bildschirmfotos herausholen – ein Befehl (DS APPKonzept, 09-pruefung.md).
#
#   bash content/_ds-appkonzept/werkzeug/ds-test.sh <projekt-ordner> <schema> [simulator] [ziel-ordner]
#
#   projekt-ordner  Ordner mit .xcodeproj oder Package.swift
#   schema          Xcode-Schema (bei einem Swift-Paket der Paketname)
#   simulator       Name, Standard "iPhone 17" (für SE-Größe zusätzlich mit "iPhone 17e" laufen lassen)
#   ziel-ordner     wohin Ergebnis und Fotos kommen, Standard <projekt-ordner>/ds-pruefung/<datum-uhrzeit>
#
# Vorher: Simulator zurücksetzen, sonst sind Rundgänge unzuverlässig (Erfahrung Tattoofin):
#   xcrun simctl shutdown "<simulator>"; xcrun simctl erase "<simulator>"
# Lädt nichts hoch, signiert nichts für den Store.
set -euo pipefail

projekt="${1:?Projekt-Ordner fehlt}"
schema="${2:?Schema fehlt}"
simulator="${3:-iPhone 17}"
ziel="${4:-$projekt/ds-pruefung/$(date +%Y-%m-%d-%H%M)}"

mkdir -p "$ziel/fotos"
ergebnis="$ziel/ergebnis.xcresult"

echo "== Bauen und testen: $schema auf $simulator"
cd "$projekt"
set +e
xcodebuild test \
  -scheme "$schema" \
  -destination "platform=iOS Simulator,name=$simulator" \
  -resultBundlePath "$ergebnis" \
  CODE_SIGNING_ALLOWED=NO \
  > "$ziel/xcodebuild.log" 2>&1
status=$?
set -e

echo "== Ergebnis"
grep -E "✔ Test run|✘|Test Suite .* (passed|failed)|Executed [0-9]+ tests" "$ziel/xcodebuild.log" | tail -8 || true

echo "== Bildschirmfotos exportieren"
if xcrun xcresulttool export attachments --path "$ergebnis" --output-path "$ziel/fotos" >/dev/null 2>&1; then
  echo "$(ls "$ziel/fotos" | grep -ci '\.png$' || true) Bilder in $ziel/fotos"
else
  echo "Keine Anhänge exportiert (ältere Xcode-Version oder keine UI-Tests)."
fi

echo "== Log: $ziel/xcodebuild.log"
exit $status
