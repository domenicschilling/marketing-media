# Tattoofin: Unterlagen

Alles für Vertrieb, Umsetzung, Studios und deren Kunden rund um Tattoofin: flexible Zahlungsoptionen und Ratenzahlung (über externe Zahlungsanbieter) für Tattoo-Studios.
Übersicht zum Anklicken: `tattoofin/index.html` (über GitHub Pages: `/marketing-media/tattoofin/`).

| Ordner | Inhalt |
|---|---|
| `intern/` | Produkt & Kalkulation, Vertriebs-Playbook, Direct-Mail-Kampagne „Das Sparschwein geht in Rente“, Umsetzung & Onboarding, Nachrichtenvorlagen |
| `studios/` | Überblick (Verkaufs-Flyer), So funktioniert's, Team-Leitfaden, Mailing-Brief, Vertrag, AVV, Fragebogen, Postkarte, Paket-Aufkleber |
| `kunden/` | Fensteraufkleber, Flyer A6, Thekenaufsteller A5, Kundeninfo „Flexibel bezahlen“, Social-Kit, Generator pro Studio |
| `pdf/` | Fertige PDFs (neu erzeugen mit `node tools/render-pdf.mjs`) |
| `website/` | Website: Online-Abschluss mit Stripe (Kauf 1.499 € oder 10 % Provision), Studio-Portal mit Zahlungslinks und Zahlseite, automatische Provisionsabrechnung, E-Mails. Siehe `website/README.md` |
| `video.html` | Mobile Seite mit Werbevideo (`assets/werbevideo.mp4`), Ziel der QR-Codes im Mailing |

## Werte ändern

Preise, Firmendaten, Aktionscode, Website-Adresse usw. stehen **nur** in `assets/config.js`.
Nach einer Änderung PDFs neu erzeugen:

```
cd tattoofin
node tools/render-pdf.mjs                      # alle allgemeinen PDFs
node tools/render-pdf.mjs intern               # nur die internen Unterlagen
node tools/render-pdf.mjs kunden --studio "Ink Studio" --tel "0951 123456" --zahlen "https://…/zahlen/ink-studio"   # Studio Kit für ein Studio (QR zur Studio-Zahlseite)
node tools/render-pdf.mjs brief --studio "Ink Studio" --vorname "Alex" --strasse "Musterstr. 1" --ort "96047 Bamberg"
```

Studio-spezifische PDFs landen in `pdf/studio-<name>/`.

Gelb markierte Stellen in den Dokumenten sind noch offene Platzhalter (werden im Druck nicht farbig).
Vertrag, AVV und die Formulierungen zur Ratenzahlung sind Vorlagen und sollten vor dem ersten Einsatz rechtlich geprüft werden.
Wichtig für alle Kundenmaterialien: keine konkreten Raten, Zinsen, Laufzeiten oder Beispielrechnungen, nur „Ratenzahlung möglich*“ mit Fußnote.
