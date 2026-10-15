"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";

async function contexte() {
  const agence = await getAgence();
  if (!agence) throw new Error("Compte non rattaché à une agence");
  const supabase = await createClient();
  return { agence, supabase };
}

// Recalcule alertes et tâches après un changement d'état
async function rafraichir(supabase: Awaited<ReturnType<typeof createClient>>, agenceId: string) {
  await supabase.rpc("rafraichir_alertes", { p_agence: agenceId });
}

export async function recalculerAlertes() {
  const { agence, supabase } = await contexte();
  await rafraichir(supabase, agence.id);
  revalidatePath("/", "layout");
}

export async function basculerTache(formData: FormData) {
  const { supabase } = await contexte();
  const id = String(formData.get("id"));
  const faite = formData.get("faite") === "1";
  await supabase.from("taches").update({ faite_le: faite ? null : new Date().toISOString() }).eq("id", id);
  revalidatePath("/");
}

export async function ajouterVisite(formData: FormData) {
  const { agence, supabase } = await contexte();
  const bienId = String(formData.get("bien_id"));
  const retour = String(formData.get("retour") ?? "").trim();
  const { error } = await supabase.from("visites").insert({
    agence_id: agence.id,
    bien_id: bienId,
    acheteur_id: String(formData.get("acheteur_id")) || null,
    date_visite: new Date().toISOString(),
    statut: "faite",
    note: Number(formData.get("note")),
    retour,
  });
  if (error) redirect(`/biens/${bienId}?erreur=${encodeURIComponent(error.message)}`);
  await rafraichir(supabase, agence.id);
  revalidatePath("/", "layout");
  redirect(`/biens/${bienId}?ok=visite#visites`);
}

export async function publierBien(formData: FormData) {
  const { agence, supabase } = await contexte();
  const bienId = String(formData.get("bien_id"));
  const { error } = await supabase.from("biens").update({ statut: "en_vente" }).eq("id", bienId);
  if (error) redirect(`/biens/${bienId}?erreur=${encodeURIComponent(error.message)}`);
  await rafraichir(supabase, agence.id);
  revalidatePath("/", "layout");
  redirect(`/biens/${bienId}?ok=publie`);
}
