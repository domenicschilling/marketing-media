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
  telefon: "0174 1682157",
  email: "info@tattoofin.de",
  web: "tattoofin.de",
  webUrl: "https://tattoofin.de",
  instagram: "@tattoofin.de",
  gerichtsstand: "Bamberg",
  // Seite mit dem Werbevideo (Ziel der QR-Codes im Mailing). Video als assets/werbevideo.mp4 ablegen.
  videoSeite: "https://domenicschilling.github.io/marketing-media/tattoofin/video.html",
  whatsappLink: "https://wa.me/491741682157?text=Hi%2C%20ich%20interessiere%20mich%20f%C3%BCr%20Tattoofin!",
  websiteUrl: "https://tattoofin.de",   // Adresse der Website mit Online-Abschluss (tattoofin/website)

  // Preismodelle. Das Studio wählt EINES:
  //  A) Kauf: einmalige Einrichtung (netto zzgl. USt.), keine Grundgebühr, keine Provision; Zahlungsgebühren zahlt das Studio
  //  B) Provision: keine Einrichtungsgebühr, 10 % vom Zahlbetrag jeder Zahlung über Tattoofin (auch Anzahlungen),
  //     alles inklusive (Zahlungsgebühren + USt.). Tattoofin kassiert über Stripe, das Studio bekommt 90 %. Abrechnung monatlich
  kaufPreis: 1499,
  kaufAktionPreis: 1249,          // mit Aktionscode (Mailing)
  provisionSatz: "10 %",
  kuendigungProvision: "jederzeit zum Monatsende",
  garantieTage: 30,
  setupSupportTage: 30,
  betreuung: "kostenlos",

  // Direct-Mail-Aktion
  aktionsCode: "RATENJA",
  aktionsPlaetze: 20,
  aktionsFrist: "30.11.2026",

  // Platzhalter für Studio-Materialien (werden per Link-Parameter ?studio=…&tel=…&zahlen=… ersetzt)
  studioPlatzhalter: "Dein Studio",
  telPlatzhalter: "0000 / 000 000"
};
