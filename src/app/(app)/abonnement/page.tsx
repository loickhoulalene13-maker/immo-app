import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { etatAcces, getAbonnement } from "@/lib/abonnement";
import { lireAbonnementStripe, stripe, stripeDisponible, synchroniserAbonnement } from "@/lib/stripe";
import { PanneauAbonnement } from "./panneau";

export default async function Abonnement({ searchParams }: { searchParams: Promise<{ session_id?: string; annule?: string; erreur?: string }> }) {
  const { session_id, annule, erreur } = await searchParams;
  const agence = await getAgence();
  if (!agence) redirect("/login");

  // Retour de la page de paiement : on enregistre l'abonnement sans attendre le webhook
  let confirme = false;
  if (session_id && stripeDisponible()) {
    try {
      const s = await stripe<{ client_reference_id: string | null; subscription: string | null }>("GET", `checkout/sessions/${encodeURIComponent(session_id)}`);
      if (s.client_reference_id === agence.id && s.subscription) {
        await synchroniserAbonnement(await lireAbonnementStripe(s.subscription), agence.id);
        confirme = true;
      }
    } catch (e) {
      console.error("[abonnement] retour de paiement", e instanceof Error ? e.message : e);
    }
  }

  const etat = etatAcces(await getAbonnement(agence.id));

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow">{agence.nom}</p>
          <h1>Abonnement</h1>
          <p className="sub">Votre formule, vos factures et votre moyen de paiement.</p>
        </div>
      </header>
      {confirme && <p className="notice ok">Merci ! Votre abonnement est enregistré. La facture vous est envoyée par e-mail.</p>}
      {session_id && !confirme && <p className="notice ok">Paiement reçu. L&apos;abonnement apparaîtra ici dans quelques instants : rechargez la page.</p>}
      {annule && <p className="notice" style={{ background: "var(--sunk)" }}>Paiement annulé, aucun montant n&apos;a été prélevé.</p>}
      {erreur && <p className="notice crit">{erreur}</p>}
      <PanneauAbonnement etat={etat} estAdmin={agence.role === "admin"} paiementActif={stripeDisponible()} />
    </>
  );
}
