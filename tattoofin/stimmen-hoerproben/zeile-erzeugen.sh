#!/bin/bash
# Eine Sprecherzeile lokal erzeugen (Piper, kostenlos, offline).
# Aufruf: zeile-erzeugen.sh <modell> <ausgabe-ohne-endung> "<Text>" [sprecher-nr]
#   modell: de_DE-thorsten-high | de_DE-thorsten_emotional-medium (Sprecher 4 = neutral, 0 = amused)
# Beispiel: zeile-erzeugen.sh de_DE-thorsten-high hook1 "Dein Kunde will den großen Slieve ..."
P=$HOME/.local/share/piper-tts
FF=/Users/domi/Marketing-Maschine/node_modules/ffmpeg-static/ffmpeg
M=$1; O=$2; T=$3; SP=$4; ARGS=""; [ -n "$SP" ] && ARGS="-s $SP"
echo "$T" | $P/venv/bin/python -m piper -m $P/models/$M.onnx $ARGS -f "$O.wav" >/dev/null 2>&1
$FF -y -loglevel error -i "$O.wav" -af "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,loudnorm=I=-14:TP=-1.5:LRA=11" -ar 44100 -b:a 192k "$O.mp3" && rm -f "$O.wav"
