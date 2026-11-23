// Gutschein-Onlineshop (seit 23.11.2026, Vorschlag, nur für Tattoo Fashion Munich – keine Funktion für alle Studios).
// Sitzt im bestehenden Gutschein-System (_lib/gutschein.mjs): Eine Shop-Bestellung ist eine Zahlung mit art „gutschein“,
// nach der Zahlung entstehen Code, PDF und Mail wie bei jedem Gutschein. Neu sind:
//   • Wert ≠ bezahlter Betrag (Aktions-Gutscheine): z.betragCent = bezahlter Betrag (alle Geldflüsse, Gebühren, Erstattungen),
//     z.gutschein.wertCent = Gutscheinwert, bonusCent = Wert − Preis, bonusBis = Ende der Bonus-Frist.
//   • Bonus-Frist: Der Bonus gilt bis bonusBis (31.03.2027), danach wird der bezahlte Betrag weiter angerechnet, bis zum Ende der
//     gesetzlichen Frist (gueltigBis = 31.12. des dritten Folgejahres, §§ 195, 199 BGB). Der bezahlte Betrag verfällt nie vorher.
//   • Stückzahl je Aktions-Gutschein, serverseitig sicher gegen Doppelverkauf (Reservierungs-Tickets, siehe unten).
//   • Öffentliche Shop-Seite /gutschein-kaufen/<studio> ohne vorher erstellten Zahlungslink.
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

// ---------- Angebot (Domenic-Entscheidung 23.11.2026) ----------
export const SHOPS = {
  "tattoo-fashion-munich": {
    studioId: "st_nqoyv1Q2wj7F",
    titel: "Weihnachts-Gutscheine",
    // Nr. · Wert · Preis · Stück
    aktionen: [
      { id: "nr1", nr: 1, wertCent: 200000, preisCent: 150000, stueck: 1 },
      { id: "nr2", nr: 2, wertCent: 150000, preisCent: 125000, stueck: 2 },
      { id: "nr3", nr: 3, wertCent: 100000, preisCent: 75000, stueck: 2 },
      { id: "nr4", nr: 4, wertCent: 50000, preisCent: 37500, stueck: 6 },
      { id: "nr5", nr: 5, wertCent: 30000, preisCent: 20000, stueck: 10 },
    ],
    bonusBis: "2027-03-31",
    // Verkaufszeitraum der Aktions-Gutscheine (Domenic 23.11.2026: Start sofort, Ende 24.12.2026 16 Uhr; Wertgutschein läuft weiter)
    aktionAb: null,
    aktionBis: "2026-12-24T16:00:00+01:00",
    // Ein Aktions-Gutschein pro Käufer (E-Mail), Domenic 23.11.2026: beibehalten. null = ohne Grenze
    aktionJeKaeufer: 1,
    // Normaler Wertgutschein mit frei wählbarem Betrag (Vorschlag 50–2.000 €, volle Euro), ganzjährig
    frei: { minCent: 5000, maxCent: 200000, vorschlaege: [5000, 10000, 15000, 25000] },
    // Verkäufer laut Impressum (aus der Tattoofin-Anmeldung, Vertrag 2026-12 von Andy Neelsen unterschrieben; Einzelunternehmen,
    // keine USt-IdNr. hinterlegt). Ohne diese Angaben geht der Shop nicht live.
    anbieter: { name: "Tattoo Fashion Munich, Inhaber Andy Neelsen", rechtsform: "Einzelunternehmen", strasse: "Landshuter Allee 42", plz: "80637", ort: "München", email: "tattoofashion.munich@gmail.com", telefon: "+49 89 94403786" },
    // Domenic 23.11.2026: „mach alles fertig, dass alles läuft“ (Live-Gang nur mit seinem OK im Chat)
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

// ---------- Stückzahl: Reservierungs-Tickets ----------
// Je Aktions-Gutschein eine fortlaufende Liste von Tickets gsshop/<studioId>/<aktionId>/<0000…>. Ein Ticket wird mit store.setNeu
// (atomar „nur anlegen, wenn neu“, Netlify Blobs onlyIfNew) angelegt und nie gelöscht → die Nummern sind lückenlos und eindeutig.
// Aktiv (zählt gegen die Stückzahl) ist ein Ticket, das verkauft ist oder reserviert und noch nicht abgelaufen.
// Ein neues Ticket k gilt nur, wenn weniger als „stueck“ aktive Tickets mit kleinerer Nummer existieren; sonst wird es sofort
// wieder freigegeben. Zwei gleichzeitige Käufer der letzten Einheit: der mit der kleineren Nummer bekommt sie, der andere sieht
// „ausverkauft“. Reservierung = Dauer der Stripe-Kasse (30 Min.) + Puffer, danach kann die Kasse nicht mehr bezahlt werden.
export const KASSE_MINUTEN = 30;
const RESERVIERUNG_MS = (KASSE_MINUTEN + 3) * 60 * 1000;
const tPrefix = (sid, aid) => `gsshop/${sid}/${aid}/`;
const tKey = (sid, aid, k) => tPrefix(sid, aid) + String(k).padStart(5, "0");
const aktiv = (t, ms = jetzt().getTime()) => Boolean(t) && (t.status === "verkauft" || (t.status === "reserviert" && new Date(t.bis).getTime() > ms));

async function tickets(sid, aid) {
  const keys = (await store.list(tPrefix(sid, aid))).sort();
  const out = [];
  for (const k of keys) { const v = await store.get(k); if (v) out.push({ key: k, ...v }); }
  return out;
}

export async function bestand(s, c) {
  const ms = jetzt().getTime(), out = {};
  for (const a of c.aktionen) {
    const l = await tickets(s.id, a.id);
    const verkauft = l.filter((t) => t.status === "verkauft").length;
    const reserviert = l.filter((t) => t.status === "reserviert" && aktiv(t, ms)).length;
    out[a.id] = { verkauft, reserviert, verfuegbar: Math.max(0, a.stueck - verkauft - reserviert) };
  }
  return out;
}

export class ShopFehler extends Error { constructor(msg, status = 409, code = "") { super(msg); this.status = status; this.code = code; } }

// Wie viele Aktions-Gutscheine hat diese E-Mail schon (verkauft oder gerade in der Kasse)?
// Gegen das Blockieren der Stückzahl (viele Kassen mit erfundenen Adressen): höchstens 3 offene Kassen je Anschluss (IP, gehasht)
const maxOffenJeIp = () => Number(process.env.TF_GS_MAX_JE_IP) || 3;
async function zaehlen(s, c, { email, ip }) {
  const n = normEmail(email), ms = jetzt().getTime();
  let kaeufer = 0, offenIp = 0;
  for (const a of c.aktionen) for (const t of await tickets(s.id, a.id)) {
    if (!aktiv(t, ms)) continue;
    if (t.email === n) kaeufer++;
    if (ip && t.ip === ip && t.status === "reserviert") offenIp++;
  }
  return { kaeufer, offenIp };
}

export async function reservieren(s, c, a, { zahlungId, email, ip = "" }) {
  const n = await zaehlen(s, c, { email, ip });
  if (n.offenIp >= maxOffenJeIp()) throw new ShopFehler("Du hast schon mehrere Gutscheine in der Kasse. Bitte schließ erst einen Kauf ab oder warte ein paar Minuten.", 429, "zu_viele");
  if (c.aktionJeKaeufer && n.kaeufer >= c.aktionJeKaeufer)
    throw new ShopFehler(c.aktionJeKaeufer === 1 ? "Pro Person gibt es einen Aktions-Gutschein. Für diese E-Mail-Adresse ist schon einer gekauft oder gerade in der Kasse." : `Pro Person gibt es höchstens ${c.aktionJeKaeufer} Aktions-Gutscheine.`, 409, "je_kaeufer");
  const at = jetzt().getTime();
  const eintrag = { zahlungId, email: normEmail(email), ip, status: "reserviert", at: new Date(at).toISOString(), bis: new Date(at + RESERVIERUNG_MS).toISOString() };
  let k = (await store.list(tPrefix(s.id, a.id))).length, key = null;
  for (let i = 0; i < 200 && !key; i++, k++) if (await store.setNeu(tKey(s.id, a.id, k), eintrag)) key = tKey(s.id, a.id, k);
  if (!key) throw new ShopFehler("Gerade sind sehr viele gleichzeitig in der Kasse. Bitte versuch es gleich noch einmal.", 503);
  // Prüfen: weniger als „stueck“ aktive Tickets VOR diesem?
  const ms = jetzt().getTime();
  const vorher = (await tickets(s.id, a.id)).filter((t) => t.key < key && aktiv(t, ms)).length;
  if (vorher >= a.stueck) {
    await store.set(key, { ...eintrag, status: "frei", freiAm: now(), grund: "ausverkauft" });
    const b = (await bestand(s, c))[a.id];
    throw new ShopFehler(b.reserviert > 0 && b.verkauft < a.stueck
      ? `Gutschein Nr. ${a.nr} ist gerade bei jemandem in der Kasse. Wird er nicht bezahlt, ist er in spätestens ${KASSE_MINUTEN} Minuten wieder frei.`
      : `Gutschein Nr. ${a.nr} ist ausverkauft.`, 409, "ausverkauft");
  }
  return { key, bis: eintrag.bis };
}

// Nach der Zahlung (gutscheinAusstellen): Ticket als verkauft markieren. Ist das Ticket schon abgelaufen und die Einheit
// inzwischen weg (sollte nie passieren, die Kasse läuft vorher ab), bleibt der Verkauf gültig und der Admin wird informiert.
export async function reservierungVerkauft(z) {
  const key = z.gutschein?.reservierung;
  if (!key) return { ok: true };
  const t = await store.get(key);
  if (t?.status === "verkauft") return { ok: true };
  const warAktiv = aktiv(t);
  await store.set(key, { ...(t || { zahlungId: z.id }), status: "verkauft", verkauftAm: now(), ...(warAktiv ? {} : { spaet: true }) });
  if (warAktiv) return { ok: true };
  const a = z.gutschein.aktion, l = (await tickets(z.studioId, a.id)).filter((x) => x.status === "verkauft").length;
  return { ok: l <= (a.stueck || 0), ueberverkauft: l > (a.stueck || 0), verkauft: l };
}

// Kasse abgelaufen oder abgebrochen: Einheit wieder frei (nur solange nicht bezahlt)
export async function reservierungFreigeben(z, grund) {
  const key = z.gutschein?.reservierung;
  if (!key || z.status === "bezahlt") return false;
  const t = await store.get(key);
  if (!t || t.status !== "reserviert") return false;
  await store.set(key, { ...t, status: "frei", freiAm: now(), grund });
  return true;
}

// ---------- Texte (Seite, Kasse, PDF, Mail) ----------
// Kurzer Satz zur Gültigkeit eines Aktions-Gutscheins – überall gleich
export function bonusSatz(g, { kurz = false } = {}) {
  if (!g?.bonusCent) return "";
  const w = euro(g.wertCent).replace(",00 €", " €"), b = euro(g.bezahltCent).replace(",00 €", " €");
  return kurz ? `${w} bis ${datum(g.bonusBis)}, danach ${b} bis ${datum(g.gueltigBis)}`
    : `Bis ${datum(g.bonusBis)} löst du den vollen Wert von ${w} ein. Danach gilt der bezahlte Betrag von ${b}, einlösbar bis ${datum(g.gueltigBis)}.`;
}

export function bedingungen(s, c, kaufJahr = jetzt()) {
  const bis = datum(gueltigBis(kaufJahr));
  const verkaeufer = c.anbieter?.name || s.firma;
  return [
    `Verkäufer und Aussteller der Gutscheine ist ${verkaeufer}. Tattoofin stellt nur die Technik für Verkauf und Zahlung bereit; bezahlt wird über Stripe.`,
    `Die Gutscheine gelten für alle Leistungen bei ${s.firma}${s.strasse ? ", " + s.strasse + ", " + [s.plz, s.ort].filter(Boolean).join(" ") : ""}, zum Beispiel Tattoos und Piercings. Das Motiv sucht sich der Beschenkte selbst aus.`,
    // Domenic 23.11.2026: Teil-Einlösung ja, keine Barauszahlung, nicht kombinierbar
    "Du kannst einen Gutschein in Teilen einlösen, der Restwert bleibt auf dem Gutschein. Eine Barauszahlung ist nicht möglich. Die Gutscheine sind nicht mit anderen Aktionen kombinierbar.",
    `Aktions-Gutscheine (Nr. 1 bis ${c.aktionen.length}): Du zahlst weniger, als der Gutschein wert ist. Der Unterschied ist ein Bonus. Den vollen Wert löst du bis ${datum(bonusBisIso(c))} ein. Danach verfällt nur der Bonus: Der bezahlte Betrag wird weiter voll angerechnet, bis ${bis}.`,
    `Jeder Aktions-Gutschein ist nur in der angegebenen Stückzahl verfügbar. Ist eine Nummer verkauft, gibt es sie nicht mehr.${c.aktionJeKaeufer ? ` Pro Person ${c.aktionJeKaeufer === 1 ? "ein Aktions-Gutschein" : "höchstens " + c.aktionJeKaeufer + " Aktions-Gutscheine"}.` : ""}${c.aktionBis ? ` Verkauf der Aktions-Gutscheine bis ${datum(aktionEndeIso(c))}${uhrzeit(aktionEndeIso(c))}, solange verfügbar.` : ""}`,
    `Wertgutschein mit eigenem Betrag: einlösbar bis ${bis}.`,
    "Alle Preise sind Endpreise inklusive Umsatzsteuer. Es kommen keine Versandkosten oder sonstigen Kosten dazu. Den Gutschein bekommst du direkt nach der Zahlung als PDF per E-Mail.",
    "Bezahlen kannst du per Karte, Apple Pay oder Google Pay. Ratenkauf ist für Gutscheine nicht möglich.",
  ];
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
  return { bedingungen: bedingungen(s, c, kauf ? new Date(kauf) : jetzt()), widerruf: widerruf(s, c), anbieter: c.anbieter || null };
}

// Öffentliche Ausgabe für /gutschein-kaufen/<studio>
export async function shopOeffentlich(s, c) {
  const z = shopZustand(s, c), b = await bestand(s, c);
  return {
    titel: c.titel, bonusBis: bonusBisIso(c), gueltigBis: gueltigBis(jetzt()), aktionBis: c.aktionBis ? aktionEndeIso(c) : null, aktionAb: c.aktionAb,
    offen: z.offen, grund: z.grund, aktionOffen: z.aktionOffen, aktionGrund: z.aktionGrund, vorschau: z.vorschau, aktionJeKaeufer: c.aktionJeKaeufer,
    aktionen: c.aktionen.map((a) => ({ id: a.id, nr: a.nr, wertCent: a.wertCent, preisCent: a.preisCent, bonusCent: a.wertCent - a.preisCent, stueck: a.stueck, ...b[a.id], ausverkauft: b[a.id].verkauft >= a.stueck })),
    frei: c.frei,
    anbieter: c.anbieter || null,
    bedingungen: bedingungen(s, c),
    widerruf: widerruf(s, c),
  };
}
