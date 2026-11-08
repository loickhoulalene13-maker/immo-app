"use server";

import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { getAbonnement } from "@/lib/abonnement";
import { createClient } from "@/lib/supabase/server";
import { prixDe, stripe, stripeDisponible, type Formule } from "@/lib/stripe";
import { urlDuSite } from "@/lib/site";

const erreur = (m: string): never => redirect(`/abonnement?erreur=${encodeURIComponent(m)}`);

async function adminAvecAbonnement() {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  if (agence.role !== "admin") erreur("Seul un administrateur de l'agence peut gérer l'abonnement.");
  if (!stripeDisponible()) erreur("Le paiement en ligne n'est pas encore activé. Contactez-nous pour vous abonner.");
  return { agence, ligne: await getAbonnement(agence.id) };
}

// Ouvre la page de paiement sécurisée de Stripe pour la formule choisie
export async function souscrire(f: FormData) {
  const { agence, ligne } = await adminAvecAbonnement();
  const formule: Formule = f.get("formule") === "agence" ? "agence" : "essentiel";

  // Déjà abonné : changement de formule, carte, factures → espace client Stripe
  if (ligne?.stripe_subscription_id && ["active", "trialing", "past_due", "unpaid"].includes(ligne.statut)) {
    return gererAbonnement();
  }

  const site = await urlDuSite();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pendant l'essai, le premier prélèvement n'a lieu qu'à la fin des 30 jours
  const finEssai = ligne ? new Date(ligne.essai_fin).getTime() : 0;
  const essaiRestant = ligne?.statut === "essai" && finEssai - Date.now() > 2 * 86_400_000;

  let url: string | null = null;
  try {
    const session = await stripe<{ url: string }>("POST", "checkout/sessions", {
      mode: "subscription",
      locale: "fr",
      line_items: [{ price: prixDe(formule), quantity: 1 }],
      client_reference_id: agence.id,
      metadata: { agence_id: agence.id },
      subscription_data: {
        metadata: { agence_id: agence.id },
        ...(essaiRestant ? { trial_end: Math.floor(finEssai / 1000) } : {}),
      },
      ...(ligne?.stripe_customer_id
        ? { customer: ligne.stripe_customer_id, customer_update: { address: "auto", name: "auto" } }
        : { customer_email: user?.email ?? undefined }),
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${site}/abonnement?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/abonnement?annule=1`,
    });
    url = session.url;
  } catch (e) {
    erreur(e instanceof Error ? e.message : "Stripe est indisponible. Réessayez dans un instant.");
  }
  redirect(url!);
}

// Espace client Stripe : carte bancaire, factures, changement de formule, résiliation
export async function gererAbonnement() {
  const { ligne } = await adminAvecAbonnement();
  if (!ligne?.stripe_customer_id) erreur("Aucun abonnement trouvé pour cette agence.");
  const site = await urlDuSite();
  let url: string | null = null;
  try {
    const s = await stripe<{ url: string }>("POST", "billing_portal/sessions", {
      customer: ligne!.stripe_customer_id,
      locale: "fr",
      return_url: `${site}/abonnement`,
    });
    url = s.url;
  } catch (e) {
    erreur(e instanceof Error ? e.message : "Stripe est indisponible. Réessayez dans un instant.");
  }
  redirect(url!);
}
