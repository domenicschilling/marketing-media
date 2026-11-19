// Baut die vier Bildanzeigen (Feed 1080×1350, Story 1080×1920) aus echten Demo-Aufnahmen. Aufruf: node quellen/anzeigen/bau.mjs [a b c d]
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire("/Users/domi/Marketing-Maschine/");
const { chromium } = require("playwright");
const D = "/Users/domi/Marketing-Maschine/content/tattookalender/werbung-2026-11-02";
const APP = "file://" + D + "/quellen/app/";
const FONT = "file://" + D + "/quellen/schrift/archivo.woff2";
const LOGO = "file://" + D + "/quellen/logo-hell.svg";

const CSS = `@font-face{font-family:Archivo;src:url(${FONT}) format("woff2");font-weight:100 900;font-stretch:62% 125%}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#f6f6f3;font-family:Archivo,sans-serif;color:#16171a}
#b{position:relative;width:1080px;overflow:hidden;background:#f6f6f3}
.logo{position:absolute;left:48px;height:50px}
.fuer{position:absolute;right:48px;font-size:28px;font-weight:600;color:#50535a}
h1{position:absolute;left:48px;right:40px;font-size:88px;line-height:.98;font-weight:800;letter-spacing:-.022em}
.satz{position:absolute;left:48px;right:48px;font-size:38px;line-height:1.2;font-weight:500;color:#26282c}
.karte{position:absolute;left:32px;width:1016px;background:#f6f6f3 no-repeat;background-size:1016px auto;border:1.5px solid #dfdfda;border-radius:22px;box-shadow:0 10px 34px rgba(22,23,26,.10);overflow:hidden}
.ins{position:absolute;background:#fff no-repeat;border-radius:16px;border:1.5px solid #cfcfc9;box-shadow:0 14px 34px rgba(22,23,26,.20)}
.pill{position:absolute;background:#16171a;color:#fff;font-size:33px;font-weight:700;padding:11px 22px;border-radius:12px;white-space:nowrap}
.pill.r::after,.pill.u::after{content:"";position:absolute;width:0;height:0}
.pill.u::after{left:var(--x,50%);bottom:-13px;border-left:13px solid transparent;border-right:13px solid transparent;border-top:14px solid #16171a}
.pill.o::after{content:"";position:absolute;left:var(--x,50%);top:-13px;border-left:13px solid transparent;border-right:13px solid transparent;border-bottom:14px solid #16171a}
.fuss{position:absolute;left:0;right:0;background:#fff;border-top:1.5px solid #dfdfda;padding:14px 48px}
.cta{font-size:33px;font-weight:800}
.klein{font-size:22px;line-height:1.25;color:#50535a;font-weight:500;margin-top:3px}
`;
const crop = (src, sx, sy, sw, sh, w) => { const s = w / sw; return `background-image:url(${APP}${src});background-size:${1440 * s}px auto;background-position:${-sx * s}px ${-sy * s}px;width:${w}px;height:${sh * s}px`; };

const S = 1016 / 1440; // Maßstab Aufnahme → Karte
const KOPF = 93;        // Höhe der Artist-Kopfzeile in der Karte
const yUhr = (h) => KOPF + (561 - 540 + (h - 10) * 228) * S; // y in der Karte zu einer Uhrzeit
const ADS = {
  a: { datei: "a-anzahlung", h: "Erst die Anzahlung. Dann steht der Termin.", satz: "Bezahllink direkt aus dem Termin, ab Paket Kalender + Zahlungen für 169 € netto im Monat.", zeilen: 2, klein: "Demo-Daten. Für Tattoostudios, Preise zzgl. USt.", bild: "kal-fr06.png",
    extra: (k) => `<div class="pill o" style="left:${k.l + 22 + 92}px;top:${k.t + yUhr(11.5) + 14}px;--x:44px">Anzahlung offen</div>
      <div class="ins" style="left:${k.l + 92}px;top:${k.t + yUhr(11.5) + 92}px;${crop("pay.png", 46, 238, 1350, 575, 720)}"></div>` },
  b: { datei: "b-einwilligung", h: "Einwilligung am Handy. Nicht im Papierordner.", satz: "Am Handy oder Tablet unterschrieben, ohne Einwilligung kein <span style='white-space:nowrap'>Check-in</span>: in jedem Paket, ab 99 € netto im Monat.", zeilen: 3, klein: "Demo-Daten. Für Tattoostudios, Preise zzgl. USt.", bild: "kal-mi04.png", bisUhr: 12.95,
    extra: (k, kh) => `<div class="pill o" style="left:${k.l + 684}px;top:${k.t + yUhr(12.5) + 12}px;--x:136px">Einwilligung fehlt</div>
      <div class="ins" style="left:${k.l + 22}px;top:${k.t + kh - 238}px;${crop("dlg-pia.png", 100, 1900, 1240, 310, 972)}"></div>` },
  c: { datei: "c-alles-an-einem-ort", h: "Ein Kalender statt Zettel und Ordner.", satz: "Anfrage, Termin und Einwilligung an einem Ort. Anzahlung ab 169 € netto im Monat, WhatsApp-Chat im Paket Komplett für 299 €.", zeilen: 3, klein: "Demo-Daten. Für Tattoostudios, Preise zzgl. USt. WhatsApp-Chat startet nach Meta-Prüfung.", bild: "kal-mi04.png", nav: true,
    extra: (k) => `<div class="pill u" style="left:${k.l + 696}px;top:${k.t + yUhr(13) - 74}px;--x:130px">Anzahlung offen</div><div class="pill o" style="left:${k.l + 362}px;top:${k.t + yUhr(10) + 150}px;--x:150px">Einwilligung fehlt</div>` },
  d: { datei: "d-umzug", h: "Dein Umzug? Machen wir kostenlos.", satz: "Kunden und künftige Termine aus Planity, Shore, Treatwell und anderen; erster Monat gratis, Karte nötig, danach ab 99 € netto im Monat.", zeilen: 3, klein: "Aktion bis 31.12.2026. Vergangene Termine und Einwilligungen kommen nicht mit. Demo-Daten. Für Tattoostudios, Preise zzgl. USt.", bild: "kal-do05.png",
    extra: (k) => `<div class="ins" style="left:${k.l + 118}px;top:${k.t + KOPF + 24}px;width:214px;padding:14px 12px 14px 16px;background:#16171a;color:#fff;border:0;font-size:32px;line-height:1.42;font-weight:700"><span style="font-weight:500">aus</span><br>Planity<br>Shore<br>Treatwell<br><span style="font-weight:500;white-space:nowrap">und anderen</span></div>` },
};

function html(ad, fmt) {
  const story = fmt === "story";
  const H = story ? 1920 : 1350;
  const hTop = story ? 332 : 106, satzTop = hTop + 2 * 86 + (story ? 28 : 20);
  const karteTop = satzTop + ad.zeilen * 46 + (story ? 30 : 22);
  const fussTop = story ? (ad.klein.length > 100 ? 1436 : 1458) : (ad.klein.length > 100 ? 1214 : 1252);
  const kh = story ? fussTop - 16 - karteTop : fussTop + 24 - karteTop;
  const k = { l: 32, t: karteTop };
  const mitNav = ad.nav && !story;
  const navH = mitNav ? 132 : 0;
  const bodyEnde = ad.bisUhr ? Math.min(yUhr(ad.bisUhr), kh) : kh - navH;
  const bg = (src, sy, h, top) => `<div style="position:absolute;left:0;top:${top}px;width:1016px;height:${h}px;background:url(${APP}${src}) no-repeat;background-size:1016px auto;background-position:0 ${-sy * S}px"></div>`;
  return `<!doctype html><html lang="de"><meta charset="utf-8"><style>${CSS}</style><body><div id="b" style="height:${H}px">
    <img class="logo" src="${LOGO}" style="top:${story ? 262 : 36}px"><div class="fuer" style="top:${(story ? 262 : 36) + 10}px">Für Tattoostudios</div>
    <h1 style="top:${hTop}px">${ad.h}</h1><div class="satz" style="top:${satzTop}px">${ad.satz}</div>
    <div class="karte" style="top:${karteTop}px;height:${kh}px;background:#fff">
      ${bg(ad.bild, 322, KOPF, 0)}${bg(ad.bild, 540, bodyEnde - KOPF, KOPF)}
      ${mitNav ? `<div style="position:absolute;left:0;bottom:0;width:1016px;height:${navH}px;background:url(${APP}kal-mi04-nav.png) no-repeat;background-size:1016px auto;background-position:0 bottom;border-top:1.5px solid #dfdfda"></div>` : ""}
    </div>
    ${ad.extra(k, kh)}
    <div class="fuss" style="top:${fussTop}px;${story ? "bottom:auto;border:1.5px solid #dfdfda;border-radius:14px;left:32px;right:32px;padding:12px 24px;" : "bottom:0;"}"><div class="cta">Demo ohne Anmeldung: tattookalender.de</div><div class="klein">${ad.klein}</div></div>
  </div></body></html>`;
}
const nur = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [id, ad] of Object.entries(ADS)) {
  if (nur.length && !nur.includes(id)) continue;
  for (const fmt of ["feed", "story"]) {
    const f = path.join(D, "quellen/anzeigen", `${ad.datei}-${fmt}.html`);
    fs.writeFileSync(f, html(ad, fmt));
    await p.goto("file://" + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    await p.locator("#b").screenshot({ path: path.join(D, "anzeigen", `${ad.datei}-${fmt === "feed" ? "1080x1350" : "1080x1920"}.png`) });
  }
}
await b.close();
