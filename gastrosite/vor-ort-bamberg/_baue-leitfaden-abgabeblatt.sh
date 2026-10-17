#!/bin/zsh
# Baut Leitfaden (A4) und Abgabeblatt (A5) als PDF aus den HTML-Dateien neu. Nur lokal, nichts wird veröffentlicht.
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for paar in "leitfaden:Leitfaden-Vor-Ort-Bamberg" "abgabeblatt:Abgabeblatt-A5-Vor-Ort-Bamberg"; do
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=5000 \
    --print-to-pdf="${paar#*:}.pdf" "file://$PWD/${paar%%:*}.html" 2>/dev/null
done
