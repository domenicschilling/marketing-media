// Stripe-Konto des Studios verbinden (Stripe Connect)
//   GET /api/connect?id=<studioId>&t=<token>          → Weiterleitung zum Stripe-Onboarding (bzw. eingebettet im Dashboard)
//   GET /api/connect/zurueck?id=<studioId>&t=<token>  → Rückkehr von Stripe, Status abgleichen
// Sicherheit (18.10.2026): nur mit gültiger Sitzung GENAU dieses Studios oder mit signiertem Link (HMAC, 24 h, Zweck
// „connect“, an die Studio-ID gebunden; kommt nur per Mail an die hinterlegte Adresse bzw. als Stripe-Rücksprung).
// Ohne beides → Login-Seite. Die Studio-ID allein reicht nicht mehr.
import { CFG } from "./_lib/config.mjs";
import { handler } from "./_lib/util.mjs";
import { getStudio, saveStudio } from "./_lib/store.mjs";
import { stripe, ensureConnectedAccount, onboardingLink } from "./_lib/stripe.mjs";
import { kontoAbgleichen, notifyAdmin, eingebettet } from "./_lib/domain.mjs";
import { currentStudio, zweckOk } from "./_lib/auth.mjs";

const redirect = (to) => new Response(null, { status: 302, headers: { Location: to } });

export default handler(async (req) => {
  const u = new URL(req.url);
  const sitzung = await currentStudio(req);
  const s = await getStudio(u.searchParams.get("id") || sitzung?.id);
  // Admin-Ansicht (nur lesend) darf keine Einrichtung starten
  const mitSitzung = Boolean(s && sitzung && sitzung.id === s.id && !sitzung._ansicht);
  const erlaubt = mitSitzung || Boolean(s && zweckOk(u.searchParams.get("t"), "connect", s.id));
  if (!erlaubt) return redirect("/login.html?weiter=einrichtung");
  if (["entwurf", "abgebrochen", "beendet", "erstattet"].includes(s.status)) return redirect("/login.html");

  if (u.pathname.endsWith("/zurueck")) {
    if (s.stripe?.accountId) await kontoAbgleichen(s, await stripe("GET", "/accounts/" + s.stripe.accountId));
    return redirect(`/danke.html?id=${s.id}&stripe=1`);
  }
  if (s.stripe?.chargesEnabled) return redirect("/app.html");
  // Eingeloggt und eingebettete Einrichtung verfügbar → im Dashboard bleiben statt zu Stripe wechseln
  // „gehostet=1“: Rettungsweg – Stripe-Seite erzwingen (sonst Schleife, wenn die eingebettete Einrichtung nicht funktioniert)
  if (eingebettet() && mitSitzung && !u.searchParams.get("gehostet")) return redirect("/app.html#einrichtung");
  try {
    await ensureConnectedAccount(s);
    await saveStudio(s);
    return redirect(await onboardingLink(s, CFG.siteUrl));
  } catch (e) {
    // Kein roher Stripe-Fehler im Browser: Studio landet auf der Danke-Seite, wir bekommen eine Mail und melden uns
    console.error("[connect]", e.message);
    await notifyAdmin("Stripe-Konto konnte nicht angelegt werden – bitte prüfen und Studio kontaktieren", s, { Fehler: e.message });
    return redirect(`/danke.html?id=${s.id}&connect=spaeter`);
  }
});

export const config = { path: ["/api/connect", "/api/connect/zurueck"] };
