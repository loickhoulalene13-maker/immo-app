"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";

const n = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : Number(s);
};

export async function ajouterAcheteur(formData: FormData) {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();

  const nom = String(formData.get("nom") ?? "").trim();
  const budget = n(formData.get("budget_max"));
  const villes = String(formData.get("villes") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (!nom || !budget) redirect("/prospects?erreur=" + encodeURIComponent("Le nom et le budget sont obligatoires."));

  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      agence_id: agence.id,
      nom,
      email: String(formData.get("email") ?? "").trim() || null,
      telephone: String(formData.get("telephone") ?? "").trim() || null,
      source: String(formData.get("source") ?? "").trim() || null,
      est_acheteur: true,
      dernier_contact_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !contact) redirect("/prospects?erreur=" + encodeURIComponent(error?.message ?? "Création impossible"));

  const { error: e2 } = await supabase.from("recherches").insert({
    agence_id: agence.id,
    contact_id: contact.id,
    budget_max: budget,
    villes,
    surface_min: n(formData.get("surface_min")),
    pieces_min: n(formData.get("pieces_min")),
  });
  if (e2) redirect(`/prospects/${contact.id}?erreur=` + encodeURIComponent(e2.message));

  await supabase.rpc("rafraichir_alertes", { p_agence: agence.id });
  revalidatePath("/", "layout");
  redirect(`/prospects/${contact.id}?ok=cree`);
}

// Enregistre la relance comme envoyée : elle compte comme un contact
// (le déclencheur textes_ia_maj_contact met à jour dernier_contact_at).
export async function marquerRelanceEnvoyee(formData: FormData) {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();
  const contactId = String(formData.get("contact_id"));
  const texte = String(formData.get("texte") ?? "");

  const { error } = await supabase.from("textes_ia").insert({
    agence_id: agence.id,
    type: "relance_acheteur",
    contact_id: contactId,
    texte,
    modele: "regles",
    envoye_le: new Date().toISOString(),
  });
  if (error) redirect(`/prospects/${contactId}?erreur=` + encodeURIComponent(error.message));

  await supabase.rpc("rafraichir_alertes", { p_agence: agence.id });
  revalidatePath("/", "layout");
  redirect(`/prospects/${contactId}?ok=relance`);
}
