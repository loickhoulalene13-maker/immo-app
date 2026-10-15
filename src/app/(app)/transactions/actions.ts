"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";

async function ctx() {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  return { agence, supabase: await createClient() };
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

async function fin(supabase: Awaited<ReturnType<typeof createClient>>, agenceId: string, url: string): Promise<never> {
  await supabase.rpc("rafraichir_alertes", { p_agence: agenceId });
  revalidatePath("/", "layout");
  redirect(url);
}

// ---------- Étapes ----------
export async function basculerEtape(formData: FormData) {
  const { agence, supabase } = await ctx();
  const tx = String(formData.get("transaction_id"));
  const faite = formData.get("faite") === "1";
  const { error } = await supabase
    .from("etapes_transaction")
    .update({ faite_le: faite ? null : aujourdhui() })
    .eq("id", String(formData.get("etape_id")));
  if (error) redirect(`/transactions/${tx}?erreur=${encodeURIComponent(error.message)}`);
  await fin(supabase, agence.id, `/transactions/${tx}`);
}

export async function changerEcheance(formData: FormData) {
  const { agence, supabase } = await ctx();
  const tx = String(formData.get("transaction_id"));
  const date = String(formData.get("echeance") ?? "");
  if (!date) redirect(`/transactions/${tx}`);
  const { error } = await supabase.from("etapes_transaction").update({ echeance: date }).eq("id", String(formData.get("etape_id")));
  if (error) redirect(`/transactions/${tx}?erreur=${encodeURIComponent(error.message)}`);
  await fin(supabase, agence.id, `/transactions/${tx}?ok=date`);
}

// ---------- Documents ----------
export async function basculerDocument(formData: FormData) {
  const { agence, supabase } = await ctx();
  const tx = String(formData.get("transaction_id"));
  const recu = formData.get("recu") === "1";
  await supabase.from("documents_transaction").update({ recu_le: recu ? null : aujourdhui() }).eq("id", String(formData.get("document_id")));
  await fin(supabase, agence.id, `/transactions/${tx}#documents`);
}

export async function ajouterDocument(formData: FormData) {
  const { agence, supabase } = await ctx();
  const tx = String(formData.get("transaction_id"));
  const libelle = String(formData.get("libelle") ?? "").trim();
  if (libelle) {
    await supabase.from("documents_transaction").insert({ agence_id: agence.id, transaction_id: tx, libelle, obligatoire: true });
  }
  await fin(supabase, agence.id, `/transactions/${tx}#documents`);
}

// ---------- Offres (depuis la fiche bien) ----------
export async function enregistrerOffre(formData: FormData) {
  const { agence, supabase } = await ctx();
  const bienId = String(formData.get("bien_id"));
  const montant = Number(formData.get("montant"));
  const acheteur = String(formData.get("acheteur_id") ?? "");
  if (!acheteur || !montant) redirect(`/biens/${bienId}?erreur=${encodeURIComponent("Choisissez un acheteur et un montant.")}#offres`);
  const { error } = await supabase.from("offres").insert({
    agence_id: agence.id,
    bien_id: bienId,
    acheteur_id: acheteur,
    montant,
    conditions: String(formData.get("conditions") ?? "").trim() || null,
    compromis_prevu_le: String(formData.get("compromis_prevu_le") ?? "") || null,
  });
  if (error) redirect(`/biens/${bienId}?erreur=${encodeURIComponent(error.message)}#offres`);
  await fin(supabase, agence.id, `/biens/${bienId}?ok=offre#offres`);
}

export async function repondreOffre(formData: FormData) {
  const { agence, supabase } = await ctx();
  const bienId = String(formData.get("bien_id"));
  const offreId = String(formData.get("offre_id"));
  const decision = formData.get("decision") === "acceptee" ? "acceptee" : "refusee";

  const { error } = await supabase.from("offres").update({ statut: decision, repondue_le: aujourdhui() }).eq("id", offreId);
  if (error) redirect(`/biens/${bienId}?erreur=${encodeURIComponent(error.message)}#offres`);

  if (decision === "acceptee") {
    // La base a créé la transaction, ses 7 étapes et ses documents
    const { data: tx } = await supabase.from("transactions").select("id").eq("offre_id", offreId).maybeSingle();
    if (tx) await fin(supabase, agence.id, `/transactions/${tx.id}?ok=creee`);
  }
  await fin(supabase, agence.id, `/biens/${bienId}#offres`);
}
