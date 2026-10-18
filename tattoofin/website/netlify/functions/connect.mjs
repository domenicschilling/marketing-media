// Stripe-Konto des Studios verbinden (Stripe Connect, Kontotyp „standard“: das Konto gehört dem Studio)
//   GET /api/connect?id=<studioId>           → Weiterleitung zum Stripe-Onboarding
//   GET /api/connect/zurueck?id=<studioId>   → Rückkehr von Stripe, Status übernehmen
import { CFG } from "./_lib/config.mjs";
import { handler } from "./_lib/util.mjs";
import { getStudio, saveStudio } from "./_lib/store.mjs";
import { stripe, ensureConnectedAccount, onboardingLink } from "./_lib/stripe.mjs";
import { kontoAbgleichen, notifyAdmin, eingebettet } from "./_lib/domain.mjs";
import { currentStudio } from "./_lib/auth.mjs";

const redirect = (to) => new Response(null, { status: 302, headers: { Location: to } });

export default handler(async (req) => {
  const u = new URL(req.url);
  const s = await getStudio(u.searchParams.get("id"));
  if (!s || ["entwurf", "abgebrochen", "beendet", "erstattet"].includes(s.status)) return redirect("/login.html");

  if (u.pathname.endsWith("/zurueck")) {
    if (s.stripe?.accountId) await kontoAbgleichen(s, await stripe("GET", "/accounts/" + s.stripe.accountId));
    return redirect(`/danke.html?id=${s.id}&stripe=1`);
  }
  if (s.stripe?.chargesEnabled) return redirect("/app.html");
  // Eingeloggt und eingebettete Einrichtung verfügbar → im Dashboard bleiben statt zu Stripe wechseln
  if (eingebettet() && (await currentStudio(req))?.id === s.id) return redirect("/app.html#einrichtung");
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
