/*
 * Zentrale Einstellungen für alle Tattoofin-Unterlagen.
 * Einmal hier ändern -> alle Dokumente (Verträge, Flyer, Preise, Kontaktdaten) übernehmen den Wert.
 * Werte in [eckigen Klammern] sind noch auszufüllen.
 */
window.CFG = {
  // Anbieter
  firma: "DSX Media Solutions UG (haftungsbeschränkt)",
  marke: "Tattoofin",
  produkt: "Tattoofin",
  adresse: "Am Weingarten 9, 96117 Memmelsdorf",
  registergericht: "Amtsgericht Bamberg, HRB 12150",
  ustid: "DE456133925",
  geschaeftsfuehrer: "Domenic Schilling",
  ansprechpartner: "Domenic Schilling",
  telefon: "0162 4502375",
  email: "info@tattoofin.de",
  web: "tattoofin.de",
  webUrl: "https://tattoofin.de",
  instagram: "@tattoofin.de",
  gerichtsstand: "Bamberg",
  // Seite mit dem Werbevideo (Ziel der QR-Codes im Mailing). Video als assets/werbevideo.mp4 ablegen.
  videoSeite: "https://domenicschilling.github.io/marketing-media/tattoofin/video.html",
  whatsappLink: "https://wa.me/491624502375?text=Hi%2C%20ich%20interessiere%20mich%20f%C3%BCr%20Tattoofin!",
  websiteUrl: "https://tattoofin.de",   // Adresse der Website mit Online-Abschluss (tattoofin/website)

  // Drei Pakete (seit 18.10.2026). Das Studio wählt EINES:
  //  Risikofrei (Modell B): 10 % vom Zahlbetrag jeder Zahlung, alles inklusive (Zahlungsgebühren + USt.), monatlich kündbar
  //  Monatlich (Modell A): 49 € netto im Monat, eigenes Stripe-Konto, Zahlungsgebühren direkt an Stripe, inkl. QR-Aufsteller
  //  Einmalzahlung (Modell A): einmalig 999 € netto, danach nur Zahlungsgebühren an Stripe, inkl. QR-Aufsteller, Nutzungszusage 5 Jahre
  kaufPreis: 999,                 // Einmalzahlung
  monatPreis: 49,                 // Monatlich
  nutzungJahre: 5,
  // Nur noch für die alten Mailing-Vorlagen (Postkarte, Brief) – Aktion RATENJA ist seit 18.10.2026 abgeschaltet
  kaufPreisAlt: 1499,
  kaufAktionPreis: 1249,
  provisionSatz: "10 %",
  kuendigungProvision: "jederzeit zum Monatsende",
  garantieTage: 30,
  setupSupportTage: 30,
  betreuung: "kostenlos",

  // Direct-Mail-Aktion (abgeschaltet seit 18.10.2026, Code wird online nicht mehr angenommen)
  aktionsCode: "RATENJA",
  aktionsPlaetze: 20,
  aktionsFrist: "30.11.2026",

  // Platzhalter für Studio-Materialien (werden per Link-Parameter ?studio=…&tel=…&zahlen=… ersetzt)
  studioPlatzhalter: "Dein Studio",
  telPlatzhalter: "0000 / 000 000"
};
