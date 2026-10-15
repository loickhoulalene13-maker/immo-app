"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const num = (f: FormData, k: string) => {
  const v = txt(f, k);
  return v == null ? null : Number(v.replace(",", "."));
};

async function ctx() {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  return { agence, supabase: await createClient() };
}

// Champs communs à la création et à la modification
function champs(f: FormData) {
  return {
    type: txt(f, "type") ?? "appartement",
    titre: txt(f, "titre") ?? "",
    description: txt(f, "description") ?? "",
    adresse: txt(f, "adresse"),
    code_postal: txt(f, "code_postal"),
    ville: txt(f, "ville") ?? "",
    surface: num(f, "surface"),
    pieces: num(f, "pieces"),
    chambres: num(f, "chambres") ?? 0,
    etage: num(f, "etage"),
    ascenseur: f.get("ascenseur") === "on",
    prix: num(f, "prix"),
    dpe: txt(f, "dpe"),
    ges: txt(f, "ges"),
    charges_annuelles: num(f, "charges_annuelles"),
    taxe_fonciere: num(f, "taxe_fonciere"),
    mandat_signe_le: txt(f, "mandat_signe_le"),
  };
}

async function vendeurId(supabase: Awaited<ReturnType<typeof createClient>>, agenceId: string, f: FormData) {
  const choix = txt(f, "vendeur_id");
  if (choix && choix !== "nouveau") return choix;
  const nom = txt(f, "vendeur_nom");
  if (!nom) return null;
  const { data } = await supabase
    .from("contacts")
    .insert({ agence_id: agenceId, nom, telephone: txt(f, "vendeur_tel"), email: txt(f, "vendeur_email"), est_vendeur: true, dernier_contact_at: new Date().toISOString() })
    .select("id")
    .single();
  return (data?.id as string) ?? null;
}

const fin = async (supabase: Awaited<ReturnType<typeof createClient>>, agenceId: string, url: string): Promise<never> => {
  await supabase.rpc("rafraichir_alertes", { p_agence: agenceId });
  revalidatePath("/", "layout");
  redirect(url);
};

export async function creerBien(f: FormData) {
  const { agence, supabase } = await ctx();
  const c = champs(f);
  if (!c.titre || !c.ville || !c.surface || !c.pieces || !c.prix) {
    redirect("/annonces/nouveau?erreur=" + encodeURIComponent("Titre, ville, surface, pièces et prix sont obligatoires."));
  }
  const vendeur = await vendeurId(supabase, agence.id, f);
  const { data, error } = await supabase
    .from("biens")
    .insert({ ...c, agence_id: agence.id, vendeur_id: vendeur, statut: "brouillon" })
    .select("id")
    .single();
  if (error || !data) redirect("/annonces/nouveau?erreur=" + encodeURIComponent(error?.message ?? "Création impossible"));
  await fin(supabase, agence.id, `/annonces/${data.id}?ok=cree`);
}

export async function modifierBien(f: FormData) {
  const { agence, supabase } = await ctx();
  const id = String(f.get("bien_id"));
  const c = champs(f);
  if (!c.titre || !c.ville || !c.surface || !c.pieces || !c.prix) {
    redirect(`/annonces/${id}?erreur=` + encodeURIComponent("Titre, ville, surface, pièces et prix sont obligatoires."));
  }
  const vendeur = await vendeurId(supabase, agence.id, f);
  const { error } = await supabase.from("biens").update({ ...c, vendeur_id: vendeur }).eq("id", id);
  if (error) redirect(`/annonces/${id}?erreur=` + encodeURIComponent(error.message));
  await fin(supabase, agence.id, `/annonces/${id}?ok=enregistre`);
}

export async function publierAnnonce(f: FormData) {
  const { agence, supabase } = await ctx();
  const id = String(f.get("bien_id"));
  // La base refuse la publication tant qu'un point critique reste ouvert
  const { error } = await supabase.from("biens").update({ statut: "en_vente" }).eq("id", id);
  if (error) redirect(`/annonces/${id}?erreur=` + encodeURIComponent(error.message));
  await fin(supabase, agence.id, `/biens/${id}?ok=publie`);
}

// ---------- Photos (libellés et signalements ; l'envoi des fichiers viendra avec le stockage) ----------
export async function ajouterPhoto(f: FormData) {
  const { agence, supabase } = await ctx();
  const id = String(f.get("bien_id"));
  const libelles = String(f.get("libelle") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (libelles.length) {
    const { data: der } = await supabase.from("photos").select("position").eq("bien_id", id).order("position", { ascending: false }).limit(1).maybeSingle();
    const depart = ((der?.position as number) ?? 0) + 1;
    await supabase.from("photos").insert(libelles.map((l, i) => ({ agence_id: agence.id, bien_id: id, libelle: l, position: depart + i })));
  }
  await fin(supabase, agence.id, `/annonces/${id}#photos`);
}

export async function signalerPhoto(f: FormData) {
  const { agence, supabase } = await ctx();
  const id = String(f.get("bien_id"));
  const sig = txt(f, "signalement");
  await supabase.from("photos").update({ signalement: sig }).eq("id", String(f.get("photo_id")));
  await fin(supabase, agence.id, `/annonces/${id}#photos`);
}

export async function supprimerPhoto(f: FormData) {
  const { agence, supabase } = await ctx();
  const id = String(f.get("bien_id"));
  await supabase.from("photos").delete().eq("id", String(f.get("photo_id")));
  await fin(supabase, agence.id, `/annonces/${id}#photos`);
}
