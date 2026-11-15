// Gemeinsame Helfer für alle Seiten (window.TF, Alias window.Ted)
window.Ted = window.TF = (function () {
  var cfgPromise;
  function config() {
    if (!cfgPromise) cfgPromise = fetch("/api/config").then(function (r) { return r.json(); });
    return cfgPromise;
  }
  // Ohne zweites Argument: ganze Euro ohne Nachkomma („49 €“), sonst automatisch mit Cent („49,90 €“, „41,93 €“), damit nie gerundet wird.
  function euro(cent, nachkomma) {
    if (nachkomma === undefined) nachkomma = Math.round(Number(cent) || 0) % 100 !== 0;
    return (cent / 100).toLocaleString("de-DE", { minimumFractionDigits: nachkomma ? 2 : 0, maximumFractionDigits: nachkomma ? 2 : 0 }) + " €";
  }
  // Monatspreis: Hauptzahl inkl. MwSt., netto klein dahinter („49,90 € im Monat inkl. MwSt. (41,93 € netto)“)
  function monatPreis(nettoCent, ustProzent) {
    var u = ustProzent == null ? 19 : ustProzent;
    return euro(Math.round(nettoCent * (100 + u) / 100), true) + " im Monat inkl. MwSt. (" + euro(nettoCent, true) + " netto)";
  }
  function datum(iso) {
    if (!iso) return "–";
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  async function api(path, opts) {
    opts = opts || {};
    var r;
    try {
      r = await fetch(path, {
        method: opts.method || (opts.body ? "POST" : "GET"),
        headers: Object.assign({ "content-type": "application/json" }, opts.headers || {}),
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        credentials: "same-origin",
      });
    } catch (e) {
      // Funkloch: der Browser meldet sonst nur „Failed to fetch“ (englisch)
      var ne = new Error("Keine Verbindung. Bitte prüfe dein Netz und versuch es nochmal."); ne.netz = true; throw ne;
    }
    var data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) { var err = new Error(data.error || "Fehler " + r.status); err.status = r.status; throw err; }
    return data;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  // data-c="kaufNetto|euro" → füllt Werte aus /api/config
  function fill(c) {
    document.querySelectorAll("[data-c]").forEach(function (el) {
      var parts = el.dataset.c.split("|"), v = c[parts[0]];
      if (v === undefined) return;
      if (parts[1] === "euro") v = euro(v);
      if (parts[1] === "brutto") v = euro(Math.round(v * (100 + c.ustProzent) / 100));
      if (parts[1] === "cent2") v = euro(v, true);
      if (parts[1] === "brutto2") v = euro(Math.round(v * (100 + c.ustProzent) / 100), true);
      if (parts[1] === "rest") v = 100 - v;
      el.textContent = v;
    });
  }
  return { config: config, euro: euro, monatPreis: monatPreis, datum: datum, api: api, esc: esc, fill: fill };
})();
