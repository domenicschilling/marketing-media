// Gemeinsame erfundene Demo-Daten für alle drei App-Vorschläge. Studio „Nadelwerk“. Zahlen auf Übersichten immer hieraus berechnen, nie von Hand schreiben.
// Statuswerte und Bezeichnungen wie in apps/tf-studio/src/lib/status.ts.
window.TK = {
  studio: { name: "Nadelwerk", ort: "Würzburg", standorte: ["Würzburg", "Kassel", "Regensburg", "Ulm"] },
  heute: "2026-11-09", heuteAnzeige: "Mo 09.11.", jetzt: "13:20", oeffnung: ["10:00", "18:00"],
  artists: [
    { id: "ben", name: "Ben Albrecht", platz: "Liege 1", farbe: "blau" },
    { id: "kaja", name: "Kaja Lindner", platz: "Liege 2", farbe: "koralle" },
    { id: "mia", name: "Mia Roth", platz: "Liege 3", farbe: "lila" },
  ],
  statusText: { reserved: "Reserviert", confirmed: "Bestätigt", checked_in: "Eingecheckt", completed: "Abgeschlossen", cancelled: "Abgesagt", cancelled_late: "Abgesagt (kurzfristig)", no_show: "No-Show", rescheduled: "Verschoben", expired: "Abgelaufen" },
  // anzahlung: bezahlt | offen | keine | erlassen; einwilligung: vollstaendig | fehlt | nicht_noetig; kunde: kommt | keine_antwort | verschieben
  termine: [
    { id: "t1", artist: "ben", von: "10:00", bis: "14:00", kunde: "Noah Wagner", art: "Session Halbtag", motiv: "Mandala", stelle: "Oberarm", preis: 380, status: "checked_in", anzahlung: "bezahlt", anzahlungBetrag: 100, einwilligung: "vollstaendig", kunde_antwort: "kommt", telefon: "+49 1510 0010001" },
    { id: "t2", artist: "ben", von: "14:30", bis: "15:30", kunde: "Jakob Hofmann", art: "Kleines Tattoo", motiv: "Minimal Linework", stelle: "Handgelenk", preis: 120, status: "confirmed", anzahlung: "bezahlt", anzahlungBetrag: 50, einwilligung: "vollstaendig", kunde_antwort: "kommt", telefon: "+49 1510 0010002" },
    { id: "t3", artist: "ben", von: "16:00", bis: "18:00", kunde: "Lara Zimmermann-Schöneberg", art: "Session", motiv: "Fineline Blume", stelle: "Schulterblatt", preis: 240, status: "reserved", anzahlung: "offen", anzahlungBetrag: 60, anzahlungFrist: "Mo 09.11., 15:00", einwilligung: "fehlt", kunde_antwort: "keine_antwort", telefon: "+49 1510 0010003" },
    { id: "t4", artist: "kaja", von: "10:00", bis: "10:45", kunde: "Clara Klein", art: "Beratung", motiv: "Cover-up altes Tribal", stelle: "Schulter", preis: 0, status: "completed", anzahlung: "keine", einwilligung: "nicht_noetig", kunde_antwort: "kommt", telefon: "+49 1510 0010004" },
    { id: "t5", artist: "kaja", von: "11:00", bis: "13:00", kunde: "Anton Schulz", art: "Session", motiv: "Schriftzug", stelle: "Unterarm", preis: 220, status: "no_show", anzahlung: "bezahlt", anzahlungBetrag: 60, einwilligung: "fehlt", kunde_antwort: "keine_antwort", telefon: "+49 1510 0010005" },
    { id: "t6", artist: "kaja", von: "13:00", bis: "13:30", kunde: "Pause", blocker: true, status: "confirmed" },
    { id: "t7", artist: "kaja", von: "13:30", bis: "17:30", kunde: "Amelie Schmitt", art: "Session Halbtag", motiv: "Phönix über den Rücken", stelle: "Rücken", preis: 420, status: "confirmed", anzahlung: "bezahlt", anzahlungBetrag: 120, einwilligung: "fehlt", kunde_antwort: "kommt", telefon: "+49 1510 0010007" },
    { id: "t8", artist: "mia", von: "10:00", bis: "12:00", kunde: "Luca Lange", art: "Session", motiv: "Portrait meines Hundes", stelle: "Wade", preis: 260, status: "completed", anzahlung: "bezahlt", anzahlungBetrag: 80, einwilligung: "vollstaendig", kunde_antwort: "kommt", telefon: "+49 1510 0010008" },
    { id: "t9", artist: "mia", von: "12:30", bis: "13:00", kunde: "Leon Richter", art: "Kleines Tattoo", motiv: "Initialen", stelle: "Finger", preis: 80, status: "cancelled_late", anzahlung: "bezahlt", anzahlungBetrag: 30, einwilligung: "nicht_noetig", kunde_antwort: "verschieben", telefon: "+49 1510 0010009" },
    { id: "t10", artist: "mia", von: "13:30", bis: "15:00", kunde: "Lina Krüger", art: "Session", motiv: "Fineline Schwalbe", stelle: "Schlüsselbein", preis: 180, status: "confirmed", anzahlung: "bezahlt", anzahlungBetrag: 50, einwilligung: "vollstaendig", kunde_antwort: "verschieben", telefon: "+49 1510 0010010" },
  ],
  anfragen: [
    { id: "a1", kunde: "Pia Koch", motiv: "Cover-up altes Tribal", budget: 450, alter: "2 T.", spalte: "Neu" },
    { id: "a2", kunde: "Marie Krause", motiv: "Fineline Blume am Unterarm", budget: null, alter: "2 T.", spalte: "Neu" },
    { id: "a3", kunde: "Jonas Wolf", motiv: "Phönix über den Rücken", budget: 1800, alter: "5 T.", spalte: "In Klärung" },
    { id: "a4", kunde: "Tom Meier", motiv: "Schriftzug", budget: null, alter: "heute", spalte: "Anzahlung offen" },
  ],
  // Alle Menüpunkte der echten App, nichts davon darf verloren gehen. Krone = erst in größerem Paket.
  menue: ["Übersicht für Inhaber", "Heute", "Kalender", "Chat", "Anfragen", "Kampagnen", "Kunden", "Zahlungen", "Kasse", "Einwilligungen", "Aufgaben", "Warteliste", "Lückenfüller", "Auslastung", "Provision", "Belege & Export", "Einstellungen"],
};
