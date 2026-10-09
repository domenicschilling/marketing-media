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

  // Preise (netto, zzgl. USt.)
  setup: 299,
  startPreis: 149,
  startMinuten: 300,
  profiPreis: 249,
  profiMinuten: 800,
  extraMinute: "0,25",
  bundleRabatt: "20 %",
  mindestlaufzeit: "3 Monate",
  kuendigungsfrist: "1 Monat zum Monatsende",
  garantieTage: 30,

  // Direct-Mail-Aktion
  aktionsCode: "TEDRUFT",
  aktionsPlaetze: 20,
  aktionsFrist: "30.11.2026",

  // Platzhalter für Studio-Materialien (werden per Link-Parameter ?studio=…&tel=… ersetzt)
  studioPlatzhalter: "Dein Studio",
  telPlatzhalter: "0000 / 000 000"
};
