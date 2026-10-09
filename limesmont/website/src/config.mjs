// Zentrale Firmendaten – hier ändern, dann `node build.mjs` ausführen.
// Werte mit TODO müssen vor dem Go-live vom Kunden bestätigt bzw. ergänzt werden.

export const SITE = {
  url: 'https://limesmont.de',
  name: 'LIMES MONT UG (haftungsbeschränkt)',
  brand: 'LIMES MONT',
  ceo: 'Anis Delalic',
  street: 'Rosenstraße 3',
  zip: '91717',
  city: 'Wassertrüdingen',
  region: 'Bayern',
  country: 'DE',
  geo: { lat: 49.0433, lng: 10.5994 },
  phone: '+49 1520 8541555',
  tel: '+4915208541555',
  whatsapp: '4915208541555', // TODO: bestätigen, dass die Nummer WhatsApp nutzt
  email: 'limes.mont@web.de', // TODO: auf info@limesmont.de umstellen, sobald eingerichtet
  // Impressum – TODO: vom Kunden liefern lassen. Leere Werte erscheinen markiert und der Build warnt.
  register: '', // z. B. 'Amtsgericht Ansbach, HRB 12345'
  vatId: '', // z. B. 'DE123456789'
  miral: {
    name: 'MIRAL PVC d.o.o.',
    url: 'https://www.miral-pvc.com/',
    catalog: 'https://miral-pvc.com/katalozi/',
    references: 'https://miral-pvc.com/reference/',
    tour: 'https://miral-pvc.com/virtualna-setnja/',
  },
};

export const waLink = (text = 'Hallo LIMES MONT, ich interessiere mich für ') =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

// Leistungen – Reihenfolge = Reihenfolge in Navigation und Kacheln
export const SERVICES = [
  { slug: 'fenster-tueren', icon: 'window', title: 'Fenster & Türen', short: 'PVC- und Aluminiumfenster, Haustüren und Hebe-Schiebe-Türen – geliefert vom Hersteller, montiert von uns.', img: 'fenster-haus' },
  { slug: 'fassaden-wintergarten', icon: 'facade', title: 'Glasfassaden & Wintergärten', short: 'Aluminium-Pfosten-Riegel-Fassaden, Wintergärten, Trennwände und Geländersysteme.', img: 'fenster-haus' },
  { slug: 'fassadenlamellen', icon: 'louvre', title: 'Fassadenlamellen & Fassadenverkleidung', short: 'Lamellenfassaden in Holzoptik, Fassadenplatten als vorgehängte hinterlüftete Fassade und Parkhausfassaden.', img: 'fenster-haus' },
  { slug: 'sandwichpaneele', icon: 'panel', title: 'Sandwichpaneele', short: 'Wand-, Dach- und Fassadenpaneele für Hallen und Gewerbebauten – präzise montiert.', img: 'dachmontage' },
  { slug: 'industriemontage', icon: 'factory', title: 'Industriemontage', short: 'Montage vorgefertigter Industrieelemente und Komponenten für Produktions- und Gewerbeobjekte.', img: 'paneelmontage' },
  { slug: 'trockenbau-innenausbau', icon: 'interior', title: 'Trockenbau & Innenausbau', short: 'Ständerwände, abgehängte Decken und Vorsatzschalen – dazu Innentüren, Küchen und Einbauten.', img: 'innenausbau' },
  { slug: 'montageservice', icon: 'tools', title: 'Montage- & Rückbauservice', short: 'Fensterbänke, Rollläden, Sonnenschutz, Sockelleisten sowie Demontage- und Rückbauarbeiten.', img: 'montageservice' },
];

// Eigene Referenzprojekte – leer lassen, bis echte Fotos vorliegen. Abschnitt erscheint automatisch.
// Beispiel: { title: 'Gewerbehalle', place: 'Gunzenhausen', service: 'Sandwichpaneele', text: '1.200 m² Wandpaneele', img: 'projekt-halle' }
export const OWN_PROJECTS = [];
