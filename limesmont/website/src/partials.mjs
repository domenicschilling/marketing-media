import { SITE, SERVICES, waLink } from './config.mjs';
import { icon } from './icons.mjs';
import { esc } from './layout.mjs';

export const img = (ctx, name, alt, { cls = '', eager = false, sizes = '(min-width: 900px) 50vw, 100vw', w = 1400, h = 812 } = {}) =>
  `<img class="${cls}" src="${ctx.a(`img/${name}.webp`)}" srcset="${ctx.a(`img/${name}-800.webp`)} 800w, ${ctx.a(`img/${name}.webp`)} 1400w" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

/* ---------- Seitenkopf für Unterseiten ---------- */
export function pageHero(ctx, { eyebrow, title, lead, image, imageAlt, actions = true, crumbs = [] }) {
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
        <a class="btn btn--primary" href="${ctx.r('kontakt/')}#anfrage">Kostenloses Angebot anfragen ${icon('arrow')}</a>
        <a class="btn btn--ghost-light" href="tel:${SITE.tel}">${icon('phone')} ${SITE.phone}</a>
      </div>` : ''}
    </div>
    ${image ? `<figure class="page-hero__media reveal">${img(ctx, image, imageAlt || '', { eager: true })}<span class="corner corner--tl"></span><span class="corner corner--br"></span></figure>` : ''}
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
    ['doc', 'Anfrage', 'Sie schildern uns Ihr Vorhaben – per Formular, Telefon oder WhatsApp. Fotos oder Pläne helfen bei der ersten Einschätzung.'],
    ['ruler', 'Beratung & Aufmaß', 'Wir besprechen Ausführung, Material und Termin und nehmen die Maße vor Ort genau auf.'],
    ['handshake', 'Angebot', 'Sie erhalten ein transparentes, schriftliches Angebot mit allen Positionen – ohne versteckte Kosten.'],
    ['truck', 'Lieferung & Montage', 'Wir koordinieren Lieferung und Montage, arbeiten sauber und übergeben das Ergebnis mit gemeinsamer Abnahme.'],
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
export function ctaBand(ctx, { title = 'Lassen Sie uns über Ihr Projekt sprechen.', text = 'Ob einzelne Haustür oder komplette Halle: Schildern Sie uns Ihr Vorhaben – wir melden uns schnellstmöglich mit einer ersten Einschätzung.' } = {}) {
  return `
<section class="cta-band">
  <div class="container cta-band__inner reveal">
    <div>
      <p class="eyebrow eyebrow--light">Kostenlos & unverbindlich</p>
      <h2>${title}</h2>
      <p>${text}</p>
    </div>
    <div class="cta-band__actions">
      <a class="btn btn--primary btn--lg" href="${ctx.r('kontakt/')}#anfrage">Angebot anfragen ${icon('arrow')}</a>
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
    ${radio('leistung', [['Fenster & Türen', 'window'], ['Glasfassade / Wintergarten', 'facade'], ['Sandwichpaneele', 'panel'], ['Industriemontage', 'factory'], ['Innenausbau', 'interior'], ['Montage- / Rückbauservice', 'tools'], ['Sonstiges', 'chat']])}
  </fieldset>

  <fieldset class="step" data-step>
    <legend>Um was für ein Objekt geht es?</legend>
    ${radio('objekt', [['Neubau'], ['Sanierung / Austausch'], ['Gewerbe / Halle'], ['Industrie / Produktion']])}
    <p class="field-label">Sie fragen an als</p>
    <div class="choice-row">
      <label class="choice choice--inline"><input type="radio" name="kundentyp" value="Privatkunde" required><span>Privatkunde</span></label>
      <label class="choice choice--inline"><input type="radio" name="kundentyp" value="Gewerbe / Unternehmen"><span>Gewerbe / Unternehmen</span></label>
    </div>
  </fieldset>

  <fieldset class="step" data-step>
    <legend>Was genau ist geplant?</legend>
    <label class="field"><span>Beschreibung</span>
      <textarea name="beschreibung" rows="5" required placeholder="z. B. 8 Kunststofffenster ca. 120 × 140 cm, weiß, Dreifachverglasung, inkl. Ausbau der alten Fenster"></textarea>
    </label>
    <div class="field-row">
      <label class="upload"><input type="file" name="datei1" accept="image/*,.pdf"><span>${icon('upload')}<b>Foto / Plan hinzufügen</b><small data-file-name>JPG, PNG oder PDF</small></span></label>
      <label class="upload"><input type="file" name="datei2" accept="image/*,.pdf"><span>${icon('upload')}<b>Weitere Datei</b><small data-file-name>optional</small></span></label>
    </div>
    <p class="field-hint">Max. 8 MB insgesamt. Fotos der Einbausituation helfen uns bei der ersten Einschätzung.</p>
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
