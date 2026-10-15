import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Agence = { id: string; nom: string; role: "admin" | "agent"; nomAffiche: string | null; email: string | null };

// Agence de l'utilisateur connecté (la première s'il en a plusieurs).
// null si le compte n'est rattaché à aucune agence.
export const getAgence = cache(async (): Promise<Agence | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const lire = () =>
    supabase
      .from("membres")
      .select("agence_id, role, nom_affiche, agences(nom)")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();

  let { data } = await lire();
  // Pas encore membre : on accepte les invitations en attente pour cette adresse
  if (!data) {
    const { data: rejoint } = await supabase.rpc("rejoindre_agence");
    if (rejoint) ({ data } = await lire());
  }

  if (!data) return null;
  const agences = data.agences as unknown as { nom: string } | null;
  return {
    id: data.agence_id,
    nom: agences?.nom ?? "",
    role: data.role,
    nomAffiche: data.nom_affiche,
    email: user.email ?? null,
  };
});
