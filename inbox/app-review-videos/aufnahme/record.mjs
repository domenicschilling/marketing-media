// Nimmt die Meta-App-Review-Screencasts für TattooLeadz Inbox auf (Playwright recordVideo).
// Aufruf: node record.mjs v1|v2   → out/<name>.webm
// Sicherheitsregeln: keine Passwörter, kein Facebook-Login, nichts bei Meta einreichen, keine Unterhaltung öffnen
// (sonst Lesebestätigung an echte Kunden), Chatliste wird unscharf gemacht.
import fs from "node:fs";
import { chromium } from "/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs";
import { confirmUrl, BASE } from "./login.mjs";

const which = process.argv[2] ?? "v1";
const W = 1280, H = 800;
fs.mkdirSync("out/raw", { recursive: true });

const OVERLAY = () => {
  const S = (() => { try { sessionStorage.length; return sessionStorage; } catch { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; } }; } })();
  const css = `
  #__cur{position:fixed;z-index:2147483647;width:26px;height:26px;pointer-events:none;transform:translate(-3px,-2px);transition:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}
  #__ring{position:fixed;z-index:2147483646;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #ffcf3f;pointer-events:none;opacity:0}
  #__ring.go{animation:__r .6s ease-out}
  @keyframes __r{0%{opacity:1;transform:scale(.3)}100%{opacity:0;transform:scale(1.6)}}
  #__cap{position:fixed;z-index:2147483645;left:50%;bottom:22px;transform:translateX(-50%);width:max-content;max-width:1180px;padding:12px 24px;border-radius:14px;
    background:rgba(12,12,16,.92);color:#fff;font:600 21px/1.35 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.55);
    border:1px solid rgba(255,207,63,.55);text-align:center;pointer-events:none;transition:opacity .25s}
  #__cap.top{top:22px;bottom:auto}
  #__cap b{color:#ffcf3f;margin-right:8px}
  #__cap:empty{opacity:0}
  #__hl{position:fixed;z-index:2147483644;border:3px solid #ffcf3f;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.35);pointer-events:none;opacity:0;transition:all .3s}
  #__card{position:fixed;inset:0;z-index:2147483640;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;
    background:radial-gradient(circle at 50% 35%,#2a2110,#0b0b0e 70%);color:#fff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:60px;transition:opacity .4s}
  #__card.off{opacity:0;pointer-events:none}
  #__card h1{font-size:46px;margin:0;font-weight:800;letter-spacing:-.5px}
  #__card h2{font-size:26px;margin:0;font-weight:500;color:#ffcf3f}
  #__card p{font-size:21px;margin:0;color:#d6d6d6;max-width:960px;line-height:1.5}
  #__card code{font-size:20px;background:rgba(255,255,255,.08);padding:3px 10px;border-radius:8px;color:#ffe08a}
  .__blur{filter:blur(9px)!important}
  .__hlx{outline:3px solid #ffcf3f!important;outline-offset:5px!important;border-radius:10px;box-shadow:0 0 0 7px rgba(255,207,63,.18)!important;transition:outline-color .2s}
  li[data-cv]{filter:blur(9px)!important}
  [role=log]{filter:blur(12px)!important}
  `;
  const add = () => {
    if (document.getElementById("__cur")) return;
    const st = document.createElement("style"); st.textContent = css; document.documentElement.appendChild(st);
    const cur = document.createElement("div"); cur.id = "__cur";
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const ring = document.createElement("div"); ring.id = "__ring";
    const cap = document.createElement("div"); cap.id = "__cap";
    const hl = document.createElement("div"); hl.id = "__hl";
    document.documentElement.append(hl, cap, ring, cur);
    const p = JSON.parse(S.getItem("__pos") || "[640,400]"); cur.style.left = p[0] + "px"; cur.style.top = p[1] + "px";
    cap.innerHTML = S.getItem("__cap") || "";
    document.addEventListener("mousemove", (e) => { cur.style.left = e.clientX + "px"; cur.style.top = e.clientY + "px"; S.setItem("__pos", JSON.stringify([e.clientX, e.clientY])); }, true);
    document.addEventListener("mousedown", (e) => { ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px"; ring.classList.remove("go"); void ring.offsetWidth; ring.classList.add("go"); }, true);
  };
  window.__rec = {
    caption(html) { add(); S.setItem("__cap", html); document.getElementById("__cap").innerHTML = html; },
    card(html) { add(); let c = document.getElementById("__card"); if (!c) { c = document.createElement("div"); c.id = "__card"; document.documentElement.appendChild(c); } c.innerHTML = html; c.classList.remove("off"); document.getElementById("__cur").style.display = "none"; this.caption(""); },
    hideCard() { const c = document.getElementById("__card"); if (c) c.classList.add("off"); document.getElementById("__cur").style.display = ""; },
    hl(r) { add(); const h = document.getElementById("__hl"); if (!r) { h.style.opacity = 0; return; } Object.assign(h.style, { left: r.x - 6 + "px", top: r.y - 6 + "px", width: r.width + 12 + "px", height: r.height + 12 + "px", opacity: 1 }); },
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: "de-DE", colorScheme: "dark",
  recordVideo: { dir: "out/raw", size: { width: W, height: H } },
});
await ctx.addCookies([{ name: "ws", value: "tattooleadz", url: BASE }]);
await ctx.addInitScript(OVERLAY);
const page = await ctx.newPage();
const t0 = Date.now();
const marks = [];
const mark = (label) => marks.push({ t: (Date.now() - t0) / 1000, label });
const wait = (ms) => page.waitForTimeout(ms);
const rec = (fn, ...a) => page.evaluate(([f, args]) => window.__rec[f](...args), [fn, a]);
const caption = async (step, text) => { mark(`${step} ${text}`); await rec("caption", step ? `<b>${step}</b>${text}` : text); };
const card = (html) => rec("card", html);
const hideCard = () => rec("hideCard");
let pos = [640, 400];
async function moveTo(target, { highlight = false, dx = 0, dy = 0 } = {}) {
  const loc = typeof target === "string" ? page.locator(target).first() : target;
  await loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 120) el.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  await wait(650);
  const r = await loc.boundingBox();
  await page.evaluate((b) => { const c = document.getElementById("__cap"); if (c) c.classList.toggle("top", b > innerHeight - 130); }, r.y + r.height);
  const x = Math.round(r.x + Math.min(r.width / 2, 60) + dx), y = Math.round(r.y + Math.min(r.height / 2, 40) + dy);
  const steps = Math.max(15, Math.round(Math.hypot(x - pos[0], y - pos[1]) / 18));
  await page.mouse.move(x, y, { steps });
  pos = [x, y];
  if (highlight) await loc.evaluate((el) => el.classList.add("__hlx"));
  return loc;
}
const unhl = () => page.evaluate(() => document.querySelectorAll(".__hlx").forEach((e) => e.classList.remove("__hlx")));
async function typeSlow(loc, text) { await loc.click(); await loc.pressSequentially(text, { delay: 55 }); }
async function settle() { await page.waitForLoadState("networkidle").catch(() => {}); await wait(600); }
async function smoothScroll(px) { const n = 20; for (let i = 0; i < n; i++) { await page.mouse.wheel(0, px / n); await wait(35); } await wait(400); }

// Startbild (schwarz) und Login-Link erst hier erzeugen, damit er frisch ist
await page.setContent("<html><body style='margin:0;background:#0b0b0e'></body></html>");
await page.evaluate(OVERLAY);

if (which === "v1") {
  // ───────── Video 1: whatsapp_business_messaging ─────────
  await card(`<h2>Meta App Review · TattooLeadz Inbox</h2><h1>Permission: whatsapp_business_messaging</h1>
    <p>A small business (tattoo studio) answers its customers' WhatsApp messages in a shared team inbox.<br>Customers write first, or opted in via the business' own web form.</p>
    <p style="font-size:17px;color:#9a9a9a">App UI is in German – each step is explained in English at the bottom of the screen.</p>`);
  mark("intro"); await wait(6500);

  await page.goto(BASE + "/login"); await settle();
  await caption("Step 1:", "The business user opens TattooLeadz Inbox and logs in (e-mail + password or magic link)");
  await wait(1200);
  await moveTo('input[name="email"]', { highlight: true }); await wait(1600);
  await moveTo('input[name="password"]', { highlight: true }); await wait(1400);
  await unhl();
  await moveTo('button[type="submit"]', { highlight: true }); await wait(1600); await unhl();
  // Anmeldung per Einmal-Link (kein Passwort wird getippt)
  await page.goto(await confirmUrl("/postfach")); await settle();
  await caption("Step 2:", "Logged in. The inbox lists the WhatsApp conversations of the connected business number");
  await wait(1500);
  await moveTo('ul[aria-label="Unterhaltungen"]', { highlight: true, dy: -80 }); await wait(2500);
  await caption("", "Customer names and messages are blurred in this recording for privacy");
  await wait(3000); await unhl();
  await caption("Step 2:", "Filters: open · mine · unassigned · done – the team shares one WhatsApp number");
  await moveTo('nav[aria-label="Filter"]', { highlight: true }); await wait(2600); await unhl();

  await caption("Step 2:", "Settings → Channels: the WhatsApp Business number +49 1523 3501951 is connected");
  await moveTo('a[href^="/einstellungen"]', { highlight: true }); await wait(900); await unhl();
  await page.locator('a[href^="/einstellungen"]').first().click();
  await page.waitForURL(/einstellungen/); await settle();
  if (!page.url().includes("kanaele")) { await page.goto(BASE + "/einstellungen/kanaele"); await settle(); }
  await moveTo(page.locator("li").filter({ hasText: "verbunden" }).first(), { highlight: true }); await wait(3500); await unhl();

  await page.goto(BASE + "/postfach"); await settle();
  await card(`<h2>Steps 3 – 6 · live demo with a test phone</h2>
    <p>3. A test customer sends a WhatsApp message to the business number<br>
       4. The message appears in the inbox in real time<br>
       5. The agent replies inside the 24-hour customer service window<br>
       6. The reply is delivered to the customer's phone</p>`);
  mark("card-live"); await wait(7000);
} else if (which === "v1c") {
  // ───────── Video 1, Schluss (nach Domenics Handy-Clip) ─────────
  await page.goto(await confirmUrl("/vorlagen")); await settle();
  mark("start");
  await caption("Step 7:", "Outside the 24-hour window the business can only send approved templates – and only to contacts who opted in");
  await moveTo(page.getByText("Freigegeben", { exact: true }).first(), { highlight: true }); await wait(4200); await unhl();
  await page.goto(BASE + "/postfach"); await settle();
  await caption("Step 8:", "All conversations stay in the inbox for the business' own customer service (customer data blurred here)");
  await moveTo('ul[aria-label="Unterhaltungen"]', { highlight: true, dy: -80 }); await wait(4000); await unhl();
  await card(`<h2>Summary · whatsapp_business_messaging</h2>
    <p>Receive customer messages via webhook · reply inside the 24-hour window · send approved templates to opted-in contacts.<br><br>
    Messages are only used by the business itself to answer its own customers. No marketing to third parties, no data resale.</p>`);
  await caption("", "");
  mark("outro"); await wait(6500);
} else {
  // ───────── Video 2: whatsapp_business_management ─────────
  await card(`<h2>Meta App Review · TattooLeadz Inbox</h2><h1>Permission: whatsapp_business_management</h1>
    <p>The business connects its own WhatsApp Business Account (WABA). The app reads the WABA and phone number to route messages,
    syncs the message templates and lets the business create new templates, which are submitted to Meta for approval.</p>
    <p style="font-size:17px;color:#9a9a9a">App UI is in German – each step is explained in English at the bottom of the screen.</p>`);
  mark("intro"); await wait(7000);

  await page.goto(BASE + "/login"); await settle();
  await caption("Step 1:", "The business admin logs in to TattooLeadz Inbox");
  await moveTo('input[name="email"]', { highlight: true }); await wait(1500); await unhl();
  await moveTo('button[type="submit"]', { highlight: true }); await wait(1300); await unhl();
  await page.goto(await confirmUrl("/postfach")); await settle();
  await caption("Step 1:", "Logged in – the shared WhatsApp inbox opens (customer chats blurred for privacy)");
  await wait(1800);

  await caption("Step 2:", "Settings (Setup) → Channels (Kanäle)");
  await moveTo('a[href^="/einstellungen"]', { highlight: true }); await wait(1000); await unhl();
  await page.locator('a[href^="/einstellungen"]').first().click();
  await page.waitForURL(/einstellungen/); await settle();
  if (!page.url().includes("kanaele")) { await moveTo('a[href="/einstellungen/kanaele"]'); await page.locator('a[href="/einstellungen/kanaele"]').first().click(); await settle(); }
  await wait(800);
  await caption("Step 2:", "The business' WhatsApp Business Account is connected: phone number, status and quality rating are read from Meta");
  await moveTo(page.locator("li").filter({ hasText: "verbunden" }).first(), { highlight: true }); await wait(4500); await unhl();

  await caption("Step 3:", "How a business connects its number: WhatsApp Business Account ID + phone number ID (Embedded Signup will replace this form)");
  const connectCard = page.locator("div").filter({ has: page.getByText("WhatsApp-Nummer verbinden", { exact: true }) }).filter({ has: page.locator("form") }).last();
  await moveTo(page.getByText("WhatsApp-Nummer verbinden", { exact: true }), { highlight: false });
  await moveTo(page.getByText("WhatsApp-Business-Konto-ID (WABA)"), { highlight: false }); await wait(1200);
  await moveTo(page.getByText("Phone-Number-ID", { exact: true })); await wait(3200);

  await caption("Step 4:", "“Vorlagen holen” = fetch templates: the app reads all message templates of the WABA from Meta");
  const syncBtn = page.getByRole("button", { name: "Vorlagen holen" });
  await moveTo(syncBtn, { highlight: true }); await wait(1500);
  await syncBtn.click(); await wait(3500); await unhl();

  await caption("Step 4:", "Templates (Vorlagen): name, language, category and approval status come from the WABA");
  await moveTo('a[href="/vorlagen"]', { highlight: true }); await wait(900); await unhl();
  await page.locator('a[href="/vorlagen"]').first().click(); await page.waitForURL(/\/vorlagen$/); await settle();
  await moveTo(page.getByText(/WABA \d+/).first(), { highlight: true }); await wait(2500); await unhl();
  await moveTo(page.getByText("Freigegeben", { exact: true }).first(), { highlight: true });
  await caption("Step 4:", "Status “Freigegeben” = APPROVED by Meta (kept up to date via the template status webhook)");
  await wait(3500); await unhl();
  await smoothScroll(500); await wait(1200); await smoothScroll(-500);

  await caption("Step 5:", "The business creates a new template: “Neue Vorlage”");
  const neu = page.getByRole("link", { name: /Neue Vorlage/ }).first();
  await moveTo(neu, { highlight: true }); await wait(1000); await unhl();
  await neu.click(); await page.waitForURL(/vorlagen\/neu/); await settle();
  await caption("Step 5:", "Name, language and category (Utility = “Service”)");
  await typeSlow(await moveTo('input[placeholder="termin_erinnerung"]', { highlight: true }), "termin_bestaetigung_demo"); await wait(600); await unhl();
  const svc = page.locator("label").filter({ hasText: "Service" }).first();
  await moveTo(svc, { highlight: true }); await svc.click(); await wait(1500); await unhl();
  await caption("Step 5:", "Message text with a variable {{1}} – the preview on the right shows how the customer will see it");
  const ta = page.locator("textarea").first();
  await moveTo(ta, { highlight: true });
  await typeSlow(ta, "Hallo {{1}}, dein Termin ist bestätigt. Antworte einfach hier, wenn du etwas ändern möchtest.");
  await wait(800); await unhl();
  const ex = page.getByLabel("Beispiel für {{1}}").first();
  if (await ex.count()) { await caption("Step 5:", "Meta requires a sample value for each variable"); await typeSlow(await moveTo(ex, { highlight: true }), "Lisa"); await wait(1200); await unhl(); }
  await moveTo(page.getByText("Vorschau", { exact: true }), { highlight: false, dy: 60 });
  await wait(2500);
  const submit = page.getByRole("button", { name: "Bei Meta einreichen" });
  await caption("Step 6:", "“Bei Meta einreichen” submits the template to Meta for approval via the WhatsApp Business Management API");
  await moveTo(submit, { highlight: true }); await wait(4200); await unhl();
  // NICHT klicken – Einreichen macht Domenic selbst (eigener Clip), siehe Anleitung.

  await caption("Step 7:", "Settings → Channels: the business can disconnect its WhatsApp account at any time (“Trennen”)");
  await page.goto(BASE + "/einstellungen/kanaele"); await settle();
  await moveTo(page.getByRole("button", { name: "Trennen" }), { highlight: true }); await wait(3800); await unhl();
  await card(`<h2>Summary · whatsapp_business_management</h2>
    <p>Read the business' own WABA and phone number (status, quality rating) · sync message templates · create templates and submit them for approval · disconnect at any time.<br><br>
    Only the business that owns the WhatsApp Business Account uses this data – for its own customer service.</p>`);
  await caption("", "");
  mark("outro"); await wait(6500);
}

mark("end");
const v = page.video();
await ctx.close(); await browser.close();
const out = `out/raw/${which}.webm`;
fs.renameSync(await v.path(), out);
fs.writeFileSync(`out/raw/${which}.marks.json`, JSON.stringify(marks, null, 1));
console.log(out, marks.at(-1));
