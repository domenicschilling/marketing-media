/*
 * Zentrale Einstellungen für alle Telefon-Unterlagen.
 * Einmal hier ändern -> alle Dokumente (Verträge, Flyer, Preise, Kontaktdaten) übernehmen den Wert.
 * Werte in [eckigen Klammern] sind noch auszufüllen.
 */
window.CFG = {
  // Anbieter
  firma: "DSX Media Solutions UG (haftungsbeschränkt)",
  marke: "TattooLeadz",
  produkt: "Ted am Telefon",
  produktKurz: "Ted",
  adresse: "[Straße Nr., PLZ Ort]",
  registergericht: "[Amtsgericht, HRB-Nr.]",
  ustid: "[USt-IdNr.]",
  geschaeftsfuehrer: "Domenic Schilling",
  ansprechpartner: "Domenic Schilling",
  telefon: "0174 1682157",
  email: "tattooleadz@gmail.com",
  web: "tattooleadz.de",
  webUrl: "https://tattooleadz.de",
  instagram: "@tattooleadz",
  // Seite mit dem Werbevideo (Ziel aller QR-Codes in Mailing/Flyern). Video als assets/werbevideo.mp4 ablegen.
  videoSeite: "https://domenicschilling.github.io/marketing-media/telefon/video.html",
  whatsappLink: "https://wa.me/491741682157?text=Hi%2C%20ich%20will%20Ted%20am%20Telefon%20testen!",
  gerichtsstand: "[Sitz des Anbieters]",

  // Live-Demo: Nummer, unter der Interessenten Ted selbst anrufen können
  demoNummer: "[Demo-Nummer]",
  demoNummerTel: "",            // z. B. "+499511234567" (für QR-Code „Jetzt anrufen“)

  // Preismodelle (netto, zzgl. USt.). Das Studio wählt EINES:
  //  A) Kauf: einmalig, inkl. Einrichtung, Betrieb und Betreuung, keine monatlichen Kosten
  //  B) Provision: keine Fixkosten, 10 % vom Tattoo-Preis für Termine aus Ted-Anfragen, Abrechnung monatlich
  kaufPreis: 1499,
  kaufAktionPreis: 1249,          // mit Aktionscode (Mailing)
  provisionSatz: "10 %",
  provisionZuordnung: "6 Monate", // Tattoo zählt, wenn es innerhalb dieser Zeit nach der Ted-Anfrage gebucht wird
  provisionMeldefrist: "3. des Folgemonats",
  provisionNachlauf: "3 Monate",  // nach Vertragsende noch provisionspflichtig (für Anfragen aus der Laufzeit)
  fairUseMinuten: 500,            // Gesprächsminuten pro Monat inklusive (beide Modelle)
  extraMinute: "0,15",
  kuendigungProvision: "jederzeit zum Monatsende",
  garantieTage: 30,
  betreuung: "kostenlos",
  websiteUrl: "[Website-URL]",   // Adresse der Abschluss-Website (telefon/website), z. B. https://ted.tattooleadz.de

  // Direct-Mail-Aktion
  aktionsCode: "TEDRUFT",
  aktionsPlaetze: 20,
  aktionsFrist: "30.11.2026",

  // Platzhalter für Studio-Materialien (werden per Link-Parameter ?studio=…&tel=… ersetzt)
  studioPlatzhalter: "Dein Studio",
  telPlatzhalter: "0000 / 000 000"
};
