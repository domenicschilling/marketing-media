# Ted am Telefon: Unterlagen

Alles für Vertrieb, Umsetzung, Studios und deren Kunden rund um den KI-Telefonassistenten.
Übersicht zum Anklicken: `telefon/index.html` (über GitHub Pages: `/marketing-media/telefon/`).

| Ordner | Inhalt |
|---|---|
| `intern/` | Produkt & Kalkulation, Vertriebs-Playbook, Direct-Mail-Kampagne, Umsetzung & Onboarding, Nachrichtenvorlagen |
| `studios/` | Überblick (Verkaufs-Flyer), Erklärung, Rufumleitung, Mailing-Brief, Postkarte, Vertrag, AVV, Fragebogen |
| `kunden/` | Fensteraufkleber, Flyer A6, Thekenaufsteller A5, Türschild A4, Datenschutzhinweis, Generator pro Studio |
| `pdf/` | Fertige PDFs (neu erzeugen mit `node tools/render-pdf.mjs`) |
| `video.html` | Mobile Seite mit Werbevideo (`assets/werbevideo.mp4`), Ziel aller QR-Codes |

## Werte ändern

Preise, Firmendaten, Demo-Nummer, Aktionscode usw. stehen **nur** in `assets/config.js`.
Nach einer Änderung PDFs neu erzeugen:

```
cd telefon
node tools/render-pdf.mjs                      # alle allgemeinen PDFs
node tools/render-pdf.mjs kunden --studio "Ink Studio" --tel "0951 123456"   # Kunden-Materialien für ein Studio
node tools/render-pdf.mjs brief --studio "Ink Studio" --vorname "Alex" --strasse "Musterstr. 1" --ort "96047 Bamberg"
```

Studio-spezifische PDFs landen in `pdf/studio-<name>/`.

Gelb markierte Stellen in den Dokumenten sind noch offene Platzhalter (werden im Druck nicht farbig).
Vertrag, AVV und Datenschutzhinweis sind Vorlagen und sollten vor dem ersten Einsatz rechtlich geprüft werden.
