# limesmont.de – Relaunch

Statische Website mit 3D-Animationen (Three.js), ohne Frameworks und ohne Abhängigkeiten.
Alle Schriften, Skripte und Bilder liegen lokal, es gibt keine Drittanbieter-Requests und keine Cookies.

## Aufbau

```
build.mjs              Generator: erzeugt alle HTML-Seiten nach public/
src/config.mjs         Firmendaten (Telefon, E-Mail, HRB, USt-ID …) und Leistungsliste
src/pages.mjs          Inhalte aller Seiten
src/partials.mjs       Bausteine (Formular, FAQ, Ablauf, 3D-Story, Konfigurator …)
src/layout.mjs         Header, Footer, SEO-Meta, strukturierte Daten
public/                Fertige Website (wird so veröffentlicht)
  assets/css/style.css
  assets/js/main.js                 Navigation, Formular, Zähler, Lazy-Load der 3D-Szenen
  assets/js/scenes/hero-house.js    Hero: Logo-Gebäude „montiert“ sich aus ~90 Teilen
  assets/js/scenes/window-profile.js  Scroll-Story: Fensterprofil zerlegt sich in 4 Schritten
  assets/js/scenes/sandwich-panel.js  Interaktiver Paneel-Konfigurator (Typ, Dicke, Farbe, U-Wert)
netlify.toml           Hosting-Konfiguration (Sicherheits-Header, Caching, Weiterleitungen)
```

Änderungen an Texten oder Daten in `src/` vornehmen, dann `node build.mjs` ausführen (Node ≥ 18).
Lokale Vorschau: `cd public && python3 -m http.server 8000` → http://localhost:8000

## Seiten

Startseite · Leistungen (Übersicht + 6 Unterseiten) · MIRAL PVC · Referenzen · Über uns · Kontakt · Danke · Impressum · Datenschutz · 404.
Dazu `sitemap.xml`, `robots.txt`, Web-Manifest, Open-Graph-Bild und JSON-LD (LocalBusiness, Service, FAQ, Breadcrumbs).

## Vorschau bei Netlify

- Projekt: **limesmont-relaunch** – https://limesmont-relaunch.netlify.app
- Verwaltung: https://app.netlify.com/projects/limesmont-relaunch (Site-ID `da5b4a3f-2c9e-4628-8995-87546a6ad6d7`)
- Formulare „anfrage“ und „rueckruf“ sind aktiv. E-Mail-Benachrichtigung unter *Forms → Form notifications* einrichten.
- Achtung: Das ältere Netlify-Projekt **limes-mont** enthält eine andere, parallel entstandene Version und wurde nicht verändert.

## Go-live-Checkliste

- [ ] **Impressum:** `register` (Registergericht + HRB) und `vatId` in `src/config.mjs` eintragen. Der Build warnt, solange sie fehlen.
- [ ] **E-Mail:** Adresse unter der eigenen Domain einrichten (z. B. info@limesmont.de) und `email` in der Konfiguration ändern.
- [ ] **WhatsApp:** bestätigen, dass +49 1520 8541555 WhatsApp nutzt.
- [ ] **Texte freigeben:** besonders „Kostenloses Angebot“, Einsatzgebiet und Leistungsumfang. Keine Aussagen ohne Beleg (z. B. Jahre an Erfahrung, Zertifikate).
- [ ] **MIRAL PVC:** schriftliche Bestätigung der Generalvertretung; Gegenlink von miral-pvc.com auf limesmont.de anfragen.
- [ ] **Datenschutzerklärung** rechtlich prüfen lassen (Muster für Netlify-Hosting und Netlify Forms).
- [ ] **Netlify:** neue Site aus diesem Repo, Basisverzeichnis `limesmont/website`. Unter *Forms* E-Mail-Benachrichtigung für „anfrage“ und „rueckruf“ an Anis Delalic einrichten.
- [ ] **Domain:** DNS von limesmont.de auf Netlify umstellen (E-Mail-MX-Einträge nicht anfassen).
- [ ] **Danach:** Google Search Console + Sitemap einreichen, Google-Unternehmensprofil auf die neue Seite verlinken.
- [ ] **Eigene Projektfotos:** in `public/assets/img/` ablegen (`name.webp` 1400 px + `name-800.webp`) und in `OWN_PROJECTS` eintragen. Der Abschnitt „Unsere Projekte“ erscheint dann automatisch.

## Hinweise

- Die Formulare (mehrstufige Anfrage mit Foto-Upload bis 8 MB, Rückruf) laufen über **Netlify Forms** und funktionieren nur auf Netlify.
  Ohne JavaScript werden alle Formularschritte untereinander angezeigt, das Absenden funktioniert trotzdem.
- 3D wird erst geladen, wenn die jeweilige Szene ins Bild scrollt. Ohne WebGL, im Datensparmodus oder bei „Bewegung reduzieren“ erscheinen Standbilder bzw. eine statische Ansicht.
- Die Bilder sind die KI-Visualisierungen der alten Website. Sie sind im Impressum als solche gekennzeichnet und sollten durch echte Fotos ersetzt werden.
