                                                       

// Ersatz, wenn die KI nicht erreichbar ist: erkennt Kunde, Mengen, Einheiten,
// Preise und Katalogeinträge mit einfachen Regeln. Lieber eine Position zu viel
// als eine verlorene – der Nutzer korrigiert im Editor.

const ZAHLWOERTER                         = {
  ein: 1, eine: 1, einen: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9,
  zehn: 10, elf: 11, zwölf: 12, fünfzehn: 15, zwanzig: 20, dreißig: 30, vierzig: 40, fünfzig: 50, sechzig: 60,
  siebzig: 70, achtzig: 80, neunzig: 90, hundert: 100, einhundert: 100, zweihundert: 200, dreihundert: 300,
  fünfhundert: 500, tausend: 1000, eintausend: 1000, halbe: 0.5, halben: 0.5, anderthalb: 1.5,
};

const EINHEITEN                          = [
  [/^(quadratmeter|qm|m²|m2)$/, "m²"],
  [/^(kubikmeter|m³|m3)$/, "m³"],
  [/^(laufmeter|laufende meter|lfm|meter|m)$/, "lfm"],
  [/^(stunden?|std\.?|h)$/, "Std."],
  [/^(stück|stk\.?|mal)$/, "Stk."],
  [/^(tage?n?)$/, "Tag"],
  [/^(monate?n?|monatlich)$/, "Monat"],
  [/^(personen|person|gäste|pers\.?)$/, "Person"],
  [/^(kilometer|km)$/, "km"],
  [/^(kilo|kg|kilogramm)$/, "kg"],
  [/^(pauschal|pauschale)$/, "pauschal"],
];

const ZAHL = String.raw`(\d+(?:[.,]\d+)?)`;
const EINHEIT_WORT = String.raw`(quadratmeter|qm|m²|m2|kubikmeter|m³|m3|laufende meter|laufmeter|lfm|meter|stunden|stunde|std\.?|stück|stk\.?|tagen|tage|tag|monaten|monate|monat|personen|person|gäste|kilometer|km|kilo|kg|pauschal)`;

const zahl = (s        ) => Number(s.replace(/\./g, "").replace(",", "."));

function zahlwoerterErsetzen(text        ) {
  return text.replace(/\b([a-zäöüß]+)\b/gi, (w) => {
    const n = ZAHLWOERTER[w.toLowerCase()];
    return n !== undefined && !/^(ein|eine|einen)$/i.test(w) ? String(n) : w;
  });
}

const stamm = (w        ) => w.toLowerCase().replace(/[^a-zäöüß]/g, "").slice(0, 6);
const STOPP = new Set(["und", "oder", "mit", "für", "von", "der", "die", "das", "den", "dem", "ein", "eine", "inkl", "inklusive", "pro", "noch", "dazu", "auch", "bitte", "alles", "ganze"]);

function katalogTreffer(fragment        , katalog                  ) {
  const woerter = new Set(fragment.split(/[\s,/()–-]+/).filter((w) => w.length > 3 && !STOPP.has(w.toLowerCase())).map(stamm));
  let best                                              = null;
  for (const k of katalog) {
    const kw = k.titel.split(/[\s,/()–-]+/).filter((w) => w.length > 3 && !STOPP.has(w.toLowerCase())).map(stamm);
    const score = kw.filter((w) => woerter.has(w)).length / Math.max(kw.length, 1);
    const treffer = kw.filter((w) => woerter.has(w)).length;
    if (treffer > 0 && (!best || score > best.score)) best = { k, score };
  }
  return best && best.score >= 0.2 ? best.k : null;
}

const gross = (s        ) => s.charAt(0).toUpperCase() + s.slice(1);

export function lokalParsen(diktat        , katalog                  , stundensatz        )          {
  const text = zahlwoerterErsetzen(diktat.replace(/(\d)\s*komma\s*(\d)/gi, "$1,$2"));
  const kunde                   = { firma: "", anrede: "", vorname: "", nachname: "", strasse: "", plz: "", ort: "", email: "", telefon: "" };

  let nameText = "";
  const name = text.match(/\b(?:für|an|kunde:?)\s+(herrn?|frau|familie|firma)\s+([A-ZÄÖÜ][\wäöüß-]+(?:\s+[A-ZÄÖÜ][\wäöüß&-]+){0,2})/i);
  if (name) {
    const typ = name[1].toLowerCase();
    const teile = name[2].trim().split(/\s+/);
    if (typ === "firma") kunde.firma = name[2].trim();
    else {
      kunde.anrede = typ.startsWith("herr") ? "Herr" : typ === "frau" ? "Frau" : "Familie";
      kunde.nachname = teile.pop() ?? "";
      kunde.vorname = teile.join(" ");
    }
  }
  if (!name) {
    const fa = text.match(/\bfür\s+(?:die|das|den|dem)\s+([A-ZÄÖÜ][\wäöüß&.-]+(?:\s+(?:Dr\.|[A-ZÄÖÜ][\wäöüß&.-]+)){0,3})/);
    if (fa) {
      kunde.firma = fa[1].trim();
      nameText = fa[0];
    }
  }
  const strasse = text.match(/([A-ZÄÖÜ][\wäöüß.-]*(?:straße|strasse|str\.|weg|gasse|platz|allee|ring|damm|ufer)\s*\d+\s?[a-z]?)\b/i);
  if (strasse) kunde.strasse = gross(strasse[1].trim());
  const ort = text.match(/\b(\d{5})\s+([A-ZÄÖÜ][\wäöüß-]+)/) ?? text.match(/\bin\s+(\d{5})?\s*([A-ZÄÖÜ][a-zäöüß-]+)\b/);
  if (ort) {
    kunde.plz = ort[1] ?? "";
    kunde.ort = ort[2];
  }
  const mail = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (mail) kunde.email = mail[0];
  const tel = text.match(/(?:telefon|tel\.?|handy|nummer)\s*:?\s*([+\d][\d\s/-]{6,})/i);
  if (tel) kunde.telefon = tel[1].trim();

  let rabatt = 0;
  const r = text.match(new RegExp(`${ZAHL}\\s*(?:%|prozent)\\s*(?:rabatt|nachlass)`, "i"));
  if (r) rabatt = zahl(r[1]);

  // Kundenangaben aus dem Text nehmen, damit sie nicht als Positionen enden.
  let rest = text;
  for (const m of [name?.[0], nameText, strasse?.[1], ort?.[0], mail?.[0], tel?.[0], r?.[0]]) if (m) rest = rest.replace(m, " ");

  const hatLeistung = (f        ) => new RegExp(`${ZAHL}\\s*${EINHEIT_WORT}`, "i").test(f) || !!katalogTreffer(f, katalog);
  const fragmente = rest
    .split(/[;.\n]|,(?!\d)|\b(?:und dann|außerdem|dazu noch|dazu|plus|sowie|zusätzlich)\b/i)
    .map((f) => f.trim())
    .map((f) => f.replace(/^[:\s-]+/, ""))
    .filter((f) => f.length > 2)
    // „drei Stunden Arbeitszeit und Anfahrt“ → zwei Positionen, „Wohnzimmer und Flur“ bleibt eine
    .flatMap((f) => {
      const teile = f.split(/\s+und\s+/i);
      if (teile.length !== 2 || !hatLeistung(teile[0]) || !hatLeistung(teile[1])) return [f];
      // „abdecken und entsorgen“ trifft zweimal dieselbe Leistung → eine Position
      const k0 = katalogTreffer(teile[0], katalog);
      if (k0 && k0 === katalogTreffer(teile[1], katalog) && !new RegExp(`${ZAHL}\\s*${EINHEIT_WORT}`, "i").test(teile[0])) return [f];
      return teile;
    });

  const positionen                        = [];
  for (const f of fragmente) {
    if (/^(angebot|erstelle|mach|schreib)\b/i.test(f) && !new RegExp(EINHEIT_WORT, "i").test(f)) continue;

    const mengeTreffer = f.match(new RegExp(`${ZAHL}\\s*${EINHEIT_WORT}`, "i"));
    const preisTreffer = f.match(new RegExp(`${ZAHL}\\s*(?:euro|€)(?:\\s*(pro|je|das|die|den)\\s*(\\S+))?`, "i"));
    const k = katalogTreffer(f, katalog);
    if (!mengeTreffer && !preisTreffer && !k) continue;

    // „zusammen 65 Quadratmeter“ als eigener Satzteil gehört zur Position davor
    // Auch ohne Füllwort: „Alte Fliesen entfernen, 24 Quadratmeter“ (Menge nach Komma)
    const nachgereicht = f.match(new RegExp(`^(?:(?:zusammen|insgesamt|gesamt|etwa|circa|ca\\.?)\\s+)?${ZAHL}\\s*${EINHEIT_WORT}$`, "i"));
    const davor = positionen[positionen.length - 1];
    if (nachgereicht && davor && davor.menge === 1) {
      const e = nachgereicht[2].toLowerCase();
      const einh = EINHEITEN.find(([re]) => re.test(e))?.[1];
      const mitFuellwort = !/^\d/.test(f);
      // Ohne Füllwort nur bei gleicher Einheit (sonst wäre „Anfahrt, 2 Stunden“ plötzlich 2 × Anfahrt)
      if (einh && (einh === davor.einheit || (mitFuellwort && davor.einheit === "pauschal"))) {
        davor.menge = zahl(nachgereicht[1]);
        davor.einheit = einh;
        continue;
      }
    }

    // Stückzahl ohne Einheit: „6 neue Steckdosen“ bei einem Katalogeintrag je Stück
    const ohneEinheit = !mengeTreffer && k && k.einheit === "Stk." ? f.replace(preisTreffer?.[0] ?? "", " ").match(/(?:^|\s)(\d+(?:[.,]\d+)?)(?=\s|$)/) : null;
    let menge = mengeTreffer ? zahl(mengeTreffer[1]) : ohneEinheit ? zahl(ohneEinheit[1]) : 1;
    let einheit = k?.einheit ?? "pauschal";
    if (mengeTreffer) {
      const e = mengeTreffer[2].toLowerCase();
      einheit = EINHEITEN.find(([re]) => re.test(e))?.[1] ?? einheit;
    }
    if (/pauschal/i.test(f) && !mengeTreffer) einheit = "pauschal";

    // Gemessen in m², Katalogpreis aber je Stunde (oder umgekehrt): lieber „Preis fehlt“ als ein falscher Preis
    const einheitPasst = !k || !mengeTreffer || k.einheit === einheit || einheit === "pauschal";
    let preis = k && einheitPasst ? k.preis : einheit === "Std." ? stundensatz : 0;
    if (preisTreffer) {
      const p = zahl(preisTreffer[1]);
      const proEinheit = !!preisTreffer[2] || /pro|je/i.test(f.slice(f.indexOf(preisTreffer[0]) - 4));
      preis = proEinheit || menge <= 1 ? p : Math.round((p / menge) * 100) / 100;
    }
    if (einheit === "pauschal") menge = mengeTreffer && mengeTreffer[2].toLowerCase() !== "pauschal" ? menge : 1;

    const titel = k
      ? k.titel
      : gross(
          f
            .replace(new RegExp(`${ZAHL}\\s*(?:euro|€)(\\s*(pro|je)\\s*\\S+)?`, "gi"), "")
            .replace(new RegExp(`${ZAHL}\\s*${EINHEIT_WORT}`, "gi"), "")
            .replace(/\b(für|zu|à|a|pauschal|optional|auf wunsch|bei bedarf)\b/gi, " ")
            .replace(/\s{2,}/g, " ")
            .trim(),
        ) || "Leistung";

    positionen.push({
      art: "posten",
      titel,
      beschreibung: k?.beschreibung ?? "",
      menge,
      einheit,
      preis,
      optional: /optional|auf wunsch|bei bedarf|alternativ/i.test(f),
    });
  }

  const ohnePreis = positionen.filter((p) => !p.preis).length;
  return {
    kunde,
    betreff: "",
    positionen,
    rabatt,
    hinweis: ohnePreis ? `Bei ${ohnePreis} Position${ohnePreis > 1 ? "en" : ""} fehlt noch der Preis.` : "",
  };
}
