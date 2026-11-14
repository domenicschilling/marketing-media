// API der Tattoofin-App für Studios (seit 13.11.2026, zuerst iPhone; alle Endpunkte plattformneutral: platform "ios" | "android").
// Anmeldung per 6-stelligem Code per E-Mail, danach Gerätetoken „Authorization: Bearer tfa_<geraetId>.<geheimnis>“ (siehe _lib/app-geraete.mjs).
// Mit demselben Token gehen auch alle /api/portal/*-Endpunkte (Zahlungslinks, Gutscheine …), außer den Web-Bereichen (403 nur_web).
//   POST   /api/app/code             { email, platform }                    → immer 200 { ok, verzoegert } (verrät nicht, ob es die Adresse gibt)
//   POST   /api/app/anmelden         { email, code, geraet } | { auswahlToken, studioId, geraet } → { token, geraet, studio } | { auswahl, auswahlToken }
//   POST   /api/app/abmelden         dieses Gerät abmelden
//   GET    /api/app/geraete          angemeldete Geräte des Studios          DELETE /api/app/geraete/:id   ein Gerät abmelden
//   PATCH  /api/app/geraet           { name?, mitteilungen?, kundennameInMitteilung? }
//   PUT    /api/app/push             { token, platform, umgebung, mitteilungen? }   DELETE /api/app/push   POST /api/app/push/test
//   GET    /api/app/auszahlungen?limit=20&nach=po_…   Auszahlungen + Saldo vom Stripe-Konto des Studios
//   GET    /api/app/team · PUT /api/app/team { emails, alleAbmelden? } (nur Inhaber) · DELETE /api/app/team/ich (nur Team)
//   POST   /api/app/konto-loeschen   { bestaetigung: "LÖSCHEN", grund? }  (nur Inhaber) → Kündigung zum Monatsende (Apple-Abo: zum Ende des
//                                     bezahlten Zeitraums) + Löschanfrage; Antwort mit appleAbo: true|false
//   POST   /api/app/demo-zahlung/:id  nur Demo-Studio (App-Prüfung): offenen Link als bezahlt markieren (Testzahlung, kein Geld) + Mitteilung
//   POST   /api/app/registrieren/code | /registrieren/pruefen | /registrieren   neues Studio in der App (seit 14.11.2026, _lib/app-registrierung.mjs)
//   POST   /api/app/abo/bestaetigen | /abo/wiederherstellen | /abo/aktualisieren   Apple-Abo (StoreKit 2, _lib/apple.mjs)
//   Code-Prüfung, Grenzen und Geräte-Anlage gemeinsam in _lib/app-code.mjs
// Grenzen (atomar, store.zaehleAtomar/belegePlatz: jeder Versuch belegt einen eigenen Platz, parallele Anfragen zählen richtig):
// Code-Mails 3 pro Adresse in 15 Min., 10 pro Adresse und Tag, 20 pro IP und Stunde; Anmelde-Versuche 30 pro IP und Stunde,
// 15 pro Adresse und Tag (über alle Codes); Code 10 Min. gültig (APP_CODE_MINUTEN), höchstens 5 Versuche je Code.
// Alle Antworten mit Cache-Control: no-store.
// Review-Zugang für Apple: APP_REVIEW_EMAIL + APP_REVIEW_CODE (6 Ziffern) + APP_REVIEW_STUDIO_ID, nur wenn alle drei gesetzt sind und das
// Studio demo:true hat (_lib/app-demo.mjs). Nur lokal (http://localhost, nicht auf Netlify): APP_LOKAL_CODE = fester Code statt Zufall.
import { body, clean, handler, now, clientIp, isEmail } from "./_lib/util.mjs";
import { store, getStudio, saveStudio, AKTIV, zaehleVersuch, zaehleAtomar, normEmail, log, getZahlung, saveZahlung } from "./_lib/store.mjs";
import { currentStudio, verify } from "./_lib/auth.mjs";
import { notify, notifyAdmin, kuendigungEinreichen } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { warteschlangeStatus } from "./_lib/mail.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { PLATTFORMEN, geraetLaden, geraetAktualisieren, geraetWiderrufen, geraeteWiderrufen, geraetOeffentlich, geraeteVon, rolleFuer, pushIndex } from "./_lib/app-geraete.mjs";
import { apnsAktiv, pushTest, pushAnStudio, mitZeitlimit, nachrichtZahlung } from "./_lib/push.mjs";
import { demoAuszahlungen } from "./_lib/app-demo.mjs";
import { oeffentlich, fuerStudio } from "./_lib/studio-ansicht.mjs";
import { gutscheinAusstellen } from "./_lib/gutschein.mjs";
import { istApple, testKasse } from "./_lib/config.mjs";
import { aj, fehler, hash, T, reviewFuer, codeIpErlaubt, codeAdresseErlaubt, aktiveStudios, anmeldeCodeSenden, reviewPruefen, codePruefen, nachAnmeldeCode, geraetFertig } from "./_lib/app-code.mjs";
import { appRegistrierungRoute } from "./_lib/app-registrierung.mjs";

const berlinTag = (ms) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

// ---------------------------------------------------------------- Code anfordern
async function codeAnfordern(req, context) {
  const b = await body(req);
  const ipOk = await codeIpErlaubt(req, context);
  const antwort = async () => aj({ ok: true, verzoegert: (await warteschlangeStatus()).anzahl > 0 });
  const email = normEmail(clean(b.email, 160));
  if (!ipOk || !isEmail(email)) return antwort();
  if (await reviewFuer(email)) return antwort();   // Review: keine Mail, kein gespeicherter Code (fester APP_REVIEW_CODE)
  if (!(await codeAdresseErlaubt(email))) return antwort();
  const studios = await aktiveStudios(email);
  if (!studios.length) return antwort();
  await anmeldeCodeSenden(email, studios);
  return antwort();
}

// ---------------------------------------------------------------- Anmelden
async function anmelden(req, context) {
  if (!(await zaehleAtomar(`rl/appanmelden-ip/${hash(clientIp(req, context) || "?")}`, 30, 3600e3))) return fehler(T.zuViele, 429, "zu_viele");
  const b = await body(req);
  const gd = b.geraet && typeof b.geraet === "object" ? b.geraet : {};
  if (!PLATTFORMEN.includes(gd.platform)) return fehler(T.platform, 400, "platform");

  // B) Auswahl bei mehreren Studios: signiertes Einmal-Token (5 Min.)
  if (b.auswahlToken) {
    const p = verify(clean(b.auswahlToken, 3000), "appauswahl");
    const sid = clean(b.studioId, 40);
    if (!p?.n || !Array.isArray(p.ids) || !p.ids.includes(sid)) return fehler(T.auswahl, 400, "auswahl");
    // Einmal verwenden (gleicher Schlüssel wie einmalVerbrauchen, aber atomar angelegt)
    if (!(await store.setNeu("einmal/" + p.n, { am: now(), t: p.t, exp: p.exp }))) return fehler(T.auswahl, 400, "auswahl");
    const s = await getStudio(sid);
    if (!s || !AKTIV(s) || s.demo || !rolleFuer(s, p.email)) return fehler(T.auswahl, 400, "auswahl");
    return fertig(s, p.email, gd);
  }

  // A) E-Mail + Code
  const email = normEmail(clean(b.email, 160));
  const code = String(b.code ?? "").replace(/\s+/g, "");
  if (!isEmail(email) || !/^\d{6}$/.test(code)) return fehler(T.eingabe, 400, "eingabe");

  const review = await reviewFuer(email);
  if (review) {
    const r = await reviewPruefen(review, email, code);
    return r.antwort || fertig(r.s, email, gd);
  }
  const c = await codePruefen(`appcode/${hash(email)}`, email, code);
  if (c.antwort) return c.antwort;
  const n = await nachAnmeldeCode(c.rec, email, gd);
  return n.antwort || aj(n.daten);
}

const fertig = async (s, email, gd) => aj(await geraetFertig(s, email, gd));

// ---------------------------------------------------------------- Auszahlungen
const STATUS_TEXT = { paid: "Angekommen", in_transit: "Unterwegs", pending: "Wird vorbereitet", failed: "Fehlgeschlagen", canceled: "Abgebrochen" };
const FEHLER_TEXT = {
  account_closed: "Das Bankkonto ist geschlossen.", no_account: "Dieses Bankkonto gibt es nicht.", invalid_account_number: "Die IBAN stimmt nicht.",
  account_frozen: "Das Bankkonto ist gesperrt.", bank_account_restricted: "Das Bankkonto nimmt diese Überweisung nicht an.", could_not_process: "Die Bank konnte die Überweisung nicht verarbeiten.",
  insufficient_funds: "Auf dem Stripe-Konto war nicht genug Guthaben.", debit_not_authorized: "Die Bank hat die Buchung nicht erlaubt.", invalid_currency: "Das Bankkonto nimmt keine Euro an.",
};
const STANDARD_FEHLER = "Die Auszahlung ist fehlgeschlagen. Bitte prüfe deine Bankdaten im Dashboard.";
function auszahlungAusgabe(po) {
  const d = po.destination && typeof po.destination === "object" ? po.destination : null;
  return {
    id: po.id, betragCent: po.amount, waehrung: po.currency || "eur", status: po.status, statusText: STATUS_TEXT[po.status] || po.status,
    ankunftAm: po.arrival_date ? berlinTag(po.arrival_date * 1000) : null,
    erstelltAm: po.created ? new Date(po.created * 1000).toISOString().replace(/\.\d{3}Z$/, "Z") : null,
    bank: d ? { name: d.bank_name || d.brand || (d.object === "card" ? "Karte" : "Bank"), endet: d.last4 || "" } : null,
    fehler: po.status === "failed" ? FEHLER_TEXT[po.failure_code] || STANDARD_FEHLER : null,
  };
}
async function auszahlungen(s, url) {
  const limit = Math.min(50, Math.max(1, Math.round(Number(url.searchParams.get("limit")) || 20)));
  const nachRoh = url.searchParams.get("nach") || "";
  const nach = /^po_[A-Za-z0-9_]{3,80}$/.test(nachRoh) ? nachRoh : null;
  if (s.demo) return aj(demoAuszahlungen({ limit, nach }));
  const konto = { verbunden: Boolean(s.stripe?.accountId), auszahlungenAktiv: Boolean(s.stripe?.payoutsEnabled), kontoTyp: s.stripe?.kontoTyp || (s.modell === "provision" ? "express" : "standard") };
  if (!konto.verbunden) return aj({ konto, saldo: null, auszahlungen: [], weitere: false, hinweis: "Noch kein Stripe-Konto verbunden." });
  const account = s.stripe.accountId;
  let liste, saldo;
  try {
    [liste, saldo] = await Promise.all([
      stripe("GET", "/payouts", { limit, ...(nach ? { starting_after: nach } : {}), expand: ["data.destination"] }, { account }),
      stripe("GET", "/balance", null, { account }),
    ]);
  } catch (e) {
    await log("app-auszahlungen-fehler", { studioId: s.id, fehler: String(e.message).slice(0, 160) });
    return fehler("Stripe antwortet gerade nicht. Bitte gleich nochmal versuchen.", 502, "stripe");
  }
  const summe = (arr) => (arr || []).filter((x) => (x.currency || "eur") === "eur").reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const daten = (liste.data || []).map(auszahlungAusgabe);
  return aj({
    konto, saldo: { verfuegbarCent: summe(saldo.available), unterwegsCent: summe(saldo.pending), waehrung: "eur" },
    auszahlungen: daten, weitere: Boolean(liste.has_more), nach: liste.has_more && daten.length ? daten[daten.length - 1].id : null,
  });
}

// ---------------------------------------------------------------- Team
const teamAntwort = (s, ich) => ({ hauptadresse: s.email, team: s.teamEmails || [], max: 5, darfAendern: ich.rolle === "inhaber" });
async function teamSetzen(s, ich, g, req) {
  if (ich.rolle !== "inhaber") return fehler("Nur der Inhaber kann das Team ändern.", 403, "nur_inhaber");
  const b = await body(req);
  // Ohne Liste nichts ändern (sonst würde ein fehlerhafter Aufruf das ganze Team löschen)
  if (!Array.isArray(b.emails)) return fehler("Bitte die Team-Adressen als Liste (emails) schicken.", 400, "emails");
  // Gleiche Prüfung wie im Admin (höchstens 5, gültige Adressen, ohne Dubletten); die Hauptadresse gehört nicht in die Liste
  const roh = [...new Set((Array.isArray(b.emails) ? b.emails : []).map((e) => clean(e, 160).replace(/\s+/g, "").toLowerCase()).filter(Boolean))];
  const gesehen = new Set([normEmail(s.email)]), liste = [];
  for (const e of roh) { const n = normEmail(e); if (!gesehen.has(n)) { gesehen.add(n); liste.push(e); } }
  if (liste.length > 5) return fehler("Höchstens 5 Team-Adressen", 400);
  const falsch = liste.find((e) => !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e));
  if (falsch) return fehler(`Keine gültige E-Mail: ${falsch}`, 400);
  const vorher = s.teamEmails || [];
  const bleibt = new Set(liste.map(normEmail));
  const entfernt = new Set(vorher.map(normEmail).filter((n) => !bleibt.has(n)));
  const alleAbmelden = b.alleAbmelden === true;
  s.teamEmails = liste;
  if (alleAbmelden) s.sessionVersion = (s.sessionVersion || 0) + 1;
  await saveStudio(s);
  // App-Geräte entfernter Adressen sofort abmelden. Web-Cookies lassen sich nicht einzeln trennen → Option „alleAbmelden“.
  const widerrufen = await geraeteWiderrufen(s.id, (x) => entfernt.has(x.email), "team-entfernt");
  // Bei „alle abmelden“ bleibt dieses Gerät angemeldet (der Inhaber hat es gerade selbst ausgelöst)
  if (alleAbmelden) await geraetAktualisieren(g, (x) => { x.sv = s.sessionVersion; });
  await log("app-team", { studioId: s.id, geraetId: ich.geraetId, anzahl: liste.length, entfernt: entfernt.size, widerrufen, alleAbmelden });
  await notifyAdmin("Team-Adressen in der App geändert", s, { Vorher: vorher.join(", ") || "–", Nachher: liste.join(", ") || "–", Alle_abgemeldet: alleAbmelden ? "ja" : "nein" });
  return aj(teamAntwort(s, ich));
}

// ---------------------------------------------------------------- Konto löschen (Kündigung + Löschanfrage)
async function kontoLoeschen(s, ich, req) {
  if (ich.rolle !== "inhaber") return fehler("Nur der Inhaber kann das Konto löschen.", 403, "nur_inhaber");
  const b = await body(req);
  if (String(b.bestaetigung || "").trim().toUpperCase() !== "LÖSCHEN") return fehler("Bitte tippe LÖSCHEN zur Bestätigung.", 400, "bestaetigung");
  const grund = clean(b.grund, 1000);
  // Schon gekündigt: kein Fehler, nur die Löschanfrage dazu
  if (!["gekuendigt", "beendet", "erstattet"].includes(s.status)) await kuendigungEinreichen(s, { grund, garantie: false, quelle: "app", mitMails: false });
  const zum = s.kuendigung?.zum || s.vertragsende || now();
  // Löschung spätestens 30 Tage nach Vertragsende (Datenschutzerklärung, Abschnitt Speicherdauer)
  const loeschungAb = berlinTag(Date.parse(zum) + 30 * 864e5);
  s.loeschAnfrage = { am: now(), durch: "app", geraetId: ich.geraetId, loeschungAb, ...(grund ? { grund } : {}) };
  await saveStudio(s);
  await log("app-loeschanfrage", { studioId: s.id, geraetId: ich.geraetId, zum, loeschungAb });
  await notify(s, mails.loeschAnfrage(s, { zum, loeschungAb }));
  await notifyAdmin("Löschanfrage aus der App", s, { Kuendigung_zum: zum, Loeschung_ab: loeschungAb, Grund: grund || "–" });
  // appleAbo: Die App zeigt dann „Kündige es zusätzlich in den Einstellungen deines Apple-Accounts“ (Zahlungen an Apple laufen sonst weiter)
  return aj({ ok: true, kuendigungZum: zum, loeschungAb, appleAbo: istApple(s), studio: oeffentlich(s) });
}

// ---------------------------------------------------------------- Verteiler
async function route(req, context) {
  const url = new URL(req.url);
  const teile = url.pathname.replace(/^\/api\/app\/?/, "").split("/").filter(Boolean);
  const [bereich, sub] = teile;
  const m = req.method;

  if (bereich === "code") return m === "POST" ? codeAnfordern(req, context) : fehler("Methode nicht erlaubt", 405);
  if (bereich === "anmelden") return m === "POST" ? anmelden(req, context) : fehler("Methode nicht erlaubt", 405);
  // Neues Studio-Konto in der App + Apple-Abo (_lib/app-registrierung.mjs). Prüft die Anmeldung selbst (teils ohne Token).
  if (bereich === "registrieren" || bereich === "abo") return appRegistrierungRoute(req, context, bereich, sub);

  // Ab hier nur mit App-Token (kein Cookie, keine Admin-Ansicht)
  const s = await currentStudio(req);
  if (!s || !s._app) return fehler(T.login, 401, "nicht_angemeldet");
  const ich = s._app, g = s._geraet;

  if (bereich === "abmelden" && m === "POST") { await geraetWiderrufen(g, "abgemeldet"); await log("app-abmeldung", { studioId: s.id, geraetId: g.id }); return aj({ ok: true }); }

  if (bereich === "geraete" && !sub && m === "GET") return aj({ geraete: (await geraeteVon(s.id)).map((x) => geraetOeffentlich(x, { aktuell: ich })) });
  if (bereich === "geraete" && sub && m === "DELETE") {
    const x = await geraetLaden(sub);
    if (!x || x.studioId !== s.id || x.widerrufenAm) return fehler("Nicht gefunden", 404);
    if (ich.rolle !== "inhaber" && x.email !== ich.email) return fehler("Nur der Inhaber kann fremde Geräte abmelden.", 403, "nur_inhaber");
    await geraetWiderrufen(x, x.id === g.id ? "abgemeldet" : "von-anderem-geraet");
    await log("app-geraet-abgemeldet", { studioId: s.id, geraetId: x.id, durch: g.id });
    return aj({ ok: true });
  }

  if (bereich === "geraet" && m === "PATCH") {
    const b = await body(req);
    let name = null;
    if (b.name !== undefined) { name = clean(b.name, 60); if (!name) return fehler("Bitte gib dem Gerät einen Namen.", 400, "eingabe"); }
    // Frisch laden und nur die Änderung schreiben (ein inzwischen abgemeldetes Gerät wird nie wieder belebt)
    const neu = await geraetAktualisieren(g, (x) => {
      if (name) x.name = name;
      if (b.mitteilungen && typeof b.mitteilungen === "object") {
        for (const k of ["zahlungen", "auszahlungen"]) if (typeof b.mitteilungen[k] === "boolean") x.mitteilungen = { ...(x.mitteilungen || {}), [k]: b.mitteilungen[k] };
      }
      if (typeof b.kundennameInMitteilung === "boolean") x.kundennameInMitteilung = b.kundennameInMitteilung;
    });
    if (!neu) return fehler(T.login, 401, "nicht_angemeldet");
    return aj({ geraet: geraetOeffentlich(neu, { aktuell: ich }) });
  }

  if (bereich === "push") {
    if (sub === "test" && m === "POST") {
      if (!(await zaehleVersuch(`rl/apppushtest/${g.id}`, 5, 3600e3))) return fehler(T.zuViele, 429, "zu_viele");
      return aj(await pushTest(g));
    }
    if (!sub && m === "PUT") {
      const b = await body(req);
      if (!PLATTFORMEN.includes(b.platform) || b.platform !== g.platform) return fehler("Die Plattform passt nicht zu diesem Gerät.", 400, "platform");
      const token = String(b.token || "").trim();
      const okToken = g.platform === "ios" ? /^[0-9a-f]{64,200}$/i.test(token) : token.length >= 20 && token.length <= 4096;
      if (!okToken) return fehler("Ungültiger Geräte-Token.", 400, "token");
      const umgebung = ["sandbox", "production"].includes(b.umgebung) ? b.umgebung : g.platform === "ios" ? null : "production";
      if (!umgebung) return fehler("Bitte umgebung sandbox oder production angeben.", 400, "umgebung");
      const pt = g.platform === "ios" ? token.toLowerCase() : token;
      // Derselbe Token an einem anderen Gerät (App neu installiert, anderes Studio …) → dort entfernen. Index über alle Studios.
      const ziel = `${s.id}/${g.id}`;
      const bisher = await store.get(pushIndex(pt));
      if (bisher && bisher !== ziel) {
        const [sid, gid] = String(bisher).split("/");
        const alt = sid && gid ? await store.get(`appgeraet/${sid}/${gid}`) : null;
        if (alt) await geraetAktualisieren(alt, (x) => { if (x.push?.token !== pt) return false; x.push = null; });
      }
      // Ältere Einträge ohne Index (vor dem 13.11.2026) im eigenen Studio
      for (const x of await geraeteVon(s.id)) if (x.id !== g.id && x.push?.token === pt) await geraetAktualisieren(x, (y) => { if (y.push?.token !== pt) return false; y.push = null; });
      const altToken = g.push?.token;
      const neu = await geraetAktualisieren(g, (x) => {
        x.push = { token: pt, umgebung, am: now() };
        if (b.mitteilungen && typeof b.mitteilungen === "object") {
          for (const k of ["zahlungen", "auszahlungen"]) if (typeof b.mitteilungen[k] === "boolean") x.mitteilungen = { ...(x.mitteilungen || {}), [k]: b.mitteilungen[k] };
        }
      });
      if (!neu) return fehler(T.login, 401, "nicht_angemeldet");
      await store.set(pushIndex(pt), ziel);
      if (altToken && altToken !== pt && (await store.get(pushIndex(altToken))) === ziel) await store.del(pushIndex(altToken));
      return aj({ ok: true, apnsAktiv: apnsAktiv() });
    }
    if (!sub && m === "DELETE") {
      const altToken = g.push?.token;
      await geraetAktualisieren(g, (x) => { x.push = null; });
      if (altToken && (await store.get(pushIndex(altToken))) === `${s.id}/${g.id}`) await store.del(pushIndex(altToken));
      return aj({ ok: true });
    }
  }

  if (bereich === "auszahlungen" && m === "GET") return auszahlungen(s, url);

  if (bereich === "team") {
    if (!sub && m === "GET") return aj(teamAntwort(s, ich));
    if (!sub && m === "PUT") return teamSetzen(s, ich, g, req);
    if (sub === "ich" && m === "DELETE") {
      if (ich.rolle !== "team") return fehler("Das geht nur mit einer Team-Adresse. Als Inhaber bleibst du im Studio.", 403, "nur_team");
      s.teamEmails = (s.teamEmails || []).filter((e) => normEmail(e) !== ich.email);
      await saveStudio(s);
      const n = await geraeteWiderrufen(s.id, (x) => x.email === ich.email, "team-verlassen");
      await log("app-team-verlassen", { studioId: s.id, geraetId: ich.geraetId, widerrufen: n });
      return aj({ ok: true });
    }
  }

  if (bereich === "konto-loeschen" && m === "POST") return kontoLoeschen(s, ich, req);

  // Nur Demo-Studio (App-Prüfung bei Apple) und Testkauf-Studio (Apple-Sandbox): Testzahlung, damit der Prüfer den Ablauf
  // „Link → bezahlt → Mitteilung“ sieht. Kein Geld, kein Stripe, keine Gutschein-Mails (gutscheinSenden bei testKasse).
  if (bereich === "demo-zahlung" && sub && m === "POST") {
    if (!testKasse(s)) return fehler("Nicht gefunden", 404);
    const z = await getZahlung(s.id, sub);
    if (!z) return fehler("Nicht gefunden", 404);
    if (z.status !== "offen") return fehler("Dieser Link ist nicht mehr offen.", 409, "nicht_offen");
    z.status = "bezahlt"; z.bezahltAm = now(); z.zahlart = "card"; z.zahlartText = "Karte (Testzahlung)"; z.demoZahlung = true;
    await saveZahlung(z);
    if (z.art === "gutschein") await gutscheinAusstellen(s, z);
    await mitZeitlimit(pushAnStudio(s, "zahlungen", nachrichtZahlung(z)));
    await log("app-demo-zahlung", { studioId: s.id, zahlungId: z.id });
    return aj(fuerStudio(z));
  }

  return fehler("Nicht gefunden", 404);
}

const inner = handler(route);
// Jede Antwort (auch Fehler aus handler) ohne Zwischenspeicher
export default async (req, context) => {
  const r = await inner(req, context);
  try { r.headers.set("cache-control", "no-store"); } catch { /* unveränderlich: egal */ }
  return r;
};

export const config = { path: ["/api/app", "/api/app/*"] };
