#!/bin/bash
# prüfklar: Ergebnisse für Lauf T2 hochladen. Der Schlüssel wird nicht angezeigt, verschickt wird nichts.
set -e
cd "$(dirname "$0")"
export NETLIFY_SITE_ID=c0009fd5-c88e-4fdd-8163-20a0906cc8a8
PK_TOKEN="$(netlify env:get PK_INTERN_TOKEN | tail -1)" node hochladen.mjs
