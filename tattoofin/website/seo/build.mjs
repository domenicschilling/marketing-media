// Erzeugt die Ratgeber-Seiten, die Ratgeber-Übersicht, sitemap.xml und robots.txt in public/.
// Aufruf (im Ordner tattoofin/website):  node seo/build.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { artikel, WARN } from "./artikel.mjs";

const SITE = "https://tattoofin.de";
const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const strip = (s) => s.replace(/<[^>]+>/g, "");
const heute = new Date().toISOString().slice(0, 10);

const ORG = {
  "@type": "Organization", "@id": SITE + "/#org", name: "Tattoofin", legalName: "DSX Media Solutions UG (haftungsbeschränkt)",
  url: SITE + "/", logo: SITE + "/assets/logo.png", email: "info@tattoofin.de", telephone: "+491741682157",
  address: { "@type": "PostalAddress", streetAddress: "Am Weingarten 9", postalCode: "96117", addressLocality: "Memmelsdorf", addressCountry: "DE" },
  sameAs: ["https://www.instagram.com/tattoofin.de/"],
};

const nav = `<header class="nav"><div class="wrap">
  <a class="brand" href="/"><img src="/assets/figur.png" alt="" width="46" height="46"><img class="wm" src="/assets/wortmarke.png" alt="Tattoofin" width="117" height="26"></a>
  <nav class="links"><a class="hide-m" href="/#so-gehts">So geht's</a><a class="hide-m" href="/#preise">Preise</a><a class="hide-m" href="/ratgeber.html">Ratgeber</a><a href="/login.html">Login</a><a class="btn dark small" href="/start.html">Jetzt starten</a></nav>
</div></header>`;

const footer = `<footer class="foot"><div class="wrap">
  <div><img class="wm" src="/assets/wortmarke.png" alt="Tattoofin" width="135" height="30"><div>© ${new Date().getFullYear()} DSX Media Solutions UG (haftungsbeschränkt) · Tattoofin ist kein Kreditinstitut.</div></div>
  <div><a href="/ratgeber.html">Ratgeber</a><a href="/impressum.html">Impressum</a><a href="/datenschutz.html">Datenschutz</a><a href="/vertrag.html">Vertrag</a><a href="/login.html">Studio-Login</a><a href="https://www.instagram.com/tattoofin.de/" rel="me noopener" target="_blank">Instagram</a></div>
</div></footer>`;

function head({ title, description, url, type = "website", jsonld }) {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${type}"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="Tattoofin">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/assets/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#fbb316">
<link rel="icon" href="/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/LuckiestGuy.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": jsonld })}</script>
</head><body>`;
}

const ctas = {
  studio: `<div class="cta-box"><h3>Du bist Tätowierer oder Studioinhaber?</h3><p>Mit Tattoofin bietest du Zahlungslinks, eine QR-Zahlseite, Anzahlungen und Ratenzahlung über Klarna an. 0 € Einrichtung, 10 % pro Zahlung, alles inklusive.</p><a class="btn gold" href="/start.html?utm_source=ratgeber">Tattoofin fürs Studio holen →</a></div>`,
  start: `<div class="cta-box"><h3>In 3 Minuten startklar</h3><p>Zahlungslinks, QR-Zahlseite, Anzahlungen und Ratenzahlung über Klarna für dein Studio. Eingerichtet, getestet, betreut. 0 € Einrichtung, 10 % pro Zahlung, alles inklusive.</p><a class="btn gold" href="/start.html?utm_source=ratgeber">Jetzt risikofrei starten →</a></div>`,
};

for (const a of artikel) {
  const url = `${SITE}/${a.slug}.html`;
  const jsonld = [
    ORG,
    { "@type": "Article", headline: a.titel, description: a.beschreibung, inLanguage: "de-DE", datePublished: a.stand, dateModified: a.stand,
      author: { "@id": SITE + "/#org" }, publisher: { "@id": SITE + "/#org" }, mainEntityOfPage: url, image: SITE + "/assets/og.jpg" },
    { "@type": "FAQPage", mainEntity: a.faq.map(([q, ans]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: ans } })) },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Tattoofin", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Ratgeber", item: SITE + "/ratgeber.html" },
      { "@type": "ListItem", position: 3, name: a.titel, item: url } ] },
  ];
  const related = artikel.filter((x) => x.slug !== a.slug).map((x) => `<a href="/${x.slug}.html">${esc(x.titel)}<span>${esc(x.beschreibung.slice(0, 110))}…</span></a>`).join("");
  const html = `${head({ title: a.seoTitel, description: a.beschreibung, url, type: "article", jsonld })}
${nav}
<main>
<section class="art-hero"><div class="wrap narrow">
  <p class="crumbs"><a href="/">Tattoofin</a> › <a href="/ratgeber.html">Ratgeber</a></p>
  <h1>${esc(a.titel)}</h1>
  <p class="lead">${esc(a.lead)}</p>
  <p class="muted" style="font-size:14px;font-weight:600">Stand: ${a.stand.split("-").reverse().join(".")} · von Tattoofin</p>
</div></section>
<section style="padding:0 0 80px"><div class="wrap narrow">
  <article class="article">
${a.inhalt}
<h2 id="faq">Häufige Fragen</h2>
${a.faq.map(([q, ans]) => `<details><summary>${esc(q)}</summary><p>${esc(ans)}</p></details>`).join("\n")}
${ctas[a.cta]}
<p class="muted" style="font-size:13px;margin-top:16px">Tattoofin ist kein Kreditgeber und vermittelt keine Kredite. Ratenzahlung und späteres Bezahlen werden von externen Zahlungsanbietern wie Klarna nach deren Prüfung angeboten. ${WARN} Allgemeine Informationen, keine Rechts- oder Finanzberatung.</p>
  </article>
  <h2 style="font-size:34px;margin:46px 0 4px">Mehr aus dem Ratgeber</h2>
  <div class="related">${related}</div>
</div></section>
</main>
${footer}
</body></html>
`;
  fs.writeFileSync(path.join(pub, a.slug + ".html"), html);
  console.log("ok:", a.slug + ".html");
}

// Ratgeber-Übersicht
{
  const url = `${SITE}/ratgeber.html`;
  const jsonld = [ORG, { "@type": "CollectionPage", name: "Tattoofin Ratgeber", url, hasPart: artikel.map((a) => ({ "@type": "Article", headline: a.titel, url: `${SITE}/${a.slug}.html` })) }];
  const html = `${head({ title: "Ratgeber: Tattoo finanzieren, Ratenzahlung & Anzahlung | Tattoofin", description: "Ratgeber rund ums Bezahlen von Tattoos: Tattoo in Raten zahlen, Anzahlung und No-Shows, Ratenzahlung und Klarna im Tattoostudio.", url, jsonld })}
${nav}
<main>
<section class="art-hero"><div class="wrap">
  <span class="stk">✦ Ratgeber</span>
  <h1>Tattoos bezahlen, <span class="outline white">ganz entspannt.</span></h1>
  <p class="lead">Für Kunden, die ihr Traum-Tattoo planen, und für Studios, die flexible Zahlungen anbieten wollen.</p>
</div></section>
<section style="padding:0 0 90px"><div class="wrap"><div class="related two">
${artikel.map((a) => `<a href="/${a.slug}.html" style="padding:24px">${esc(a.titel)}<span>${esc(a.beschreibung)}</span></a>`).join("\n")}
</div></div></section>
</main>
${footer}
</body></html>
`;
  fs.writeFileSync(path.join(pub, "ratgeber.html"), html);
  console.log("ok: ratgeber.html");
}

// Sitemap + robots
const seiten = [
  ["/", "1.0", "weekly"], ["/ratgeber.html", "0.7", "weekly"],
  ...artikel.map((a) => [`/${a.slug}.html`, "0.8", "monthly"]),
  ["/vertrag.html", "0.3", "yearly"], ["/avv.html", "0.2", "yearly"], ["/impressum.html", "0.1", "yearly"], ["/datenschutz.html", "0.1", "yearly"],
];
fs.writeFileSync(path.join(pub, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${seiten.map(([p, prio, freq]) => `  <url><loc>${SITE}${p}</loc><lastmod>${heute}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`).join("\n")}
</urlset>
`);
fs.writeFileSync(path.join(pub, "robots.txt"), `User-agent: *
Allow: /
Disallow: /api/
Disallow: /portal.html
Disallow: /admin.html
Disallow: /onboarding.html

Sitemap: ${SITE}/sitemap.xml
`);
console.log("ok: sitemap.xml, robots.txt");
