#!/bin/bash
# Baut die fertigen Meta-App-Review-Videos aus den automatisch aufgenommenen Teilen + Domenics Handy-Clip.
# Aufruf:
#   bash zusammenbauen.sh video1 ~/Desktop/Bildschirmaufnahme.mov   → Video 1 (whatsapp_business_messaging)
#   bash zusammenbauen.sh video2 ~/Desktop/Bildschirmaufnahme.mov   → Video 2 mit eingefügtem „Einreichen“-Clip (optional)
# Ergebnis landet hier im Ordner und als Kopie in ~/Downloads/Meta-App-Review/.
set -euo pipefail
WHICH="${1:?video1 oder video2}"; CLIP="${2:?Pfad zur eigenen Aufnahme (.mov/.mp4)}"
[ -f "$CLIP" ] || { echo "Datei nicht gefunden: $CLIP"; exit 1; }
CLIP="$(cd "$(dirname "$CLIP")" && pwd)/$(basename "$CLIP")"
cd "$(dirname "$0")"
VF="scale=1920:1200:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1200:(ow-iw)/2:(oh-ih)/2:color=0x0b0b0e,fps=30,format=yuv420p,setsar=1"
ENC="-c:v libx264 -preset slow -crf 22 -profile:v high -pix_fmt yuv420p -an -video_track_timescale 15360"
TMP="$(mktemp -d)"
ffmpeg -v error -y -i "$CLIP" -vf "$VF" $ENC "$TMP/clip.mp4"
if [ "$WHICH" = video1 ]; then
  OUT="Meta-Review-1-whatsapp_business_messaging.mp4"
  printf "file '%s'\nfile '%s'\nfile '%s'\n" "$PWD/teile/v1-A-vorher.mp4" "$TMP/clip.mp4" "$PWD/teile/v1-C-nachher.mp4" > "$TMP/list.txt"
else
  OUT="Meta-Review-2-whatsapp_business_management-mit-Einreichen.mp4"
  printf "file '%s'\nfile '%s'\nfile '%s'\n" "$PWD/teile/v2-A-bis-Schritt6.mp4" "$TMP/clip.mp4" "$PWD/teile/v2-C-ab-Schritt7.mp4" > "$TMP/list.txt"
fi
ffmpeg -v error -y -f concat -safe 0 -i "$TMP/list.txt" -c copy -movflags +faststart "$OUT"
mkdir -p ~/Downloads/Meta-App-Review && cp "$OUT" ~/Downloads/Meta-App-Review/
rm -rf "$TMP"
echo "Fertig: $PWD/$OUT ($(du -h "$OUT" | cut -f1)) – Kopie in ~/Downloads/Meta-App-Review/"
