// EINE Quelle für die Werbe-Texte der Studios (seit 14.11.2026): Werbevideo und Studio-Beiträge (Bilder zeichnet app-kit.js).
// Genutzt vom Dashboard im Browser (app.js, app-kit.js über window.TF_WERBUNG) UND vom Server (netlify/functions/_lib/werbung.mjs →
// GET /api/app/werbung für die iPhone-App). Deshalb hier nur reines JavaScript ohne DOM, ohne Abhängigkeiten: Die Klarna-Texte
// kommen als Parameter K herein (Browser: window.TF_KLARNA, Server: Werte aus _lib/klarna-texte.mjs, gleicher Wortlaut).
// Regeln (Klarna Deutschland ab 20.11.2026): nur der Name („Mit Klarna bezahlen“, „Klarna verfügbar“), keine Raten-/Später-Aussage im Text.
// Unter jedem Beitragstext steht der Zusatz + Warnsatz (FUSS), nie abkürzen. Gutscheine nie mit Klarna (hier gibt es keine Gutschein-Texte).
// Beiträge und Video zeigen Klarna bzw. Raten: nur für Studios, die Klarna dauerhaft anbieten (studio.klarnaDauerhaft bzw. API „klarna“).
(function (g) {
  // Name auf den Bildern/Hashtags: aus dem Ort „#bambergtattoo #bamberg“
  function hashtags(k) {
    var ort = String((k && k.ort) || "").toLowerCase().replace(/[^a-zäöüß0-9]/g, "");
    var t = ["#tattoo", "#wunschtattoo", "#tattoostudio"];
    if (ort && ort.length > 1) t.push("#" + ort + "tattoo", "#" + ort);
    else t.push("#tattooart", "#ink");
    return t.join(" ");
  }
  function beiUns(k) { return k && k.ort ? "bei uns in " + k.ort : "bei uns"; }
  // Fußnote unter den Posting-Texten: Zusatz in der „wir“-Fassung (das Studio spricht) + Warnsatz
  function fuss(K) { return K.ZUSATZ_STUDIO + " " + K.WARNSATZ; }
  function caption(K, k, teile) { return teile.join("\n\n") + "\n\n" + fuss(K) + "\n\n" + hashtags(k); }

  // Vorlagen der Studio-Beiträge. seiten = Bild-IDs für app-kit.js (zeichneSeite), kopieren: link (nur Zahlseiten-Link für den
  // Link-Sticker), sticker (Text für den Fragen-Sticker), sonst der ganze Posting-Text.
  function vorlagen(K) {
    var MIT = K.NAME.mitKlarna;
    return [
      { id: "ankuendigung", titel: "Beitrag: Ab jetzt mit Klarna bezahlen", format: "Beitrag 4:5", art: "post",
        wofuer: "Dein Start-Beitrag: Alle sehen sofort, dass man bei euch jetzt auch mit Klarna bezahlen kann.",
        seiten: ["ankuendigung"],
        text: function (k) { return caption(K, k, [
          "Ab jetzt bei uns: " + MIT + " für dein Wunsch-Tattoo! 🖤",
          "Dein Tattoo kannst du " + beiUns(k) + " jetzt ganz bequem übers Handy bezahlen, per Link oder QR-Code. Zum Beispiel mit Karte, Apple Pay oder Google Pay. " + K.NAME.verfuegbar + ".",
          "Sprich uns einfach drauf an oder schreib uns eine Nachricht. Wir freuen uns auf dein Projekt!"]); } },
      { id: "karussell", titel: "Karussell: Wunsch-Tattoo mit Klarna bezahlen", format: "4 Bilder 4:5", art: "post",
        wofuer: "Vier Bilder zum Durchwischen: Frage, Neuigkeit, So geht's, Frag uns. Alle vier zusammen als einen Beitrag posten.",
        seiten: ["haken", "ankuendigung", "schritte", "fragpost"],
        text: function (k) { return caption(K, k, [
          "Dein Wunsch-Tattoo – jetzt ganz einfach bezahlen. Wisch mal rüber 👉",
          "Ab jetzt kannst du " + beiUns(k) + " mit Klarna bezahlen. So einfach geht's: Design und Termin mit uns absprechen, Link oder QR-Code öffnen und am Handy bezahlen.",
          "Fragen? Schreib uns eine Nachricht oder sprich uns im Studio an! 🖤"]); } },
      { id: "qr-story", titel: "Story: Mit Klarna bezahlen, QR-Code", format: "Story 9:16", art: "story",
        wofuer: "Für deine Story, mit dem QR-Code zu deiner Zahlseite. Tipp: In Instagram noch den Link-Sticker mit deiner Zahlseite dazu – dann können Kunden direkt antippen.",
        seiten: ["qrstory"], kopieren: "link",
        text: function (k) { return "Link für den Link-Sticker in deiner Story:\n" + k.zahlseite; } },
      { id: "schritte", titel: "Beitrag: So einfach geht's", format: "Beitrag 4:5", art: "post",
        wofuer: "Erklärt in drei Schritten, wie das Bezahlen bei euch funktioniert. Gut als zweiter Beitrag ein paar Tage später.",
        seiten: ["schritte"],
        text: function (k) { return caption(K, k, [
          "Tattoo bezahlen? So einfach geht's 👇",
          "1️⃣ Design & Termin: Wir planen dein Tattoo gemeinsam mit dir.\n2️⃣ Link oder QR-Code: Den Link schicken wir dir, oder du scannst den QR-Code bei uns im Studio.\n3️⃣ Bezahlen: Bequem am Handy. " + MIT + ".",
          "Alles übers Handy, ohne Papierkram. Fragen? Schreib uns einfach!"]); } },
      { id: "frag-story", titel: "Story: Frag uns!", format: "Story 9:16", art: "story",
        wofuer: "Lädt deine Follower ein, euch zur Bezahlung zu schreiben. Tipp: In Instagram den Fragen-Sticker dazu – den Text dafür kannst du kopieren.",
        seiten: ["fragstory"], kopieren: "sticker",
        text: function () { return "Hast du Fragen zum Bezahlen?"; } },
    ];
  }

  // Werbevideo für alle Studios (Reel 9:16 + Beitrag 4:5). Das Video sagt „Bei uns geht das ganz bequem in Raten.“ → nur mit Klarna,
  // und der Posting-Text trägt die Fußnote (Zusatz + Warnsatz) wie die Beiträge.
  var VIDEO = {
    formate: [
      { id: "reel", titel: "Reel / Story (9:16)", datei: "/media/studio-video/reel.mp4", cover: "/media/studio-video/cover.jpg", breite: 1080, hoehe: 1920, dauer: 17.5 },
      { id: "feed", titel: "Beitrag (4:5)", datei: "/media/studio-video/feed.mp4", cover: "/media/studio-video/cover-feed.jpg", breite: 1080, hoehe: 1350, dauer: 17.5 },
    ],
    dateiname: function (format) { return "tattoofin-raten-" + format + ".mp4"; },
  };
  function videoText(K) {
    return "Dein Wunsch-Tattoo – bei uns ganz bequem übers Handy bezahlen 🖤\n\nBei uns kannst du dein Tattoo jetzt ganz einfach per Link oder QR-Code bezahlen: Karte, Apple Pay, Google Pay. " +
      K.NAME.verfuegbar + ". Ohne Papierkram.\n\nSprich uns einfach drauf an oder schreib uns eine Nachricht!\n\n" + fuss(K) + "\n\nStimme mit KI erstellt";
  }

  g.TF_WERBUNG = { hashtags: hashtags, beiUns: beiUns, fuss: fuss, vorlagen: vorlagen, VIDEO: VIDEO, videoText: videoText };
})(typeof globalThis !== "undefined" ? globalThis : window);
