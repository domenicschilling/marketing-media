#!/bin/zsh
# Baut die beiden PDFs (Rechnungsvorlage, Auftragszettel) aus den HTML-Dateien neu. Nur lokal, nichts wird veröffentlicht.
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for paar in "rechnungsvorlage-gruender-249:Rechnungsvorlage-Gruender-Aktion-249" "auftragszettel-gruender-249:Auftragszettel-Gruender-Aktion-249"; do
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=5000 \
    --print-to-pdf="${paar#*:}.pdf" "file://$PWD/${paar%%:*}.html" 2>/dev/null
done
