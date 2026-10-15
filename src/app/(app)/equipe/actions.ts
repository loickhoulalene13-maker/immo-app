"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";

const ret = (q: string): never => redirect(`/equipe?${q}`);
const err = (m: string): never => ret(`erreur=${encodeURIComponent(m)}`);

async function admin() {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  if (agence.role !== "admin") err("Seul un administrateur de l'agence peut faire cette action.");
  return { agence, supabase: await createClient() };
}

export async function inviterMembre(f: FormData) {
  const { agence, supabase } = await admin();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err("Adresse e-mail invalide.");
  const { error } = await supabase.from("invitations").insert({
    agence_id: agence.id,
    email,
    role: f.get("role") === "admin" ? "admin" : "agent",
    nom_affiche: String(f.get("nom") ?? "").trim() || null,
    created_by: user?.id ?? null,
  });
  if (error) err(/invitations_en_attente|duplicate/.test(error.message) ? "Une invitation est déjà en attente pour cette adresse." : error.message);
  revalidatePath("/equipe");
  ret(`invite=${encodeURIComponent(email)}`);
}

export async function annulerInvitation(f: FormData) {
  const { supabase } = await admin();
  await supabase.from("invitations").delete().eq("id", String(f.get("id")));
  revalidatePath("/equipe");
  ret("ok=annulee");
}

export async function changerRole(f: FormData) {
  const { agence, supabase } = await admin();
  const { error } = await supabase
    .from("membres")
    .update({ role: f.get("role") === "admin" ? "admin" : "agent" })
    .eq("agence_id", agence.id)
    .eq("user_id", String(f.get("user_id")));
  if (error) err(error.message);
  revalidatePath("/", "layout");
  ret("ok=role");
}

export async function retirerMembre(f: FormData) {
  const { agence, supabase } = await admin();
  const cible = String(f.get("user_id"));
  const { error } = await supabase.from("membres").delete().eq("agence_id", agence.id).eq("user_id", cible);
  if (error) err(error.message);
  revalidatePath("/equipe");
  ret("ok=retire");
}

export async function changerMonNom(f: FormData) {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();
  const { error } = await supabase.rpc("changer_mon_nom", { p_agence: agence.id, p_nom: String(f.get("nom") ?? "") });
  if (error) err(error.message);
  revalidatePath("/", "layout");
  ret("ok=nom");
}

// Compte sans agence : il crée la sienne et en devient administrateur
export async function creerMonAgence(f: FormData) {
  const supabase = await createClient();
  const nom = String(f.get("nom") ?? "").trim();
  if (nom.length < 2) redirect("/?erreur=" + encodeURIComponent("Indiquez le nom de l'agence."));
  const { data: id, error } = await supabase.rpc("creer_agence", { p_nom: nom });
  if (error || !id) redirect("/?erreur=" + encodeURIComponent(error?.message ?? "Création impossible"));
  const nomAffiche = String(f.get("nom_affiche") ?? "").trim();
  if (nomAffiche) await supabase.rpc("changer_mon_nom", { p_agence: id, p_nom: nomAffiche });
  revalidatePath("/", "layout");
  redirect("/");
}
