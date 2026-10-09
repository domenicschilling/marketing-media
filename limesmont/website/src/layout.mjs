import { SITE, SERVICES, waLink } from './config.mjs';
import { icon } from './icons.mjs';

// Cache-Buster für CSS/JS – ändert sich bei jedem Build
const VERSION = Date.now().toString(36);

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Relativer Pfad von der aktuellen Seite zu einer Zielseite – funktioniert auf jedem Hosting (auch in Unterordnern).
export function makeCtx(page) {
  // Seiten mit absolute: true (z. B. 404) werden unter beliebigen URLs ausgeliefert und brauchen Root-Pfade.
  const depth = page.path.split('/').filter(Boolean).length;
  const up = page.absolute ? '/' : depth ? '../'.repeat(depth) : './';
  return {
    page,
    r: (to = '') => (to === '' ? up : up + to),
    a: (file) => up + 'assets/' + file,
  };
}

function header({ r, a, page }) {
  const cur = (p) => (page.path.startsWith(p) && p ? ' aria-current="page"' : '');
  const mega = SERVICES.map((s) => `
            <a class="mega__item" href="${r('leistungen/' + s.slug + '/')}">
              <span class="mega__icon">${icon(s.icon)}</span>
              <span><b>${s.title}</b><small>${s.short}</small></span>
            </a>`).join('');
  return `
<a class="skip" href="#main">Zum Inhalt springen</a>
<header class="site-header${page.dark ? ' is-over-dark' : ''}" data-header>
  <div class="container site-header__inner">
    <a class="brand" href="${r('')}" aria-label="LIMES MONT – zur Startseite">
      <img class="brand__icon brand__icon--on-light" src="${a('img/logo-icon.png')}" width="34" height="40" alt="">
      <img class="brand__icon brand__icon--on-dark" src="${a('img/logo-icon-dark.png')}" width="34" height="40" alt="">
      <span class="brand__word"><b>LIMES</b> MONT</span>
    </a>
    <nav class="nav" id="nav" aria-label="Hauptnavigation">
      <ul class="nav__list">
        <li class="nav__item"><a class="nav__link nav__link--accent" href="${r('bautraeger/')}"${cur('bautraeger/')}>Für Bauträger</a></li>
        <li class="nav__item nav__item--mega">
          <a class="nav__link" href="${r('leistungen/')}"${cur('leistungen/')} data-mega-toggle aria-expanded="false">Leistungen ${icon('chevron', 'i i--sm')}</a>
          <div class="mega">
            <div class="mega__grid">${mega}
            </div>
            <a class="mega__all" href="${r('leistungen/')}">Alle Leistungen im Überblick ${icon('arrow', 'i i--sm')}</a>
          </div>
        </li>
        <li class="nav__item"><a class="nav__link" href="${r('miral-pvc/')}"${cur('miral-pvc/')}>MIRAL PVC</a></li>
        <li class="nav__item"><a class="nav__link" href="${r('referenzen/')}"${cur('referenzen/')}>Referenzen</a></li>
        <li class="nav__item"><a class="nav__link" href="${r('ueber-uns/')}"${cur('ueber-uns/')}>Über uns</a></li>
        <li class="nav__item"><a class="nav__link" href="${r('kontakt/')}"${cur('kontakt/')}>Kontakt</a></li>
      </ul>
      <div class="nav__mobile-extra">
        <a class="btn btn--primary btn--block" href="${r('kontakt/')}#anfrage">Projekt anfragen ${icon('arrow')}</a>
        <a class="btn btn--ghost btn--block" href="tel:${SITE.tel}">${icon('phone')} ${SITE.phone}</a>
      </div>
    </nav>
    <div class="site-header__actions">
      <a class="header-phone" href="tel:${SITE.tel}">${icon('phone')}<span>${SITE.phone}</span></a>
      <a class="btn btn--primary btn--sm" href="${r('kontakt/')}#anfrage">Projekt anfragen</a>
      <button class="burger" type="button" aria-controls="nav" aria-expanded="false" aria-label="Menü öffnen" data-burger>
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>`;
}

function footer({ r, a }) {
  return `
<footer class="site-footer">
  <div class="container site-footer__grid">
    <div class="site-footer__brand">
      <a class="brand brand--footer" href="${r('')}" aria-label="LIMES MONT – zur Startseite">
        <img class="brand__icon" src="${a('img/logo-icon-dark.png')}" width="34" height="40" alt="">
        <span class="brand__word"><b>LIMES</b> MONT</span>
      </a>
      <p>Fenster, Türen und Fassaden direkt vom Hersteller – geliefert und montiert für Bauträger, Generalunternehmer, Gewerbe und Industrie.</p>
      <a class="partner-badge" href="${r('miral-pvc/')}">
        <span>Generalvertretung Deutschland</span><b>MIRAL PVC</b>
      </a>
    </div>
    <div>
      <h2 class="site-footer__title">Leistungen</h2>
      <ul class="site-footer__links">
        ${SERVICES.map((s) => `<li><a href="${r('leistungen/' + s.slug + '/')}">${s.title}</a></li>`).join('\n        ')}
      </ul>
    </div>
    <div>
      <h2 class="site-footer__title">Unternehmen</h2>
      <ul class="site-footer__links">
        <li><a href="${r('bautraeger/')}">Für Bauträger</a></li>
        <li><a href="${r('ueber-uns/')}">Über uns</a></li>
        <li><a href="${r('miral-pvc/')}">Partner MIRAL PVC</a></li>
        <li><a href="${r('referenzen/')}">Referenzen</a></li>
        <li><a href="${r('kontakt/')}">Kontakt & Anfrage</a></li>
        <li><a href="${SITE.miral.url}" target="_blank" rel="noopener">miral-pvc.com ${icon('external', 'i i--xs')}</a></li>
      </ul>
    </div>
    <div>
      <h2 class="site-footer__title">Kontakt</h2>
      <address class="site-footer__contact">
        <strong>${SITE.name}</strong><br>
        ${SITE.street}<br>${SITE.zip} ${SITE.city}<br>
        <a href="tel:${SITE.tel}">${icon('phone', 'i i--sm')} ${SITE.phone}</a><br>
        <a href="mailto:${SITE.email}">${icon('mail', 'i i--sm')} ${SITE.email}</a><br>
        <a href="${waLink()}" target="_blank" rel="noopener">${icon('chat', 'i i--sm')} WhatsApp schreiben</a>
      </address>
    </div>
  </div>
  <div class="container site-footer__bottom">
    <span>© <span data-year>2026</span> ${SITE.name}</span>
    <nav aria-label="Rechtliches"><a href="${r('impressum/')}">Impressum</a><a href="${r('datenschutz/')}">Datenschutz</a></nav>
  </div>
</footer>
<nav class="mobile-bar" aria-label="Schnellkontakt">
  <a href="tel:${SITE.tel}">${icon('phone')}<span>Anrufen</span></a>
  <a href="${waLink()}" target="_blank" rel="noopener">${icon('chat')}<span>WhatsApp</span></a>
  <a class="mobile-bar__cta" href="${r('kontakt/')}#anfrage">${icon('doc')}<span>Anfrage</span></a>
</nav>`;
}

export function businessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': SITE.url + '/#business',
    name: SITE.name,
    alternateName: SITE.brand,
    url: SITE.url + '/',
    logo: SITE.url + '/assets/img/logo-icon.png',
    image: SITE.url + '/assets/img/og-image.jpg',
    telephone: SITE.tel,
    email: SITE.email,
    address: { '@type': 'PostalAddress', streetAddress: SITE.street, postalCode: SITE.zip, addressLocality: SITE.city, addressRegion: SITE.region, addressCountry: SITE.country },
    geo: { '@type': 'GeoCoordinates', latitude: SITE.geo.lat, longitude: SITE.geo.lng },
    areaServed: ['Wassertrüdingen', 'Landkreis Ansbach', 'Gunzenhausen', 'Dinkelsbühl', 'Nördlingen', 'Weißenburg in Bayern', 'Deutschland'],
    founder: { '@type': 'Person', name: SITE.ceo, jobTitle: 'Geschäftsführer' },
    knowsAbout: ['Fenster und Türen für Bauträger', 'Objektgeschäft Wohnungsbau', 'Fenstermontage', 'Türmontage', 'Sandwichpaneele', 'Industriemontage', 'Glasfassaden', 'Fassadenlamellen', 'Vorgehängte hinterlüftete Fassade', 'Trockenbau', 'Innenausbau'],
  };
}

export function layout(page, ctx) {
  const { r, a } = ctx;
  const canonical = SITE.url + '/' + page.path;
  const title = page.path === '' ? page.title : `${page.title} | LIMES MONT`;
  const crumbs = page.crumbs
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [['Startseite', ''], ...page.crumbs].map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE.url + '/' + p })),
      }
    : null;
  const schemas = [businessSchema(), crumbs, ...(page.schema || [])].filter(Boolean);
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description)}">
${page.noindex ? '<meta name="robots" content="noindex,follow">' : `<link rel="canonical" href="${canonical}">`}
<meta name="theme-color" content="#10221A">
<meta property="og:type" content="website">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="LIMES MONT">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE.url}/assets/img/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${a('img/favicon-32.png')}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${a('img/apple-touch-icon.png')}">
<link rel="manifest" href="${r('site.webmanifest')}">
<link rel="preload" href="${a('fonts/Barlow-700.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${a('fonts/Inter-var.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${a('css/style.css')}?v=${VERSION}">
${page.preloadImg ? `<link rel="preload" as="image" href="${a('img/' + page.preloadImg)}" fetchpriority="high">` : ''}
${schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body class="${page.bodyClass || ''}">
${header(ctx)}
<main id="main">
${page.body(ctx)}
</main>
${footer(ctx)}
<script type="module" src="${a('js/main.js')}?v=${VERSION}"></script>
</body>
</html>
`;
}
