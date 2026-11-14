#!/bin/bash
# Kopiert den Zeichen-Baukasten der Studio-Beiträge (app-kit.js) samt allem, was er braucht, aus der Website in die App.
# Die App zeichnet die Beiträge damit lokal in einem unsichtbaren WKWebView (ohne Internet, gleiches Aussehen wie im Web).
# Aufruf nach jeder Änderung an app-kit.js, werbung-texte.js, klarna-texte.js, werbung-texte.js (vor app-kit.js laden), Figur/Wortmarke oder Schriften:
#   bash tattoofin/ios/scripts/web-kit-sync.sh
# Danach die Kopie mit einchecken. Der Test WerbungTests/kitGleichWieWebsite meldet, wenn die Kopie veraltet ist.
set -euo pipefail
HIER="$(cd "$(dirname "$0")" && pwd)"
QUELLE="$HIER/../../website/public"
ZIEL="$HIER/../Tattoofin/Resources/WebKit"
mkdir -p "$ZIEL"
for d in js/app-kit.js js/werbung-texte.js js/klarna-texte.js js/werbung-texte.js js/qrcode.min.js assets/figur.png assets/wortmarke.png assets/fonts/LuckiestGuy.woff2 assets/fonts/DMSans.woff2; do
  cp "$QUELLE/$d" "$ZIEL/$(basename "$d")"
done
echo "Web-Kit kopiert nach $ZIEL:"
ls -la "$ZIEL"
