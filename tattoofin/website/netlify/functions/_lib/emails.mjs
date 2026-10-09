// Alle automatischen E-Mails (an Studios und intern). Jede Funktion liefert { subject, html, text }.
import { CFG } from "./config.mjs";
import { esc, euro, brutto, datum, monatName } from "./util.mjs";

const gold = "#f5a50b", ink = "#0d1117";

function layout({ preheader = "", title, body, cta, ctaUrl, footerNote = "" }) {
  const button = cta && ctaUrl
    ? `<p style="margin:26px 0"><a href="${esc(ctaUrl)}" style="background:${gold};color:${ink};text-decoration:none;font-weight:700;padding:13px 22px;border-radius:99px;display:inline-block">${esc(cta)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f5f2ea;font:15px/1.6 -apple-system,Segoe UI,Inter,Arial,sans-serif;color:#14161a">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:${ink};padding:18px 26px;color:#fff;font-weight:700;font-size:16px">📞 Ted am Telefon <span style="color:${gold}">· ${esc(CFG.marke)}</span></td></tr>
<tr><td style="padding:26px 26px 8px"><h1 style="font-size:21px;line-height:1.25;margin:0 0 14px">${title}</h1>${body}${button}</td></tr>
<tr><td style="padding:8px 26px 24px;color:#5b6370;font-size:13px">${footerNote}
<p style="margin:14px 0 0">Fragen? Antworte einfach auf diese E-Mail oder ruf an: ${esc(CFG.telefon)}.<br>
${esc(CFG.firma)} · ${esc(CFG.adresse)}</p></td></tr></table></td></tr></table></body></html>`;
  const text = (title + "\n\n" + body + (cta ? `\n\n${cta}: ${ctaUrl}` : ""))
    .replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|li|tr|h\d)>/g, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();
  return { html, text };
}

const p = (s) => `<p style="margin:0 0 12px">${s}</p>`;
const box = (s) => `<div style="background:#fff4dc;border:1px solid #f3d79a;border-radius:10px;padding:12px 14px;margin:0 0 14px">${s}</div>`;
const rows = (pairs) => `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;margin:0 0 14px">${pairs
  .filter(([, v]) => v !== undefined && v !== null && v !== "")
  .map(([k, v]) => `<tr><td style="padding:5px 0;color:#5b6370;width:42%;vertical-align:top">${esc(k)}</td><td style="padding:5px 0;font-weight:600">${v}</td></tr>`).join("")}</table>`;
const hallo = (s) => p(`Hey ${esc(s.inhaber?.split(" ")[0] || s.firma)},`);
const modellText = (s) => (s.modell === "kauf"
  ? `Kaufpaket: ${euro(s.preisNetto)} netto einmalig (${euro(brutto(s.preisNetto))} brutto)`
  : `Provisionsmodell: ${CFG.provisionProzent} % vom Tattoo-Preis für Termine aus Ted-Anfragen, monatliche Abrechnung`);
const mk = (subject, l) => ({ subject, ...layout(l) });

export const mails = {
  // 1) direkt nach dem Online-Abschluss
  anmeldung: (s, { loginUrl }) => mk(`Willkommen bei Ted am Telefon, ${s.firma}`, {
    preheader: "Dein Vertrag ist abgeschlossen. Das sind die nächsten Schritte.",
    title: "Danke! Dein Vertrag ist abgeschlossen. 🖤",
    body: hallo(s) + p("schön, dass du dabei bist. Hier ist die Zusammenfassung deines Vertrags:") + rows([
      ["Studio", esc(s.firma)], ["Modell", esc(modellText(s))],
      ["Vertrag / AVV", `Version ${esc(s.vertrag.version)}, akzeptiert am ${datum(s.vertrag.akzeptiertAm)} von ${esc(s.vertrag.name)}`],
      ["Vertragstext", `<a href="${CFG.siteUrl}/vertrag.html">Vertrag</a> · <a href="${CFG.siteUrl}/avv.html">AVV</a>`],
    ]) + p("<b>So geht's weiter:</b>") +
      `<ol style="margin:0 0 14px;padding-left:20px"><li>${s.modell === "kauf" ? (s.zahlart === "rechnung" ? "Rechnung bezahlen (kommt separat per E-Mail)." : "Die Zahlung ist erledigt, die Rechnung kommt separat.") : "Deine Zahlungsmethode ist hinterlegt. Abgebucht wird nur, wenn Provision anfällt."}</li>
      <li>Fragebogen ausfüllen (ca. 15 Minuten), damit Ted dein Studio kennt.</li>
      <li>Wir melden uns für einen kurzen Kickoff und richten alles ein. Ted ist in der Regel nach 5 Werktagen live.</li></ol>` +
      p("Über den Button kommst du in dein Studio-Portal mit Fragebogen, Anfragen und Abrechnungen. Später kannst du dich dort jederzeit mit deiner E-Mail-Adresse einloggen."),
    cta: "Zum Fragebogen", ctaUrl: loginUrl + "&next=/onboarding.html",
  }),

  // 2a) Kauf sofort bezahlt (Rechnungs-PDF verschickt Stripe zusätzlich)
  kaufBezahlt: (s, { betragCent, rechnungUrl }) => mk("Zahlung erhalten. Danke!", {
    preheader: "Deine Zahlung für Ted am Telefon ist eingegangen.",
    title: "Zahlung erhalten ✅",
    body: hallo(s) + p(`wir haben deine Zahlung über <b>${euro(betragCent)}</b> erhalten. Ab jetzt fallen für Ted keine weiteren Kosten an: Betrieb und Betreuung sind inklusive (Fair Use: ${CFG.fairUseMinuten} Gesprächsminuten pro Monat).`) +
      (rechnungUrl ? p(`Deine Rechnung: <a href="${esc(rechnungUrl)}">Rechnung ansehen / herunterladen</a>`) : "") +
      box(`<b>Zufriedenheitsgarantie:</b> ${CFG.garantieTage} Tage ab dem Tag, an dem Ted live geht. Passt es nicht, bekommst du dein Geld zurück.`),
  }),

  // 2b) Kauf auf Rechnung
  rechnungVersendet: (s, { betragCent, rechnungUrl, faellig }) => mk("Deine Rechnung für Ted am Telefon", {
    preheader: `Rechnung über ${euro(betragCent)}, fällig am ${datum(faellig)}.`,
    title: "Deine Rechnung ist da",
    body: hallo(s) + p(`hier ist deine Rechnung über <b>${euro(betragCent)}</b> (inkl. USt.), zahlbar bis <b>${datum(faellig)}</b>. Du kannst per Überweisung oder direkt online bezahlen.`) +
      p("Wir starten mit der Einrichtung schon jetzt, damit keine Zeit verloren geht."),
    cta: "Rechnung ansehen & bezahlen", ctaUrl: rechnungUrl,
  }),

  // 2c) Provision: Zahlungsmethode hinterlegt
  mandatHinterlegt: (s) => mk("Zahlungsmethode hinterlegt: alles bereit", {
    preheader: "Abgebucht wird nur, wenn Ted dir Termine bringt.",
    title: "Alles bereit: risikofrei mit Provision",
    body: hallo(s) + p(`deine Zahlungsmethode ist hinterlegt. Es gibt <b>keine Einrichtungs- und keine Monatsgebühr</b>. Du zahlst nur ${CFG.provisionProzent} % vom Tattoo-Preis, wenn aus einer Ted-Anfrage ein Termin wird.`) +
      p(`<b>So funktioniert die Abrechnung:</b> Jede Anfrage von Ted erscheint in deinem Studio-Portal. Wird daraus ein Termin, trägst du dort Datum und Preis ein. Bis zum ${CFG.meldeTag}. jedes Monats rechnen wir die Termine des Vormonats ab und buchen den Betrag ab. Du bekommst vorher eine Übersicht.`),
  }),

  login: (s, { url }) => mk("Dein Login-Link für das Studio-Portal", {
    preheader: "Einfach klicken, kein Passwort nötig.",
    title: "Dein Login-Link",
    body: hallo(s) + p("hier ist dein persönlicher Link zum Studio-Portal. Er ist 60 Minuten gültig und funktioniert nur für dich. Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren."),
    cta: "Jetzt einloggen", ctaUrl: url,
  }),

  fragebogen: (s) => mk("Fragebogen erhalten. Wir legen los!", {
    preheader: "Danke! Jetzt bauen wir Ted für dein Studio.",
    title: "Fragebogen erhalten 👍",
    body: hallo(s) + p("danke für deine Angaben! Wir bauen jetzt Ted für dein Studio, mit Stimme, Begrüßung und euren Infos.") +
      p("Als Nächstes bekommst du von uns eine Testnummer. Ruf Ted an, stell ihm ruhig fiese Fragen und sag uns, was wir anpassen sollen. Danach richten wir zusammen die Rufumleitung ein (2 Minuten)."),
  }),

  live: (s, { tedNummer }) => mk("🚀 Ted ist live!", {
    preheader: "Ab jetzt geht kein Anruf mehr verloren.",
    title: "Ted geht ab jetzt für euch ran 🚀",
    body: hallo(s) + p("Ted ist live. Jeder Anruf, den ihr nicht annehmt, landet ab jetzt bei ihm, und die Zusammenfassung kommt sofort per WhatsApp und E-Mail.") + rows([
      ["Ted-Nummer (Ziel der Rufumleitung)", esc(tedNummer || "siehe Portal")],
      ["Rufumleitung ausschalten (Handy)", "<b>##002#</b> und Anrufen drücken"],
      ["Zufriedenheitsgarantie", s.modell === "kauf" ? `bis ${datum(new Date(Date.now() + CFG.garantieTage * 864e5).toISOString())}` : "Provision: jederzeit zum Monatsende kündbar"],
    ]) + p(`Fensteraufkleber, Flyer und Thekenaufsteller mit eurer Nummer findest du im Portal unter „Materialien“.`) +
      (s.modell === "provision" ? box(`Wichtig fürs Provisionsmodell: Trag im Portal ein, wenn aus einer Anfrage ein Termin wird (Datum + Preis). Abgerechnet wird einmal im Monat.`) : ""),
    cta: "Zum Studio-Portal", ctaUrl: `${CFG.siteUrl}/portal.html`,
  }),

  neueAnfrage: (s, a) => mk(`📞 Neue Anfrage: ${a.name || "Anrufer"}${a.dringend ? " ⚠️ DRINGEND" : ""}`, {
    preheader: [a.motiv, a.stelle].filter(Boolean).join(" · "),
    title: `${a.dringend ? "⚠️ Dringend: " : ""}Neue Anfrage von ${esc(a.name || "Anrufer")}`,
    body: rows([
      ["Rückrufnummer", a.nummer ? `<a href="tel:${esc(a.nummer)}">${esc(a.nummer)}</a>` : ""],
      ["Anliegen", esc(a.anliegen)], ["Motiv", esc(a.motiv)], ["Körperstelle", esc(a.stelle)], ["Größe", esc(a.groesse)],
      ["Stil / Farbe", esc([a.stil, a.farbe].filter(Boolean).join(" / "))], ["Wunschzeitraum", esc(a.wunschzeitraum)],
      ["Artist-Wunsch", esc(a.artist)], ["Budget (genannt)", esc(a.budget)], ["Dauer", a.dauerSek ? Math.round(a.dauerSek / 60 * 10) / 10 + " Min." : ""],
    ]) + (a.zusammenfassung ? box(esc(a.zusammenfassung)) : "") + p("Preis und Termin machst du. Bitte meld dich zeitnah beim Kunden.") +
      (s.modell === "provision" ? p(`<small>Wird daraus ein Termin? Trag ihn im Portal ein.</small>`) : ""),
    cta: "Im Portal öffnen", ctaUrl: `${CFG.siteUrl}/portal.html#anfrage-${a.id}`,
  }),

  buchungenErinnerung: (s, { offen, monat, letzte }) => mk(letzte ? "Letzte Erinnerung: Termine bis morgen eintragen" : `Kurz erinnert: Termine für ${monatName(monat)} eintragen`, {
    preheader: `${offen} Anfragen ohne Status`,
    title: letzte ? "Letzte Erinnerung vor der Abrechnung" : "Kurz erinnert: Termine eintragen",
    body: hallo(s) + p(`in deinem Portal sind noch <b>${offen} Anfrage${offen === 1 ? "" : "n"}</b> ohne Status. Bitte trag ein, ob daraus ein Termin geworden ist (mit Datum und Preis) oder nicht. Die Abrechnung für ${monatName(monat)} erstellen wir am ${CFG.meldeTag + 1}. des Folgemonats.`) +
      p("Das dauert pro Anfrage nur ein paar Sekunden."),
    cta: "Termine eintragen", ctaUrl: `${CFG.siteUrl}/portal.html#anfragen`,
  }),

  monatsabrechnung: (s, ab, { rechnungUrl }) => {
    const ges = ab.gesamtNetto ?? ab.summeNetto;
    const mm = ab.mehrminuten || { extra: 0, cent: 0 };
    const zeilen = [];
    if (ab.summeNetto) zeilen.push(["Provision " + CFG.provisionProzent + " % auf " + euro(ab.umsatzNetto), euro(ab.summeNetto)]);
    if (mm.cent) zeilen.push([`Mehrminuten (${mm.extra} Min. über ${CFG.fairUseMinuten})`, euro(mm.cent)]);
    zeilen.push(["USt. " + CFG.ustProzent + " %", euro(brutto(ges) - ges)], ["Gesamt", "<b>" + euro(brutto(ges)) + "</b>"]);
    const einzug = s.modell === "provision" && s.stripe?.paymentMethod;
    return mk(`Deine Abrechnung ${monatName(ab.monat)}`, {
      preheader: ges ? `${euro(brutto(ges))} · ${ab.positionen.length} Termine` : "Diesen Monat fällt nichts an.",
      title: `Abrechnung ${monatName(ab.monat)}`,
      body: hallo(s) + (ges
        ? (ab.positionen.length ? p(`aus Ted-Anfragen sind im ${monatName(ab.monat)} <b>${ab.positionen.length} Termin${ab.positionen.length === 1 ? "" : "e"}</b> mit einem Tattoo-Umsatz von <b>${euro(ab.umsatzNetto)}</b> netto entstanden. Glückwunsch! 🖤`) : p(`hier ist deine Abrechnung für ${monatName(ab.monat)}.`)) +
          rows(zeilen) +
          p(einzug ? "Der Betrag wird in den nächsten Tagen von deiner hinterlegten Zahlungsmethode eingezogen. Die Einzelpositionen siehst du im Portal und auf der Rechnung." : `Die Rechnung ist zahlbar innerhalb von ${CFG.rechnungFaelligTage} Tagen.`)
        : p(`für ${monatName(ab.monat)} sind keine provisionspflichtigen Termine eingetragen. Es wird nichts abgebucht.`)),
      cta: ges && rechnungUrl ? "Rechnung ansehen" : "Zum Portal", ctaUrl: ges && rechnungUrl ? rechnungUrl : `${CFG.siteUrl}/portal.html#abrechnungen`,
    });
  },

  zahlungFehlgeschlagen: (s, { betragCent, rechnungUrl }) => mk("Zahlung fehlgeschlagen: bitte kurz prüfen", {
    preheader: "Wir konnten den Betrag nicht einziehen.",
    title: "Die Zahlung hat nicht geklappt",
    body: hallo(s) + p(`leider konnten wir <b>${euro(betragCent)}</b> nicht einziehen. Das passiert z. B. bei abgelaufenen Karten oder geändertem Konto. Ted läuft normal weiter.`) +
      p("Bitte bezahl die Rechnung über den Button oder aktualisiere deine Zahlungsmethode im Portal. Wir versuchen den Einzug in einigen Tagen automatisch erneut."),
    cta: "Jetzt bezahlen", ctaUrl: rechnungUrl || `${CFG.siteUrl}/portal.html#zahlung`,
  }),

  fairUse: (s, { minuten, monat }) => mk("Ted war diesen Monat richtig fleißig", {
    preheader: `${minuten} Gesprächsminuten im ${monatName(monat)}`,
    title: "Hinweis zu deinen Gesprächsminuten",
    body: hallo(s) + p(`Ted hat im ${monatName(monat)} bereits <b>${minuten} Minuten</b> telefoniert. Inklusive sind ${CFG.fairUseMinuten} Minuten pro Monat, darüber berechnen wir ${euro(CFG.extraMinuteCent)} pro Minute zzgl. USt.`) +
      p("Kein Grund zur Sorge: Ted läuft ganz normal weiter. Wenn das öfter vorkommt, melden wir uns und schauen gemeinsam, was am besten passt."),
  }),

  kuendigung: (s, { zum }) => mk("Deine Kündigung ist eingegangen", {
    preheader: `Ted läuft noch bis ${datum(zum)}.`,
    title: "Schade, aber verstanden. Kündigung bestätigt.",
    body: hallo(s) + p(`wir bestätigen deine Kündigung zum <b>${datum(zum)}</b>. Bis dahin läuft Ted ganz normal weiter.`) +
      (s.modell === "provision" ? p(`Termine aus Anfragen, die bis dahin eingehen, sind noch ${CFG.nachlaufMonate} Monate provisionspflichtig. Bitte trag sie wie gewohnt im Portal ein.`) : "") +
      box("<b>Wichtig:</b> Schalte zum Vertragsende die Rufumleitung zu Ted ab (Handy: <b>##002#</b>), sonst landen Anrufe ins Leere. Wir erinnern dich vorher noch einmal.") +
      p("Falls du es dir anders überlegst: Im Portal kannst du die Kündigung bis zum Stichtag mit einem Klick zurücknehmen. Und wenn du uns sagst, was nicht gepasst hat, hilft uns das sehr."),
    cta: "Kündigung zurücknehmen", ctaUrl: `${CFG.siteUrl}/portal.html#vertrag`,
  }),

  kuendigungZurueck: (s) => mk("Kündigung zurückgenommen: schön, dass du bleibst!", {
    title: "Ted bleibt bei euch 🖤", preheader: "Alles läuft weiter wie bisher.",
    body: hallo(s) + p("deine Kündigung ist zurückgenommen. Es läuft alles weiter wie bisher, du musst nichts tun."),
  }),

  vertragsendeBald: (s, { zum }) => mk("In 7 Tagen endet Ted am Telefon: Rufumleitung abschalten", {
    title: "Bitte Rufumleitung abschalten", preheader: `Vertragsende am ${datum(zum)}`,
    body: hallo(s) + p(`am <b>${datum(zum)}</b> endet dein Vertrag und Teds Nummer wird abgeschaltet. Bitte schalte bis dahin die Rufumleitung ab, damit Anrufer wieder bei euch landen:`) +
      `<ul style="margin:0 0 14px;padding-left:20px"><li>Handy: <b>##002#</b> eintippen und Anrufen drücken</li><li>FRITZ!Box: Telefonie → Rufbehandlung → Rufumleitung: Häkchen entfernen</li><li>Festnetz: im Kundencenter eures Anbieters ausschalten</li></ul>` +
      p("Danke, dass ihr Ted ausprobiert habt. Die Tür bleibt offen. 🖤"),
  }),

  vertragsende: (s) => mk("Dein Vertrag ist beendet", {
    title: "Ted am Telefon ist beendet", preheader: "Danke für die Zeit mit dir.",
    body: hallo(s) + p("dein Vertrag ist heute ausgelaufen und Teds Nummer ist abgeschaltet. Deine Daten löschen wir gemäß Auftragsverarbeitungsvertrag innerhalb von 30 Tagen.") +
      (s.modell === "provision" ? p(`Für Termine aus Anfragen der Vertragslaufzeit gilt noch ${CFG.nachlaufMonate} Monate die Provision. Dein Portal-Zugang bleibt dafür so lange aktiv.`) : ""),
  }),

  garantieErstattung: (s, { betragCent }) => mk("Erstattung veranlasst (Zufriedenheitsgarantie)", {
    title: "Dein Geld ist auf dem Weg zurück", preheader: `${euro(betragCent)} werden erstattet.`,
    body: hallo(s) + p(`wie versprochen erstatten wir dir <b>${euro(betragCent)}</b> im Rahmen unserer Zufriedenheitsgarantie. Je nach Zahlungsart ist das Geld in 5 bis 10 Werktagen auf deinem Konto. Eine Stornorechnung bekommst du separat.`) +
      p("Bitte schalte die Rufumleitung zu Ted ab (Handy: <b>##002#</b>). Danke, dass du es ausprobiert hast, und wenn du magst: Sag uns kurz, was wir besser machen können."),
  }),

  anmeldungAbgebrochen: (s, { resumeUrl }) => mk("Fast geschafft: dein Abschluss ist noch offen", {
    title: "Du warst fast fertig 🙂", preheader: "Mit einem Klick weitermachen.",
    body: hallo(s) + p("du hast gestern angefangen, Ted am Telefon für dein Studio abzuschließen, aber die Zahlung bzw. das Hinterlegen der Zahlungsmethode ist noch offen.") +
      p(`Falls etwas unklar war: Antworte einfach auf diese E-Mail oder ruf an (${esc(CFG.telefon)}). Und falls du lieber risikofrei startest: Im Provisionsmodell zahlst du nur ${CFG.provisionProzent} % für Termine, die Ted dir bringt.`),
    cta: "Abschluss fortsetzen", ctaUrl: resumeUrl,
  }),

  // ---- intern ----
  intern: (titel, s, details = {}) => mk(`[Ted] ${titel}: ${s?.firma || ""}`, {
    title: esc(titel),
    body: rows([
      ["Studio", esc(s?.firma)], ["Inhaber", esc(s?.inhaber)], ["E-Mail", esc(s?.email)], ["Telefon", esc(s?.telefon)],
      ["Modell", esc(s?.modell)], ["Status", esc(s?.status)],
      ...Object.entries(details).map(([k, v]) => [k, esc(typeof v === "object" ? JSON.stringify(v) : v)]),
    ]),
    cta: "Admin öffnen", ctaUrl: `${CFG.siteUrl}/admin.html#${s?.id || ""}`,
  }),
};
