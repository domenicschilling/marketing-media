#!/bin/zsh
# Baut ~/Downloads/Tattookalender Angebote neu/Tattookalender-Preisplan.pdf aus preisplan.html (Chrome headless) und rendert jede Seite mit Apple PDFKit zur Kontrolle.
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="$HOME/Downloads/Tattookalender Angebote neu/Tattookalender-Preisplan.pdf"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=10000 \
  --print-to-pdf="$OUT" "file://$PWD/preisplan.html" 2>/dev/null
echo "PDF: $OUT"
