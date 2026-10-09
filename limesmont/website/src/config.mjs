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

// Herstellerreferenzen MIRAL PVC mit Fotos (Freigabe durch MIRAL PVC liegt vor)
// cat: Wohnen | Hotel | Gewerbe | Fassade  ·  cc: Ländercode
export const REFERENCES = [
  { img: 'ref/gelsenkirchen', title: 'Mehrfamilienhaus', place: 'Gelsenkirchen', cc: 'DE', cat: 'Wohnen', note: 'Fenster und Balkontüren – im Ausbau' },
  { img: 'ref/gelsenkirchen-montage', title: 'Mehrfamilienhaus – Bauphase', place: 'Gelsenkirchen', cc: 'DE', cat: 'Wohnen', note: 'Montage im laufenden Ausbau' },
  { img: 'ref/geschaeftshaus-de', title: 'Wohn- und Geschäftshaus', place: 'Deutschland', cc: 'DE', cat: 'Wohnen', note: 'Fenster und Eingangselemente' },
  { img: 'ref/liberty-novalja', title: 'Hotel Liberty', place: 'Novalja, Kroatien', cc: 'HR', cat: 'Hotel', note: 'Lamellenfassade, Fenster und Glasbrüstungen' },
  { img: 'ref/wohngebaeude-schweiz', title: 'Wohngebäude', place: 'Schweiz', cc: 'CH', cat: 'Wohnen', note: 'Großflächige Fensterelemente' },
  { img: 'ref/wohngebaeude-schweiz-2', title: 'Mehrfamilienhaus', place: 'Schweiz', cc: 'CH', cat: 'Wohnen', note: 'Fenster und Balkonanlagen' },
  { img: 'ref/wohnanlage-zadar', title: 'Wohnanlage', place: 'Zadar, Kroatien', cc: 'HR', cat: 'Wohnen', note: 'Mehrere Wohnhäuser' },
  { img: 'ref/wohnkomplex-zadar', title: 'Wohnkomplex – Bauphase', place: 'Zadar, Kroatien', cc: 'HR', cat: 'Wohnen', note: 'Wohnquartier mit mehreren Bauabschnitten' },
  { img: 'ref/wohngebaeude-kroatien', title: 'Wohngebäude', place: 'Kroatien', cc: 'HR', cat: 'Wohnen', note: 'Fenster und Balkontüren' },
  { img: 'ref/wohnanlage-dubrovnik', title: 'Wohnanlage', place: 'Dubrovnik, Kroatien', cc: 'HR', cat: 'Wohnen', note: 'Mehrfamilienhäuser' },
  { img: 'ref/wohnhochhaus-zagreb', title: 'Wohnhochhaus', place: 'Zagreb, Kroatien', cc: 'HR', cat: 'Wohnen', note: 'Fenster für alle Geschosse' },
  { img: 'ref/wohngebaeude-bih', title: 'Wohngebäude', place: 'Bosnien und Herzegowina', cc: 'BA', cat: 'Wohnen', note: 'Neubau mit Balkonen' },
  { img: 'ref/wohnsiedlung', title: 'Wohnsiedlung mit 14 Gebäuden', place: 'Kroatien', cc: 'HR', cat: 'Wohnen', note: '14 Wohngebäude' },
  { img: 'ref/hotel-split', title: 'Hotel Amphora', place: 'Split, Kroatien', cc: 'HR', cat: 'Hotel', note: 'Hotelhochhaus' },
  { img: 'ref/hotel-eraclea', title: 'Hotel Eraclea', place: 'Caorle, Italien', cc: 'IT', cat: 'Hotel', note: 'Fenster, Balkone, Glasflächen' },
  { img: 'ref/hotel-marina', title: 'Hotel Marina', place: 'Caorle, Italien', cc: 'IT', cat: 'Hotel', note: 'Strandhotel' },
  { img: 'ref/hotel-crikvenica', title: 'Hotel', place: 'Crikvenica, Kroatien', cc: 'HR', cat: 'Hotel', note: 'Fenster und Balkonanlagen' },
  { img: 'ref/kolmix-trespa', title: 'Verwaltungsgebäude Kolmix', place: 'Bosnien und Herzegowina', cc: 'BA', cat: 'Fassade', note: 'Vorgehängte Fassade aus HPL-Platten' },
  { img: 'ref/karlic-trespa', title: 'Firmengebäude Karlić', place: 'Istrien, Kroatien', cc: 'HR', cat: 'Fassade', note: 'HPL-Fassade mit Glasfront' },
  { img: 'ref/kolmix-glasfassade', title: 'Glasfassade Kolmix', place: 'Bosnien und Herzegowina', cc: 'BA', cat: 'Fassade', note: 'Pfosten-Riegel-Glasfassade' },
  { img: 'ref/bf-komerc-glasfassade', title: 'Gewerbebau BF Komerc', place: 'Bosnien und Herzegowina', cc: 'BA', cat: 'Gewerbe', note: 'Glasfassade' },
  { img: 'ref/miral-verwaltung', title: 'Verwaltungsgebäude MIRAL PVC', place: 'Velika Kladuša', cc: 'BA', cat: 'Gewerbe', note: 'Firmensitz des Herstellers' },
];
