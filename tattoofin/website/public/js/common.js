// Gemeinsame Helfer für alle Seiten (window.TF, Alias window.Ted)
window.Ted = window.TF = (function () {
  var cfgPromise;
  function config() {
    if (!cfgPromise) cfgPromise = fetch("/api/config").then(function (r) { return r.json(); });
    return cfgPromise;
  }
  function euro(cent, nachkomma) {
    return (cent / 100).toLocaleString("de-DE", { minimumFractionDigits: nachkomma ? 2 : 0, maximumFractionDigits: nachkomma ? 2 : 0 }) + " €";
  }
  function datum(iso) {
    if (!iso) return "–";
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  async function api(path, opts) {
    opts = opts || {};
    var r = await fetch(path, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      headers: Object.assign({ "content-type": "application/json" }, opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
    });
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
      el.textContent = v;
    });
  }
  return { config: config, euro: euro, datum: datum, api: api, esc: esc, fill: fill };
})();
