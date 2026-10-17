#!/bin/zsh
# Baut die drei PDFs (Angebotsblatt, Checkliste, Rechnungsvorlage) aus den HTML-Dateien neu. Nur lokal, nichts wird veröffentlicht.
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for paar in "google-profil-49:Google-Profil-Schnellhilfe-49" "checkliste-google-profil-49:Checkliste-Google-Profil-20-Min" "rechnungsvorlage-google-profil-49:Rechnungsvorlage-Google-Profil-49"; do
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=5000 \
    --print-to-pdf="${paar#*:}.pdf" "file://$PWD/${paar%%:*}.html" 2>/dev/null
done
