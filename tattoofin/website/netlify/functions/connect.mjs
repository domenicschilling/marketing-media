// Stripe-Konto des Studios verbinden (Stripe Connect, Kontotyp „standard“: das Konto gehört dem Studio)
//   GET /api/connect?id=<studioId>           → Weiterleitung zum Stripe-Onboarding
//   GET /api/connect/zurueck?id=<studioId>   → Rückkehr von Stripe, Status übernehmen
import { CFG } from "./_lib/config.mjs";
import { handler } from "./_lib/util.mjs";
import { getStudio, saveStudio } from "./_lib/store.mjs";
import { stripe, ensureConnectedAccount, onboardingLink } from "./_lib/stripe.mjs";
import { kontoAbgleichen } from "./_lib/domain.mjs";

const redirect = (to) => new Response(null, { status: 302, headers: { Location: to } });

export default handler(async (req) => {
  const u = new URL(req.url);
  const s = await getStudio(u.searchParams.get("id"));
  if (!s || ["entwurf", "abgebrochen", "beendet", "erstattet"].includes(s.status)) return redirect("/login.html");

  if (u.pathname.endsWith("/zurueck")) {
    if (s.stripe?.accountId) await kontoAbgleichen(s, await stripe("GET", "/accounts/" + s.stripe.accountId));
    return redirect(`/danke.html?id=${s.id}&stripe=1`);
  }
  if (s.stripe?.chargesEnabled) return redirect("/portal.html");
  await ensureConnectedAccount(s);
  await saveStudio(s);
  return redirect(await onboardingLink(s, CFG.siteUrl));
});

export const config = { path: ["/api/connect", "/api/connect/zurueck"] };
