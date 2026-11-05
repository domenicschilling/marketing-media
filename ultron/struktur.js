// ULTRON – Team-Ansicht als Kino-Galerie: Ultron groß oben, das Team als Porträt-Karten (p-<id>.webp, flach im Ordner).
// Porträts werden erst geladen, wenn der Team-Bereich zum ersten Mal offen ist (loading="lazy"); kein three.js mehr.
// Karten zeigen Level (wächst mit gelernten Regeln), Kraft (Note), Einsätze, Fehler; Antippen öffnet den Steckbrief.
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const vorZeit = (iso) => { if (!iso) return "noch nie"; const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? "gerade eben" : m < 60 ? `vor ${m} Min.` : m < 1440 ? `vor ${Math.round(m / 60)} Std.` : `vor ${Math.round(m / 1440)} Tg.`; };
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");
  const reduziert = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Jede Abteilung bekommt einen eigenen Schurken (eigene Silhouette, Farbe, Beiname)
  const PROFILE = {
    "scout": { akzent: 0x19e3ff, koerper: "orb", kopf: "none", augen: "zyklop", extras: ["rotoren"], rolle: "Die Späher-Drohne" },
    "anwalt": { akzent: 0xd8a72c, koerper: "robe", kopf: "helm", augen: "visier", extras: ["hammer", "umhang"], rolle: "Der gepanzerte Richter" },
    "token-sheriff": { akzent: 0xffb020, koerper: "brawler", kopf: "helm", augen: "zwei", extras: ["schild", "hut"], rolle: "Der Wächter mit Schild" },
    "coo": { akzent: 0x3fa2ff, koerper: "tank", kopf: "box", augen: "visier", extras: ["wuerfel"], rolle: "Der Stratege" },
    "forschung": { akzent: 0x7dff6b, koerper: "slim", kopf: "dome", augen: "zwei", extras: ["antennen"], rolle: "Der Alchemist" },
    "freigabe-manager": { akzent: 0x2bd96b, koerper: "brawler", kopf: "box", augen: "visier", extras: ["tor"], rolle: "Der Torwächter" },
    "marketingchef": { akzent: 0xff3b30, koerper: "brawler", kopf: "helm", augen: "zwei", extras: ["megafon", "umhang"], rolle: "Der Herold" },
    "personalchef": { akzent: 0xb07cff, koerper: "robe", kopf: "helm", augen: "zwei", extras: ["koepfe"], rolle: "Der Puppenspieler" },
    "technikchef": { akzent: 0xff8a1a, koerper: "tank", kopf: "box", augen: "zwei", extras: ["zahnrad", "antennen"], rolle: "Der Schmied" },
    "seo-chef": { akzent: 0xffd23f, koerper: "slim", kopf: "dome", augen: "zyklop", extras: ["linse"], rolle: "Das Suchauge" },
    "skill-chef": { akzent: 0x9fe870, koerper: "robe", kopf: "oct", augen: "zwei", extras: ["ringe"], rolle: "Der Lehrmeister" },
    "bild-designer": { akzent: 0xff4fd8, koerper: "slim", kopf: "oct", augen: "zyklop", extras: ["kristall"], rolle: "Der Bildformer" },
    "video-regisseur": { akzent: 0xff2e63, koerper: "slim", kopf: "box", augen: "zyklop", extras: ["kamera"], rolle: "Das Kamera-Auge" },
    "skript-autor": { akzent: 0xf2e6c8, koerper: "slim", kopf: "helm", augen: "zwei", extras: ["feder", "umhang"], rolle: "Der Federkiel" },
    "trend-scout": { akzent: 0xff6a1f, koerper: "slim", kopf: "helm", augen: "zwei", extras: ["flamme"], rolle: "Der Funkenjäger" },
    "qualitaetskontrolle": { akzent: 0xdfe6ef, koerper: "brawler", kopf: "box", augen: "visier", extras: ["schild"], rolle: "Die Schildwache" },
    "instagram-wachstum": { akzent: 0xff7a3d, koerper: "robe", kopf: "oct", augen: "zwei", extras: ["kristall", "ringe"], rolle: "Der Wachstums-Titan" },
  };
  const BAU = { koerper: ["robe", "brawler", "slim", "tank", "orb"], kopf: ["helm", "box", "oct", "dome"], augen: ["zwei", "visier", "zyklop"], extras: ["schild", "antennen", "ringe", "wuerfel", "kristall", "linse", "zahnrad", "umhang", "flamme", "hammer"], farben: [0xff3b6b, 0x36d1ff, 0xc6ff3d, 0xff9a3d, 0xa77bff, 0x3dffb0, 0xffe14d] };
  function profilVon(t) {
    if (PROFILE[t.id]) return PROFILE[t.id];
    let h = 0; for (const c of t.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const w = (l, s) => l[(h >>> s) % l.length];
    return { akzent: w(BAU.farben, 1), koerper: w(BAU.koerper, 3), kopf: w(BAU.kopf, 6), augen: w(BAU.augen, 9), extras: [w(BAU.extras, 12), w(BAU.extras, 16)], rolle: "Der Neue" };
  }
  const PORTRAETS = new Set(["ultron", "anwalt", "bild-designer", "coo", "forschung", "freigabe-manager", "instagram-wachstum", "marketingchef", "personalchef", "qualitaetskontrolle", "scout", "seo-chef", "skill-chef", "skript-autor", "technikchef", "token-sheriff", "trend-scout", "video-regisseur"]);
  // Level 1–10 kommt von Ultron (Wirkung statt Regel-Zahl), Endlevel 10 = Meister
  const RAENGE = ["Rekrut", "Söldner", "Kämpfer", "Vollstrecker", "Kommandant", "Hauptmann", "General", "Kriegsherr", "Großmeister", "Meister"];

  // Welche Workflow-Agenten („Drohnen“) gehören zu welcher Abteilung?
  const ZUORDNUNG = [
    [/^(ads-|campaign|creatives|leadform|ad-library|meta-pixel)/, "marketingchef"],
    [/^(publish|serie|burst|idea|fill|daily|weekly|regenerate|render|plan-sync|strahlebox|auto-reply|reply|ig-photos)/, "marketingchef"],
    [/^(token-info)/, "token-sheriff"], [/^(gsc)/, "forschung"], [/^(prompt-tests)/, "skill-chef"], [/.*/, "technikchef"],
  ];
  const abteilungVon = (datei, ids) => { for (const [re, id] of ZUORDNUNG) if (re.test(datei) && ids.includes(id)) return id; return ids.includes("technikchef") ? "technikchef" : ids[0]; };

  function aufbereiten(d) {
    const s = d?.struktur || {}, berichte = d?.teamBerichte?.berichte || [];
    const team = (s.team || []).filter((t) => t.status !== "archiviert").sort((a, b) => Date.parse(a.erschaffen) - Date.parse(b.erschaffen) || a.id.localeCompare(b.id));
    const ids = team.map((t) => t.id);
    return team.map((t) => {
      const b = berichte.find((x) => x.id === t.id) || null;
      const regeln = t.regeln || 0, level = Math.max(1, Math.min(10, t.level || 1 + Math.floor(regeln / 5)));
      return {
        ...t, profil: profilVon(t), level, xp: level, rang: RAENGE[Math.min(level - 1, RAENGE.length - 1)], bericht: b,
        fehler: b?.fehler || null, aktiv: !!t.letzterLauf && Date.now() - Date.parse(t.letzterLauf) < 3 * 3600e3,
        neu: !!t.erschaffen && Date.now() - Date.parse(t.erschaffen) < 24 * 3600e3,
        drohnen: (s.workflows || []).filter((w) => abteilungVon(w.datei, ids) === t.id),
      };
    });
  }

  let daten = null, liste = [], galerieAn = false, offenId = null;
  const $ = (s) => document.querySelector(s);

  // Porträt nur, wenn der Team-Bereich schon offen war (spart Laden auf allen anderen Seiten)
  function bildHtml(t, gross) {
    if (PORTRAETS.has(t.id) && (galerieAn || gross)) return `<img src="p-${esc(t.id)}.webp" alt="" width="480" height="643" loading="lazy" decoding="async">`;
    return `<span class="sk-emoji" aria-hidden="true">${esc(t.symbol || "◆")}</span>`;
  }
  function karte(t) {
    const kraft = t.note == null ? null : Math.max(0, Math.min(10, t.note));
    return `<button type="button" class="kino${t.fehler ? " fehler" : ""}${t.aktiv ? " aktiv" : ""}" data-schurke="${esc(t.id)}" style="--ak:${hex(t.profil.akzent)}" aria-label="${esc(t.name)}, ${esc(t.profil.rolle)}, Level ${t.level}${t.fehler ? ", Fehler beim letzten Einsatz" : ""}">
      <span class="kino-bild">${bildHtml(t)}</span>
      <span class="kino-lv">LV ${t.level}</span>${t.neu ? `<span class="kino-neu">NEU</span>` : ""}
      <span class="kino-text">
        <span class="kino-name">${esc(t.name)}</span>
        <span class="kino-rolle">${esc(t.profil.rolle)}</span>
        <span class="sk-kraft" aria-hidden="true"><i style="width:${kraft == null ? 0 : kraft * 10}%"></i></span>
        <span class="kino-meta">${t.fehler ? `<b class="sk-warn">Fehler</b> · ` : t.aktiv ? `<b class="sk-ok">im Einsatz</b> · ` : ""}${t.laeufe || 0}× · ${vorZeit(t.letzterLauf)}</span>
      </span></button>`;
  }
  function zeigeUltron() {
    const e = $("#ultronHeld"); if (!e) return;
    const d = daten || {}, regeln = liste.reduce((a, t) => a + (t.regeln || 0), 0), taten = (d.aktionen || []).filter((a) => Date.now() - Date.parse(a.zeit) < 864e5).length;
    e.innerHTML = `<button type="button" class="held-kino" data-schurke="ultron" aria-label="Ultrons Steckbrief öffnen">
      <span class="held-bild">${galerieAn ? `<img src="p-ultron.webp" alt="" width="480" height="643" decoding="async">` : ""}</span>
      <span class="held-text"><span class="sb-rolle">Oberkommando</span><span class="held-name">ULTRON</span>
      <span class="held-modus">${esc({ aktiv: "Arbeitet selbstständig", "nur-melden": "Meldet nur, ändert nichts", aus: "Ist ausgeschaltet" }[d.modus] || "")}</span>
      <span class="held-werte"><span><b>${liste.length}</b>im Team</span><span><b>${regeln}</b>Regeln</span><span><b>${liste.reduce((a, t) => a + (t.laeufe || 0), 0)}</b>Einsätze</span><span><b>${taten}</b>Taten heute</span></span></span></button>`;
  }
  function zeigeKarten() {
    const box = $("#schurken"); if (!box) return;
    const chefs = liste.filter((t) => !t.chef || !liste.some((x) => x.id === t.chef));
    const truppen = chefs.filter((c) => liste.some((t) => t.chef === c.id));
    box.innerHTML = liste.length ? `<h2>Abteilungen</h2><div class="galerie">${chefs.map((c) => karte(c)).join("")}</div>`
      + truppen.map((c) => { const u = liste.filter((t) => t.chef === c.id); return `<h2 style="margin-top:22px">${esc(c.name)}s Truppe · ${u.length}</h2><div class="galerie">${u.map((x) => karte(x)).join("")}</div>`; }).join("")
      : `<div class="karte leer">Noch kein Team.</div>`;
  }
  // ---------- Steckbrief ----------
  function steckbrief(id, still) {
    const blatt = $("#steckbrief"), inhalt = $("#sbInhalt"); if (!blatt) return;
    offenId = id;
    const mdF = typeof md === "function" ? md : esc;
    if (id === "ultron") {
      const d = daten || {}, regeln = liste.reduce((a, t) => a + (t.regeln || 0), 0);
      blatt.style.setProperty("--ak", "#ff2a1a");
      inhalt.innerHTML = `<div class="sb-portraet"><img src="p-ultron.webp" alt="" width="480" height="643" decoding="async"></div><div class="sb-kopf">
        <div><div class="sb-rolle">Oberkommando</div><h2 id="sbName">ULTRON</h2><div class="sb-titel">${esc({ aktiv: "Arbeitet selbstständig", "nur-melden": "Meldet nur, ändert nichts", aus: "Ist ausgeschaltet" }[d.modus] || "")}</div></div></div>
        <div class="sb-werte"><div><b>${liste.length}</b><span>im Team</span></div><div><b>${regeln}</b><span>Regeln im Team</span></div><div><b>${(d.struktur?.workflows || []).length}</b><span>Automatiken</span></div><div><b>${(d.aktionen || []).filter((a) => Date.now() - Date.parse(a.zeit) < 864e5).length}</b><span>Taten heute</span></div></div>
        ${d.lage ? `<h3>Meine Lage</h3><div class="sb-bericht mehrtext" id="sbBericht">${mdF(d.lage)}</div><button class="aufklapp" data-sb-auf>Ganz lesen</button>` : ""}`;
    } else {
      const t = liste.find((x) => x.id === id); if (!t) return;
      const chef = t.chef && liste.find((x) => x.id === t.chef), unter = liste.filter((x) => x.chef === t.id);
      const b = t.bericht, text = b?.bericht || t.letzterBericht || "";
      blatt.style.setProperty("--ak", hex(t.profil.akzent));
      const kaputt = t.drohnen.filter((w) => w.fehlerSerie);
      inhalt.innerHTML = `${PORTRAETS.has(t.id) ? `<div class="sb-portraet">${bildHtml(t, true)}</div>` : `<div class="sb-portraet ohne">${bildHtml(t, true)}</div>`}<div class="sb-kopf">
        <div><div class="sb-rolle">${esc(t.profil.rolle)}</div><h2 id="sbName">${esc(t.symbol || "")} ${esc(t.name)}</h2><div class="sb-titel">${esc(t.titel)}${chef ? ` · gehört zu ${esc(chef.name)}` : ""}</div>
        <div class="sb-rang">${esc(t.rang)} · Level ${t.level}<span class="sb-xp" aria-label="Level ${t.level} von 10 (Meister)">${"<i class=\"an\"></i>".repeat(t.level)}${"<i></i>".repeat(10 - t.level)}</span></div></div></div>
        ${t.fehler ? `<div class="sb-fehler"><b>Beim letzten Einsatz ging etwas schief.</b> ${esc(String(t.fehler).slice(0, 300))}</div>` : ""}
        <div class="sb-werte"><div><b>${t.laeufe || 0}</b><span>Einsätze</span></div><div><b>${t.regeln || 0}</b><span>gelernte Regeln</span></div><div><b>${t.note == null ? "–" : t.note + "/10"}</b><span>Kraft (Note)</span></div><div><b>${esc(vorZeit(t.letzterLauf))}</b><span>zuletzt</span></div></div>
        <div class="sb-kraft"><i style="width:${(t.note ?? 0) * 10}%"></i></div>
        <div class="sb-zeile">${t.von === "ultron" ? "Von Ultron erschaffen" : "Von dir eingesetzt"} am ${new Date(t.erschaffen).toLocaleDateString("de-DE")} · arbeitet ${esc({ taeglich: "täglich", woechentlich: "wöchentlich" }[t.rhythmus] || t.rhythmus || "")}</div>
        ${(t.verantwortet || []).length ? `<h3>Zuständig für</h3><div class="sb-chips">${t.verantwortet.map((v) => `<span>${esc(v)}</span>`).join("")}</div>` : ""}
        ${unter.length ? `<h3>Seine Truppe</h3><div class="sb-chips">${unter.map((u) => `<button type="button" data-schurke="${esc(u.id)}">${esc(u.symbol || "")} ${esc(u.name)}</button>`).join("")}</div>` : ""}
        ${t.drohnen.length ? `<h3>Automatiken</h3><div class="sb-zeile">${t.drohnen.length} Automatiken laufen unter ihm${kaputt.length ? `, <b class="sk-warn">${kaputt.length} mit Fehler</b>: ${kaputt.slice(0, 4).map((w) => esc(w.name)).join(", ")}` : " – alle ohne Fehler"}.</div>` : ""}
        <h3>Letzter Bericht${b?.titel ? ` · ${esc(b.titel)}` : ""}</h3>
        ${text ? `<div class="sb-bericht mehrtext" id="sbBericht">${mdF(text)}</div><button class="aufklapp" data-sb-auf>Ganz lesen</button>` : `<p class="meta">Noch kein Einsatz. Er meldet sich mit der nächsten Team-Runde.</p>`}
        ${(b?.vorschlaege || []).length ? `<h3>Seine Vorschläge</h3>${b.vorschlaege.map((v) => `<div class="sb-vorschlag"><b>${esc(v.titel)}</b><div>${esc(v.detail)}</div></div>`).join("")}` : ""}
        <button class="knopf" type="button" data-sb-auftrag="${esc(t.id)}" style="width:100%;margin-top:16px">Auftrag an ${esc(t.name)} geben</button>`;
    }
    if (still) return;
    blatt.classList.remove("verborgen"); document.body.classList.add("blatt-offen");
    requestAnimationFrame(() => blatt.classList.add("da"));
    steckbrief.zurueck = document.activeElement;
    $("#sbZu").focus({ preventScroll: true });
    inhalt.scrollTop = 0;
  }
  function schliessen() {
    const blatt = $("#steckbrief"); if (!blatt || blatt.classList.contains("verborgen")) return;
    blatt.classList.remove("da"); document.body.classList.remove("blatt-offen"); offenId = null;
    setTimeout(() => blatt.classList.add("verborgen"), reduziert() ? 0 : 220);
    steckbrief.zurueck?.focus?.({ preventScroll: true });
  }
  document.addEventListener("click", (e) => {
    const k = e.target.closest?.("[data-schurke]"); if (k) { steckbrief(k.dataset.schurke); return; }
    if (e.target.closest?.("[data-sb-zu]")) return schliessen();
    const a = e.target.closest?.("[data-sb-auf]"); if (a) { const t = $("#sbBericht"); t.classList.toggle("offen"); a.textContent = t.classList.contains("offen") ? "Weniger" : "Ganz lesen"; return; }
    const au = e.target.closest?.("[data-sb-auftrag]"); if (au) { schliessen(); window.ultronAuftragAn?.(au.dataset.sbAuftrag); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") schliessen(); });

  window.UltronTeam = {
    zeige(d) { daten = d; liste = aufbereiten(d); zeigeUltron(); zeigeKarten(); if (offenId) steckbrief(offenId, true); },
    sichtbar(s) { if (s && !galerieAn) { galerieAn = true; zeigeUltron(); zeigeKarten(); } if (!s) schliessen(); },
    oeffne: steckbrief,
    profile: PROFILE,
  };
})();
