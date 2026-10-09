import { SITE, SERVICES, waLink } from './config.mjs';
import { icon } from './icons.mjs';
import { esc } from './layout.mjs';

export const img = (ctx, name, alt, { cls = '', eager = false, sizes = '(min-width: 900px) 50vw, 100vw', w = 1400, h = 812 } = {}) =>
  `<img class="${cls}" src="${ctx.a(`img/${name}.webp`)}" srcset="${ctx.a(`img/${name}-800.webp`)} 800w, ${ctx.a(`img/${name}.webp`)} 1400w" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

/* ---------- Seitenkopf für Unterseiten ---------- */
export function pageHero(ctx, { eyebrow, title, lead, image, imageAlt, media, actions = true, crumbs = [] }) {
  const trail = [['Startseite', ''], ...crumbs];
  return `
<section class="page-hero">
  <div class="page-hero__bg" aria-hidden="true"></div>
  <div class="container page-hero__grid">
    <div class="page-hero__text reveal">
      <nav class="crumbs" aria-label="Brotkrümelnavigation"><ol>${trail
        .map(([l, p], i) => (i < trail.length - 1 ? `<li><a href="${ctx.r(p)}">${l}</a></li>` : `<li aria-current="page">${l}</li>`))
        .join('')}</ol></nav>
      ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
      <h1>${title}</h1>
      ${lead ? `<p class="lead">${lead}</p>` : ''}
      ${actions ? `<div class="actions">
        <a class="btn btn--primary" href="${ctx.r('kontakt/')}#anfrage">Projekt anfragen ${icon('arrow')}</a>
        <a class="btn btn--ghost-light" href="tel:${SITE.tel}">${icon('phone')} ${SITE.phone}</a>
      </div>` : ''}
    </div>
    ${media || ''}${image && !media ? `<figure class="page-hero__media reveal">${img(ctx, image, imageAlt || '', { eager: true })}<span class="corner corner--tl"></span><span class="corner corner--br"></span></figure>` : ''}
  </div>
</section>`;
}

/* ---------- Leistungskacheln ---------- */
export function serviceCards(ctx, { exclude, heading = true } = {}) {
  const list = SERVICES.filter((s) => s.slug !== exclude);
  return `
<div class="cards cards--services">
  ${list
    .map(
      (s, i) => `<a class="card card--service tilt reveal" style="--d:${i * 60}ms" href="${ctx.r('leistungen/' + s.slug + '/')}">
    <span class="card__index">0${SERVICES.indexOf(s) + 1}</span>
    <span class="card__icon">${icon(s.icon)}</span>
    <${heading ? 'h3' : 'h4'} class="card__title">${s.title}</${heading ? 'h3' : 'h4'}>
    <p>${s.short}</p>
    <span class="card__more">Mehr erfahren ${icon('arrow', 'i i--sm')}</span>
  </a>`
    )
    .join('\n  ')}
</div>`;
}

/* ---------- Ablauf ---------- */
export function processSteps() {
  const steps = [
    ['doc', 'Unterlagen', 'Sie schicken uns Pläne, Fensterliste oder Leistungsverzeichnis – bei kleineren Vorhaben genügen Fotos und Maße.'],
    ['handshake', 'Angebot', 'Wir kalkulieren das komplette Objekt oder einzelne Bauabschnitte und klären offene Punkte direkt mit Ihnen.'],
    ['ruler', 'Bemusterung & Aufmaß', 'Sie geben Profile, Farben und Gläser frei, wir nehmen die Maße auf der Baustelle.'],
    ['factory', 'Fertigung', 'Alle Elemente werden nach Maß im Werk von MIRAL PVC gefertigt und gesammelt angeliefert.'],
    ['truck', 'Montage & Abnahme', 'Wir montieren nach Ihrem Bauzeitenplan und übergeben jeden Abschnitt mit gemeinsamer Abnahme.'],
  ];
  return `
<ol class="process">
  ${steps
    .map(
      ([ic, t, d], i) => `<li class="process__step reveal" style="--d:${i * 90}ms">
    <span class="process__icon">${icon(ic)}</span>
    <span class="process__num">Schritt ${i + 1}</span>
    <h3>${t}</h3>
    <p>${d}</p>
  </li>`
    )
    .join('\n  ')}
</ol>`;
}

/* ---------- FAQ ---------- */
export function faq(items) {
  return `
<div class="faq">
  ${items
    .map(
      ([q, a]) => `<details class="faq__item reveal">
    <summary><span>${q}</span><span class="faq__icon" aria-hidden="true"></span></summary>
    <div class="faq__body"><p>${a}</p></div>
  </details>`
    )
    .join('\n  ')}
</div>`;
}
export const faqSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })),
});

/* ---------- Abschluss-CTA ---------- */
export function ctaBand(ctx, { title = 'Ihr nächstes Bauprojekt? Lassen Sie uns rechnen.', text = 'Schicken Sie uns Pläne, Fensterliste oder Leistungsverzeichnis – wir melden uns schnellstmöglich mit einer ersten Einschätzung und klären offene Punkte direkt mit Ihnen.' } = {}) {
  return `
<section class="cta-band">
  <div class="container cta-band__inner reveal">
    <div>
      <p class="eyebrow eyebrow--light">Für Bauträger &amp; Generalunternehmer</p>
      <h2>${title}</h2>
      <p>${text}</p>
    </div>
    <div class="cta-band__actions">
      <a class="btn btn--primary btn--lg" href="${ctx.r('kontakt/')}#anfrage">Projekt anfragen ${icon('arrow')}</a>
      <div class="cta-band__direct">
        <a href="tel:${SITE.tel}">${icon('phone')} ${SITE.phone}</a>
        <a href="${waLink()}" target="_blank" rel="noopener">${icon('chat')} WhatsApp</a>
      </div>
    </div>
  </div>
</section>`;
}

/* ---------- 3D-Scroll-Story: Fensterprofil ---------- */
export function profileStory(ctx) {
  const steps = [
    ['Das Fenster im Schnitt', 'Rahmen, Flügel, Verstärkung, Dichtungen und Glas: Erst das Zusammenspiel aller Bauteile entscheidet über Dämmung, Dichtheit und Lebensdauer.'],
    ['Mehrkammer-Profil', 'Mehrere Luftkammern im Rahmen- und Flügelprofil bremsen den Wärmeverlust – für warme Innenoberflächen und weniger Kondenswasser.'],
    ['Stahlverstärkung', 'Verzinkte Stahlprofile im Inneren der Hauptkammer geben dem Fenster Stabilität und halten Beschläge dauerhaft sicher – auch bei großen Formaten.'],
    ['Dichtungen & Isolierglas', 'Umlaufende Dichtungen halten Wind, Schlagregen und Lärm draußen. Zwei- oder Dreifach-Isolierglas mit Edelgasfüllung sorgt für niedrige Energiekosten.'],
  ];
  return `
<section class="story" data-story aria-labelledby="story-title">
  <div class="story__sticky">
    <div class="container story__grid">
      <div class="story__text">
        <p class="eyebrow eyebrow--light">Technik im Detail</p>
        <h2 id="story-title">Was in einem guten Fenster steckt</h2>
        <ol class="story__steps">
          ${steps
            .map(
              ([t, d], i) => `<li class="story__step${i === 0 ? ' is-active' : ''}" data-step="${i}">
            <span class="story__num">0${i + 1}</span>
            <div><h3>${t}</h3><p>${d}</p></div>
          </li>`
            )
            .join('\n          ')}
        </ol>
        <div class="story__progress" aria-hidden="true"><span></span></div>
        <p class="story__hint" aria-hidden="true">Scrollen, um das Fenster zu zerlegen</p>
      </div>
      <div class="story__stage scene" data-scene="window-profile">
        ${img(ctx, 'fenster-haus', 'Fensterprofil im Querschnitt vor einem modernen Wohnhaus', { cls: 'scene-fallback' })}
        <div class="scene-labels" aria-hidden="true">
          <span class="scene-label" data-label="chambers" data-from="1">Mehrkammer-Profil</span>
          <span class="scene-label" data-label="steel" data-from="2">Stahlverstärkung</span>
          <span class="scene-label" data-label="gasket" data-from="3">Dichtung</span>
          <span class="scene-label" data-label="glass" data-from="3">Isolierglas</span>
        </div>
        <div class="scene-hud" aria-hidden="true"><span>Schnitt A–A</span><span data-hud-step>01 / 04</span></div>
      </div>
    </div>
  </div>
</section>`;
}

/* ---------- Sandwichpaneel-Konfigurator ---------- */
export function panelConfigurator(ctx) {
  const thick = [40, 60, 80, 100, 120, 160, 200];
  const colors = [
    ['#E4E7DA', 'RAL 9002 Grauweiß'],
    ['#A5A8A6', 'RAL 9006 Weißaluminium'],
    ['#3B4245', 'RAL 7016 Anthrazitgrau'],
    ['#1F4A36', 'RAL 6005 Moosgrün'],
  ];
  return `
<div class="configurator reveal" data-configurator>
  <div class="configurator__stage scene" data-scene="sandwich-panel">
    ${img(ctx, 'dachmontage', 'Monteure verlegen Trapez-Sandwichpaneele auf einem Hallendach', { cls: 'scene-fallback' })}
    <div class="scene-hud" aria-hidden="true"><span>Paneel-Querschnitt</span><span>Ziehen zum Drehen</span></div>
  </div>
  <div class="configurator__panel">
    <div class="configurator__group" role="group" aria-label="Paneeltyp">
      <span class="configurator__label">Paneeltyp</span>
      <div class="seg">
        <button type="button" class="seg__btn is-active" data-type="wall" aria-pressed="true">Wandpaneel</button>
        <button type="button" class="seg__btn" data-type="roof" aria-pressed="false">Dachpaneel</button>
      </div>
    </div>
    <div class="configurator__group" role="group" aria-label="Kerndicke">
      <span class="configurator__label">Kerndicke (PIR)</span>
      <div class="chips">
        ${thick.map((t) => `<button type="button" class="chip${t === 100 ? ' is-active' : ''}" data-thickness="${t}" aria-pressed="${t === 100}">${t} mm</button>`).join('')}
      </div>
    </div>
    <div class="configurator__group" role="group" aria-label="Farbe Deckschale">
      <span class="configurator__label">Farbe Deckschale <em data-color-name>${colors[0][1]}</em></span>
      <div class="swatches">
        ${colors.map(([c, n], i) => `<button type="button" class="swatch${i === 0 ? ' is-active' : ''}" style="--c:${c}" data-color="${c}" data-name="${n}" aria-label="${n}" aria-pressed="${i === 0}"></button>`).join('')}
      </div>
    </div>
    <dl class="configurator__result">
      <div><dt>Wärmedurchgang (Richtwert)</dt><dd>U ≈ <output data-u>0,21</output> W/(m²K)</dd></div>
      <div><dt>Aufbau</dt><dd>Stahl · PIR-Hartschaum · Stahl</dd></div>
    </dl>
    <button type="button" class="btn btn--ghost btn--block" data-explode aria-pressed="false">${icon('panel')} Schichtaufbau zeigen</button>
    <p class="configurator__note">Richtwert für PIR-Kern (λ ≈ 0,022 W/(mK)) ohne Fugen und Befestigung. Verbindliche Werte liefert das Datenblatt des jeweiligen Paneelherstellers.</p>
  </div>
</div>`;
}

/* ---------- Einsatzgebiet ---------- */
export function areaMap() {
  const towns = [
    ['Ansbach', 292, 146], ['Feuchtwangen', 222, 205], ['Gunzenhausen', 345, 228], ['Dinkelsbühl', 218, 248],
    ['Weißenburg', 409, 265], ['Oettingen', 302, 300], ['Treuchtlingen', 390, 300], ['Nördlingen', 268, 345],
    ['Donauwörth', 352, 404], ['Nürnberg', 440, 78],
  ];
  return `
<figure class="area-map" aria-label="Einsatzgebiet rund um Wassertrüdingen">
  <svg viewBox="0 0 600 500" role="img">
    <title>Einsatzgebiet: Radius rund um Wassertrüdingen</title>
    <defs>
      <radialGradient id="glow"><stop offset="0" stop-color="#9BC04F" stop-opacity=".35"/><stop offset="1" stop-color="#9BC04F" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="300" cy="250" r="200" fill="url(#glow)"/>
    <circle class="ring" cx="300" cy="250" r="100"/>
    <circle class="ring ring--outer" cx="300" cy="250" r="200"/>
    <text class="ring-label" x="226" y="172">25 km</text>
    <text class="ring-label" x="155" y="102">50 km</text>
    ${towns.map(([n, x, y]) => `<g class="town"><line x1="300" y1="250" x2="${x}" y2="${y - 10}"/><circle cx="${x}" cy="${y - 10}" r="4"/><text x="${x + 8}" y="${y - 6}">${n}</text></g>`).join('')}
    <g class="home"><circle class="pulse" cx="300" cy="250" r="10"/><circle cx="300" cy="250" r="7"/><text x="300" y="281" text-anchor="middle">Wassertrüdingen</text></g>
  </svg>
  <figcaption>Firmensitz Wassertrüdingen · Industrieprojekte deutschlandweit auf Anfrage</figcaption>
</figure>`;
}

/* ---------- MIRAL-Kennzahlen ---------- */
export function miralStats() {
  // [Zahl, Beschriftung, Präfix, Suffix, hochzählen?]
  const s = [
    ['1996', 'Gründungsjahr des Herstellers', '', '', false],
    ['140', 'Mitarbeitende im Werk', '', '+', true],
    ['13000', 'm² Produktionsfläche', '', '+', true],
    ['80', 'der Produktion gehen in die EU', 'über ', ' %', true],
  ];
  return `
<ul class="stats">
  ${s
    .map(
      ([n, l, pre, suf, count]) => `<li class="stat reveal">
    <span class="stat__num">${pre ? `<small>${pre}</small>` : ''}<span${count ? ` data-count="${n}"` : ''}>${count ? Number(n).toLocaleString('de-DE') : n}</span>${suf}</span>
    <span class="stat__label">${l}</span>
  </li>`
    )
    .join('\n  ')}
</ul>
<p class="stats__source">Herstellerangaben MIRAL PVC d.o.o., Velika Kladuša (Bosnien und Herzegowina)</p>`;
}

/* ---------- Anfrageformular (Netlify Forms, mehrstufig) ---------- */
export function inquiryForm(ctx) {
  const radio = (name, items, req = true) =>
    `<div class="choice-grid">${items
      .map(
        ([v, ic], i) => `<label class="choice"><input type="radio" name="${name}" value="${v}"${req && i === 0 ? ' required' : ''}><span>${ic ? icon(ic) : ''}${v}</span></label>`
      )
      .join('')}</div>`;
  return `
<form class="inquiry" name="anfrage" method="POST" action="/danke/" enctype="multipart/form-data" data-netlify="true" netlify-honeypot="bot-field" data-steps novalidate>
  <input type="hidden" name="form-name" value="anfrage">
  <p class="hp"><label>Nicht ausfüllen: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
  <div class="inquiry__head">
    <ol class="inquiry__labels" aria-hidden="true"><li class="is-active">Leistung</li><li>Objekt</li><li>Umfang</li><li>Ort</li><li>Kontakt</li></ol>
    <div class="inquiry__bar"><span data-progress></span></div>
  </div>

  <fieldset class="step is-active" data-step>
    <legend>Wobei dürfen wir Sie unterstützen?</legend>
    ${radio('leistung', [['Fenster & Türen', 'window'], ['Glasfassade / Wintergarten', 'facade'], ['Fassadenlamellen / -verkleidung', 'louvre'], ['Sandwichpaneele', 'panel'], ['Industriemontage', 'factory'], ['Trockenbau / Innenausbau', 'interior'], ['Montage- / Rückbauservice', 'tools'], ['Sonstiges', 'chat']])}
  </fieldset>

  <fieldset class="step" data-step>
    <legend>Um was für ein Objekt geht es?</legend>
    ${radio('objekt', [['Mehrfamilienhaus / Wohnanlage'], ['Reihen- / Doppelhäuser'], ['Gewerbe / Halle'], ['Einfamilienhaus / Sanierung']])}
    <p class="field-label">Sie fragen an als</p>
    <div class="choice-row">
      ${['Bauträger / Projektentwickler', 'Generalunternehmer / Bauunternehmen', 'Gewerbe / Industrie', 'Privat'].map((v, i) => `<label class="choice choice--inline"><input type="radio" name="kundentyp" value="${v}"${i === 0 ? ' required' : ''}><span>${v}</span></label>`).join('\n      ')}
    </div>
  </fieldset>

  <fieldset class="step" data-step>
    <legend>Was genau ist geplant?</legend>
    <label class="field"><span>Beschreibung</span>
      <textarea name="beschreibung" rows="5" required placeholder="z. B. Wohnanlage mit 3 Häusern, ca. 120 Fenster und 24 Balkontüren in PVC, Dreifachverglasung, Montage ab Frühjahr in zwei Bauabschnitten"></textarea>
    </label>
    <div class="field-row">
      <label class="field"><span>Wohneinheiten / Häuser</span><input name="einheiten" inputmode="numeric" placeholder="z. B. 24 WE in 3 Häusern"></label>
      <label class="field"><span>Ca. Anzahl Elemente</span><input name="elemente" inputmode="numeric" placeholder="z. B. 140"></label>
    </div>
    <div class="field-row">
      <label class="upload"><input type="file" name="datei1" accept="image/*,.pdf,.xlsx,.xls,.x83,.x84,.d83,.gaeb"><span>${icon('upload')}<b>Pläne / LV hinzufügen</b><small data-file-name>PDF, Excel, GAEB oder Fotos</small></span></label>
      <label class="upload"><input type="file" name="datei2" accept="image/*,.pdf,.xlsx,.xls,.x83,.x84,.d83,.gaeb"><span>${icon('upload')}<b>Fensterliste / weitere Datei</b><small data-file-name>optional</small></span></label>
    </div>
    <p class="field-hint">Max. 8 MB insgesamt. Größere Planunterlagen senden Sie uns gern per E-Mail oder Download-Link.</p>
  </fieldset>

  <fieldset class="step" data-step>
    <legend>Wo und wann?</legend>
    <div class="field-row">
      <label class="field field--sm"><span>PLZ *</span><input name="plz" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" required autocomplete="postal-code"></label>
      <label class="field"><span>Ort</span><input name="ort" autocomplete="address-level2"></label>
    </div>
    <label class="field"><span>Gewünschter Zeitraum</span>
      <select name="zeitraum">
        <option>So schnell wie möglich</option><option>In 1–3 Monaten</option><option>In 3–6 Monaten</option><option>Noch offen</option>
      </select>
    </label>
  </fieldset>

  <fieldset class="step" data-step>
    <legend>Wie erreichen wir Sie?</legend>
    <div class="field-row">
      <label class="field"><span>Name *</span><input name="name" required autocomplete="name"></label>
      <label class="field"><span>Firma</span><input name="firma" autocomplete="organization"></label>
    </div>
    <div class="field-row">
      <label class="field"><span>Telefon *</span><input name="telefon" type="tel" required autocomplete="tel"></label>
      <label class="field"><span>E-Mail *</span><input name="email" type="email" required autocomplete="email"></label>
    </div>
    <label class="field"><span>Am besten erreichbar</span>
      <select name="erreichbar"><option>Egal</option><option>Vormittags</option><option>Nachmittags</option><option>Abends</option></select>
    </label>
    <label class="consent"><input type="checkbox" name="datenschutz" value="ja" required><span>Ich bin einverstanden, dass meine Angaben zur Bearbeitung der Anfrage gespeichert und verwendet werden. Details in der <a href="${ctx.r('datenschutz/')}" target="_blank">Datenschutzerklärung</a>. *</span></label>
  </fieldset>

  <p class="inquiry__error" role="alert" data-error hidden></p>
  <div class="inquiry__nav">
    <button type="button" class="btn btn--ghost" data-prev hidden>Zurück</button>
    <button type="button" class="btn btn--primary js-only" data-next>Weiter ${icon('arrow')}</button>
    <button type="submit" class="btn btn--primary" data-submit>Anfrage senden ${icon('arrow')}</button>
  </div>
</form>`;
}

/* ---------- Rückruf-Formular ---------- */
export function callbackForm(ctx) {
  return `
<form class="callback" name="rueckruf" method="POST" action="/danke/" data-netlify="true" netlify-honeypot="bot-field">
  <input type="hidden" name="form-name" value="rueckruf">
  <p class="hp"><label>Nicht ausfüllen: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
  <label class="field"><span>Name</span><input name="name" required autocomplete="name"></label>
  <label class="field"><span>Telefon</span><input name="telefon" type="tel" required autocomplete="tel"></label>
  <label class="consent consent--sm"><input type="checkbox" name="datenschutz" value="ja" required><span>Einverstanden mit der Verarbeitung gemäß <a href="${ctx.r('datenschutz/')}" target="_blank">Datenschutzerklärung</a>.</span></label>
  <button class="btn btn--primary btn--block" type="submit">Rückruf anfordern ${icon('phone')}</button>
</form>`;
}

/* ---------- Vorteile für Bauträger ---------- */
export const BUILDER_BENEFITS = [
  ['doc', 'Angebot nach Ihren Plänen', 'Grundrisse, Fensterliste oder Leistungsverzeichnis genügen. Wir kalkulieren das komplette Objekt – oder einzelne Häuser und Bauabschnitte.'],
  ['factory', 'Direkt vom Hersteller', 'Als Generalvertretung beziehen wir ohne Umweg über den Großhandel aus dem Werk von MIRAL PVC. Das hält die Kette kurz – bei Preis und Rückfragen.'],
  ['clock', 'Montage im Takt der Baustelle', 'Lieferung und Einbau stimmen wir auf Ihren Bauzeitenplan ab – Haus für Haus oder Abschnitt für Abschnitt.'],
  ['window', 'Bemusterung & Sonderwünsche', 'Profile, Farben, Gläser und Türfüllungen geben Sie vorab frei. Sonderwünsche Ihrer Erwerber nehmen wir strukturiert auf.'],
  ['handshake', 'Ein Ansprechpartner', 'Vom Angebot über Aufmaß und Fertigung bis zur Abnahme sprechen Sie mit einer Person – statt zwischen Hersteller, Händler und Monteur zu vermitteln.'],
  ['shield', 'Saubere Übergabe', 'Abnahme je Abschnitt, Dokumentation der Montage und technische Kennwerte der Elemente für Ihre Unterlagen.'],
];

export function builderBenefits() {
  return `
<div class="features features--3">
  ${BUILDER_BENEFITS.map(([ic, t, d], i) => `<div class="feature reveal" style="--d:${(i % 3) * 70}ms"><span class="feature__icon">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></div>`).join('\n  ')}
</div>`;
}

/* ---------- Herstellerreferenzen Wohnungsbau ---------- */
export const RESIDENTIAL_REFS = [
  ['Wohnsiedlung mit 14 Gebäuden', 'Kroatien', 'HR'],
  ['Wohnkomplex', 'Zadar, Kroatien', 'HR'],
  ['Wohnhochhaus', 'Zagreb, Kroatien', 'HR'],
  ['Wohngebäude', 'Split, Kroatien', 'HR'],
  ['Wohn- und Geschäftshaus', 'Cazin, Bosnien und Herzegowina', 'BA'],
  ['Wohngebäude', 'Schweiz', 'CH'],
  ['Seniorenheim', 'Köln', 'DE'],
  ['Wohnanlagen', 'Dubrovnik, Kroatien', 'HR'],
];

export function residentialRefs(ctx, { limit = 8 } = {}) {
  return `
<ul class="refs refs--compact">
  ${RESIDENTIAL_REFS.slice(0, limit).map(([t, place, cc]) => `<li class="ref reveal"><span class="ref__cc">${cc}</span><div><b>${t}</b><small>${place}</small></div></li>`).join('\n  ')}
</ul>
<p class="fineprint">Herstellerreferenzen von MIRAL PVC. Alle Projekte mit Fotos: <a href="${SITE.miral.references}" target="_blank" rel="noopener">miral-pvc.com/reference</a></p>`;
}

/* ---------- Interaktive Lamellenfassade (CSS-3D, folgt Maus bzw. Scrollposition) ---------- */
export function lamellaVisual() {
  const group = (n) => `<div class="lamella-group">${'<span class="lamella"></span>'.repeat(n)}</div>`;
  return `<figure class="page-hero__media lamella-visual reveal" data-lamellas aria-label="Animierte Lamellenfassade: Holzlamellen vor Balkonen und Glasflächen">
    <div class="lamella-facade">
      <div class="lamella-floors" aria-hidden="true">${'<span></span>'.repeat(5)}</div>
      <div class="lamella-row" aria-hidden="true">${group(6)}${group(6)}${group(6)}${group(6)}</div>
    </div>
    <div class="scene-hud" aria-hidden="true"><span>Lamellenfassade</span><span>Maus bewegen</span></div>
    <span class="corner corner--tl"></span><span class="corner corner--br"></span>
  </figure>`;
}
