// Alle automatischen E-Mails (an Studios, Endkunden und intern). Jede Funktion liefert { subject, html, text }.
import { CFG } from "./config.mjs";
import { esc, euro, brutto, datum, monatName } from "./util.mjs";

const gelb = "#ffbd16", navy = "#13243d";

function layout({ preheader = "", title, body, cta, ctaUrl, footerNote = "" }) {
  const button = cta && ctaUrl
    ? `<p style="margin:26px 0"><a href="${esc(ctaUrl)}" style="background:${gelb};color:${navy};text-decoration:none;font-weight:700;padding:13px 22px;border-radius:99px;display:inline-block">${esc(cta)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f7f7f4;font:15px/1.6 -apple-system,Segoe UI,'DM Sans',Arial,sans-serif;color:#14161a">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:${navy};padding:16px 26px"><img src="${CFG.siteUrl}/assets/wortmarke.png" alt="Tattoofin" height="30" style="height:30px;background:#fff;border-radius:8px;padding:5px 8px"></td></tr>
<tr><td style="padding:26px 26px 8px"><h1 style="font-size:21px;line-height:1.25;margin:0 0 14px;color:${navy}">${title}</h1>${body}${button}</td></tr>
<tr><td style="padding:8px 26px 24px;color:#5b6370;font-size:13px">${footerNote}
<p style="margin:14px 0 0">Fragen? Antworte einfach auf diese E-Mail oder schreib uns per WhatsApp: ${esc(CFG.telefon)}.<br>
${esc(CFG.firma)} · ${esc(CFG.adresse)}<br>Tattoofin ist kein Kreditgeber. Zahlungen werden über externe Zahlungsanbieter abgewickelt.</p></td></tr></table></td></tr></table></body></html>`;
  const text = (title + "\n\n" + body + (cta ? `\n\n${cta}: ${ctaUrl}` : ""))
    .replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|li|tr|h\d)>/g, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();
  return { html, text };
}

const p = (s) => `<p style="margin:0 0 12px">${s}</p>`;
const box = (s) => `<div style="background:#fff5d6;border:1px solid #f5d77a;border-radius:10px;padding:12px 14px;margin:0 0 14px">${s}</div>`;
const rows = (pairs) => `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;margin:0 0 14px">${pairs
  .filter(([, v]) => v !== undefined && v !== null && v !== "")
  .map(([k, v]) => `<tr><td style="padding:5px 0;color:#5b6370;width:44%;vertical-align:top">${esc(k)}</td><td style="padding:5px 0;font-weight:600">${v}</td></tr>`).join("")}</table>`;
const hallo = (s) => p(`Hey ${esc(s.inhaber?.split(" ")[0] || s.firma)},`);
const modellText = (s) => (s.modell === "kauf"
  ? `Kauf: Einrichtung ${euro(s.preisNetto)} netto einmalig (${euro(brutto(s.preisNetto))} brutto), keine monatliche Grundgebühr, keine Provision`
  : `Provision: ${CFG.provisionProzent} % netto vom Betrag jeder Zahlung über Tattoofin, keine Einrichtungs- und keine Grundgebühr`);
const mk = (subject, l) => ({ subject, ...layout(l) });

export const mails = {
  // 1) direkt nach dem Online-Abschluss
  anmeldung: (s, { loginUrl, connectUrl }) => mk(`Willkommen bei Tattoofin, ${s.firma}`, {
    preheader: "Dein Vertrag ist abgeschlossen. Jetzt das Stripe-Konto deines Studios verbinden.",
    title: "Willkommen bei Tattoofin! 🎉",
    body: hallo(s) + p("schön, dass du dabei bist. Hier ist die Zusammenfassung deines Vertrags:") + rows([
      ["Studio", esc(s.firma)], ["Modell", esc(modellText(s))],
      ["Vertrag / AVV", `Version ${esc(s.vertrag.version)}, akzeptiert am ${datum(s.vertrag.akzeptiertAm)} von ${esc(s.vertrag.name)}`],
      ["Vertragstext", `<a href="${CFG.siteUrl}/vertrag.html">Vertrag</a> · <a href="${CFG.siteUrl}/avv.html">AVV</a>`],
    ]) + p("<b>So geht's weiter:</b>") +
      `<ol style="margin:0 0 14px;padding-left:20px">
      <li><b>Stripe-Konto verbinden</b> (ca. 10 Minuten): Das Konto gehört deinem Studio. Stripe prüft Identität und Bankverbindung, das dauert meist 1 bis 3 Werktage.</li>
      <li><b>Fragebogen ausfüllen</b>, damit wir Branding und Zahlungsarten passend einrichten.</li>
      <li>Wir richten alles ein, testen den Ablauf und schulen dein Team. Dann bekommst du dein Studio Kit mit QR-Code, Aufklebern und Vorlagen.</li></ol>` +
      p(`Über dein Studio-Portal kommst du jederzeit an alles ran: <a href="${esc(loginUrl)}">zum Portal</a>.`),
    cta: "Stripe-Konto jetzt verbinden", ctaUrl: connectUrl,
  }),

  kaufBezahlt: (s, { betragCent, rechnungUrl }) => mk("Zahlung erhalten. Danke!", {
    preheader: "Deine Zahlung für das Tattoofin Setup ist eingegangen.",
    title: "Zahlung erhalten ✅",
    body: hallo(s) + p(`wir haben deine Zahlung über <b>${euro(betragCent)}</b> erhalten. Es gibt keine monatliche Grundgebühr und keine Provision. Die Betreuung bleibt kostenlos.`) +
      (rechnungUrl ? p(`Deine Rechnung: <a href="${esc(rechnungUrl)}">ansehen / herunterladen</a>`) : "") +
      box(`<b>Zufriedenheitsgarantie:</b> ${CFG.garantieTage} Tage ab Go-live. Passt es nicht, bekommst du dein Geld zurück.`),
  }),

  rechnungVersendet: (s, { betragCent, rechnungUrl, faellig }) => mk("Deine Rechnung für das Tattoofin Setup", {
    preheader: `Rechnung über ${euro(betragCent)}, fällig am ${datum(faellig)}.`,
    title: "Deine Rechnung ist da",
    body: hallo(s) + p(`hier ist deine Rechnung über <b>${euro(betragCent)}</b> (inkl. USt.), zahlbar bis <b>${datum(faellig)}</b>. Du kannst per Überweisung oder direkt online bezahlen.`) +
      p("Mit der Einrichtung fangen wir trotzdem schon an, damit keine Zeit verloren geht."),
    cta: "Rechnung ansehen & bezahlen", ctaUrl: rechnungUrl,
  }),

  connectErinnerung: (s, { connectUrl }) => mk("Noch ein Schritt: Stripe-Konto verbinden", {
    preheader: "Ohne verbundenes Konto können wir Tattoofin nicht für dich freischalten.",
    title: "Fast startklar: Stripe-Konto verbinden",
    body: hallo(s) + p("dein Tattoofin-Vertrag steht, aber das Stripe-Konto deines Studios ist noch nicht fertig eingerichtet. Ohne Konto können noch keine Zahlungen laufen.") +
      p("Das dauert ca. 10 Minuten. Halte Ausweis, Steuernummer bzw. USt-IdNr. und die Bankverbindung des Studios bereit. Wenn du Hilfe brauchst, machen wir es gern gemeinsam am Telefon."),
    cta: "Stripe-Konto verbinden", ctaUrl: connectUrl,
  }),

  kontoFreigegeben: (s) => mk("Stripe hat dein Konto freigegeben ✅", {
    preheader: "Jetzt richten wir Zahlungsarten und Branding ein.",
    title: "Dein Stripe-Konto ist freigegeben",
    body: hallo(s) + p("gute Nachrichten: Stripe hat das Konto deines Studios geprüft und freigegeben. Wir richten jetzt Zahlungsarten, Branding und den Ablauf ein und melden uns für Test und Teamschulung."),
  }),

  login: (s, { url }) => mk("Dein Login-Link für das Tattoofin-Portal", {
    preheader: "Einfach klicken, kein Passwort nötig.",
    title: "Dein Login-Link",
    body: hallo(s) + p("hier ist dein persönlicher Link zum Studio-Portal. Er ist 60 Minuten gültig und funktioniert nur für dich. Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren."),
    cta: "Jetzt einloggen", ctaUrl: url,
  }),

  fragebogen: (s) => mk("Fragebogen erhalten. Wir legen los!", {
    preheader: "Danke! Jetzt richten wir Tattoofin für dein Studio ein.",
    title: "Fragebogen erhalten 👍",
    body: hallo(s) + p("danke für deine Angaben! Wir richten jetzt Zahlungsarten, Branding und deinen QR-Code ein. Danach machen wir eine Testzahlung mit dir und eine kurze Schulung fürs Team (ca. 30 Minuten)."),
  }),

  live: (s) => mk("🚀 Tattoofin ist live!", {
    preheader: "Ab jetzt können deine Kunden flexibel bezahlen.",
    title: "Tattoofin ist live in deinem Studio 🚀",
    body: hallo(s) + p("ab sofort kannst du im Portal Zahlungslinks erstellen und deinen Kunden zusätzliche Zahlungsoptionen anbieten, je nach Freigabe auch Ratenzahlung.") + rows([
      ["Zahlungslink erstellen", `<a href="${CFG.siteUrl}/portal.html#anfordern">im Portal</a> (Betrag, Kunde, Projekt, fertig)`],
      ["Deine Zahlseite mit QR", `<a href="${CFG.siteUrl}/zahlen.html?s=${esc(s.slug)}">${CFG.siteUrl}/zahlen.html?s=${esc(s.slug)}</a>`],
      ["Studio Kit", "Fensteraufkleber, Flyer, Aufsteller und Social-Vorlagen im Portal unter „Studio Kit“"],
      [s.modell === "kauf" ? "Zufriedenheitsgarantie" : "Abrechnung", s.modell === "kauf" ? `bis ${datum(new Date(Date.now() + CFG.garantieTage * 864e5).toISOString())}` : `${CFG.provisionProzent} % werden automatisch einbehalten, die Rechnung kommt einmal im Monat`],
    ]) + box("Wichtig fürs Team: keine Raten oder Zinsen versprechen. Einfach sagen: „Du kannst beim Bezahlen schauen, welche Zahlungsoptionen dir angeboten werden.“"),
    cta: "Zum Studio-Portal", ctaUrl: `${CFG.siteUrl}/portal.html`,
  }),

  zahlungEingegangen: (s, z) => mk(`💸 Zahlung eingegangen: ${euro(z.betragCent)} von ${z.kunde || "Kunde"}`, {
    preheader: `${z.beschreibung || "Tattoo-Projekt"} · ${z.zahlartText || ""}`,
    title: `Zahlung eingegangen: ${euro(z.betragCent)}`,
    body: rows([
      ["Kunde", esc(z.kunde)], ["Projekt", esc(z.beschreibung)], ["Betrag", euro(z.betragCent)],
      ["Zahlungsart", esc(z.zahlartText || z.zahlart || "")],
      ["Tattoofin-Provision", s.modell === "provision" ? euro(z.gebuehrBruttoCent) + " inkl. USt. (automatisch einbehalten)" : ""],
    ]) + p("Die Auszahlung auf dein Konto übernimmt Stripe nach deinem Auszahlungsplan. Gebühren des Zahlungsanbieters siehst du im Stripe-Dashboard."),
    cta: "Im Portal ansehen", ctaUrl: `${CFG.siteUrl}/portal.html#zahlungen`,
  }),

  zahlungKunde: (s, z) => mk(`Danke für deine Zahlung bei ${s.firma}`, {
    preheader: `${euro(z.betragCent)} für ${z.beschreibung || "dein Tattoo-Projekt"}`,
    title: `Danke, ${esc(z.kunde || "")}! Deine Zahlung ist da.`,
    body: p(`${esc(s.firma)} hat deine Zahlung über <b>${euro(z.betragCent)}</b> für <b>${esc(z.beschreibung || "dein Tattoo-Projekt")}</b> erhalten.`) +
      p("Den Beleg des Zahlungsanbieters bekommst du separat. Bei Fragen zu Termin oder Projekt meld dich direkt beim Studio.") +
      (z.zahlart === "klarna" ? p("Du hast über Klarna bezahlt. Alle Fragen zu Raten oder Fälligkeiten klärst du direkt mit Klarna.") : ""),
    footerNote: `Diese E-Mail wurde im Auftrag von ${esc(s.firma)} über Tattoofin versendet.`,
  }),

  monatsabrechnung: (s, ab, { rechnungUrl }) => mk(`Deine Tattoofin-Abrechnung ${monatName(ab.monat)}`, {
    preheader: ab.provisionNettoCent ? `${ab.positionen.length} Zahlungen · Umsatz ${euro(ab.umsatzCent)}` : "Diesen Monat fällt keine Provision an.",
    title: `Abrechnung ${monatName(ab.monat)}`,
    body: hallo(s) + (ab.provisionNettoCent
      ? p(`im ${monatName(ab.monat)} haben deine Kunden <b>${ab.positionen.length} Zahlung${ab.positionen.length === 1 ? "" : "en"}</b> über Tattoofin geleistet, zusammen <b>${euro(ab.umsatzCent)}</b>. 🖤`) +
        rows([
          ["Provision " + CFG.provisionProzent + " % (netto)", euro(ab.provisionNettoCent)],
          ["USt. " + CFG.ustProzent + " %", euro(ab.provisionBruttoCent - ab.provisionNettoCent)],
          ["Gesamt (bereits einbehalten)", "<b>" + euro(ab.provisionBruttoCent) + "</b>"],
        ]) + p("Die Provision wurde bei jeder Zahlung automatisch einbehalten. Du musst nichts überweisen. Die Rechnung ist für deine Buchhaltung.")
      : p(`im ${monatName(ab.monat)} liefen keine Zahlungen über Tattoofin. Es fällt keine Provision an.`)),
    cta: ab.provisionNettoCent && rechnungUrl ? "Rechnung ansehen" : "Zum Portal", ctaUrl: ab.provisionNettoCent && rechnungUrl ? rechnungUrl : `${CFG.siteUrl}/portal.html#abrechnungen`,
  }),

  zahlungFehlgeschlagen: (s, { betragCent, rechnungUrl }) => mk("Zahlung fehlgeschlagen: bitte kurz prüfen", {
    preheader: "Wir konnten den Betrag nicht einziehen.",
    title: "Die Zahlung hat nicht geklappt",
    body: hallo(s) + p(`leider konnten wir <b>${euro(betragCent)}</b> nicht einziehen. Bitte bezahl die Rechnung über den Button. Bei Fragen melde dich gern.`),
    cta: "Jetzt bezahlen", ctaUrl: rechnungUrl || `${CFG.siteUrl}/portal.html`,
  }),

  kuendigung: (s, { zum }) => mk("Deine Kündigung ist eingegangen", {
    preheader: `Tattoofin läuft noch bis ${datum(zum)}.`,
    title: "Schade, aber verstanden. Kündigung bestätigt.",
    body: hallo(s) + p(`wir bestätigen deine Kündigung zum <b>${datum(zum)}</b>. Bis dahin funktionieren Zahlungslinks und Zahlseite ganz normal.`) +
      box("Dein Stripe-Konto gehört deinem Studio und bleibt bestehen. Nach Vertragsende trennen wir nur die Verbindung zu Tattoofin. Bitte entferne dann Aufkleber und QR-Codes, die auf die Tattoofin-Zahlseite zeigen.") +
      p("Falls du es dir anders überlegst: Im Portal kannst du die Kündigung bis zum Stichtag mit einem Klick zurücknehmen."),
    cta: "Kündigung zurücknehmen", ctaUrl: `${CFG.siteUrl}/portal.html#vertrag`,
  }),

  kuendigungZurueck: (s) => mk("Kündigung zurückgenommen: schön, dass du bleibst!", {
    title: "Tattoofin bleibt bei euch 🖤", preheader: "Alles läuft weiter wie bisher.",
    body: hallo(s) + p("deine Kündigung ist zurückgenommen. Es läuft alles weiter wie bisher, du musst nichts tun."),
  }),

  vertragsendeBald: (s, { zum }) => mk("In 7 Tagen endet Tattoofin", {
    title: "Dein Vertrag endet bald", preheader: `Vertragsende am ${datum(zum)}`,
    body: hallo(s) + p(`am <b>${datum(zum)}</b> endet dein Tattoofin-Vertrag. Danach funktionieren Zahlungslinks und die Tattoofin-Zahlseite nicht mehr. Bitte entferne bis dahin QR-Codes und Aufkleber, die darauf verweisen.`) +
      p("Dein Stripe-Konto bleibt dir erhalten. Danke, dass ihr Tattoofin genutzt habt. Die Tür bleibt offen. 🖤"),
  }),

  vertragsende: (s) => mk("Dein Tattoofin-Vertrag ist beendet", {
    title: "Tattoofin ist beendet", preheader: "Danke für die Zeit mit dir.",
    body: hallo(s) + p("dein Vertrag ist heute ausgelaufen. Die Verbindung zu deinem Stripe-Konto ist getrennt, das Konto selbst gehört weiter deinem Studio. Deine Daten löschen wir gemäß Auftragsverarbeitungsvertrag, soweit keine Aufbewahrungspflichten bestehen."),
  }),

  garantieErstattung: (s, { betragCent }) => mk("Erstattung veranlasst (Zufriedenheitsgarantie)", {
    title: "Dein Geld ist auf dem Weg zurück", preheader: `${euro(betragCent)} werden erstattet.`,
    body: hallo(s) + p(`wie versprochen erstatten wir dir <b>${euro(betragCent)}</b> im Rahmen unserer Zufriedenheitsgarantie. Je nach Zahlungsart ist das Geld in 5 bis 10 Werktagen auf deinem Konto.`) +
      p("Danke, dass du Tattoofin ausprobiert hast. Wenn du magst, sag uns kurz, was wir besser machen können."),
  }),

  anmeldungAbgebrochen: (s, { resumeUrl }) => mk("Fast geschafft: dein Abschluss ist noch offen", {
    title: "Du warst fast fertig 🙂", preheader: "Mit einem Klick weitermachen.",
    body: hallo(s) + p("du hast gestern angefangen, Tattoofin für dein Studio abzuschließen, aber die Zahlung ist noch offen.") +
      p(`Falls etwas unklar war: Antworte einfach auf diese E-Mail. Und falls du lieber ohne Einrichtungsgebühr startest: Im Provisionsmodell zahlst du nur ${CFG.provisionProzent} % von Zahlungen, die über Tattoofin laufen.`),
    cta: "Abschluss fortsetzen", ctaUrl: resumeUrl,
  }),

  // ---- intern ----
  intern: (titel, s, details = {}) => mk(`[Tattoofin] ${titel}: ${s?.firma || ""}`, {
    title: esc(titel),
    body: rows([
      ["Studio", esc(s?.firma)], ["Inhaber", esc(s?.inhaber)], ["E-Mail", esc(s?.email)], ["Telefon", esc(s?.telefon)],
      ["Modell", esc(s?.modell)], ["Status", esc(s?.status)], ["Stripe-Konto", esc(s?.stripe?.accountId)],
      ...Object.entries(details).map(([k, v]) => [k, esc(typeof v === "object" ? JSON.stringify(v) : v)]),
    ]),
    cta: "Admin öffnen", ctaUrl: `${CFG.siteUrl}/admin.html#${s?.id || ""}`,
  }),
};
