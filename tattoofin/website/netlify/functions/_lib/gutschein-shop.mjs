// Gutschein-Onlineshop (seit 23.11.2026, nur für Tattoo Fashion München und Landshut – keine Funktion für alle Studios).
// Sitzt im bestehenden Gutschein-System (_lib/gutschein.mjs): Eine Shop-Bestellung ist eine Zahlung mit art „gutschein“,
// nach der Zahlung entstehen Code, PDF und Mail wie bei jedem Gutschein. Neu sind:
//   • Wert ≠ bezahlter Betrag (Aktions-Gutscheine): z.betragCent = bezahlter Betrag (alle Geldflüsse, Gebühren, Erstattungen),
//     z.gutschein.wertCent = Gutscheinwert, bonusCent = Wert − Preis, bonusBis = Ende der Bonus-Frist.
//   • Bonus-Frist: Der Bonus gilt bis bonusBis (31.03.2027), danach wird der bezahlte Betrag weiter angerechnet, bis zum Ende der
//     gesetzlichen Frist (gueltigBis = 31.12. des dritten Folgejahres, §§ 195, 199 BGB). Der bezahlte Betrag verfällt nie vorher.
//   • Aktions-Gutscheine unbegrenzt kaufbar (Domenic 24.11.2026): keine Stückzahl, kein „ausverkauft“, Knappheit nur aus der Frist
//     (24.12.2026, 16 Uhr). Je Kasse ein Ticket, nur noch für „1 pro Person“ und gegen Kassen-Flut (siehe unten).
//   • Öffentliche Shop-Seite /gutschein-kaufen/<studio> ohne vorher erstellten Zahlungslink (statisch je Stadt, dev/gutschein-seiten.mjs).
// Klarna ist für Gutscheine ausgeschlossen (Klarna-Regeln), bezahlt wird nur per Karte (inkl. Apple Pay / Google Pay).
// Aussteller und Verkäufer ist das Studio. Tattoofin stellt nur die Technik.
//
// Freischaltung: Auf der echten Site ist der Shop zu, solange „freigegeben“ nicht true ist (Domenics OK) UND die Anbieter-Angaben
// (Impressum des Verkäufers) fehlen. In der Vorschau und lokal ist er zum Testen offen.
import { CFG, jetzt, nurLokal } from "./config.mjs";
import { store, normEmail } from "./store.mjs";
import { now, euro, datum } from "./util.mjs";
import { gueltigBis } from "./gutschein.mjs";

// Ende eines Kalendertags in Berlin: 23:59:59 MEZ (22:59:59 UTC) bzw. MESZ (21:59:59 UTC). Der 31.03.2027 liegt schon in der Sommerzeit.
const berlinTag = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
export const tagesende = (ymd) => [`${ymd}T22:59:59.000Z`, `${ymd}T21:59:59.000Z`].find((x) => berlinTag(x) === ymd);

// Look des Studios für Mail und PDF der Shop-Gutscheine (TF: Schwarz/Gold, Logo aus public/assets/gs-shop/<kuerzel>/)
export const markeFuer = (c) => (c?.marke ? {
  ...c.marke, logo: `${CFG.siteUrl}${c.marke.logoPfad}`, grund: c.marke.grundPfad ? `${CFG.siteUrl}${c.marke.grundPfad}` : null,
  fragen: c.anbieter ? `Fragen? Schreib ${c.anbieter.name.split(",")[0]}: ${c.anbieter.email}${c.anbieter.telefon ? " · " + c.anbieter.telefon : ""}. Technik und Zahlung: Tattoofin.` : null,
} : null);

// ---------- Angebot (Domenic-Entscheidung 23.11.2026, je Stadt gleich) ----------
// Weihnachts-Aktion der Tattoo-Fashion-Studios: gleiches Angebot je Studio, „1 pro Person“ getrennt je Studio (Tickets je studioId).
// Unbegrenzt (Domenic 24.11.2026): keine Stückzahl. Alte Felder in gespeicherten Daten (stueck, Tickets mit grund „ausverkauft“) werden ignoriert.
const TF_WEIHNACHTEN = {
  titel: "Weihnachts-Gutscheine",
  // Nr. · Wert · Preis (unbegrenzt kaufbar)
  aktionen: [
    { id: "nr1", nr: 1, wertCent: 200000, preisCent: 150000 },
    { id: "nr2", nr: 2, wertCent: 150000, preisCent: 125000 },
    { id: "nr3", nr: 3, wertCent: 100000, preisCent: 75000 },
    { id: "nr4", nr: 4, wertCent: 50000, preisCent: 37500 },
    { id: "nr5", nr: 5, wertCent: 30000, preisCent: 20000 },
  ],
  bonusBis: "2027-03-31",
  // Verkaufszeitraum der Aktions-Gutscheine (Domenic 23.11.2026: Start sofort, Ende 24.12.2026 16 Uhr; Wertgutschein läuft weiter)
  aktionAb: null,
  aktionBis: "2026-12-24T16:00:00+01:00",
  // Ein Aktions-Gutschein pro Käufer (E-Mail, je Studio), Domenic 23.11.2026: beibehalten; durchgesetzt in reservieren() (Kasse). null = ohne Grenze
  aktionJeKaeufer: 1,
  // Normaler Wertgutschein mit frei wählbarem Betrag (50–2.000 €, volle Euro), ganzjährig
  // Vorschläge 100/200/300/500 € (24.11.2026: 50 € reicht kaum für ein Tattoo und setzt den Anker zu niedrig)
  frei: { minCent: 5000, maxCent: 200000, vorschlaege: [10000, 20000, 30000, 50000] },
};
// grundPfad: Hintergrund des Gutschein-PDFs (Karte mit Satinband, Schleife und Logo, dev/gutschein/pdf-grund.html)
const tfMarke = (kuerzel, alt) => ({ kopf: "#0B0B0B", logoPfad: `/assets/gs-shop/${kuerzel}/logo.png`, grundPfad: `/assets/gs-shop/${kuerzel}/pdf-grund.jpg`, alt, knopf: "#C8A35A", knopfText: "#0B0B0B", titel: "#0B0B0B", band: "#0B0B0B", akzent: "#C8A35A", kasten: "#f6efe0" });

// ---------- Chic Tattoo Augsburg (Domenic 25.11.2026, über Ultron) ----------
// Eigene Stufen „Du zahlst → Du bekommst*“: 100 → 150, 200 → 280, 400 → 500, 800 → 1.000 € (ohne „+50 €“ aus dem alten Studio-Bild),
// dazu Wertgutschein ab 50 €. Unbegrenzt, Knappheit nur aus der echten Frist 24.12.2026, 16 Uhr (Ultron 25.11.: wie MU/LA).
// Voller Wert bis 31.03.2027, danach der Kaufpreis bis 31.12.2029. 1 Aktions-Gutschein pro Person wie bei TF München („wie bei TF Munich“).
const CHIC_WEIHNACHTEN = {
  titel: "Weihnachts-Gutscheine",
  aktionen: [
    { id: "nr1", nr: 1, wertCent: 15000, preisCent: 10000 },
    { id: "nr2", nr: 2, wertCent: 28000, preisCent: 20000 },
    { id: "nr3", nr: 3, wertCent: 50000, preisCent: 40000 },
    { id: "nr4", nr: 4, wertCent: 100000, preisCent: 80000 },
  ],
  bonusBis: "2027-03-31",
  aktionAb: null,
  aktionBis: "2026-12-24T16:00:00+01:00",
  aktionJeKaeufer: 1,
  // Wertgutschein ab 50 € (Domenic); Vorschläge ab 100 €, damit der Anker nicht bei 50 € liegt
  frei: { minCent: 5000, maxCent: 200000, vorschlaege: [10000, 15000, 25000, 50000] },
};
// Look von Chic (wie die Chic-Seiten seit 17.11.2026: Schwarz, Papierweiß, Chic-Rot #E3121B als einziger Akzent, eckige Knöpfe).
// pdf: Schriftfarben auf dem Gutschein-PDF (dunkle Karte aus dev/gutschein/chic/pdf-grund.html); ohne pdf gelten die TF-Farben (Gold).
// kasse: Look der Stripe-Kasse; ohne kasse gilt Schwarz/Gold (TF).
const chicMarke = { kopf: "#0C0C0D", logoPfad: "/assets/gs-shop/chic/logo.png", grundPfad: "/assets/gs-shop/chic/pdf-grund.jpg", alt: "Chic Tattoo Augsburg",
  knopf: "#C70F17", knopfText: "#FFFFFF", titel: "#0C0C0D", band: "#0C0C0D", akzent: "#C70F17", kasten: "#F4F2EE",
  kasse: { background_color: "#FFFFFF", button_color: "#C70F17", border_style: "rectangular" },
  pdf: { wert: "#FFFFFF", hell: "#FFFFFF", creme: "#E6E3DD", mute: "#A9A6A0", gold: "#FF5A5F", rand: "#3a3a3d", qr: "#0C0C0D", klein: "#8A877F" } };

// seite: Angaben für die statische Shop-Seite je Stadt (dev/gutschein-seiten.mjs → public/gutschein-kaufen/<slug>.html)
export const SHOPS = {
  "tattoo-fashion-munich": {
    studioId: "st_nqoyv1Q2wj7F",
    ...TF_WEIHNACHTEN,
    marke: tfMarke("tfm", "Tattoo Fashion München"),
    // Verkäufer laut Impressum (aus der Tattoofin-Anmeldung, Vertrag 2026-12 von Andy Neelsen unterschrieben; Einzelunternehmen,
    // keine USt-IdNr. hinterlegt). Ohne diese Angaben geht der Shop nicht live.
    anbieter: { name: "Tattoo Fashion Munich, Inhaber Andy Neelsen", rechtsform: "Einzelunternehmen", strasse: "Landshuter Allee 42", plz: "80637", ort: "München", email: "tattoofashion.munich@gmail.com", telefon: "+49 89 94403786" },
    seite: {
      kuerzel: "tfm", name: "Tattoo Fashion München", firma: "Tattoo Fashion Munich", stadt: "München",
      telefon: "089 94403786", telefonLink: "+498994403786", whatsapp: "491626527442", instagram: "tattoofashion_munich",
      // Google-Bewertungen: Stand 24.11.2026, 03:30 Uhr geprüft (Bildschirmfotos tattoofin/intern/gutschein-shop-tfm/belege/; bei Änderung hier anpassen und Seiten neu erzeugen)
      google: { sterne: "4,9", anzahl: 348, stand: "24.11.2026", suche: "Tattoo Fashion Munich, Landshuter Allee 42, 80637 München" },
      zeiten: [["Montag bis Freitag", "10–18 Uhr"], ["Samstag", "10–16 Uhr"], ["Sonntag", "geschlossen"]],
      pixel: "2379676156103158",
      // Bildstreifen „Tattoos aus unserem Studio“: public/assets/gs-shop/tfm/b-<name>.jpg (600×800, ohne Personen/Wasserzeichen)
      bilder: ["adler", "phoenix", "loewe", "schlange", "schaedel", "blumen"],
      // Echte Google-Bewertungen, wörtlich (gekürzt nur mit „…“), Vorname + Initiale, Zeitangabe wie bei Google am Stand-Datum
      // (24.11.2026 im Google-Profil abgeschrieben). Nichts umformulieren, nichts dazuerfinden.
      stimmen: {
        stand: "24.11.2026",
        link: "https://www.google.com/maps/place/Tattoo+Fashion+Munich/@48.1509028,11.5374496,17z/data=!4m8!3m7!1s0x479e7771662d1217:0x68af90ebeb49b298!8m2!3d48.1509028!4d11.5374496!9m1!1b1",
        liste: [
          ["Lejla P.", "vor einem Monat", "… Pablo hat sich von Anfang an sehr viel Zeit für die Beratung genommen, ist auf meine Wünsche eingegangen und hat mich super beraten. Das Tattoo ist wunderschön geworden und wurde mit viel Können und Liebe zum Detail gestochen. …"],
          ["Melisa Z.", "vor 3 Monaten", "Absolut empfehlenswert! Ich habe mir hier mein Bauchnabelpiercing stechen lassen und bin mehr als zufrieden. Das Team ist super freundlich, nimmt sich Zeit und erklärt alles ganz genau. …"],
          ["Twin", "vor einer Woche", "… Pablo und Nico haben unsere Wünsche absolut erfüllt. Alles war sauber, hygienisch und professionell. Insgesamt eine tolle Truppe mit viel Humor und Perfektionismus. …"],
        ],
      },
    },
    // Domenic 23.11.2026: „mach alles fertig, dass alles läuft“ (Live-Gang nur mit seinem OK im Chat)
    freigegeben: true,
  },
  "tattoo-fashion-landshut": {
    studioId: "st_ybbij1eOoS9l",
    ...TF_WEIHNACHTEN,
    marke: tfMarke("tfla", "Tattoo Fashion Landshut"),
    anbieter: { name: "Tattoo Fashion Landshut, Inhaber Andy Neelsen", rechtsform: "Einzelunternehmen", strasse: "Neustadt 502", plz: "84028", ort: "Landshut", email: "neelsen.andy@gmail.com", telefon: "+49 871 14210163" },
    seite: {
      kuerzel: "tfla", name: "Tattoo Fashion Landshut", firma: "Tattoo Fashion Landshut", stadt: "Landshut",
      telefon: "0871 14210163", telefonLink: "+4987114210163", whatsapp: "491625642090", instagram: "tattoofashion_landshut",
      google: { sterne: "4,8", anzahl: 167, stand: "24.11.2026", suche: "Tattoo Fashion Landshut, Neustadt 502, 84028 Landshut" },
      zeiten: [["Montag bis Freitag", "10–18 Uhr"], ["Samstag", "10–16 Uhr"], ["Sonntag", "geschlossen"]],
      pixel: "1324284036136356",
      // 24.11.2026: Rabe mit Runen, Tiere (unscharf) und Baum (angeblitzt) ersetzt; Runde 3: Herzen und Mandala (Folie im Hintergrund)
      // und Sonne (Flanke) ersetzt durch Ranken (dunkler Hintergrund), Mandala eng zugeschnitten (nur Haut) und Stier
      bilder: ["rabe-sanduhr", "ranken", "mandala", "blumen", "stier", "schmetterling"],
      // Echte Google-Bewertungen aus der Landshut-Seite (Marketing-Maschine/landingpages/tf-landshut-wunsch, am 12.10.2026 abgeschrieben)
      stimmen: {
        stand: "12.10.2026",
        link: "https://www.google.com/maps/place/Tattoo+Fashion+Landshut/@48.5350968,12.1541868,17z/data=!4m8!3m7!1s0x479e2703b4a082b1:0xf2116c853922f11e!8m2!3d48.5350968!4d12.1541868!9m1!1b1",
        liste: [
          ["Uwe A.", "vor 10 Monaten", "Ich hatte ein Beratungsgespräch ausgemacht, wurde gleich sehr freundlich, kompetent und so genau auf meinen Wunsch beraten, dass ich gleich da geblieben bin um das Tattoo stechen zu lassen. Bin ausgesprochen zufrieden, war mein erstes Tattoo!!"],
          ["Tina Z.", "vor 3 Jahren", "Sehr schöner Laden, kompetent und super freundlich. Hab mich super wohl gefühlt und mein Tattoo ist zu 100% so wie ich es wollte. Sehr empfehlenswert. 👍🏼"],
          ["Lukas L.", "vor 2 Jahren", "… es wurde sich viel Zeit genommen um auf alle Wünsche einzugehen und auch preislich absolut unschlagbar! Bin sehr zufrieden mit meinem Tattoo …"],
        ],
      },
    },
    // Domenic 23.11.2026: gleiche Aktion für Landshut (Live-Gang nur mit seinem OK im Chat)
    freigegeben: true,
  },
  // Chic Tattoo Augsburg (Tattoofin-Studio seit 19.10.2026, Paket Risikofrei, Stripe-Konto acct_1USGZY0O569qR7tG, Zahlungen + Auszahlungen an;
  // nur lesend geprüft 25.11.2026). Eigene Vorlage dev/gutschein/chic/ (modernes Chic-Design, zwei Wege „Geschenk gesucht?“ / „Gönn dir selbst was“).
  "chic-tattoo-augsburg": {
    studioId: "st_0yyvqSMyCfUr",
    ...CHIC_WEIHNACHTEN,
    marke: chicMarke,
    // Verkäufer laut Impressum der Chic-Seiten (chic-tattoo-augsburg-rubbellos.netlify.app/impressum) und Stripe-Konto (Einzelunternehmer
    // Christoph Weiße). Keine USt-IdNr. hinterlegt.
    anbieter: { name: "Chic Tattoo & Piercing, Inhaber Christoph Weiße", rechtsform: "Einzelunternehmen", strasse: "Ulmer Straße 14", plz: "86154", ort: "Augsburg", email: "Lanzatattoo1@gmx.de", telefon: "+49 821 24299615" },
    seite: {
      kuerzel: "chic", name: "Chic Tattoo Augsburg", firma: "Chic Tattoo Augsburg", stadt: "Augsburg",
      // Eigene Vorlagen (Seite, Rechtsseiten, Vorschaubild, PDF-Hintergrund, Symbol) statt der TF-Vorlagen
      vorlagen: { seite: "chic/seite.html", recht: "chic/recht.html", og: "chic/og.html", pdfGrund: "chic/pdf-grund.html", icon: "chic/icon.html" },
      // Angebot der Überschrift ohne ?g= (und im Vorschaubild): 100 € kaufen, 150 € bekommen (höchster Aufschlag, kleinster Einstieg)
      heroId: "nr1", musterId: "nr2",
      telefon: "0821 24299615", telefonLink: "+4982124299615", whatsapp: "4915204485125", instagram: "chic_tattoo_augsburg",
      // Google: 5,0 aus 372 Bewertungen, Stand 15.11.2026 (Memory chic-tattoo-augsburg; vor dem Live-Gang neu nachsehen)
      google: { sterne: "5,0", anzahl: 372, stand: "15.11.2026", suche: "Chic Tattoo & Piercing, Ulmer Straße 14, 86154 Augsburg" },
      zeiten: [["Montag bis Freitag", "10–18 Uhr"], ["Samstag", "10–16 Uhr"], ["Sonntag", "geschlossen"]],
      pixel: "1142712101501159",
      // Echte Arbeiten aus dem Studio (Instagram @chic_tattoo_augsburg, Quellen public/assets/gs-shop/chic/LIZENZ.txt), keine KI, keine Narben-Bilder
      bilder: ["loewe", "rosen", "rabe", "schildkroete", "herz", "sleeve"],
      stimmen: null,
    },
    // Wie MU/LA: Live-Gang nur über den Prod-Deploy dieses Branches mit Domenics OK (Entwurf-Deploys zeigen die Seite offen, dort nie bezahlen)
    freigegeben: true,
  },
};

const testUmgebung = () => CFG.vorschau || nurLokal();

export function shopFuer(s, { test = testUmgebung(), shops = SHOPS } = {}) {
  const c = s?.slug ? shops[s.slug] : null;
  if (!c) return null;
  // Auf der echten Site nur genau dieses Studio (Slug allein reicht nicht, falls ein anderes Studio den Slug bekäme)
  if (!test && c.studioId !== s.id) return null;
  return c;
}

export const bonusBisIso = (c) => tagesende(c.bonusBis);
// Ende der Aktion: Datum (Tagesende) oder genauer Zeitpunkt (z. B. 24.12.2026 16 Uhr)
export const aktionEndeIso = (c) => (c.aktionBis.length === 10 ? tagesende(c.aktionBis) : new Date(c.aktionBis).toISOString());
const uhrzeit = (iso) => { const t = new Date(iso).toLocaleTimeString("de-DE", { hour: "numeric", minute: "2-digit", timeZone: "Europe/Berlin" }); return t === "23:59" ? "" : " um " + t.replace(/:00$/, "") + " Uhr"; };

// Ist der Shop offen? grund: text für die Seite, wenn nicht
export function shopZustand(s, c, zeit = jetzt(), { test = testUmgebung() } = {}) {
  const t = zeit.getTime();
  const anbieterDa = Boolean(c.anbieter?.name && c.anbieter?.strasse && c.anbieter?.ort && (c.anbieter?.email || c.anbieter?.telefon));
  let offen = true, grund = "";
  if (!test && (!c.freigegeben || !anbieterDa)) { offen = false; grund = "Der Gutschein-Shop ist noch nicht freigeschaltet."; }
  const aktionStart = c.aktionAb ? new Date(c.aktionAb + "T00:00:00+01:00").getTime() : 0;
  const aktionEnde = c.aktionBis ? new Date(aktionEndeIso(c)).getTime() : Infinity;
  const aktionOffen = offen && t >= aktionStart && t <= aktionEnde;
  const aktionGrund = !offen ? grund : t < aktionStart ? `Die Aktions-Gutscheine gibt es ab ${datum(new Date(aktionStart).toISOString())}.` : t > aktionEnde ? "Die Weihnachts-Aktion ist vorbei." : "";
  return { offen, grund, aktionOffen, aktionGrund, anbieterDa, vorschau: test && !(c.freigegeben && anbieterDa) };
}

// ---------- Kassen-Tickets: 1 pro Person, Schutz vor Kassen-Flut ----------
// Seit 24.11.2026 (Domenic) sind die Aktions-Gutscheine unbegrenzt kaufbar: keine Stückzahl, kein „ausverkauft“, kein Zähler.
// Je Kasse eines Aktions-Gutscheins entsteht weiter ein Ticket gsshop/<studioId>/<aktionId>/<00000…> (store.setNeu, atomar „nur anlegen,
// wenn neu“, nie gelöscht). Es dient nur noch
//   • „1 Aktions-Gutschein pro Person“ (E-Mail, je Studio): zählt verkaufte und gerade offene Kassen dieser E-Mail,
//   • dem Schutz vor vielen gleichzeitig offenen Kassen vom selben Anschluss (IP gehasht, nur solange die Kasse offen ist),
//   • dem Beenden einer alten offenen Kasse, wenn jemand mit der Zurück-Taste aus Stripe kommt.
// Aktiv ist ein Ticket, das verkauft ist oder reserviert und noch nicht abgelaufen. Reservierung = Dauer der Stripe-Kasse (30 Min.)
// + Puffer. Alte Tickets aus der Zeit mit Stückzahl (z. B. status „frei“, grund „ausverkauft“) stören nicht.
export const KASSE_MINUTEN = 30;
const RESERVIERUNG_MS = (KASSE_MINUTEN + 3) * 60 * 1000;
const tPrefix = (sid, aid) => `gsshop/${sid}/${aid}/`;
const tKey = (sid, aid, k) => tPrefix(sid, aid) + String(k).padStart(5, "0");
const aktiv = (t, ms = jetzt().getTime()) => Boolean(t) && (t.status === "verkauft" || (t.status === "reserviert" && new Date(t.bis).getTime() > ms));

// Lesen: alle Tickets einer Aktion gleichzeitig (nicht nacheinander) und je Anfrage nur einmal („Stand“, siehe unten).
// Erledigte Tickets ändern sich nicht mehr und werden je Funktions-Exemplar gemerkt: „verkauft“ für immer, „frei“ 10 Minuten
// (frei → verkauft gibt es nur, wenn eine schon beendete Kasse doch bezahlt würde; Stripe lässt das nicht zu).
// So liest eine Kasse bei 150 Tickets je Studio nicht 150 × nacheinander, sondern einmal die Liste und nur die offenen Tickets.
const ERLEDIGT = new Map(), FREI_MERKEN_MS = 10 * 60 * 1000, GLEICHZEITIG = 32;
const merken = (key, t) => { if (t?.status === "verkauft" || t?.status === "frei") ERLEDIGT.set(key, { t, am: Date.now() }); };
const gemerkt = (key) => { const e = ERLEDIGT.get(key); if (!e) return null; if (e.t.status === "frei" && Date.now() - e.am > FREI_MERKEN_MS) { ERLEDIGT.delete(key); return null; } return e.t; };
async function lesen(keys) {
  const out = new Array(keys.length);
  let i = 0;
  const arbeiter = async () => { while (i < keys.length) { const n = i++, k = keys[n]; let v = gemerkt(k); if (!v) { v = await store.get(k); if (v) merken(k, v); } out[n] = v ? { key: k, ...v } : null; } };
  await Promise.all(Array.from({ length: Math.min(GLEICHZEITIG, keys.length) }, arbeiter));
  return out.filter(Boolean);
}
async function tickets(sid, aid) {
  return lesen((await store.list(tPrefix(sid, aid))).sort());
}
// Stand: alle Tickets aller Aktions-Gutscheine eines Studios, einmal je Kasse gelesen (1 pro Person, offene Kassen)
export async function stand(s, c) {
  const l = await Promise.all(c.aktionen.map((a) => tickets(s.id, a.id)));
  return Object.fromEntries(c.aktionen.map((a, i) => [a.id, l[i]]));
}

export class ShopFehler extends Error { constructor(msg, status = 409, code = "") { super(msg); this.status = status; this.code = code; } }

// Wie viele Aktions-Gutscheine hat diese E-Mail schon (verkauft oder gerade in der Kasse)?
// Gegen Kassen-Flut (viele Kassen mit erfundenen Adressen): höchstens 3 offene Kassen je Anschluss (IP, gehasht)
const maxOffenJeIp = () => Number(process.env.TF_GS_MAX_JE_IP) || 3;
function zaehlen(st, c, { email, ip }) {
  const n = normEmail(email), ms = jetzt().getTime();
  let kaeufer = 0, offenIp = 0;
  for (const a of c.aktionen) for (const t of st[a.id] || []) {
    if (!aktiv(t, ms)) continue;
    if (t.email === n) kaeufer++;
    if (ip && t.ip === ip && t.status === "reserviert") offenIp++;
  }
  return { kaeufer, offenIp };
}

// Offene (reservierte, nicht abgelaufene) Kassen dieser E-Mail – z. B. jemand kam mit der Zurück-Taste aus Stripe zurück
export async function offeneKassen(s, c, email, st = null) {
  const n = normEmail(email), ms = jetzt().getTime(), out = [], t0 = st || (await stand(s, c));
  for (const a of c.aktionen) for (const t of t0[a.id] || []) if (t.status === "reserviert" && aktiv(t, ms) && t.email === n) out.push(t);
  return out;
}

// st: Stand dieser Anfrage (aus offeneKassen), damit nicht alles noch einmal gelesen wird. Keine Stückzahl: jedes neue Ticket gilt.
export async function reservieren(s, c, a, { zahlungId, email, ip = "", stand: st = null }) {
  const t0 = st || (await stand(s, c));
  const n = zaehlen(t0, c, { email, ip });
  if (n.offenIp >= maxOffenJeIp()) throw new ShopFehler("Du hast schon mehrere Gutscheine in der Kasse. Bitte schließ erst einen Kauf ab oder warte ein paar Minuten.", 429, "zu_viele");
  if (c.aktionJeKaeufer && n.kaeufer >= c.aktionJeKaeufer)
    throw new ShopFehler(c.aktionJeKaeufer === 1 ? "Pro Person gibt es einen Aktions-Gutschein. Für diese E-Mail-Adresse ist schon einer gekauft oder gerade in der Kasse. Einen Wertgutschein mit eigenem Betrag kannst du sofort dazu kaufen." : `Pro Person gibt es höchstens ${c.aktionJeKaeufer} Aktions-Gutscheine.`, 409, "je_kaeufer");
  const at = jetzt().getTime();
  const eintrag = { zahlungId, email: normEmail(email), ip, status: "reserviert", at: new Date(at).toISOString(), bis: new Date(at + RESERVIERUNG_MS).toISOString() };
  // Nummern sind lückenlos: Start bei der Anzahl aus dem Stand, belegte Nummern überspringt setNeu
  let k = (t0[a.id] || []).length, key = null;
  for (let i = 0; i < 200 && !key; i++, k++) if (await store.setNeu(tKey(s.id, a.id, k), eintrag)) key = tKey(s.id, a.id, k);
  if (!key) throw new ShopFehler("Gerade sind sehr viele gleichzeitig in der Kasse. Bitte versuch es gleich noch einmal.", 503);
  return { key, bis: eintrag.bis };
}

// Nach der Zahlung (gutscheinAusstellen): Ticket als verkauft markieren (zählt danach für „1 pro Person“). Keine Stückzahl, also
// auch kein „ausverkauft“ und keine Meldung. Die Anschluss-Kennung (ip) braucht es nach der Kasse nicht mehr: sie fällt weg.
// spaet: Zahlung kam erst nach Ablauf der Reservierung an (gültig wie jeder Verkauf, nur zur Nachvollziehbarkeit).
export async function reservierungVerkauft(z) {
  const key = z.gutschein?.reservierung;
  if (!key) return { ok: true };
  const t = await store.get(key);
  if (t?.status === "verkauft") return { ok: true };
  const { ip: _ip, ...rest } = t || { zahlungId: z.id };
  const neu = { ...rest, status: "verkauft", verkauftAm: now(), ...(aktiv(t) ? {} : { spaet: true }) };
  await store.set(key, neu); ERLEDIGT.delete(key); merken(key, neu);
  return { ok: true };
}

// Kasse abgelaufen oder abgebrochen: Ticket frei (zählt nicht mehr für „1 pro Person“; nur solange nicht bezahlt), ohne Anschluss-Kennung
export async function reservierungFreigeben(z, grund) {
  const key = z.gutschein?.reservierung;
  if (!key || z.status === "bezahlt") return false;
  const t = await store.get(key);
  if (!t || t.status !== "reserviert") return false;
  const { ip: _ip, ...rest } = t;
  const frei = { ...rest, status: "frei", freiAm: now(), grund };
  await store.set(key, frei); merken(key, frei);
  return true;
}

// ---------- Texte (Seite, Kasse, PDF, Mail) ----------
// Kurzer Satz zur Gültigkeit eines Aktions-Gutscheins – überall gleich
// geschenk: Satz für den Beschenkten (PDF, Online-Ansicht, 24.11.2026): ohne Aktions-Nummer und ohne den bezahlten Betrag
// (der Beschenkte soll nicht lesen, was das Geschenk gekostet hat; der genaue Betrag steht in der Kauf-Mail)
export function bonusSatz(g, { kurz = false, geschenk = false } = {}) {
  if (!g?.bonusCent) return "";
  const w = euro(g.wertCent).replace(",00 €", " €"), b = euro(g.bezahltCent).replace(",00 €", " €");
  if (geschenk) return `Voller Wert ${w} bis ${datum(g.bonusBis)}. Danach gilt der bezahlte Betrag bis ${datum(g.gueltigBis)}.`;
  return kurz ? `${w} bis ${datum(g.bonusBis)}, danach ${b} bis ${datum(g.gueltigBis)}`
    : `Bis ${datum(g.bonusBis)} löst du den vollen Wert von ${w} ein. Danach gilt der bezahlte Betrag von ${b}, einlösbar bis ${datum(g.gueltigBis)}.`;
}

// seite: true → Text für die Seite „Gutscheinbedingungen“ (ohne festes Kaufjahr; die Mail nennt das genaue Datum)
export function bedingungen(s, c, kaufJahr = jetzt(), { seite = false } = {}) {
  const bis = seite ? `zum 31.12. des dritten Jahres nach dem Kauf (bei Kauf ${kaufJahr.getFullYear()}: ${datum(gueltigBis(kaufJahr))})` : datum(gueltigBis(kaufJahr));
  const verkaeufer = c.anbieter?.name || s.firma;
  return [
    `Verkäufer und Aussteller der Gutscheine ist ${verkaeufer}. Tattoofin stellt nur die Technik für Verkauf und Zahlung bereit; bezahlt wird über Stripe.`,
    `Die Gutscheine gelten für alle Leistungen bei ${s.firma}${s.strasse ? ", " + s.strasse + ", " + [s.plz, s.ort].filter(Boolean).join(" ") : ""}, zum Beispiel Tattoos und Piercings. Das Motiv sucht sich der Beschenkte selbst aus.`,
    // Domenic 23.11.2026: Teil-Einlösung ja, keine Barauszahlung, nicht kombinierbar
    "Du kannst einen Gutschein in Teilen einlösen, der Restwert bleibt auf dem Gutschein. Eine Barauszahlung ist nicht möglich. Die Gutscheine sind nicht mit anderen Aktionen kombinierbar.",
    `Aktions-Gutscheine (Nr. 1 bis ${c.aktionen.length}): Du bekommst mehr, als du zahlst. Der Unterschied ist ein Bonus. Den vollen Wert löst du bis ${datum(bonusBisIso(c))} ein. Was bis dahin eingelöst wird, zählt zuerst gegen den Bonus. Danach verfällt nur der noch nicht genutzte Bonus: Der bezahlte Betrag wird weiter voll angerechnet, bis ${bis}.`,
    // Unbegrenzt (Domenic 24.11.2026): keine Stückzahl mehr. „solange verfügbar“ stand hier schon vorher und bleibt (Domenics Entscheidung)
    [c.aktionJeKaeufer ? `Pro Person ${c.aktionJeKaeufer === 1 ? "ein Aktions-Gutschein" : "höchstens " + c.aktionJeKaeufer + " Aktions-Gutscheine"}.` : "", c.aktionBis ? `Verkauf der Aktions-Gutscheine bis ${datum(aktionEndeIso(c))}${uhrzeit(aktionEndeIso(c))}, solange verfügbar.` : ""].filter(Boolean).join(" "),
    `Wertgutschein mit eigenem Betrag: einlösbar bis ${bis}.`,
    "Alle Preise sind Endpreise inklusive Umsatzsteuer. Es kommen keine Versandkosten oder sonstigen Kosten dazu. Den Gutschein bekommst du direkt nach der Zahlung als PDF per E-Mail.",
    "Bezahlen kannst du per Karte, Apple Pay oder Google Pay. Ratenkauf ist für Gutscheine nicht möglich.",
  ].filter(Boolean);
}

export function widerruf(s, c) {
  const a = c.anbieter || {};
  const adr = [a.name || s.firma, a.strasse || s.strasse, [a.plz || s.plz, a.ort || s.ort].filter(Boolean).join(" "), a.email ? "E-Mail: " + a.email : "", a.telefon ? "Telefon: " + a.telefon : ""].filter(Boolean).join(", ");
  return {
    titel: "Widerrufsbelehrung",
    text: [
      "Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.",
      `Um dein Widerrufsrecht auszuüben, musst du uns (${adr}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das Muster-Widerrufsformular unten verwenden, das jedoch nicht vorgeschrieben ist. Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.`,
      "Folgen des Widerrufs: Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet. Mit dem Widerruf wird der Gutschein ungültig.",
    ],
    formular: `Muster-Widerrufsformular (Wenn du den Vertrag widerrufen willst, dann fülle bitte dieses Formular aus und sende es zurück.) An: ${adr}. Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf des folgenden Gutscheins: Gutschein-Code … / Bestellt am (*) … / Name des/der Verbraucher(s) … / Anschrift des/der Verbraucher(s) … / Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier) / Datum. (*) Unzutreffendes streichen.`,
  };
}

// Texte für die Gutschein-Mail einer Shop-Bestellung (Bedingungen + Widerrufsbelehrung auf dauerhaftem Datenträger, § 312f BGB)
export function shopTexte(s, kauf) {
  const c = SHOPS[s?.slug];
  if (!c) return null;
  return { bedingungen: bedingungen(s, c, kauf ? new Date(kauf) : jetzt()), widerruf: widerruf(s, c), anbieter: c.anbieter || null, marke: markeFuer(c) };
}

// Öffentliche Ausgabe für /gutschein-kaufen/<studio> (ohne Stückzahl: liest keine Tickets)
export async function shopOeffentlich(s, c) {
  const z = shopZustand(s, c);
  return {
    titel: c.titel, bonusBis: bonusBisIso(c), gueltigBis: gueltigBis(jetzt()), aktionBis: c.aktionBis ? aktionEndeIso(c) : null, aktionAb: c.aktionAb,
    offen: z.offen, grund: z.grund, aktionOffen: z.aktionOffen, aktionGrund: z.aktionGrund, vorschau: z.vorschau, aktionJeKaeufer: c.aktionJeKaeufer,
    aktionen: c.aktionen.map((a) => ({ id: a.id, nr: a.nr, wertCent: a.wertCent, preisCent: a.preisCent, bonusCent: a.wertCent - a.preisCent })),
    frei: c.frei,
    anbieter: c.anbieter || null,
    bedingungen: bedingungen(s, c),
    widerruf: widerruf(s, c),
  };
}
