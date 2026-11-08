import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Offres affichées dans l'app (gardez-les identiques à la page de présentation)
export const OFFRES = [
  { id: "essentiel" as const, nom: "Essentiel", prix: "59 €", detail: "2 utilisateurs · assistant IA 100 rédactions / mois" },
  { id: "agence" as const, nom: "Agence", prix: "119 €", detail: "Jusqu'à 10 utilisateurs · IA sans limite · envoi d'e-mails" },
];

export type LigneAbonnement = {
  essai_fin: string;
  acces_offert: boolean;
  formule: "essentiel" | "agence" | null;
  statut: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  fin_periode: string | null;
  resiliation_prevue: boolean;
};

export type EtatAcces =
  | { acces: true; type: "offert" | "actif" | "inconnu"; ligne: LigneAbonnement | null }
  | { acces: true; type: "essai"; joursRestants: number; ligne: LigneAbonnement }
  | { acces: true; type: "impaye"; ligne: LigneAbonnement }
  | { acces: false; type: "expire"; ligne: LigneAbonnement };

const JOUR = 86_400_000;

export function etatAcces(l: LigneAbonnement | null): EtatAcces {
  // Table absente ou ligne introuvable : on ne bloque jamais l'app par erreur
  if (!l) return { acces: true, type: "inconnu", ligne: null };
  if (l.acces_offert) return { acces: true, type: "offert", ligne: l };
  if (l.statut === "active" || l.statut === "trialing") return { acces: true, type: "actif", ligne: l };
  // Paiement en échec : Stripe relance la carte pendant quelques jours, on laisse l'accès
  if (l.statut === "past_due") return { acces: true, type: "impaye", ligne: l };
  const reste = new Date(l.essai_fin).getTime() - Date.now();
  if (l.statut === "essai" && reste > 0) return { acces: true, type: "essai", joursRestants: Math.ceil(reste / JOUR), ligne: l };
  return { acces: false, type: "expire", ligne: l };
}

export const getAbonnement = cache(async (agenceId: string): Promise<LigneAbonnement | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("abonnements")
    .select("essai_fin, acces_offert, formule, statut, stripe_customer_id, stripe_subscription_id, fin_periode, resiliation_prevue")
    .eq("agence_id", agenceId)
    .maybeSingle();
  if (error) return null;
  return (data as LigneAbonnement | null) ?? null;
});
