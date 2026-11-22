#!/bin/zsh
# INTERN: baut ~/Downloads/Tattookalender Angebote neu/Tattookalender-Preise-Tattoo-Fashion-Kette.pdf (nur für Domenic/Andy/Mads, nie veröffentlichen).
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="$HOME/Downloads/Tattookalender Angebote neu/Tattookalender-Preise-Tattoo-Fashion-Kette.pdf"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=10000 \
  --print-to-pdf="$OUT" "file://$PWD/preise-kette.html" 2>/dev/null
echo "PDF: $OUT"
