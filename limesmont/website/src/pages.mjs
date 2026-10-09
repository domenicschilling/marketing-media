import { SITE, SERVICES, OWN_PROJECTS, waLink } from './config.mjs';
import { icon } from './icons.mjs';
import { pageHero, serviceCards, processSteps, faq, faqSchema, ctaBand, profileStory, panelConfigurator, areaMap, miralStats, inquiryForm, callbackForm, img, builderBenefits, residentialRefs, lamellaHero, lamellaSection } from './partials.mjs';

const todo = (v, label) => (v ? v : `<mark class="todo">[${label} – vom Kunden zu ergänzen]</mark>`);

/* =====================================================================
   STARTSEITE
   ===================================================================== */
const BUILDER_FAQ = [
  ['Welche Unterlagen brauchen Sie für ein Angebot?', 'Am besten Grundrisse und Ansichten, eine Fensterliste bzw. ein Positionsplan oder Ihr Leistungsverzeichnis. Dazu die Anforderungen an Wärme-, Schall- und Einbruchschutz sowie Ihren groben Terminrahmen. Bei kleineren Vorhaben genügen Fotos und ungefähre Maße.'],
  ['Kalkulieren Sie komplette Wohnanlagen oder auch einzelne Bauabschnitte?', 'Beides. Wir rechnen das gesamte Objekt oder einzelne Häuser und Bauabschnitte – so, wie es zu Ihrer Vergabe und Ihrem Bauablauf passt.'],
  ['Wie stimmen Sie Lieferung und Montage auf den Bauzeitenplan ab?', 'Die Elemente werden nach Aufmaß gefertigt und abschnittsweise angeliefert. Montagetermine planen wir gemeinsam mit Ihrer Bauleitung und bestätigen sie mit der Auftragsbestätigung.'],
  ['Wie läuft die Bemusterung – auch für Sonderwünsche der Erwerber?', 'Sie geben Profilsystem, Farben, Gläser und Türfüllungen vorab frei. Abweichende Wünsche einzelner Erwerber nehmen wir je Einheit auf und berücksichtigen sie in Fertigung und Abrechnung.'],
  ['Welche technischen Nachweise erhalten wir?', 'Mit dem Angebot erhalten Sie die technischen Kennwerte der angebotenen Systeme (z. B. Uw-Werte), mit der Übergabe die Montagedokumentation und das Abnahmeprotokoll je Abschnitt.'],
];

const HOME_FAQ = [
  BUILDER_FAQ[0],
  BUILDER_FAQ[1],
  BUILDER_FAQ[2],
  ['Montieren Sie auch Bauelemente, die nicht bei Ihnen gekauft wurden?', 'In vielen Fällen ja – wir montieren genormte Fenster, Türen, Paneele und vorgefertigte Bauelemente aus Kunststoff, Aluminium oder Holz. Sprechen Sie uns mit den Produktdaten an, dann prüfen wir Ihr Vorhaben.'],
  ['In welchem Gebiet sind Sie tätig?', 'Unser Sitz ist in Wassertrüdingen. Wir sind vor allem in Westmittelfranken und Nordschwaben im Einsatz – etwa in Gunzenhausen, Dinkelsbühl, Ansbach, Nördlingen und Weißenburg. Industrie- und Gewerbeprojekte übernehmen wir auf Anfrage deutschlandweit.'],
  ['Welche Arbeiten führen Sie nicht aus?', 'Wir führen keine zulassungspflichtigen Handwerksarbeiten aus und nehmen keine Eingriffe in die Statik von Bauwerken vor. Unser Schwerpunkt ist der fachgerechte Einbau vorgefertigter, genormter Bauelemente.'],
];

const home = {
  path: '',
  title: 'LIMES MONT – Fenster & Türen für Bauträger, direkt vom Hersteller | Wassertrüdingen',
  description: 'Fenster, Türen und Fassaden für Wohnanlagen und Gewerbebauten: Angebot nach Plänen oder LV, Fertigung bei MIRAL PVC, Montage nach Bauzeitenplan. LIMES MONT – Generalvertretung Deutschland.',
  dark: true,
  bodyClass: 'is-home',
  schema: [faqSchema(HOME_FAQ)],
  body: (ctx) => `
<section class="hero" data-hero>
  <div class="hero__bg" aria-hidden="true"></div>
  <div class="container hero__grid">
    <div class="hero__text">
      <p class="eyebrow eyebrow--light hero__eyebrow"><span class="dot"></span> Für Bauträger &amp; Generalunternehmer</p>
      <h1 class="hero__title">Fenster &amp; Türen für Ihr Bauprojekt. <span>Direkt vom Hersteller.</span></h1>
      <p class="hero__lead">Als Generalvertretung von MIRAL PVC liefern und montieren wir Fenster, Türen und Fassaden für Mehrfamilienhäuser, Wohnanlagen und Gewerbebauten – kalkuliert nach Ihren Plänen, montiert nach Ihrem Bauzeitenplan.</p>
      <div class="actions">
        <a class="btn btn--primary btn--lg" href="${ctx.r('kontakt/')}#anfrage">Projekt anfragen ${icon('arrow')}</a>
        <a class="btn btn--ghost-light btn--lg" href="tel:${SITE.tel}">${icon('phone')} ${SITE.phone}</a>
      </div>
      <ul class="hero__points">
        <li>${icon('check')} Angebot nach Plänen oder LV</li>
        <li>${icon('check')} Montage nach Bauzeitenplan</li>
        <li>${icon('check')} Ein Ansprechpartner bis zur Abnahme</li>
      </ul>
    </div>
    <div class="hero__stage scene" data-scene="hero-house">
      <div class="hero__poster" aria-hidden="true">
        <img src="${ctx.a('img/logo-icon-dark-lg.png')}" alt="" width="295" height="353">
      </div>
      <div class="scene-hud" aria-hidden="true"><span>LM-01 · Montage</span><span data-hud>0 %</span></div>
    </div>
  </div>
  <a class="hero__scroll" href="#leistungen" aria-label="Weiter zu den Leistungen"><span></span></a>
</section>

<section class="trust" aria-label="Unser Partner MIRAL PVC in Zahlen">
  <div class="container">
    <p class="trust__intro"><b>Kapazität für ganze Wohnanlagen:</b> Als Generalvertretung für Deutschland liefern wir Fenster, Türen und Fassaden von MIRAL PVC – aus eigener Fertigung des Herstellers.</p>
    ${miralStats()}
  </div>
</section>

<section class="section" id="bautraeger">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Für Bauträger</p>
      <h2>Gebaut für das Objektgeschäft.</h2>
      <p class="lead">Bei einer Wohnanlage zählen Preis, Termine und ein Partner, der liefert, wenn die Baustelle so weit ist. Genau dafür ist unser Modell gemacht: Hersteller und Montage in einer Hand.</p>
    </div>
    ${builderBenefits()}
    <div class="actions">
      <a class="btn btn--primary" href="${ctx.r('kontakt/')}#anfrage">Pläne oder LV senden ${icon('arrow')}</a>
      <a class="btn btn--ghost" href="${ctx.r('bautraeger/')}">Mehr für Bauträger ${icon('arrow')}</a>
    </div>
  </div>
</section>

${profileStory(ctx)}

<section class="section section--tint" id="leistungen">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Leistungen</p>
      <h2>Von der Wohnanlage bis zur Gewerbehalle.</h2>
      <p class="lead">Unser Schwerpunkt sind Fenster, Türen und Fassaden im Objektbau. Dazu kommen Fassadenlamellen und -verkleidungen, Trockenbau, Sandwichpaneele und Industriemontage – alles aus einem Team.</p>
    </div>
    ${serviceCards(ctx)}
  </div>
</section>

${lamellaSection(ctx)}

<section class="section section--split">
  <div class="container split">
    <figure class="split__media reveal">
      ${img(ctx, 'paneelmontage', 'Monteure setzen ein Sandwichpaneel an einer Gewerbehalle', { w: 1400, h: 933 })}
      <span class="corner corner--tl"></span><span class="corner corner--br"></span>
    </figure>
    <div class="split__text reveal">
      <p class="eyebrow">Für Industrie &amp; Gewerbe</p>
      <h2>Montagepartner für Hallenbauer, Generalunternehmer und Betriebe.</h2>
      <p>Termindruck, Sicherheitsvorschriften und laufender Betrieb – auf Industriebaustellen zählt Verlässlichkeit. Wir montieren Sandwichpaneele, vorgefertigte Industrieelemente sowie Fenster- und Toranlagen und stimmen uns eng mit Bauleitung und anderen Gewerken ab.</p>
      <ul class="check-list">
        <li>${icon('check')} Wand-, Dach- und Fassadenpaneele</li>
        <li>${icon('check')} Montage vorgefertigter Industriekomponenten</li>
        <li>${icon('check')} Fenster, Türen, Tore und Glasfassaden im Objektbau</li>
        <li>${icon('check')} Saubere Dokumentation und gemeinsame Abnahme</li>
      </ul>
      <a class="btn btn--dark" href="${ctx.r('leistungen/industriemontage/')}">Industriemontage ${icon('arrow')}</a>
    </div>
  </div>
</section>

<section class="miral-band">
  <div class="container miral-band__grid">
    <div class="reveal">
      <p class="eyebrow eyebrow--light">Unser Herstellerpartner</p>
      <h2>Direkt vom Werk. Mit deutschem Ansprechpartner.</h2>
      <p>MIRAL PVC fertigt seit 1996 PVC- und Aluminiumfenster, Türen, Glasfassaden, Wintergärten und Sonnenschutz – und exportiert den Großteil der Produktion in die EU. Als Generalvertretung für Deutschland sind wir Ihr Ansprechpartner für Beratung, Aufmaß, Bestellung und Montage.</p>
      <div class="actions">
        <a class="btn btn--primary" href="${ctx.r('miral-pvc/')}">Mehr über MIRAL PVC ${icon('arrow')}</a>
        <a class="btn btn--ghost-light" href="${SITE.miral.url}" target="_blank" rel="noopener">miral-pvc.com ${icon('external')}</a>
      </div>
    </div>
    <ul class="product-list reveal">
      <li><b>PVC-Fenster &amp; -Türen</b><span>Mehrkammer-Profilsysteme, Hebe-Schiebe-Türen</span></li>
      <li><b>Aluminium-Systeme</b><span>Fenster, Türen, Haustüren</span></li>
      <li><b>Glasfassaden</b><span>Pfosten-Riegel-Systeme</span></li>
      <li><b>Wintergärten &amp; Trennwände</b><span>Aluminiumkonstruktionen</span></li>
      <li><b>Sonnenschutz</b><span>Rollläden, Raffstores, Klappläden, Insektenschutz</span></li>
      <li><b>Garagentore</b><span>Sektional- und Rolltore</span></li>
    </ul>
  </div>
</section>

<section class="section section--tint">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Referenzen im Wohnungsbau</p>
      <h2>Wohnanlagen, die schon mit MIRAL-Fenstern gebaut wurden.</h2>
      <p class="lead">Unser Herstellerpartner hat Wohnsiedlungen, Wohnhochhäuser und Mehrfamilienhäuser in mehreren Ländern Europas ausgestattet – eine Auswahl.</p>
    </div>
    ${residentialRefs(ctx)}
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Projektablauf</p>
      <h2>Von Ihren Plänen bis zur Abnahme.</h2>
    </div>
    ${processSteps()}
  </div>
</section>

<section class="section section--area">
  <div class="container split split--area">
    <div class="split__text reveal">
      <p class="eyebrow eyebrow--light">Einsatzgebiet</p>
      <h2>Zuhause in Wassertrüdingen. Unterwegs in der ganzen Region.</h2>
      <p>Kurze Wege, schnelle Termine: Wir betreuen Bauträger, Generalunternehmer, Gewerbe- und Privatkunden in Westmittelfranken und Nordschwaben. Für größere Wohnbau-, Gewerbe- und Industrieprojekte sind wir auf Anfrage deutschlandweit im Einsatz.</p>
      <ul class="tag-list">
        <li>Wassertrüdingen</li><li>Gunzenhausen</li><li>Dinkelsbühl</li><li>Ansbach</li><li>Feuchtwangen</li><li>Oettingen</li><li>Nördlingen</li><li>Weißenburg</li><li>Treuchtlingen</li><li>Donauwörth</li>
      </ul>
    </div>
    <div class="reveal">${areaMap()}</div>
  </div>
</section>

<section class="section">
  <div class="container narrow">
    <div class="section-head section-head--center reveal">
      <p class="eyebrow">Häufige Fragen</p>
      <h2>Gut zu wissen</h2>
    </div>
    ${faq(HOME_FAQ)}
  </div>
</section>

${ctaBand(ctx)}
`,
};

/* =====================================================================
   FÜR BAUTRÄGER (Hauptzielgruppe)
   ===================================================================== */
const builders = {
  path: 'bautraeger/',
  title: 'Fenster & Türen für Bauträger – Objektgeschäft direkt vom Hersteller',
  description: 'Für Bauträger und Generalunternehmer: Fenster, Türen und Fassaden für Wohnanlagen und Mehrfamilienhäuser – Angebot nach Plänen oder LV, Fertigung bei MIRAL PVC, Montage nach Bauzeitenplan.',
  crumbs: [['Für Bauträger', 'bautraeger/']],
  preloadImg: 'fenster-haus-800.webp',
  schema: [
    { '@context': 'https://schema.org', '@type': 'Service', name: 'Fenster und Türen für Bauträger', serviceType: 'Lieferung und Montage von Fenstern, Türen und Fassaden im Objektbau', audience: { '@type': 'BusinessAudience', name: 'Bauträger, Projektentwickler und Generalunternehmer' }, provider: { '@id': SITE.url + '/#business' }, areaServed: 'Deutschland' },
    faqSchema(BUILDER_FAQ),
  ],
  body: (ctx) => `
${pageHero(ctx, { eyebrow: 'Für Bauträger & Generalunternehmer', title: 'Fenster, Türen und Fassaden für Ihre Wohnanlage.', lead: 'Ein Werk, ein Ansprechpartner, Ihr ganzes Projekt: Wir kalkulieren nach Ihren Plänen, lassen bei MIRAL PVC nach Maß fertigen und montieren im Takt Ihrer Baustelle.', image: 'fenster-haus', imageAlt: 'Modernes Wohngebäude mit großflächigen Fenstern und Fensterprofil im Querschnitt', crumbs: [['Für Bauträger', 'bautraeger/']] })}

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Ihre Vorteile</p>
      <h2>Hersteller und Montage in einer Hand.</h2>
      <p class="lead">Im Objektgeschäft gehen Marge und Zeitplan oft an den Schnittstellen verloren – zwischen Hersteller, Händler und Montagebetrieb. Bei uns gibt es diese Schnittstellen nicht.</p>
    </div>
    ${builderBenefits()}
  </div>
</section>

${profileStory(ctx)}

<section class="section">
  <div class="container split split--text">
    <div class="prose reveal">
      <p class="eyebrow">Lieferumfang</p>
      <h2>Was wir für Ihr Projekt liefern und montieren</h2>
      <p>Aus dem Programm von MIRAL PVC stellen wir das Paket zusammen, das zu Ihrem Objekt, Ihrem Budget und den Anforderungen aus GEG, Schall- und Einbruchschutz passt.</p>
      <ul class="check-list">
        <li>${icon('check')} Kunststofffenster in Mehrkammer-Profilsystemen – weiß, farbig oder in Holzdekor</li>
        <li>${icon('check')} Aluminiumfenster und -türen für Gewerbeeinheiten und Treppenhäuser</li>
        <li>${icon('check')} Hauseingangstüren und Wohnungs-Außentüren</li>
        <li>${icon('check')} Balkon- und Terrassentüren, Hebe-Schiebe-Anlagen</li>
        <li>${icon('check')} Rollläden, Raffstores und Insektenschutz</li>
        <li>${icon('check')} Balkon- und Treppengeländer aus Aluminium</li>
        <li>${icon('check')} Glasfassaden und Pfosten-Riegel-Konstruktionen</li>
        <li>${icon('check')} Fassadenlamellen in Holzoptik und Fassadenverkleidungen</li>
        <li>${icon('check')} Trockenbau: Ständerwände, Decken, Vorsatzschalen</li>
        <li>${icon('check')} Fensterbänke innen und außen</li>
      </ul>
      <a class="btn btn--dark" href="${ctx.r('miral-pvc/')}">Zum Produktprogramm ${icon('arrow')}</a>
    </div>
    <div class="panel reveal">
      <h2 class="panel__title">Diese Unterlagen helfen uns beim Angebot</h2>
      <ul class="check-list">
        <li>${icon('doc')} Grundrisse und Ansichten</li>
        <li>${icon('doc')} Fensterliste bzw. Positionsplan</li>
        <li>${icon('doc')} Leistungsverzeichnis (PDF, Excel oder GAEB)</li>
        <li>${icon('doc')} Anforderungen an Uw-Wert, Schallschutz, Einbruchschutz</li>
        <li>${icon('doc')} Bauzeitenplan bzw. gewünschter Montagezeitraum</li>
        <li>${icon('doc')} Ansprechpartner Ihrer Bauleitung</li>
      </ul>
      <a class="btn btn--primary btn--block" href="${ctx.r('kontakt/')}#anfrage">Unterlagen hochladen ${icon('upload')}</a>
    </div>
  </div>
</section>

<section class="section section--tint">
  <div class="container">
    <div class="section-head reveal"><p class="eyebrow">Projektablauf</p><h2>So läuft Ihr Projekt mit uns.</h2></div>
    ${processSteps()}
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Referenzen im Wohnungsbau</p>
      <h2>Erfahrung aus Wohnanlagen in ganz Europa.</h2>
    </div>
    ${residentialRefs(ctx)}
  </div>
</section>

<section class="trust" aria-label="MIRAL PVC in Zahlen">
  <div class="container">
    <p class="trust__intro"><b>Das Werk hinter unseren Fenstern:</b> MIRAL PVC fertigt seit 1996 Fenster, Türen und Fassadensysteme aus PVC und Aluminium für Projekte in ganz Europa.</p>
    ${miralStats()}
  </div>
</section>

<section class="section">
  <div class="container narrow">
    <div class="section-head section-head--center reveal"><p class="eyebrow">Fragen &amp; Antworten</p><h2>Häufige Fragen von Bauträgern</h2></div>
    ${faq(BUILDER_FAQ)}
  </div>
</section>

${ctaBand(ctx)}
`,
};

/* =====================================================================
   LEISTUNGEN – Übersicht
   ===================================================================== */
const services = {
  path: 'leistungen/',
  title: 'Leistungen – Fenster, Türen, Sandwichpaneele & Industriemontage',
  description: 'Alle Leistungen von LIMES MONT: Fenster und Türen, Glasfassaden, Fassadenlamellen und Fassadenverkleidung, Trockenbau und Innenausbau, Sandwichpaneele, Industriemontage sowie Montage- und Rückbauservice.',
  crumbs: [['Leistungen', 'leistungen/']],
  body: (ctx) => `
${pageHero(ctx, { eyebrow: 'Leistungen', title: 'Montage, die passt – vom Fenster bis zur Halle.', lead: 'Wir verbinden den Vertrieb hochwertiger Fenster-, Tür- und Fassadenelemente mit eigener Montage. Für private Bauherren, Gewerbe und Industrie.', image: 'dachmontage', imageAlt: 'Monteure bei der Dachmontage von Sandwichpaneelen', crumbs: [['Leistungen', 'leistungen/']] })}
<section class="section">
  <div class="container">
    ${serviceCards(ctx)}
    <aside class="note reveal">
      ${icon('shield')}
      <p><b>Hinweis:</b> Wir führen keine zulassungspflichtigen Handwerksarbeiten aus und nehmen keine Eingriffe in die Statik von Bauwerken vor. Unser Leistungsschwerpunkt ist der fachgerechte Einbau vorgefertigter, genormter Bauelemente sowie Montage-, Demontage- und Serviceleistungen.</p>
    </aside>
  </div>
</section>
<section class="section section--tint">
  <div class="container">
    <div class="section-head reveal"><p class="eyebrow">Ablauf</p><h2>So läuft Ihr Projekt mit uns.</h2></div>
    ${processSteps()}
  </div>
</section>
${ctaBand(ctx)}
`,
};

/* =====================================================================
   LEISTUNGSSEITEN (gemeinsame Vorlage)
   ===================================================================== */
const SERVICE_CONTENT = {
  'fenster-tueren': {
    seo: 'Fenster & Türen kaufen und montieren lassen – Wassertrüdingen',
    description: 'PVC- und Aluminiumfenster, Haustüren und Hebe-Schiebe-Türen von MIRAL PVC – Beratung, Aufmaß, Lieferung und Montage aus einer Hand. Für Neubau und Sanierung.',
    eyebrow: 'Fenster & Türen',
    h1: 'Neue Fenster und Türen – geliefert vom Hersteller, eingebaut von uns.',
    lead: 'Kunststoff- oder Aluminiumfenster, Hauseingangs-, Balkon- und Hebe-Schiebe-Türen für Wohnanlagen, Mehrfamilienhäuser und Sanierungen – kalkuliert nach Plänen, gefertigt bei MIRAL PVC, montiert von uns.',
    image: 'fenster-haus',
    imageAlt: 'Modernes Wohnhaus mit großen Glasflächen und Fensterprofil im Querschnitt',
    intro: ['Ob Wohnanlage mit mehreren Häusern, Mehrfamilienhaus oder einzelne Sanierung: Fenster und Türen entscheiden über Energiebedarf, Schallschutz und Wohnkomfort – und bei Bauträgerprojekten über Kosten und Termine. Damit alles passt, müssen Produkt, Kalkulation und Einbau zusammenspielen. Genau darum kümmern wir uns.', 'Als Generalvertretung von MIRAL PVC haben wir direkten Zugang zu modernen Mehrkammer-Profilsystemen aus Kunststoff und Aluminium. Sie bekommen Fenster und Türen nach Maß – und einen Ansprechpartner, der von der Beratung bis zur Abnahme für Sie da ist.'],
    listTitle: 'Was wir für Sie einbauen',
    list: ['Komplette Fensterpakete für Wohnanlagen und Mehrfamilienhäuser', 'Kunststofffenster (PVC) in Weiß, Farbe oder Holzdekor', 'Aluminiumfenster und -türen', 'Haustüren aus PVC und Aluminium', 'Balkon- und Terrassentüren', 'Hebe-Schiebe- und Schiebetüren für große Glasflächen', 'Austausch alter Fenster inkl. Ausbau und Entsorgung', 'Fensterbänke innen und außen, Rollläden, Insektenschutz'],
    features: [
      ['leaf', 'Energieeffizient', 'Mehrkammerprofile und Zwei- oder Dreifach-Isolierglas senken den Wärmeverlust deutlich.'],
      ['shield', 'Sicher', 'Stahlverstärkte Profile und hochwertige Beschläge – einbruchhemmende Ausstattung auf Anfrage.'],
      ['ruler', 'Nach Maß', 'Jedes Element wird nach unserem Aufmaß gefertigt – für einen sauberen, dichten Anschluss.'],
      ['truck', 'Ein Ansprechpartner', 'Beratung, Bestellung, Lieferung und Montage koordinieren wir aus einer Hand.'],
    ],
    extra: 'story',
    faq: [
      ['Kunststoff oder Aluminium – was ist besser?', 'Kunststofffenster bieten sehr gute Dämmwerte zu einem attraktiven Preis und sind pflegeleicht. Aluminium punktet bei großen Glasflächen, schlanken Ansichten und hoher Stabilität, etwa für moderne Architektur oder Gewerbebauten. Wir beraten Sie gern zu Ihrem Objekt.'],
      ['Zwei- oder Dreifachverglasung?', 'Für Neubauten und energetische Sanierungen ist Dreifachverglasung heute meist die bessere Wahl. In manchen Fällen – etwa bei Nebenräumen – kann Zweifachverglasung ausreichen. Wir zeigen Ihnen die Unterschiede.'],
      ['Wie lange dauert der Fenstertausch?', 'Ein einzelnes Fenster ist meist in wenigen Stunden getauscht. Bei einem Einfamilienhaus planen wir in der Regel ein bis drei Tage ein – inklusive Ausbau, Einbau und Abdichtung.'],
    ],
  },
  'fassaden-wintergarten': {
    seo: 'Glasfassaden, Wintergärten & Trennwände aus Aluminium',
    description: 'Aluminium-Glasfassaden, Wintergärten, Trennwandsysteme und Geländer von MIRAL PVC – geplant, geliefert und montiert von LIMES MONT.',
    eyebrow: 'Glasfassaden & Wintergärten',
    h1: 'Glasfassaden und Wintergärten, die Räume öffnen.',
    lead: 'Pfosten-Riegel-Fassaden, Wintergärten, Innen-Trennwände und Geländer aus Aluminium – für Gewerbe, Büro und anspruchsvolle Wohnhäuser.',
    image: 'fenster-haus',
    imageAlt: 'Wohnhaus mit großen Glasfassaden in Aluminium',
    intro: ['Große Glasflächen bringen Licht in Gebäude und prägen ihre Architektur. Damit sie dauerhaft dicht, sicher und energieeffizient sind, braucht es durchdachte Aluminiumsysteme und eine präzise Montage.', 'Über MIRAL PVC liefern wir Fassaden-, Wintergarten-, Trennwand- und Geländersysteme aus eigener Fertigung des Herstellers. Wir übernehmen Aufmaß, Abstimmung mit Planern und die Montage auf der Baustelle.'],
    listTitle: 'Systeme im Überblick',
    list: ['Pfosten-Riegel-Glasfassaden (z. B. Systeme 50 FK und 60 K)', 'Fassadenbekleidungen aus Aluminium', 'Wintergärten – selbsttragend, voll verglast und wärmegedämmt', 'Innen-Trennwände mit Türen (z. B. System PF 100 S)', 'Geländer- und Brüstungssysteme (z. B. OF 60 / OF 80 / OF 100)', 'Sonnenschutz: Raffstores, Brise Soleil, Alu-Klappläden'],
    features: [
      ['facade', 'Architektur', 'Schlanke Ansichten, große Glasformate und viele Farben dank Pulverbeschichtung.'],
      ['leaf', 'Wärmegedämmt', 'Thermisch getrennte Profile für Außenanwendungen und Wintergärten.'],
      ['shield', 'Geprüfte Systeme', 'Geländersysteme laut Hersteller nach EN 1991-1-1 getestet.'],
      ['handshake', 'Abstimmung', 'Wir arbeiten eng mit Architekten, Bauleitung und anderen Gewerken zusammen.'],
    ],
    faq: [
      ['Planen Sie auch individuelle Fassaden?', 'Ja. Auf Basis Ihrer Pläne oder eines Aufmaßes stimmen wir Ausführung, Glas und Profilsystem mit Ihnen und dem Hersteller ab.'],
      ['Ist ein Wintergarten genehmigungspflichtig?', 'Das hängt vom Bundesland, der Größe und der Nutzung ab. In Bayern regelt das die Bayerische Bauordnung – klären Sie die Genehmigungsfrage bitte vorab mit Ihrem Bauamt oder Planer.'],
    ],
  },
  sandwichpaneele: {
    seo: 'Sandwichpaneele Montage – Wand, Dach & Fassade',
    description: 'Montage von Sandwichpaneelen für Hallen, Gewerbe- und Industriebauten: Wand-, Dach- und Fassadenpaneele – präzise, sicher und termingerecht. Mit interaktivem 3D-Paneel.',
    eyebrow: 'Sandwichpaneele',
    h1: 'Sandwichpaneele für Hallen, Gewerbe und Industrie.',
    lead: 'Wir montieren Wand-, Dach- und Fassadenpaneele für Produktions-, Lager- und Gewerbehallen – sauber, sicher und im Zeitplan.',
    image: 'dachmontage',
    imageAlt: 'Monteure verlegen Trapez-Sandwichpaneele auf einem Hallendach',
    intro: ['Sandwichpaneele sind die schnellste Art, eine Halle dicht und gedämmt zu bekommen: zwei Stahldeckschalen mit einem Dämmkern aus PIR-Hartschaum oder Mineralwolle, fertig beschichtet und in einem Arbeitsgang montiert.', 'Wir übernehmen die Montage für Bauherren, Hallenbauer und Generalunternehmer – von der Wand bis zum Dach, inklusive Kantteilen, Anschlüssen und dem Einbau von Fenstern, Türen und Toren.'],
    listTitle: 'Unsere Leistungen',
    list: ['Wandpaneele – horizontal und vertikal verlegt', 'Dachpaneele (Trapezprofil) für Hallendächer', 'Fassadenpaneele mit verdeckter Befestigung', 'Wandverkleidungen und Trennwände aus Paneelen', 'Kantteile, Attika-, First- und Ortgangabschlüsse', 'Einbau von Fenstern, Türen, Toren und Lichtbändern in Paneelwände'],
    features: [
      ['clock', 'Schnell', 'Großformatige Elemente bedeuten kurze Montagezeiten und frühen Witterungsschutz.'],
      ['leaf', 'Gedämmt', 'PIR- oder Mineralwollkern je nach Anforderung an Wärme- und Brandschutz.'],
      ['shield', 'Sicher', 'Montage mit geeigneter Hebetechnik und Absturzsicherung nach den geltenden Vorschriften.'],
      ['handshake', 'Abgestimmt', 'Enge Abstimmung mit Stahlbau, Bauleitung und Folgegewerken.'],
    ],
    extra: 'configurator',
    faq: [
      ['Liefern Sie die Paneele auch?', 'Auf Wunsch übernehmen wir die Beschaffung über unsere Lieferanten – oder montieren bauseits gestellte Paneele. Sprechen Sie uns an.'],
      ['Welche Kerndicke brauche ich?', 'Das hängt von Nutzung, Beheizung und den Anforderungen des Gebäudeenergiegesetzes bzw. des Brandschutzes ab. Für beheizte Hallen sind 100 mm und mehr üblich, für Kühlräume deutlich mehr. Die Festlegung erfolgt durch Ihren Planer.'],
      ['Arbeiten Sie auch für Generalunternehmer?', 'Ja – ein großer Teil unserer Montageleistungen entsteht als Nachunternehmer für Hallenbauer und Generalunternehmer.'],
    ],
  },
  industriemontage: {
    seo: 'Industriemontage – vorgefertigte Elemente & Komponenten',
    description: 'Fachgerechte Montage vorgefertigter Industrieelemente und Komponenten für Produktions- und Gewerbeobjekte. LIMES MONT – Ihr Montagepartner aus Wassertrüdingen.',
    eyebrow: 'Industriemontage',
    h1: 'Industriemontage – präzise, sicher, termintreu.',
    lead: 'Wir montieren vorgefertigte Industrieelemente und Komponenten für Produktions- und Gewerbeobjekte – als zuverlässiger Partner für Betreiber, Hallenbauer und Generalunternehmer.',
    image: 'paneelmontage',
    imageAlt: 'Monteure mit Kran bei der Montage von Fassadenelementen an einer Industriehalle',
    intro: ['Auf Industriebaustellen greifen viele Gewerke ineinander. Wer hier montiert, muss Pläne lesen, Toleranzen einhalten, Sicherheitsvorgaben leben und sich nahtlos in den Bauablauf einfügen.', 'Unser Team aus Monteuren und Projektleitern übernimmt die Montage vorgefertigter Elemente – von Paneelen und Bauelementen bis zu industriellen Montagekomponenten. Auch Zweigniederlassungen und Projekteinsätze außerhalb der Region sind möglich.'],
    listTitle: 'Typische Aufgaben',
    list: ['Montage vorgefertigter Industrie- und Bauelemente', 'Hallen- und Fassadenelemente, Sandwichpaneele', 'Fenster, Türen, Tore und Lichtbänder im Objektbau', 'Montage industrieller Komponenten nach Plan', 'Demontage- und Rückbauarbeiten (zulassungsfrei)', 'Montageteams für Projekteinsätze außerhalb der Region'],
    features: [
      ['shield', 'Arbeitssicherheit', 'Arbeit nach den geltenden Sicherheits- und Industriestandards, eingewiesenes Personal.'],
      ['clock', 'Termintreue', 'Realistische Planung und klare Kommunikation, wenn sich auf der Baustelle etwas ändert.'],
      ['ruler', 'Präzision', 'Montage nach Plan und Toleranz – mit Dokumentation und gemeinsamer Abnahme.'],
      ['globe', 'Flexibel im Einsatz', 'Projekte in der Region und auf Anfrage deutschlandweit.'],
    ],
    faq: [
      ['Wie kurzfristig können Sie starten?', 'Das hängt von Projektumfang und Auslastung ab. Melden Sie sich möglichst früh mit Zeitraum und Leistungsumfang – wir sagen Ihnen schnell, was möglich ist.'],
      ['Arbeiten Sie nach Leistungsverzeichnis?', 'Ja. Senden Sie uns LV, Pläne und Terminrahmen über das Anfrageformular – wir erstellen Ihnen ein Angebot.'],
    ],
  },
  'trockenbau-innenausbau': {
    seo: 'Trockenbau & Innenausbau – Ständerwände, Decken, Dachgeschossausbau',
    description: 'Trockenbau für Wohnanlagen und Gewerbe: Metallständerwände, abgehängte Decken, Vorsatzschalen und Dachgeschossausbau – dazu Einbau von Innentüren, Küchen und Schranksystemen. LIMES MONT, Wassertrüdingen.',
    eyebrow: 'Trockenbau & Innenausbau',
    h1: 'Trockenbau und Innenausbau – schnell, sauber, termingerecht.',
    lead: 'Ständerwände, abgehängte Decken, Vorsatzschalen und Dachgeschossausbau: Wir bauen Wohnanlagen und Gewerbeflächen im Takt Ihrer Baustelle aus – auf Wunsch inklusive Innentüren, Küchen und Einbauten.',
    image: 'innenausbau',
    imageAlt: 'Innenraum mit Rahmenelementen in Dunkelgrün und Hellgrün und moderner Küche',
    intro: ['Trockenbau ist das Rückgrat des modernen Innenausbaus: schnell, flexibel und ohne lange Trocknungszeiten. Gerade bei Wohnanlagen mit vielen gleichen Einheiten zählen eingespielte Abläufe und verlässliche Termine – damit die Folgegewerke pünktlich weiterarbeiten können.', 'Wir arbeiten nach Plan und nach den Systemvorgaben der Hersteller und übernehmen auf Wunsch auch die anschließende Montage von Innentüren, Küchen und Einbauten. So haben Sie für den kompletten Innenausbau einen Ansprechpartner.'],
    listTitle: 'Leistungen im Innenausbau',
    list: ['Metallständerwände und Trennwände', 'Abgehängte Decken und Unterdecken', 'Vorsatzschalen und Installationswände', 'Dachgeschossausbau', 'Spachtelarbeiten in der gewünschten Oberflächenqualität', 'Innentüren und Zargen', 'Einbau von Küchen, Schranksystemen und Einbaumöbeln', 'Sockelleisten, Profile und Abschlussleisten'],
    features: [
      ['clock', 'Im Takt der Baustelle', 'Wohnung für Wohnung, Geschoss für Geschoss – abgestimmt mit Rohbau, Haustechnik und Malern.'],
      ['ruler', 'Nach System', 'Ausführung nach Plan und den Systemvorgaben der Hersteller – inklusive der Schall- und Brandschutzanforderungen aus Ihrer Planung.'],
      ['leaf', 'Sauber', 'Abdecken, aufräumen, Verschnitt mitnehmen – die Baustelle bleibt ordentlich.'],
      ['handshake', 'Ein Team', 'Trockenbau, Türen und Einbauten aus einer Hand – weniger Schnittstellen für Ihre Bauleitung.'],
    ],
    faq: [
      ['Übernehmen Sie den Trockenbau für ganze Wohnanlagen?', 'Ja. Wir kalkulieren nach Plänen oder Leistungsverzeichnis und arbeiten Einheit für Einheit nach Ihrem Bauzeitenplan.'],
      ['Bauen Sie auch Küchen ein, die selbst gekauft wurden?', 'Ja, wir montieren auch Küchen und Möbel, die bei einem Händler gekauft wurden. Elektro- und Wasseranschlüsse müssen gegebenenfalls von einem zugelassenen Fachbetrieb ausgeführt werden.'],
    ],
  },
  fassadenlamellen: {
    seo: 'Fassadenlamellen & Fassadenverkleidung – Lamellenfassade, VHF, Parkhausfassade',
    description: 'Montage von Fassadenlamellen in Holzoptik, Lamellenfassaden aus Aluminium, Fassadenplatten als vorgehängte hinterlüftete Fassade und Parkhausfassaden – für Wohnanlagen, Hotels und Gewerbebauten.',
    eyebrow: 'Fassadenlamellen & Fassadenverkleidung',
    h1: 'Lamellenfassaden und Verkleidungen, die ein Gebäude prägen.',
    lead: 'Senkrechte Lamellen in Holzoptik, großformatige Fassadenplatten und luftige Parkhausfassaden: Wir montieren Fassadenverkleidungen für Wohnanlagen, Hotels, Büro- und Parkhäuser.',
    media: 'lamellas',
    extra: 'lamellas3d',
    intro: ['Fassadenlamellen sind das Markenzeichen moderner Wohn- und Hotelbauten: Sie gliedern die Fassade, setzen warme Akzente in Holzoptik und spenden zugleich Schatten und Sichtschutz. An Parkhäusern sorgen Lamellen- und Streckmetallfassaden für natürliche Belüftung bei geschlossenem Erscheinungsbild.', 'Wir montieren Unterkonstruktion und Fassadenelemente nach Planung und Herstellervorgaben – abgestimmt mit der Fenster- und Geländermontage, damit an den Anschlüssen alles zusammenpasst.'],
    listTitle: 'Systeme, die wir montieren',
    list: ['Vertikale und horizontale Fassadenlamellen aus Aluminium – pulverbeschichtet oder in Holzdekor', 'Lamellen aus WPC und Holz', 'Fassadenplatten (z. B. HPL, Faserzement, Aluminium-Verbund) als vorgehängte hinterlüftete Fassade', 'Parkhausfassaden aus Lamellen, Streckmetall oder Lochblech', 'Sonnenschutz-Lamellen und feste Brise Soleil', 'Glas- und Aluminiumgeländer für Balkone und Loggien', 'Attika-, Laibungs- und Kantteile'],
    features: [
      ['louvre', 'Gestaltung', 'Lamellen in Holzoptik oder RAL-Farbe gliedern die Fassade und setzen Akzente – wie an modernen Wohnanlagen und Hotels.'],
      ['leaf', 'Sonnen- & Sichtschutz', 'Lamellen verschatten Fenster und Loggien und schützen die Privatsphäre, ohne das Licht auszusperren.'],
      ['factory', 'Für Parkhäuser', 'Offene Lamellen- und Streckmetallfassaden ermöglichen natürliche Belüftung bei geschlossener Optik.'],
      ['handshake', 'Alles aus einer Hand', 'Fenster, Geländer und Fassadenverkleidung abgestimmt montiert – ohne Schnittstellenprobleme an den Anschlüssen.'],
    ],
    faq: [
      ['Wie heißen die senkrechten „Holzlatten“ an modernen Fassaden?', 'Man spricht von Fassadenlamellen oder einer Lamellenfassade. Die Lamellen bestehen häufig aus pulverbeschichtetem Aluminium in Holzdekor – das sieht aus wie Holz, ist aber witterungsbeständig und pflegeleicht. Alternativen sind WPC oder echtes Holz.'],
      ['Was ist eine vorgehängte hinterlüftete Fassade (VHF)?', 'Bei einer VHF werden Fassadenplatten mit Abstand auf einer Unterkonstruktion vor der Dämmung montiert. Der Luftspalt dahinter führt Feuchtigkeit ab – die Konstruktion ist langlebig und gestalterisch sehr flexibel.'],
      ['Liefern Sie das Material auch?', 'Je nach Projekt beschaffen wir die Systeme über unsere Lieferanten – Sonnenschutz-Lamellen und Geländer auch direkt von MIRAL PVC – oder montieren bauseits gestelltes Material nach Ihrer Planung.'],
    ],
  },
  montageservice: {
    seo: 'Montageservice: Fensterbänke, Rollläden, Sonnenschutz & Rückbau',
    description: 'Montage von Fensterbänken, Rollläden, Sonnenschutz, Sockelleisten und Profilen sowie Demontage- und Rückbauarbeiten. LIMES MONT – schnell und zuverlässig.',
    eyebrow: 'Montage- & Rückbauservice',
    h1: 'Montage- und Rückbauservice – die vielen kleinen Dinge, gut gemacht.',
    lead: 'Fensterbänke, Rollläden, Sonnenschutz, Insektenschutz, Sockelleisten und Profile – und alles, was vorher raus muss: Demontage, Rückbau und Vorbereitung.',
    image: 'montageservice',
    imageAlt: 'Rohbau-Innenraum mit Rahmenelementen und Türblatt während der Montage',
    intro: ['Nicht jedes Projekt ist eine Großbaustelle. Oft geht es um Ergänzungen und Nachrüstungen – vom Rollladen über den Insektenschutz bis zur neuen Fensterbank. Auch dafür sind wir da.', 'Und bevor Neues eingebaut wird, muss Altes oft raus: Wir übernehmen Demontage-, Rückbau- und vorbereitende Arbeiten, soweit sie zulassungsfrei sind, und kümmern uns auf Wunsch um die Entsorgung.'],
    listTitle: 'Was wir übernehmen',
    list: ['Fensterbänke innen und außen', 'Rollläden, Raffstores und Sonnenschutzsysteme', 'Insektenschutz-Rahmen und -Türen', 'Sockelleisten, Profile und Abschlussleisten', 'Demontage alter Fenster, Türen und Bauelemente', 'Zulassungsfreie Rückbau- und Vorbereitungsarbeiten'],
    features: [
      ['clock', 'Flexibel', 'Auch kleinere Aufträge und Ergänzungen zu bestehenden Projekten.'],
      ['tools', 'Gut ausgestattet', 'Das richtige Werkzeug und Material für einen sauberen Abschluss.'],
      ['leaf', 'Entsorgung', 'Auf Wunsch kümmern wir uns um Abtransport und fachgerechte Entsorgung.'],
      ['handshake', 'Unkompliziert', 'Kurz anrufen oder per WhatsApp Fotos schicken – wir melden uns.'],
    ],
    faq: [
      ['Lohnt sich ein Anruf auch für kleine Aufträge?', 'Ja. Schicken Sie uns am besten ein paar Fotos per WhatsApp oder über das Formular – dann können wir Aufwand und Termin schnell einschätzen.'],
    ],
  },
};

function servicePage(s) {
  const c = SERVICE_CONTENT[s.slug];
  return {
    path: `leistungen/${s.slug}/`,
    title: c.seo,
    description: c.description,
    crumbs: [['Leistungen', 'leistungen/'], [s.title, `leistungen/${s.slug}/`]],
    preloadImg: c.image ? `${c.image}-800.webp` : undefined,
    schema: [
      { '@context': 'https://schema.org', '@type': 'Service', name: s.title, serviceType: s.title, description: c.description, provider: { '@id': SITE.url + '/#business' }, areaServed: 'Westmittelfranken, Nordschwaben, Deutschland' },
      ...(c.faq?.length ? [faqSchema(c.faq)] : []),
    ],
    body: (ctx) => `
${pageHero(ctx, { eyebrow: c.eyebrow, title: c.h1, lead: c.lead, image: c.image, imageAlt: c.imageAlt, media: c.media === 'lamellas' ? lamellaHero() : undefined, crumbs: [['Leistungen', 'leistungen/'], [s.title, `leistungen/${s.slug}/`]] })}

<section class="section">
  <div class="container split split--text">
    <div class="prose reveal">
      ${c.intro.map((p) => `<p>${p}</p>`).join('\n      ')}
    </div>
    <div class="panel reveal">
      <h2 class="panel__title">${c.listTitle}</h2>
      <ul class="check-list">
        ${c.list.map((l) => `<li>${icon('check')} ${l}</li>`).join('\n        ')}
      </ul>
    </div>
  </div>
</section>

<section class="section section--tint">
  <div class="container">
    <div class="features">
      ${c.features.map(([ic, t, d], i) => `<div class="feature reveal" style="--d:${i * 70}ms"><span class="feature__icon">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>

${c.extra === 'story' ? profileStory(ctx) : ''}
${c.extra === 'lamellas3d' ? lamellaSection(ctx, { standalone: false }) : ''}
${c.extra === 'configurator' ? `
<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Interaktiv</p>
      <h2>Sandwichpaneel in 3D – Aufbau und Dämmwirkung.</h2>
      <p class="lead">Wählen Sie Paneeltyp, Kerndicke und Farbe und sehen Sie, wie sich der Wärmedurchgang verändert.</p>
    </div>
    ${panelConfigurator(ctx)}
  </div>
</section>` : ''}

${['fenster-tueren', 'fassaden-wintergarten', 'fassadenlamellen'].includes(s.slug) ? `
<section class="section section--compact">
  <div class="container">
    <a class="partner-strip reveal" href="${ctx.r('miral-pvc/')}">
      <span class="partner-strip__label">Hersteller</span>
      <span class="partner-strip__name">MIRAL PVC</span>
      <span class="partner-strip__text">Produkte aus eigener Fertigung des Herstellers – über uns als Generalvertretung in Deutschland.</span>
      <span class="partner-strip__more">Zum Partner ${icon('arrow')}</span>
    </a>
  </div>
</section>` : ''}

<section class="section${c.extra === 'story' ? '' : ' section--tint'}">
  <div class="container">
    <div class="section-head reveal"><p class="eyebrow">Ablauf</p><h2>So einfach geht's.</h2></div>
    ${processSteps()}
  </div>
</section>

${c.faq?.length ? `
<section class="section">
  <div class="container narrow">
    <div class="section-head section-head--center reveal"><p class="eyebrow">Fragen &amp; Antworten</p><h2>Häufige Fragen zu ${s.title}</h2></div>
    ${faq(c.faq)}
  </div>
</section>` : ''}

<section class="section section--tint">
  <div class="container">
    <div class="section-head reveal"><p class="eyebrow">Weitere Leistungen</p><h2>Das könnte Sie auch interessieren.</h2></div>
    ${serviceCards(ctx, { exclude: s.slug })}
  </div>
</section>

${ctaBand(ctx, { title: `Ihr Projekt: ${s.title}.`, text: 'Beschreiben Sie uns kurz Ihr Vorhaben – gern mit Fotos oder Plänen. Wir melden uns mit einer ersten Einschätzung und einem Terminvorschlag.' })}
`,
  };
}

/* =====================================================================
   MIRAL PVC
   ===================================================================== */
const miral = {
  path: 'miral-pvc/',
  title: 'MIRAL PVC – Generalvertretung Deutschland',
  description: 'LIMES MONT ist Generalvertretung von MIRAL PVC in Deutschland: PVC- und Aluminiumfenster, Türen, Glasfassaden, Wintergärten, Sonnenschutz und Garagentore – Beratung, Aufmaß und Montage aus einer Hand.',
  crumbs: [['MIRAL PVC', 'miral-pvc/']],
  dark: false,
  body: (ctx) => `
${pageHero(ctx, { eyebrow: 'Herstellerpartner', title: 'MIRAL PVC – Generalvertretung für Deutschland.', lead: 'Fenster, Türen, Fassaden und Sonnenschutz aus eigener Fertigung des Herstellers – mit LIMES MONT als deutschem Ansprechpartner für Beratung, Aufmaß, Bestellung und Montage.', image: 'fenster-haus', imageAlt: 'Modernes Haus mit großflächiger Verglasung', crumbs: [['MIRAL PVC', 'miral-pvc/']] })}

<section class="section">
  <div class="container split split--text">
    <div class="prose reveal">
      <h2>Über den Hersteller</h2>
      <p>MIRAL PVC d.o.o. wurde 1996 als Familienunternehmen gegründet und hat seinen Sitz in Velika Kladuša (Bosnien und Herzegowina). Was mit der Fertigung von PVC-Fenstern begann, ist heute ein breit aufgestellter Hersteller von PVC- und Aluminiumelementen mit über 140 Mitarbeitenden und mehr als 13.000 m² Produktionsfläche mit modernen CNC-Bearbeitungszentren.</p>
      <p>Seit 1998 liefert MIRAL PVC in europäische Märkte – heute geht der überwiegende Teil der Produktion in Länder der EU. Zu den Referenzen gehören Wohn- und Geschäftsgebäude, Hotels, Schulen und Gewerbebauten in Kroatien, Italien, der Schweiz, Deutschland und weiteren Ländern.</p>
      <h2>Was die Generalvertretung für Sie bedeutet</h2>
      <p>Sie kaufen nicht anonym im Ausland, sondern bei einem Unternehmen vor Ort: Wir beraten Sie, nehmen Maß, bestellen beim Werk, koordinieren die Lieferung und montieren die Elemente mit unserem eigenen Team. Bei Fragen haben Sie einen festen, deutschsprachigen Ansprechpartner.</p>
      <div class="actions">
        <a class="btn btn--primary" href="${SITE.miral.url}" target="_blank" rel="noopener">Zur Herstellerseite miral-pvc.com ${icon('external')}</a>
        <a class="btn btn--ghost" href="${SITE.miral.catalog}" target="_blank" rel="noopener">${icon('doc')} Kataloge ansehen</a>
      </div>
    </div>
    <div class="panel panel--dark reveal">
      <p class="eyebrow eyebrow--light">Auf einen Blick</p>
      ${miralStats()}
    </div>
  </div>
</section>

<section class="section section--tint">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Produktprogramm</p>
      <h2>Das liefern und montieren wir von MIRAL PVC.</h2>
    </div>
    <div class="products">
      ${[
        ['window', 'PVC-Fenster', 'Mehrkammer-Profilsysteme wie IDEAL NEO MD, IDEAL 8000® und ENERGETO® NEO MD – mit sehr guten Dämmwerten.'],
        ['window', 'PVC-Türen & Schiebesysteme', 'Balkon- und Haustüren (z. B. IDEAL 4000® / 7000®), Smart-Slide und Hebe-Schiebe-Türen mit 85 mm Bautiefe.'],
        ['facade', 'Aluminium-Systeme', 'Fenster, Türen und Haustüren aus Aluminium – stabil, schlank und in vielen RAL-Farben pulverbeschichtet.'],
        ['facade', 'Glasfassaden', 'Pfosten-Riegel-Fassaden (z. B. 50 FK, 60 K) und Fassadenbekleidungen für Gewerbe- und Wohnbauten.'],
        ['leaf', 'Wintergärten', 'Selbsttragende, voll verglaste und wärmegedämmte Konstruktionen aus Aluminiumprofilen.'],
        ['interior', 'Trennwandsysteme', 'Innen-Trennwände mit Türen, z. B. System PF 100 S mit 100 mm Rahmentiefe, ein- oder zweifach verglast.'],
        ['shield', 'Geländer', 'Aluminium-Geländersysteme OF 60, OF 80 und OF 100 für Balkone, Treppen und Terrassen.'],
        ['panel', 'Sonnenschutz', 'Rollläden, Raffstores, feste Brise Soleil, Alu-Klappläden und Insektenschutz.'],
        ['factory', 'Garagentore', 'Sektionaltore mit PU-gedämmten Stahlpaneelen und Rolltore mit Aluminiumlamellen – manuell oder mit Motor.'],
      ]
        .map(([ic, t, d], i) => `<article class="product reveal" style="--d:${(i % 3) * 70}ms"><span class="product__icon">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></article>`)
        .join('\n      ')}
    </div>
    <p class="fineprint">Produktbezeichnungen laut Hersteller. Markenzeichen gehören ihren jeweiligen Inhabern. Technische Daten erhalten Sie mit dem Angebot.</p>
  </div>
</section>

<section class="section">
  <div class="container split">
    <div class="split__text reveal">
      <p class="eyebrow">Fertigung beim Hersteller</p>
      <h2>Alles aus einer Hand – auch im Werk.</h2>
      <p>MIRAL PVC fertigt viele Komponenten selbst. Das sorgt für kurze Wege, gleichbleibende Qualität und Flexibilität bei Sonderwünschen.</p>
      <ul class="check-list">
        <li>${icon('check')} Isolierglas aus eigener Produktion</li>
        <li>${icon('check')} Pulverbeschichtung von Aluminiumprofilen</li>
        <li>${icon('check')} Dekorative Aluminiumpaneele für Haustüren</li>
        <li>${icon('check')} Stahlverstärkungen für PVC-Profile</li>
        <li>${icon('check')} Rollladenwellen und -komponenten</li>
        <li>${icon('check')} Wasserstrahlschneiden plattenförmiger Materialien</li>
      </ul>
    </div>
    <div class="reveal">
      <div class="link-cards">
        <a class="link-card" href="${SITE.miral.url}" target="_blank" rel="noopener"><span>${icon('globe')}</span><b>Website des Herstellers</b><small>miral-pvc.com</small>${icon('external', 'i i--sm link-card__ext')}</a>
        <a class="link-card" href="${SITE.miral.catalog}" target="_blank" rel="noopener"><span>${icon('doc')}</span><b>Kataloge</b><small>inkl. deutscher Katalog</small>${icon('external', 'i i--sm link-card__ext')}</a>
        <a class="link-card" href="${SITE.miral.references}" target="_blank" rel="noopener"><span>${icon('factory')}</span><b>Referenzen des Herstellers</b><small>Projekte in ganz Europa</small>${icon('external', 'i i--sm link-card__ext')}</a>
        <a class="link-card" href="${SITE.miral.tour}" target="_blank" rel="noopener"><span>${icon('chat')}</span><b>Virtueller Rundgang</b><small>Ausstellung &amp; Werk</small>${icon('external', 'i i--sm link-card__ext')}</a>
      </div>
    </div>
  </div>
</section>

${ctaBand(ctx, { title: 'Fenster & Türen von MIRAL PVC anfragen.', text: 'Wir beraten Sie zu Profilsystem, Verglasung und Ausführung und erstellen Ihnen ein Angebot inklusive Montage.' })}
`,
};

/* =====================================================================
   REFERENZEN
   ===================================================================== */
const MIRAL_REFS = [
  ['Wohnsiedlung mit 14 Gebäuden', 'Kroatien', 'HR', 'Wohnen'],
  ['Wohnanlagen', 'Dubrovnik', 'HR', 'Wohnen'],
  ['Wohngebäude', 'Split', 'HR', 'Wohnen'],
  ['Wohn- und Geschäftshaus', 'Cazin', 'BA', 'Wohnen'],
  ['Seniorenheim', 'Köln', 'DE', 'Öffentlich'],
  ['Hotel Eraclea', 'Caorle', 'IT', 'Hotel'],
  ['Hotel Marina', 'Caorle', 'IT', 'Hotel'],
  ['Hotel Austria', 'Caorle', 'IT', 'Hotel'],
  ['Wohngebäude', 'Schweiz', 'CH', 'Wohnen'],
  ['Sportfachgeschäft', 'Schweiz', 'CH', 'Gewerbe'],
  ['Hotel Liberty', 'Novalja', 'HR', 'Hotel'],
  ['Hotel Amphora', 'Split', 'HR', 'Hotel'],
  ['Wohnhochhaus', 'Zagreb', 'HR', 'Wohnen'],
  ['Wohnkomplex', 'Zadar', 'HR', 'Wohnen'],
  ['Grundschule Središće', 'Zagreb', 'HR', 'Öffentlich'],
  ['Gründerzentrum', 'Novalja', 'HR', 'Gewerbe'],
  ['Aquaestil', 'Karlovac', 'HR', 'Gewerbe'],
  ['Verwaltungsgebäude Kolmix', 'Bosnien und Herzegowina', 'BA', 'Gewerbe'],
  ['Wohnhaus', 'Kanada', 'CA', 'Wohnen'],
  ['Glasfassade Werk MIRAL PVC', 'Velika Kladuša', 'BA', 'Gewerbe'],
];

const refs = {
  path: 'referenzen/',
  title: 'Referenzen – Projekte mit Fenstern, Fassaden & Montage',
  description: 'Referenzen von LIMES MONT und Herstellerreferenzen von MIRAL PVC: Hotels, Wohn- und Gewerbebauten, Schulen und Fassaden in ganz Europa.',
  crumbs: [['Referenzen', 'referenzen/']],
  body: (ctx) => `
${pageHero(ctx, { eyebrow: 'Referenzen', title: 'Projekte, die für sich sprechen.', lead: 'Von der Wohnsiedlung mit 14 Gebäuden bis zum Seniorenheim in Köln: Fenster, Türen und Fassaden unseres Herstellerpartners MIRAL PVC sind in ganz Europa verbaut.', image: 'paneelmontage', imageAlt: 'Montage von Fassadenelementen an einer Gewerbehalle', crumbs: [['Referenzen', 'referenzen/']] })}

${OWN_PROJECTS.length ? `
<section class="section">
  <div class="container">
    <div class="section-head reveal"><p class="eyebrow">LIMES MONT</p><h2>Unsere Projekte</h2></div>
    <div class="projects">
      ${OWN_PROJECTS.map((p) => `<article class="project reveal">${img(ctx, p.img, p.title, { w: 1400, h: 933 })}<div><span class="tag">${p.service}</span><h3>${p.title}</h3><p>${p.place} · ${p.text}</p></div></article>`).join('\n      ')}
    </div>
  </div>
</section>` : ''}

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Herstellerreferenzen MIRAL PVC</p>
      <h2>Fenster, Türen und Fassaden in ganz Europa.</h2>
      <p class="lead">Eine Auswahl von Objekten, die mit Produkten von MIRAL PVC ausgestattet wurden. Alle Projekte mit Bildern finden Sie auf der Website des Herstellers.</p>
    </div>
    <div class="ref-filter reveal" role="group" aria-label="Referenzen filtern">
      ${['Alle', 'Wohnen', 'Hotel', 'Gewerbe', 'Öffentlich'].map((f, i) => `<button type="button" class="chip${i === 0 ? ' is-active' : ''}" data-filter="${f}" aria-pressed="${i === 0}">${f}</button>`).join('')}
    </div>
    <ul class="refs">
      ${MIRAL_REFS.map(([t, place, cc, cat]) => `<li class="ref reveal" data-cat="${cat}"><span class="ref__cc">${cc}</span><div><b>${t}</b><small>${place} · ${cat}</small></div></li>`).join('\n      ')}
    </ul>
    <div class="actions actions--center">
      <a class="btn btn--dark" href="${SITE.miral.references}" target="_blank" rel="noopener">Alle Referenzen mit Fotos auf miral-pvc.com ${icon('external')}</a>
    </div>
  </div>
</section>

${ctaBand(ctx, { title: 'Ihr Projekt als nächste Referenz?', text: 'Erzählen Sie uns, was Sie vorhaben – wir beraten Sie gern.' })}
`,
};

/* =====================================================================
   ÜBER UNS
   ===================================================================== */
const about = {
  path: 'ueber-uns/',
  title: 'Über uns – Montagebetrieb aus Wassertrüdingen',
  description: 'LIMES MONT UG aus Wassertrüdingen: Montageleistungen für Industrie, Gewerbe und private Bauherren und Generalvertretung von MIRAL PVC in Deutschland. Geschäftsführer Anis Delalic.',
  crumbs: [['Über uns', 'ueber-uns/']],
  body: (ctx) => `
${pageHero(ctx, { eyebrow: 'Über uns', title: 'Ein Team. Ein Anspruch: Montage, auf die man sich verlassen kann.', lead: 'LIMES MONT steht für präzise Montage von Fenstern, Türen, Paneelen und vorgefertigten Bauelementen – und für einen direkten Draht vom Hersteller bis zur Baustelle.', image: 'paneelmontage', imageAlt: 'Montageteam bei der Arbeit an einer Gewerbehalle', crumbs: [['Über uns', 'ueber-uns/']] })}

<section class="section">
  <div class="container split split--text">
    <div class="prose reveal">
      <h2>Wer wir sind</h2>
      <p>Die LIMES MONT UG (haftungsbeschränkt) mit Sitz in Wassertrüdingen ist auf die Montage vorgefertigter Bauelemente spezialisiert: Fenster und Türen, Fassadenlamellen und -verkleidungen, Sandwichpaneele, Industrieelemente sowie Trockenbau und Innenausbau. Unser Team aus Monteuren und Projektleitern arbeitet für private Bauherren ebenso wie für Gewerbebetriebe, Hallenbauer und Generalunternehmer.</p>
      <p>Als Generalvertretung von MIRAL PVC für Deutschland verbinden wir zwei Welten: die Fertigungskompetenz eines großen europäischen Herstellers und den persönlichen Service eines regionalen Montagebetriebs.</p>
      <h2>Wofür wir stehen</h2>
      <ul class="values">
        <li><b>Präzision.</b> Aufmaß, Montage und Abdichtung so genau wie nötig – nicht so schnell wie möglich.</li>
        <li><b>Termintreue.</b> Wir planen realistisch und sagen rechtzeitig Bescheid, wenn sich etwas ändert.</li>
        <li><b>Sauberkeit.</b> Wir arbeiten ordentlich und hinterlassen die Baustelle aufgeräumt.</li>
        <li><b>Klare Worte.</b> Transparente Angebote ohne versteckte Kosten und ein fester Ansprechpartner.</li>
      </ul>
    </div>
    <aside class="person reveal">
      <div class="person__avatar" aria-hidden="true">AD</div>
      <p class="person__name">${SITE.ceo}</p>
      <p class="person__role">Geschäftsführer</p>
      <p>Ihr Ansprechpartner für Beratung, Angebot und Projektkoordination – von der ersten Anfrage bis zur Abnahme.</p>
      <a class="btn btn--primary btn--block" href="tel:${SITE.tel}">${icon('phone')} Direkt anrufen</a>
      <a class="btn btn--ghost btn--block" href="mailto:${SITE.email}">${icon('mail')} E-Mail schreiben</a>
    </aside>
  </div>
</section>

<section class="section section--area">
  <div class="container split split--area">
    <div class="split__text reveal">
      <p class="eyebrow eyebrow--light">Standort</p>
      <h2>Wassertrüdingen – mitten zwischen Franken und Schwaben.</h2>
      <p>Von hier aus erreichen wir schnell den Landkreis Ansbach, Weißenburg-Gunzenhausen und Donau-Ries. Für Industrie- und Gewerbeprojekte sind wir auf Anfrage deutschlandweit im Einsatz – und können bei Bedarf auch Niederlassungen im In- und Ausland einrichten.</p>
      <address class="address-block">${icon('pin')} ${SITE.name}<br>${SITE.street} · ${SITE.zip} ${SITE.city}</address>
    </div>
    <div class="reveal">${areaMap()}</div>
  </div>
</section>

<section class="section">
  <div class="container">
    <aside class="note reveal">
      ${icon('shield')}
      <p><b>Unser Leistungsrahmen:</b> Wir führen keine zulassungspflichtigen Handwerksarbeiten aus und nehmen keine statischen Veränderungen an Bauwerken vor. Wir bieten außerdem flexible Unternehmensdienstleistungen an.</p>
    </aside>
  </div>
</section>

${ctaBand(ctx)}
`,
};

/* =====================================================================
   KONTAKT
   ===================================================================== */
const contact = {
  path: 'kontakt/',
  title: 'Projekt anfragen – Kontakt',
  description: 'Projekt anfragen: Pläne, Fensterliste oder LV hochladen und ein Angebot für Fenster, Türen, Fassaden oder Montage erhalten. Telefon, WhatsApp oder E-Mail. LIMES MONT, Wassertrüdingen.',
  crumbs: [['Kontakt', 'kontakt/']],
  body: (ctx) => `
<section class="contact-hero">
  <div class="container">
    <nav class="crumbs" aria-label="Brotkrümelnavigation"><ol><li><a href="${ctx.r('')}">Startseite</a></li><li aria-current="page">Kontakt</li></ol></nav>
    <p class="eyebrow eyebrow--light">Kontakt</p>
    <h1>Erzählen Sie uns von Ihrem Projekt.</h1>
    <p class="lead">Schicken Sie uns Eckdaten und gern gleich Pläne, Fensterliste oder Leistungsverzeichnis. Je mehr wir wissen, desto genauer wird unsere erste Einschätzung.</p>
  </div>
</section>

<section class="section section--contact" id="anfrage">
  <div class="container contact-grid">
    <div class="contact-form reveal">
      <h2 class="visually-hidden">Anfrageformular</h2>
      ${inquiryForm(ctx)}
    </div>
    <aside class="contact-aside">
      <div class="contact-card reveal">
        <h2>Direkter Draht</h2>
        <a class="contact-line" href="tel:${SITE.tel}"><span>${icon('phone')}</span><div><small>Telefon</small><b>${SITE.phone}</b></div></a>
        <a class="contact-line" href="${waLink()}" target="_blank" rel="noopener"><span>${icon('chat')}</span><div><small>WhatsApp</small><b>Nachricht schreiben</b></div></a>
        <a class="contact-line" href="mailto:${SITE.email}"><span>${icon('mail')}</span><div><small>E-Mail</small><b>${SITE.email}</b></div></a>
        <a class="contact-line" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SITE.street}, ${SITE.zip} ${SITE.city}`)}" target="_blank" rel="noopener"><span>${icon('pin')}</span><div><small>Adresse</small><b>${SITE.street}, ${SITE.zip} ${SITE.city}</b></div></a>
        <p class="contact-card__person"><b>${SITE.ceo}</b> · Geschäftsführer</p>
      </div>
      <div class="contact-card contact-card--light reveal">
        <h2>Lieber zurückrufen lassen?</h2>
        <p>Name und Nummer genügen – wir melden uns.</p>
        ${callbackForm(ctx)}
      </div>
    </aside>
  </div>
</section>
`,
};

/* =====================================================================
   DANKE / 404
   ===================================================================== */
const thanks = {
  path: 'danke/',
  title: 'Vielen Dank für Ihre Anfrage',
  description: 'Ihre Anfrage ist bei LIMES MONT eingegangen.',
  noindex: true,
  body: (ctx) => `
<section class="message-page">
  <div class="container narrow">
    <span class="message-page__icon">${icon('check')}</span>
    <h1>Vielen Dank – Ihre Anfrage ist da.</h1>
    <p class="lead">Wir melden uns schnellstmöglich bei Ihnen. Wenn es eilt, erreichen Sie uns direkt unter <a href="tel:${SITE.tel}">${SITE.phone}</a>.</p>
    <div class="actions actions--center">
      <a class="btn btn--primary" href="${ctx.r('')}">Zur Startseite</a>
      <a class="btn btn--ghost" href="${ctx.r('leistungen/')}">Leistungen ansehen</a>
    </div>
  </div>
</section>`,
};

const notFound = {
  path: '404.html',
  file: '404.html',
  title: 'Seite nicht gefunden',
  description: 'Diese Seite gibt es nicht (mehr).',
  noindex: true,
  absolute: true,
  body: (ctx) => `
<section class="message-page">
  <div class="container narrow">
    <span class="message-page__icon message-page__icon--warn">404</span>
    <h1>Hier fehlt ein Bauteil.</h1>
    <p class="lead">Die Seite, die Sie suchen, gibt es nicht (mehr). Vielleicht hilft Ihnen einer dieser Links weiter:</p>
    <div class="actions actions--center">
      <a class="btn btn--primary" href="/">Zur Startseite</a>
      <a class="btn btn--ghost" href="/leistungen/">Leistungen</a>
      <a class="btn btn--ghost" href="/kontakt/">Kontakt</a>
    </div>
  </div>
</section>`,
};

/* =====================================================================
   IMPRESSUM & DATENSCHUTZ
   ===================================================================== */
const imprint = {
  path: 'impressum/',
  title: 'Impressum',
  description: 'Impressum der LIMES MONT UG (haftungsbeschränkt), Wassertrüdingen.',
  noindex: true,
  crumbs: [['Impressum', 'impressum/']],
  body: () => `
<section class="legal">
  <div class="container narrow prose">
    <h1>Impressum</h1>
    <h2>Angaben gemäß § 5 DDG</h2>
    <p>${SITE.name}<br>${SITE.street}<br>${SITE.zip} ${SITE.city}<br>Deutschland</p>
    <p><b>Vertreten durch den Geschäftsführer:</b><br>${SITE.ceo}</p>
    <h2>Kontakt</h2>
    <p>Telefon: <a href="tel:${SITE.tel}">${SITE.phone}</a><br>E-Mail: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
    <h2>Registereintrag</h2>
    <p>Eintragung im Handelsregister.<br>Registergericht und Registernummer: ${todo(SITE.register, 'Registergericht, HRB-Nummer')}</p>
    <h2>Umsatzsteuer-ID</h2>
    <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: ${todo(SITE.vatId, 'USt-IdNr.')}</p>
    <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
    <p>${SITE.ceo}<br>${SITE.street}, ${SITE.zip} ${SITE.city}</p>
    <h2>Verbraucherstreitbeilegung</h2>
    <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    <h2>Haftung für Inhalte</h2>
    <p>Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen entfernen wir diese Inhalte umgehend.</p>
    <h2>Haftung für Links</h2>
    <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für diese fremden Inhalte übernehmen wir keine Gewähr; verantwortlich ist stets der jeweilige Anbieter oder Betreiber der Seiten. Bei Bekanntwerden von Rechtsverletzungen entfernen wir derartige Links umgehend.</p>
    <h2>Bildnachweis</h2>
    <p>Visualisierungen und Stimmungsbilder auf dieser Website wurden teilweise mit KI-Werkzeugen erstellt und zeigen keine konkreten Kundenprojekte. 3D-Darstellungen: eigene Erstellung.</p>
  </div>
</section>`,
};

const privacy = {
  path: 'datenschutz/',
  title: 'Datenschutzerklärung',
  description: 'Datenschutzerklärung der LIMES MONT UG (haftungsbeschränkt).',
  noindex: true,
  crumbs: [['Datenschutz', 'datenschutz/']],
  body: (ctx) => `
<section class="legal">
  <div class="container narrow prose">
    <h1>Datenschutzerklärung</h1>
    <p class="fineprint">Stand: Oktober 2026</p>

    <h2>1. Verantwortlicher</h2>
    <p>${SITE.name}<br>${SITE.street}, ${SITE.zip} ${SITE.city}<br>Geschäftsführer: ${SITE.ceo}<br>Telefon: ${SITE.phone} · E-Mail: <a href="mailto:${SITE.email}">${SITE.email}</a></p>

    <h2>2. Das Wichtigste in Kürze</h2>
    <p>Diese Website setzt keine Cookies zu Analyse- oder Werbezwecken ein und verwendet keine Tracking-Dienste. Schriftarten und Programmbibliotheken werden von unserem eigenen Server geladen, nicht von Drittanbietern. Personenbezogene Daten verarbeiten wir nur, wenn Sie uns aktiv kontaktieren.</p>

    <h2>3. Hosting und Server-Logfiles</h2>
    <p>Diese Website wird bei Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, USA gehostet. Beim Aufruf der Website verarbeitet der Hoster technisch notwendige Daten (z. B. IP-Adresse, Datum und Uhrzeit des Abrufs, aufgerufene Seite, Browsertyp, Referrer) in Server-Logfiles. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in der sicheren und stabilen Bereitstellung der Website. Mit dem Hoster besteht ein Vertrag zur Auftragsverarbeitung. Eine Übermittlung in die USA erfolgt auf Grundlage des EU-US Data Privacy Framework bzw. der EU-Standardvertragsklauseln.</p>

    <h2>4. Kontakt- und Anfrageformular</h2>
    <p>Wenn Sie uns über das Anfrage- oder Rückrufformular kontaktieren, verarbeiten wir Ihre Angaben (z. B. Name, Firma, Telefonnummer, E-Mail-Adresse, PLZ/Ort, Projektbeschreibung sowie hochgeladene Fotos oder Pläne), um Ihre Anfrage zu bearbeiten und Ihnen ein Angebot zu erstellen. Die Formulardaten werden über den Formulardienst unseres Hosters (Netlify Forms) übermittelt und gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen) sowie Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO, die Sie jederzeit mit Wirkung für die Zukunft widerrufen können. Wir löschen die Daten, sobald sie für die Bearbeitung nicht mehr erforderlich sind und keine gesetzlichen Aufbewahrungspflichten (z. B. bei Vertragsschluss) entgegenstehen.</p>

    <h2>5. Kontakt per E-Mail, Telefon oder WhatsApp</h2>
    <p>Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir Ihre Angaben zur Bearbeitung Ihres Anliegens (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Der WhatsApp-Button ist ein einfacher Link: Erst wenn Sie ihn anklicken, wird WhatsApp (WhatsApp Ireland Limited bzw. Meta Platforms) geöffnet und es gelten dessen Datenschutzbestimmungen. Dabei können Daten auch in die USA übermittelt werden. Wenn Sie das nicht möchten, kontaktieren Sie uns bitte per Telefon, E-Mail oder Formular.</p>

    <h2>6. Externe Links</h2>
    <p>Unsere Website enthält Links zu anderen Websites, z. B. zu unserem Herstellerpartner MIRAL PVC oder zu Google Maps. Beim Anklicken verlassen Sie unsere Website; für die Datenverarbeitung dort ist der jeweilige Anbieter verantwortlich.</p>

    <h2>7. SSL-/TLS-Verschlüsselung</h2>
    <p>Diese Website nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie an „https://“ in der Adresszeile Ihres Browsers.</p>

    <h2>8. Ihre Rechte</h2>
    <p>Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO). Erteilte Einwilligungen können Sie jederzeit widerrufen. Wenden Sie sich dazu einfach an die oben genannten Kontaktdaten.</p>
    <p>Außerdem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig für uns ist das Bayerische Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach.</p>
  </div>
</section>`,
};

export const PAGES = [home, builders, services, ...SERVICES.map(servicePage), miral, refs, about, contact, thanks, imprint, privacy, notFound];
