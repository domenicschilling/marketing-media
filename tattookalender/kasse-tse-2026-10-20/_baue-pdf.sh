#!/bin/zsh
# Baut ~/Downloads/Tattookalender Angebote neu/Tattookalender-Kasse-TSE-Ablauf.pdf aus kasse-tse.html (Chrome headless)
# und rendert jede Seite mit Apple PDFKit/Quartz als PNG zur Kontrolle (_kontrolle/).
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="$HOME/Downloads/Tattookalender Angebote neu/Tattookalender-Kasse-TSE-Ablauf.pdf"
mkdir -p "$(dirname "$OUT")"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=10000 \
  --print-to-pdf="$OUT" "file://$PWD/kasse-tse.html" 2>/dev/null
echo "PDF: $OUT"
rm -rf _kontrolle && mkdir -p _kontrolle
swift _seiten-png.swift "$OUT" _kontrolle
