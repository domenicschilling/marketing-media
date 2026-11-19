#!/bin/zsh
# Baut ~/Downloads/Tattookalender Angebote neu/Studio-Kit-Tattoo-Fashion.pdf (für Mads Kristensen, Tattoo Fashion).
# Kontrolle danach mit Apple-Darstellung: swift ../angebot-website-2026-10-20/pdf2png.swift <pdf> <ordner>
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="${1:-$HOME/Downloads/Tattookalender Angebote neu/Studio-Kit-Tattoo-Fashion.pdf}"
SRC="${2:-studio-kit.html}"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=15000 \
  --print-to-pdf="$OUT" "file://$PWD/$SRC" 2>/dev/null
echo "PDF: $OUT"
