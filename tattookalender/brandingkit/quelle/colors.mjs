export const COLORS = [
  // [Name, HEX, Rolle, Gruppe, css-var]
  ["Nachtschwarz", "#0B0B0D", "Haupt-Hintergrund (App, Website, Social, Druck)", "Grund", "--tk-nacht"],
  ["Tinte", "#141311", "Flächen: Karten, Kästen, Eingabefelder", "Grund", "--tk-flaeche"],
  ["Kalenderblatt", "#1C1A16", "Erhöhte Flächen, Innenfläche der Bildmarke", "Grund", "--tk-flaeche-2"],
  ["Linie", "#2C2822", "Trennlinien und Rahmen auf Dunkel", "Grund", "--tk-linie"],
  ["Elfenbein", "#F4F1EA", "Text auf Dunkel – und heller Hintergrund", "Text", "--tk-elfenbein"],
  ["Stein", "#A7A39A", "Nebentext auf Dunkel, Unterzeile im Logo", "Text", "--tk-stein"],
  ["Schiefer", "#6B675F", "Nebentext auf Hell", "Text", "--tk-schiefer"],
  ["Champagner", "#F3D891", "Gold hell – oberer Verlaufston", "Gold", "--tk-champagner"],
  ["Gold", "#C9A24F", "Akzentfarbe: Buttons, Hervorhebungen, Bildmarke", "Gold", "--tk-gold"],
  ["Altgold", "#B88A2C", "Gold auf hellem Hintergrund (oben)", "Gold", "--tk-altgold"],
  ["Bronze", "#8A6418", "Gold auf hellem Hintergrund (unten), Gold-Text auf Hell", "Gold", "--tk-bronze"],
];
export const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const cmyk = (h) => { const [r, g, b] = rgb(h).map((v) => v / 255); const k = 1 - Math.max(r, g, b); if (k >= 1) return [0, 0, 0, 100]; return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((v) => Math.round(v * 100)); };
