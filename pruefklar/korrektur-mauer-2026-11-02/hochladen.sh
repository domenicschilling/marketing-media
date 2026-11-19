#!/bin/bash
# prüfklar: Ergebnisseite von Mauer korrigieren (falsche Warenkorb-Aussage raus). Alter Stand: alt.json + alt-beweis.jpg in diesem Ordner.
set -e
cd "$(dirname "$0")"
export NETLIFY_SITE_ID=c0009fd5-c88e-4fdd-8163-20a0906cc8a8
netlify blobs:set pruefklar checks/EPYTQVNE/beweis.jpg --input neu-beweis.jpg --force
netlify blobs:set pruefklar checks/EPYTQVNE.json --input neu.json --force
echo "Fertig. Sag Claude im Prüfklar-Chat kurz Bescheid."
