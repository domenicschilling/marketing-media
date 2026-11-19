#!/bin/bash
# prüfklar: repariert das Foto auf der Ergebnisseite von Mauer. Der Schlüssel wird nicht angezeigt.
set -e
cd "$(dirname "$0")"
export NETLIFY_SITE_ID=c0009fd5-c88e-4fdd-8163-20a0906cc8a8
PK_TOKEN="$(netlify env:get PK_INTERN_TOKEN | tail -1)" node foto-hochladen.mjs
