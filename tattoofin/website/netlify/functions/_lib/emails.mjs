// Alle automatischen E-Mails (an Studios, Endkunden und intern). Jede Funktion liefert { subject, html, text }.
import { CFG, provisionSatz, paketVon } from "./config.mjs";
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
const modellText = (s) => {
  const p = paketVon(s);
  if (p.id === "geschenk" && s.sonderkondition) return `${s.sonderkondition}: keine Einrichtungsgebühr, keine Grundgebühr, keine Provision. Du zahlst nur die normalen Zahlungsgebühren von Stripe (bzw. Klarna) direkt an Stripe, Tattoofin verdient nichts daran.`;
  if (p.id === "geschenk") return "Geschenk: keine Einrichtungsgebühr, keine Grundgebühr, keine Provision. Du zahlst nur die normalen Gebühren von Stripe (bzw. Klarna) direkt an Stripe, Tattoofin verdient nichts daran.";
  if (p.id === "monatlich") return `Paket Monatlich: ${euro(CFG.monatNetto)} netto im Monat (${euro(brutto(CFG.monatNetto))} inkl. USt.), danach nur die Zahlungsgebühren, die du direkt an Stripe zahlst. Keine Tattoofin-Provision, monatlich kündbar. Inklusive QR-Aufsteller aus Holz (Wert 29 €) und digitalem QR-Code.`;
  if (p.id === "einmal" && s.paket === "einmal") return `Paket Einmalzahlung: ${euro(s.preisNetto)} netto einmalig (${euro(brutto(s.preisNetto))} inkl. USt.), danach keine Tattoofin-Gebühr mehr, nur die Zahlungsgebühren, die du direkt an Stripe zahlst. Inklusive QR-Aufsteller aus Holz (Wert 29 €) und digitalem QR-Code.`;
  if (s.modell === "kauf") return `Kauf: Einrichtung ${euro(s.preisNetto)} netto einmalig (${euro(brutto(s.preisNetto))} brutto), keine monatliche Grundgebühr, keine Provision`;
  return `Paket Risikofrei: ${CFG.provisionProzent} % vom Zahlbetrag jeder Zahlung über Tattoofin, alles inklusive (Zahlungsgebühren und USt.), keine Einrichtungs- und keine Grundgebühr, monatlich kündbar. Digitaler QR-Code inklusive.`;
};
// Pflichthinweis bei Werbung mit Raten (UWG-Anhang Nr. 23e): deutlich lesbar, fett, volle Textfarbe, mindestens Fließtextgröße
const RATEN_HINWEIS_HTML = '<span style="color:#1f3d5c;font-size:15px;line-height:1.5">*Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin. <b style="font-size:16px">Achtung! Kreditaufnahme kostet Geld.</b></span>';
const istProv = (z) => z.abwicklung === "plattform" || z.abwicklung === "direkt";
const wert = (v) => (typeof v === "string" && /^https?:\/\/\S+$/.test(v) ? `<a href="${esc(v)}">${esc(v)}</a>` : esc(typeof v === "object" ? JSON.stringify(v) : v));
const mk = (subject, l) => ({ subject, ...layout(l) });

export const mails = {
  // Einrichtungs-Anleitung (PDF auf tattoofin.de) für neue Studios
  anleitung: ({ firma }) => mk(`So richtest du Tattoofin ein – Anleitung für ${firma}`, {
    preheader: "Schritt für Schritt: Einladung annehmen, Zahlungskonto verbinden, erste Zahlung anfordern.",
    title: "Deine Anleitung 📋",
    body: p("Hey,") + p(`damit der Start für <b>${esc(firma)}</b> ganz einfach wird, hier die Anleitung Schritt für Schritt – in ca. 20 Minuten bist du startklar:`) +
      `<ol style="margin:0 0 14px;padding-left:20px"><li><b>Einladung annehmen</b> (Link aus der Einladungs-Mail, mit genau dieser E-Mail-Adresse)</li><li><b>Zahlungskonto bei Stripe verbinden</b> – Ausweis, IBAN und Steuernummer bereitlegen</li><li><b>Fragebogen</b> im Studio-Portal ausfüllen</li><li><b>Erste Zahlung anfordern</b> und den Link per WhatsApp schicken</li><li><b>QR-Code</b> für die Theke ausdrucken</li></ol>` +
      p("Alle Details mit Bildschirm-Erklärungen stehen in der Anleitung (PDF). Bei Fragen schreib uns einfach per WhatsApp an 0162 4502375."),
    cta: "Anleitung öffnen (PDF)", ctaUrl: `${CFG.siteUrl}/einrichtung-anleitung.pdf`,
  }),

  // Persönliche Einladung (Geschenk): Link zur Anmeldung ohne Einrichtung und ohne Provision
  // Mit bezeichnung (Sonderkondition, z. B. „Partner – nur Zahlungsgebühren“): gleiche Abwicklung, Text ohne „Geschenk“
  geschenkEinladung: ({ firma, link, bezeichnung }) => bezeichnung ? mk(`Deine Einladung zu Tattoofin – keine Provision, nur Zahlungsgebühren`, {
    preheader: "Tattoofin für dein Studio: keine Provision, du zahlst nur die Zahlungsgebühren.",
    title: "Du bist eingeladen",
    body: p("Hey,") + p(`für <b>${esc(firma)}</b> haben wir bei Tattoofin eine eigene Kondition eingerichtet: <b>${esc(bezeichnung)}</b>.`) +
      p("Das heißt ganz einfach: Tattoofin nimmt <b>keine Provision</b>. Du zahlst <b>nur die Zahlungsgebühren</b>, die Stripe bzw. Klarna für jede Zahlung verlangt. Die gehen direkt an Stripe, Tattoofin verdient daran nichts.") + rows([
      ["Einrichtung", "0 €"], ["Grundgebühr", "0 €"], ["Provision", "keine (0 %)"],
      ["Du zahlst nur", "die normalen Zahlungsgebühren von Stripe bzw. Klarna, direkt an Stripe"], ["Dein Geld", "landet direkt auf dem Konto deines Studios"],
    ]) + p("Damit bekommst du: Zahlungslinks per WhatsApp, eine QR-Zahlseite für die Theke, Anzahlungen mit deinen Bedingungen und Ratenzahlung über Klarna* für deine Kunden.") +
      p("<b>So geht's:</b> Knopf unten drücken, Studio-Daten eintragen, Vertrag bestätigen. Danach legst du das Zahlungskonto deines Studios bei Stripe an (ca. 10 Minuten, Ausweis und Bankverbindung bereithalten). Bitte nutze dafür genau diese E-Mail-Adresse. Den Rest richten wir mit dir ein.") +
      p(RATEN_HINWEIS_HTML),
    cta: "Einladung annehmen", ctaUrl: link,
  }) : mk(`Deine Einladung zu Tattoofin – für ${firma} geschenkt`, {
    preheader: "Tattoofin für dein Studio: ohne Einrichtungsgebühr und ohne Provision.",
    title: "Du bist eingeladen 🎁",
    body: p("Hey,") + p(`wir schenken <b>${esc(firma)}</b> Tattoofin: Zahlungslinks per WhatsApp, QR-Zahlseite an der Theke, Anzahlungen mit deinen Bedingungen und Ratenzahlung über Klarna* für deine Kunden.`) + rows([
      ["Einrichtung", "0 €"], ["Grundgebühr", "0 €"], ["Provision", "0 % – Tattoofin verdient nichts daran"],
      ["Du zahlst nur", "die normalen Gebühren von Stripe bzw. Klarna, direkt an Stripe"], ["Dein Geld", "landet direkt auf dem Konto deines Studios"],
    ]) + p("So geht's: Link öffnen, Studio-Daten eintragen, Vertrag bestätigen, dann das Zahlungskonto deines Studios verbinden (ca. 10 Minuten, Ausweis und Bankverbindung bereithalten). Wir richten den Rest mit dir ein.") +
      p(RATEN_HINWEIS_HTML),
    cta: "Einladung annehmen", ctaUrl: link,
  }),

  // 1) direkt nach dem Online-Abschluss
  anmeldung: (s, { loginUrl, connectUrl }) => mk(`Willkommen bei Tattoofin, ${s.firma}`, {
    preheader: "Dein Vertrag ist abgeschlossen. Jetzt das Stripe-Konto deines Studios verbinden.",
    title: "Willkommen bei Tattoofin! 🎉",
    body: hallo(s) + p("schön, dass du dabei bist. Hier ist die Zusammenfassung deines Vertrags:") + rows([
      ["Studio", esc(s.firma)], ["Paket", esc(modellText(s))],
      ["Vertrag / AVV", `Version ${esc(s.vertrag.version)}, akzeptiert am ${datum(s.vertrag.akzeptiertAm)} von ${esc(s.vertrag.name)}`],
      ["Vertragstext", `<a href="${CFG.siteUrl}/vertrag.html">Vertrag</a> · <a href="${CFG.siteUrl}/avv.html">AVV</a>`],
    ]) + p("<b>So geht's weiter:</b>") +
      `<ol style="margin:0 0 14px;padding-left:20px">
      <li><b>Stripe-Konto verbinden</b> (ca. 10 Minuten): ${s.modell === "provision" ? "Über dieses Konto zahlt Stripe dir automatisch " + (100 - provisionSatz(s)) + " % jeder Kundenzahlung auf das Bankkonto deines Studios aus." : "Das Konto gehört deinem Studio."} Stripe prüft Identität und Bankverbindung, das dauert meist 1 bis 3 Werktage.</li>
      <li><b>Fragebogen ausfüllen</b>, damit wir Branding und Zahlungsarten passend einrichten.</li>
      <li>Wir richten alles ein, testen den Ablauf und schulen dein Team. Dann bekommst du dein Studio Kit mit QR-Code, Aufklebern und Vorlagen.</li></ol>` +
      p(`Über dein Studio-Portal kommst du jederzeit an alles ran: <a href="${esc(loginUrl)}">zum Portal</a>.`),
    cta: "Stripe-Konto jetzt verbinden", ctaUrl: connectUrl,
  }),

  kaufBezahlt: (s, { betragCent, rechnungUrl }) => mk("Zahlung erhalten. Danke!", {
    preheader: s.paket === "einmal" ? "Deine Einmalzahlung für Tattoofin ist eingegangen." : "Deine Zahlung für das Tattoofin Setup ist eingegangen.",
    title: "Zahlung erhalten ✅",
    body: hallo(s) + p(`wir haben deine Zahlung über <b>${euro(betragCent)}</b> erhalten. ${s.paket === "einmal" ? "Ab jetzt gibt es keine Tattoofin-Gebühr mehr, du zahlst nur noch die Zahlungsgebühren direkt an Stripe. Dein QR-Aufsteller aus Holz (Wert 29 €) ist inklusive, wir schicken ihn dir nach dem Go-live." : "Es gibt keine monatliche Grundgebühr und keine Provision."} Die Betreuung bleibt kostenlos.`) +
      (rechnungUrl ? p(`Deine Rechnung: <a href="${esc(rechnungUrl)}">ansehen / herunterladen</a>`) : "") +
      box(`<b>Zufriedenheitsgarantie:</b> ${CFG.garantieTage} Tage ab Go-live. Passt es nicht, bekommst du dein Geld zurück.`),
  }),

  aboGestartet: (s, { betragCent, rechnungUrl }) => mk("Dein Paket Monatlich läuft. Danke!", {
    preheader: "Deine erste Monatszahlung ist eingegangen.",
    title: "Paket Monatlich gestartet ✅",
    body: hallo(s) + p(`danke! Deine erste Monatszahlung über <b>${euro(betragCent)}</b> (inkl. USt.) ist da. Ab jetzt zahlst du ${euro(CFG.monatNetto)} netto im Monat und sonst nur die Zahlungsgebühren deiner Kunden-Zahlungen, direkt an Stripe. Tattoofin nimmt keine Provision.`) +
      (rechnungUrl ? p(`Deine Rechnung: <a href="${esc(rechnungUrl)}">ansehen / herunterladen</a>. Jeden Monat bekommst du automatisch eine neue Rechnung per E-Mail.`) : "") +
      box("<b>Dein QR-Aufsteller aus Holz</b> (Wert 29 €) ist inklusive. Wir schicken ihn dir nach dem Go-live an die Studio-Adresse.") +
      p("Kündigen kannst du jederzeit zum Ende des laufenden Monats, mit einem Klick im Studio-Portal."),
  }),

  rechnungVersendet: (s, { betragCent, rechnungUrl, faellig }) => mk("Deine Rechnung für das Tattoofin Setup", {
    preheader: `Rechnung über ${euro(betragCent)}, fällig am ${datum(faellig)}.`,
    title: "Deine Rechnung ist da",
    body: hallo(s) + p(`hier ist deine Rechnung über <b>${euro(betragCent)}</b> (inkl. USt.), zahlbar bis <b>${datum(faellig)}</b>. Du kannst per Überweisung oder direkt online bezahlen.`) +
      p("Sobald die Zahlung eingegangen ist, starten wir mit der Einrichtung und melden uns bei dir."),
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

  login: (s, { url, stunden = 24 }) => mk(`Dein Login-Link für das Tattoofin-Portal (${s.firma})`, {
    preheader: "Einfach klicken, kein Passwort nötig.",
    title: "Dein Login-Link",
    body: hallo(s) + p(`hier ist dein persönlicher Link zum Studio-Portal. Er ist ${stunden} Stunden gültig, funktioniert einmal und nur für dich. Danach bleibst du 30 Tage angemeldet. Ist er abgelaufen, kannst du auf der Seite mit einem Klick einen neuen anfordern. Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.`),
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
    body: hallo(s) + p("ab sofort kannst du im Portal Zahlungslinks erstellen und deinen Kunden zusätzliche Zahlungsoptionen anbieten, je nach Freigabe durch den Anbieter auch Ratenzahlung*.") + rows([
      ["Zahlungslink erstellen", `<a href="${CFG.siteUrl}/app.html#link">in deiner Tattoofin-App</a> (Betrag, Kunde, Projekt, fertig)`],
      ["Deine Zahlseite mit QR", `<a href="${CFG.siteUrl}/zahlen/${esc(s.slug)}">${CFG.siteUrl}/zahlen/${esc(s.slug)}</a>`],
      ["Studio Kit", "Fensteraufkleber, Flyer, Aufsteller und Social-Vorlagen im Portal unter „Studio Kit“"],
      s.zahlart === "geschenk" ? ["Abrechnung", "Keine Tattoofin-Gebühr. Zahlungsgebühren zahlst du direkt an Stripe."] :
      s.paket === "monatlich" ? ["Abrechnung", `${euro(CFG.monatNetto)} netto im Monat, die Rechnung kommt automatisch per E-Mail. Zahlungsgebühren zahlst du direkt an Stripe.`] :
      [s.modell === "kauf" && s.zahlart !== "geschenk" && s.paket !== "monatlich" ? "Geld-zurück-Garantie" : "Abrechnung", s.modell === "kauf" && s.zahlart !== "geschenk" && s.paket !== "monatlich" ? `bis ${datum(new Date(Date.now() + CFG.garantieTage * 864e5).toISOString())}` : `Stripe zahlt dir automatisch ${100 - provisionSatz(s)} % jeder Zahlung aus, die Rechnung über die ${provisionSatz(s)} % kommt einmal im Monat`],
    ]) + box("Wichtig fürs Team: keine Raten oder Zinsen versprechen. Einfach sagen: „Du kannst beim Bezahlen schauen, welche Zahlungsoptionen dir angeboten werden.“"),
    cta: "Zur Tattoofin-App", ctaUrl: `${CFG.siteUrl}/app.html`,
  }),

  zahlungEingegangen: (s, z) => mk(z.art === "gutschein" ? `🎁 Gutschein verkauft: ${euro(z.betragCent)} an ${z.kunde || "Kunde"}` : `💸 Zahlung eingegangen: ${euro(z.betragCent)} von ${z.kunde || "Kunde"}`, {
    preheader: `${z.beschreibung || "Tattoo-Projekt"} · ${z.zahlartText || ""}`,
    title: `Zahlung eingegangen: ${euro(z.betragCent)}`,
    body: rows([
      ["Kunde", esc(z.kunde)], ["Projekt", esc(z.beschreibung)], ["Betrag", euro(z.betragCent)],
      ["Gutschein-Code", z.gutschein?.code ? esc(z.gutschein.code) + (z.gutschein.empfaenger ? " (für " + esc(z.gutschein.empfaenger) + ")" : "") + ", gültig bis " + datum(z.gutschein.gueltigBis) : ""],
      ["Zahlungsart", esc(z.zahlartText || z.zahlart || "")],
      ["Tattoofin " + provisionSatz(s) + " % (alles inklusive)", istProv(z) ? euro(z.gebuehrBruttoCent) : ""],
      ["Auszahlung an dich", istProv(z) ? "<b>" + euro(z.betragCent - z.gebuehrBruttoCent) + "</b>" : ""],
    ]) + p(istProv(z)
      ? "Stripe überweist den Betrag automatisch auf das Bankkonto deines Studios. Weitere Gebühren fallen für dich nicht an: Die Kosten des Zahlungsanbieters sind in den " + provisionSatz(s) + " % enthalten."
      : "Die Auszahlung auf dein Konto übernimmt Stripe nach deinem Auszahlungsplan. Gebühren des Zahlungsanbieters siehst du im Stripe-Dashboard."),
    cta: "In der App ansehen", ctaUrl: `${CFG.siteUrl}/app.html#zahlungen`,
  }),

  leistungBestaetigt: (s, z) => mk(`✍️ Leistungsbestätigung von ${z.leistung?.name || z.kunde || "Kunde"}`, {
    preheader: `${z.beschreibung || "Tattoo-Projekt"} · ${euro(z.betragCent)}`,
    title: "Dein Kunde hat die Sitzung bestätigt",
    body: hallo(s) + p(`<b>${esc(z.leistung?.name || z.kunde || "Dein Kunde")}</b> hat bestätigt, dass die Sitzung (${esc(z.beschreibung || "Tattoo-Projekt")}) am ${datum((z.leistung?.datum || "") + "T12:00:00Z")} stattgefunden hat${z.leistung?.hatFoto ? ", mit Foto" : ""}.`) +
      p("Die Bestätigung liegt in deiner Tattoofin-App bei der Zahlung. Dort kannst du sie jederzeit als PDF speichern, zum Beispiel falls es später eine Rückbuchung gibt."),
    cta: "In der App ansehen", ctaUrl: `${CFG.siteUrl}/app.html#zahlungen`,
  }),

  zahlungKunde: (s, z) => mk(`Danke für deine Zahlung bei ${s.firma}`, {
    preheader: `${euro(z.betragCent)} für ${z.beschreibung || "dein Tattoo-Projekt"}`,
    title: `Danke, ${esc(z.kunde || "")}! Deine Zahlung ist da.`,
    body: p(`${esc(s.firma)} hat deine Zahlung über <b>${euro(z.betragCent)}</b> für <b>${esc(z.beschreibung || "dein Tattoo-Projekt")}</b> erhalten.`) +
      p("Den Beleg des Zahlungsanbieters bekommst du separat. Bei Fragen zu Termin oder Projekt meld dich direkt beim Studio.") +
      (z.zahlart === "klarna" ? p("Du hast über Klarna bezahlt. Alle Fragen zu Raten oder Fälligkeiten klärst du direkt mit Klarna.") : ""),
    footerNote: `Diese E-Mail wurde im Auftrag von ${esc(s.firma)} über Tattoofin versendet.`,
  }),

  // Gutschein an den Käufer (PDF hängt an, Link zur Online-Ansicht als Rückfall)
  gutscheinKaeufer: (s, z, { url }) => {
    const g = z.gutschein || {};
    const adr = [s.strasse, [s.plz, s.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    return mk(`Dein Gutschein von ${s.firma} über ${euro(z.betragCent)}`, {
      preheader: `Code ${g.code} · gültig bis ${datum(g.gueltigBis)}`,
      title: `Dein Gutschein ist da 🎁`,
      body: p(`Hi ${esc((z.kunde || "").split(" ")[0])}, danke für deinen Einkauf! Hier ist dein Tattoo-Gutschein von <b>${esc(s.firma)}</b>${g.empfaenger ? ` für <b>${esc(g.empfaenger)}</b>` : ""}.`) +
        `<div style="border:2px dashed #f5d77a;background:#fff5d6;border-radius:12px;padding:16px 18px;margin:0 0 16px;text-align:center">
<div style="font-size:30px;font-weight:800;color:${navy}">${euro(z.betragCent)}</div>
<div style="color:#5b6370;font-size:13px;margin:4px 0 10px">Tattoo-Gutschein</div>
<div style="font:700 20px/1.3 'Courier New',monospace;letter-spacing:1px;color:${navy}">${esc(g.code)}</div>
${g.nachricht ? `<div style="font-style:italic;color:#5b6370;margin-top:10px">„${esc(g.nachricht)}“</div>` : ""}</div>` +
        rows([["Ausgestellt am", datum(g.ausgestelltAm)], ["Gültig bis", datum(g.gueltigBis)], ["Einlösbar bei", esc(s.firma) + (adr ? "<br>" + esc(adr) : "")]]) +
        p("Den Gutschein zum Ausdrucken oder Weiterschicken findest du als PDF im Anhang. Bitte den Code beim Termin angeben."),
      cta: "Gutschein online ansehen", ctaUrl: url,
      footerNote: `Der Gutschein wurde von ${esc(s.firma)} ausgestellt und über Tattoofin verkauft. Fragen zum Termin klärst du direkt mit dem Studio.`,
    });
  },

  // Info ans Studio: Kunde hat es mit Klarna versucht, Klarna hat (diesmal) nicht zugestimmt
  klarnaAbgelehnt: (s, z) => mk(`Klarna hat bei ${z.kunde || "deinem Kunden"} nicht zugestimmt`, {
    preheader: `${euro(z.betragCent)} · ${z.beschreibung || "Tattoo-Projekt"}`,
    title: "Klarna hat diesmal nicht zugestimmt",
    body: hallo(s) + p(`<b>${esc(z.kunde || "Dein Kunde")}</b> wollte ${euro(z.betragCent)} (${esc(z.beschreibung || "Tattoo-Projekt")}) mit Klarna bezahlen. Klarna hat die Zahlung nicht bestätigt. Das entscheidet allein Klarna, die Gründe nennt Klarna weder uns noch dir.`) +
      p("Dein Kunde sieht auf der Zahlseite jetzt diese Möglichkeiten: noch einmal mit Klarna versuchen, mit Karte zahlen" + (s.ausweichAnzahlung?.an ? ` oder eine Anzahlung von ${s.ausweichAnzahlung.prozent} % per Karte und den Rest direkt bei dir im Studio` : "") + ".") +
      p("Tipp: Frag kurz nach, ob alles geklappt hat. Es ist noch nichts bezahlt."),
    cta: "Zahlung in der App ansehen", ctaUrl: `${CFG.siteUrl}/app.html#zahlung/${z.id}`,
  }),

  rueckbuchung: (s, z) => {
    const plattform = istProv(z);
    const direkt = z.abwicklung === "direkt";
    const bis = z.rueckbuchung?.faelligBis ? `, spätestens bis <b>${datum(z.rueckbuchung.faelligBis)}</b>` : "";
    const belege = "unterschriebene Einverständniserklärung, Terminbestätigung bzw. akzeptierte Anzahlungsbedingungen, Chatverlauf, Foto vom fertigen Tattoo (ohne Gesicht), Rechnung";
    return mk(`⚠️ Rückbuchung: ${euro(z.betragCent)} von ${z.kunde || "Kunde"}`, {
      preheader: plattform ? "Bitte schick uns die Belege." : "Bitte Belege bei Stripe einreichen.",
      title: z.rueckbuchung?.anfrage ? "Ein Kunde hat eine Zahlung reklamiert" : "Ein Kunde hat eine Zahlung zurückgebucht",
      body: hallo(s) + p(`für die Zahlung von <b>${esc(z.kunde || "Kunde")}</b> über <b>${euro(z.betragCent)}</b> (${esc(z.beschreibung || "Tattoo-Projekt")}${z.art === "anzahlung" ? ", Anzahlung" : ""}) wurde eine Rückbuchung bzw. Reklamation eröffnet. Grund laut Bank/Anbieter: <b>${esc(z.rueckbuchung?.grund || "nicht angegeben")}</b>.`) +
        (plattform
          ? box(`<b>Was du jetzt tun solltest:</b> Antworte auf diese E-Mail oder schick uns per WhatsApp die Belege${bis}: ${belege}. Wir reichen sie für dich bei Stripe ein.`) +
            p(direkt
              ? "Solange der Fall offen ist, bucht Stripe den streitigen Betrag von deinem Studio-Konto ab. Wird zu deinen Gunsten entschieden, bekommst du ihn zurück. Geht der Fall verloren, verlangen wir für diese Zahlung keine Provision."
              : `Solange der Fall offen ist, holt Stripe den Betrag abzüglich der Tattoofin-Provision plus ${euro(CFG.ruecklastGebuehrCent)} Rückbuchungsgebühr von deinem Studio-Konto zurück. Wird zu deinen Gunsten entschieden, bekommst du alles zurück. Geht der Fall verloren, verlangen wir für diese Zahlung keine Provision.`)
          : box(`<b>Was du jetzt tun solltest:</b> Im Stripe-Dashboard unter „Zahlungen → Angefochten“ Belege einreichen${bis}: ${belege}.`)),
      cta: plattform ? "Belege per WhatsApp schicken" : "Zum Stripe-Dashboard",
      ctaUrl: plattform ? `https://wa.me/${CFG.whatsapp}` : "https://dashboard.stripe.com/disputes",
    });
  },

  rueckbuchungEntschieden: (s, z) => {
    const st = z.rueckbuchung?.status;
    const gewonnen = st === "won" || st === "warning_closed";
    return mk(gewonnen ? `✅ Rückbuchung erledigt: ${euro(z.betragCent)} von ${z.kunde || "Kunde"}` : `Rückbuchung entschieden: ${euro(z.betragCent)} von ${z.kunde || "Kunde"}`, {
      title: gewonnen ? "Der Fall ist zu deinen Gunsten erledigt" : st === "lost" ? "Die Rückbuchung ging leider verloren" : "Der Rückbuchungsfall ist abgeschlossen",
      body: hallo(s) + (gewonnen
        ? p(`die Reklamation zur Zahlung von <b>${esc(z.kunde || "Kunde")}</b> über <b>${euro(z.betragCent)}</b> ist erledigt. ${z.rueckbuchung?.zurueckgeholtCent ? `Die zurückgeholten <b>${euro(z.rueckbuchung.zurueckgeholtCent)}</b> überweist Stripe wieder auf dein Studio-Konto.` : "Das Geld bleibt bei dir."}`)
        : st === "lost"
          ? p(`die Bank bzw. der Zahlungsanbieter hat die Rückbuchung zur Zahlung von <b>${esc(z.kunde || "Kunde")}</b> über <b>${euro(z.betragCent)}</b> zugunsten des Kunden entschieden. Der Betrag geht an den Kunden zurück.`) +
            (istProv(z) ? p("Für diese Zahlung verlangen wir keine Provision. Tipp für die Zukunft: Anzahlungsbedingungen und Einverständniserklärung immer unterschreiben bzw. bestätigen lassen, das sind die stärksten Belege.") : "")
          : p(`der Rückbuchungsfall zur Zahlung von <b>${esc(z.kunde || "Kunde")}</b> ist abgeschlossen (Status: ${esc(st || "")}).`)),
      cta: "In der App ansehen", ctaUrl: `${CFG.siteUrl}/app.html#zahlungen`,
    });
  },

  erstattung: (s, z, { betragCent, provisionZurueckCent }) => mk(`Erstattung an ${z.kunde || "Kunde"}: ${euro(betragCent)}`, {
    title: "Erstattung ausgelöst",
    body: hallo(s) + p(`du hast <b>${euro(betragCent)}</b> an <b>${esc(z.kunde || "Kunde")}</b> erstattet (${esc(z.beschreibung || "Tattoo-Projekt")}). Der Kunde bekommt das Geld über die ursprüngliche Zahlungsart zurück, meist innerhalb von 5 bis 10 Werktagen.`) +
      p(`Der Betrag wird von deinem Studio-Konto bei Stripe zurückgeholt. Die Tattoofin-Provision bekommst du anteilig zurück (${provisionZurueckCent != null ? euro(provisionZurueckCent) : "wird gleich verrechnet"}), abzüglich der Gebühr des Zahlungsanbieters, die bei Erstattungen nicht zurückkommt.`),
    cta: "In der App ansehen", ctaUrl: `${CFG.siteUrl}/app.html#zahlungen`,
  }),

  monatsabrechnung: (s, ab, { rechnungUrl }) => mk(`Deine Tattoofin-Abrechnung ${monatName(ab.monat)}`, {
    preheader: ab.provisionBruttoCent ? `${ab.positionen.length} Zahlungen · ${euro(ab.umsatzCent)} · Auszahlung ${euro(ab.auszahlungCent ?? ab.umsatzCent - ab.provisionBruttoCent)}` : "Diesen Monat fällt keine Provision an.",
    title: `Abrechnung ${monatName(ab.monat)}`,
    body: hallo(s) + (ab.provisionBruttoCent
      ? p(`im ${monatName(ab.monat)} haben deine Kunden <b>${ab.positionen.length} Zahlung${ab.positionen.length === 1 ? "" : "en"}</b> über Tattoofin geleistet, zusammen <b>${euro(ab.umsatzCent)}</b>. 🖤`) +
        rows([
          ["Zahlungen deiner Kunden", euro(ab.umsatzCent)],
          ["Tattoofin " + provisionSatz(s) + " % (alles inklusive)", euro(ab.provisionBruttoCent)],
          ["davon netto", euro(ab.provisionNettoCent)],
          ["davon USt. " + CFG.ustProzent + " %", euro(ab.provisionBruttoCent - ab.provisionNettoCent)],
          ["An dich ausgezahlt", "<b>" + euro(ab.auszahlungCent ?? ab.umsatzCent - ab.provisionBruttoCent) + "</b>"],
        ]) + p(`Die Provision wurde bei jeder Zahlung automatisch einbehalten, Stripe hat dir den Rest ausgezahlt. Du musst nichts überweisen. In den ${provisionSatz(s)} % sind die Gebühren der Zahlungsanbieter schon enthalten. Die Rechnung ist für deine Buchhaltung (Vorsteuer).`)
      : p(`im ${monatName(ab.monat)} liefen keine Zahlungen über Tattoofin. Es fällt keine Provision an.`)),
    cta: ab.provisionBruttoCent && rechnungUrl ? "Rechnung ansehen" : "Zum Portal", ctaUrl: ab.provisionBruttoCent && rechnungUrl ? rechnungUrl : `${CFG.siteUrl}/portal.html#abrechnungen`,
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
      (s.paket === "monatlich" ? p("Dein Monatsbetrag wird ab dann nicht mehr abgebucht. Bereits gezahlte Monate werden nicht anteilig erstattet.") : "") +
      box(s.modell === "provision" ? "Offene Auszahlungen bekommst du auch nach dem Ende, abzüglich späterer Rückbuchungen. Bitte entferne nach dem Vertragsende Aufkleber und QR-Codes, die auf die Tattoofin-Zahlseite zeigen." : "Dein Stripe-Konto gehört deinem Studio und bleibt bestehen. Nach Vertragsende trennen wir nur die Verbindung zu Tattoofin. Bitte entferne dann Aufkleber und QR-Codes, die auf die Tattoofin-Zahlseite zeigen.") +
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
      p(`Falls etwas unklar war: Antworte einfach auf diese E-Mail, wir helfen dir gern bei der Wahl zwischen Monatlich (${euro(CFG.monatNetto)} netto im Monat) und Einmalzahlung (${euro(CFG.kaufNetto)} netto einmalig).`),
    cta: "Abschluss fortsetzen", ctaUrl: resumeUrl,
  }),

  // ---- intern ----
  intern: (titel, s, details = {}) => mk(`[Tattoofin] ${titel}: ${s?.firma || ""}`, {
    title: esc(titel),
    body: rows([
      ["Studio", esc(s?.firma)], ["Inhaber", esc(s?.inhaber)], ["E-Mail", esc(s?.email)], ["Telefon", esc(s?.telefon)],
      ["Paket", s ? esc(paketVon(s).name) + (s.zahlart ? ` (${esc(s.zahlart)})` : "") : ""], ["Modell", esc(s?.modell)], ["Status", esc(s?.status)], ["Stripe-Konto", esc(s?.stripe?.accountId)],
      ...Object.entries(details).map(([k, v]) => [k, wert(v)]),
    ]),
    cta: "Admin öffnen", ctaUrl: `${CFG.siteUrl}/admin.html#${s?.id || ""}`,
  }),
};
