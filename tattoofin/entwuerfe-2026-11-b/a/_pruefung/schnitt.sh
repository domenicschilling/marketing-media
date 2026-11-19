#!/bin/zsh
# schneidet die ganze Seite in lesbare Stücke
cd "$(dirname "$0")/shots"
h=$(sips -g pixelHeight 390-ganz.png | tail -1 | awk '{print $2}')
i=0; y=0; while (( y < h )); do ffmpeg -hide_banner -loglevel error -y -i 390-ganz.png -vf "crop=780:min(3400\,$((h-y))):0:$y,scale=390:-1" m$i.png; i=$((i+1)); y=$((y+3400)); done
h=$(sips -g pixelHeight 1440-ganz.png | tail -1 | awk '{print $2}')
i=0; y=0; while (( y < h )); do ffmpeg -hide_banner -loglevel error -y -i 1440-ganz.png -vf "crop=1440:min(2000\,$((h-y))):0:$y,scale=1000:-1" d$i.png; i=$((i+1)); y=$((y+2000)); done
