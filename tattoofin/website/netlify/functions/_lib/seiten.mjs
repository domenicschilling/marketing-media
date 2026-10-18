// Kleine HTML-Seiten direkt aus Funktionen (z. B. Zwischenseite beim Login per E-Mail-Link)
import { esc } from "./util.mjs";

// Zwischenseite, die sich sofort selbst per POST abschickt. Mailprogramme/Virenscanner rufen Links oft vorab per GET auf –
// ein Einmal-Link darf dadurch nicht verbraucht werden. Ohne JavaScript: Knopf zum Antippen.
export function zwischenseite({ action, felder, titel = "Du wirst angemeldet …", knopf = "Jetzt anmelden" }) {
  const inputs = Object.entries(felder).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join("");
  return new Response(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><title>${esc(titel)} – Tattoofin</title>
<link rel="icon" href="/assets/figur.png"><link rel="stylesheet" href="/css/site.css"></head>
<body><main class="sec"><div class="wrap" style="max-width:440px;text-align:center">
<img src="/assets/figur.png" alt="" width="64" height="64" style="margin:0 auto 12px;display:block">
<h1 style="font-size:26px;margin-bottom:14px">${esc(titel)}</h1>
<form method="post" action="${esc(action)}" id="f">${inputs}<button class="btn gold" style="width:100%">${esc(knopf)}</button></form>
<p class="muted" style="font-size:13.5px;margin-top:12px">Falls nichts passiert, tippe auf den Knopf.</p>
</div></main><script>setTimeout(function(){document.getElementById("f").submit();},150);</script></body></html>`,
  { status: 200, headers: { "content-type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

export const weiter = (to, headers = {}) => new Response(null, { status: 303, headers: { Location: to, "Cache-Control": "no-store", ...headers } });
