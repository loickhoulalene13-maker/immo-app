"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { appelIA, CONSIGNES_STYLE, iaDisponible } from "@/lib/ia";
import { brouillonRapportVendeur, brouillonRelance, type DonneesRapport } from "@/lib/redaction";
import { eur, typologie } from "@/lib/format";
import { envoyerEmail, separerObjet } from "@/lib/email";

type Client = Awaited<ReturnType<typeof createClient>>;

const POINTS_FORTS: { libelle: string; re: RegExp }[] = [
  { libelle: "Extérieur", re: /balcon|terrasse|jardin/i },
  { libelle: "Emplacement", re: /emplacement|bien placé|quartier|proche|vue/i },
  { libelle: "Luminosité", re: /lumineux|lumière naturelle/i },
  { libelle: "Volume", re: /volume|spacieu/i },
  { libelle: "État général", re: /bon état|aucun travaux|refait/i },
  { libelle: "Stationnement", re: /garage|place de parking/i },
];

const err = (url: string, m: string): never => redirect(`${url}${url.includes("?") ? "&" : "?"}erreur=${encodeURIComponent(m)}`);

// ---------------------------------------------------------------------
// Données d'un bien, sans les noms des visiteurs (inutiles pour l'IA)
// ---------------------------------------------------------------------
async function donneesBien(supabase: Client, bienId: string) {
  const [{ data: b }, { data: suivi }, { data: visites }, { data: objections }, { data: rappro }, { data: cats }] = await Promise.all([
    supabase.from("biens").select("id, reference, titre, type, pieces, surface, ville, prix, statut, description, vendeur_id, vendeur:contacts(nom)").eq("id", bienId).single(),
    supabase.from("v_biens_suivi").select("jours_en_ligne, nb_visites, nb_visites_30j, note_moyenne, prix_m2").eq("bien_id", bienId).maybeSingle(),
    supabase.from("visites").select("id, date_visite, note, retour").eq("bien_id", bienId).eq("statut", "faite").order("date_visite"),
    supabase.from("v_objections_bien").select("categorie, libelle, action_suggeree, nb, recurrente").eq("bien_id", bienId).order("nb", { ascending: false }),
    supabase.from("v_rapprochements").select("acheteur_id").eq("bien_id", bienId),
    supabase.from("categories_objection").select("code, libelle").order("ordre"),
  ]);
  if (!b) throw new Error("Bien introuvable");
  const vis = (visites ?? []) as { id: string; date_visite: string; note: number | null; retour: string | null }[];
  const pointsForts = POINTS_FORTS.map((p) => ({ libelle: p.libelle, nb: vis.filter((v) => p.re.test(v.retour ?? "")).length })).filter((p) => p.nb > 0).sort((x, y) => y.nb - x.nb);
  return {
    bien: b,
    vendeur: (b.vendeur as unknown as { nom: string } | null)?.nom ?? "",
    suivi,
    visites: vis,
    objections: (objections ?? []) as { categorie: string; libelle: string; action_suggeree: string; nb: number; recurrente: boolean }[],
    nbCompatibles: (rappro ?? []).length,
    categories: (cats ?? []) as { code: string; libelle: string }[],
    pointsForts,
  };
}

// ---------------------------------------------------------------------
// 1. Analyse des retours de visite
// ---------------------------------------------------------------------
type Analyse = {
  visites: { n: number; categories: string[]; autres: string[] }[];
  points_forts: { libelle: string; nb: number }[];
  synthese: string;
  actions: string[];
};

export async function analyserBien(formData: FormData) {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();
  const bienId = String(formData.get("bien_id"));
  const url = `/biens/${bienId}`;

  if (!iaDisponible()) err(url, "L'analyse IA demande une clé OpenAI (OPENAI_API_KEY dans .env.local).");
  const d = await donneesBien(supabase, bienId);
  const avecRetour = d.visites.filter((v) => (v.retour ?? "").trim());
  if (!avecRetour.length) err(url, "Aucun retour de visite à analyser.");

  const r = await appelIA<Analyse>({
    json: true,
    systeme: `${CONSIGNES_STYLE}
Tu analyses des retours de visite pour aider l'agent à convaincre le vendeur ou à ajuster la commercialisation.
Réponds uniquement en JSON avec ce format :
{"visites":[{"n":1,"categories":["prix"],"autres":["vis-à-vis"]}],
 "points_forts":[{"libelle":"Balcon","nb":2}],
 "synthese":"2 à 3 phrases",
 "actions":["action concrète 1","action concrète 2"]}
- "categories" : seulement parmi ces codes : ${d.categories.map((c) => `${c.code} (${c.libelle})`).join(", ")}.
- "autres" : freins qui n'entrent dans aucune catégorie, en 1 à 3 mots chacun. Vide si aucun.
- Un frein n'est retenu que s'il est exprimé comme un frein (pas « lumineux » pour luminosité).
- 2 à 4 actions, concrètes, réalisables par l'agence ou le vendeur, classées par impact.`,
    utilisateur: `Bien : ${typologie(d.bien.type, d.bien.pieces)} de ${d.bien.surface} m² à ${d.bien.ville}, ${eur(d.bien.prix)} (${eur(d.suivi?.prix_m2)}/m²), en ligne depuis ${d.suivi?.jours_en_ligne ?? "?"} jours.
Retours de visite :
${avecRetour.map((v, i) => `${i + 1}. [note ${v.note ?? "?"}/5] ${v.retour}`).join("\n")}`,
  });
  if (!r.ok) err(url, r.erreur);
  const a = (r as { data: Analyse }).data;

  // Objections détectées par l'IA, ajoutées à celles des règles (source distincte)
  const codes = new Set(d.categories.map((c) => c.code));
  const ids = avecRetour.map((v) => v.id);
  await supabase.from("objections_visite").delete().in("visite_id", ids).eq("source", "ia");
  const lignes = (a.visites ?? []).flatMap((v) => {
    const visite = avecRetour[v.n - 1];
    return visite ? (v.categories ?? []).filter((c) => codes.has(c)).map((c) => ({ visite_id: visite.id, agence_id: agence.id, categorie: c, source: "ia" })) : [];
  });
  if (lignes.length) await supabase.from("objections_visite").insert(lignes);

  const autres = new Map<string, number>();
  (a.visites ?? []).forEach((v) => (v.autres ?? []).forEach((x) => autres.set(x.toLowerCase(), (autres.get(x.toLowerCase()) ?? 0) + 1)));

  await supabase.from("textes_ia").insert({
    agence_id: agence.id,
    type: "analyse_bien",
    bien_id: bienId,
    modele: (r as { modele: string }).modele,
    texte: a.synthese ?? "",
    donnees: {
      synthese: a.synthese ?? "",
      actions: (a.actions ?? []).slice(0, 5),
      points_forts: (a.points_forts ?? []).slice(0, 6),
      autres: [...autres].map(([libelle, nb]) => ({ libelle, nb })).sort((x, y) => y.nb - x.nb),
      nb_visites: avecRetour.length,
    },
  });

  revalidatePath("/", "layout");
  redirect(`${url}?ok=analyse#ia`);
}

// ---------------------------------------------------------------------
// 2. Compte rendu pour le vendeur
// ---------------------------------------------------------------------
export async function genererRapportVendeur(formData: FormData) {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();
  const bienId = String(formData.get("bien_id"));
  const retour = String(formData.get("retour") ?? `/biens/${bienId}`);
  const d = await donneesBien(supabase, bienId);

  const base: DonneesRapport = {
    vendeur: d.vendeur,
    bien: { reference: d.bien.reference, titre: d.bien.titre, prix: d.bien.prix },
    joursEnLigne: d.suivi?.jours_en_ligne ?? null,
    nbVisites: d.suivi?.nb_visites ?? d.visites.length,
    nbVisites30j: d.suivi?.nb_visites_30j ?? 0,
    noteMoyenne: d.suivi?.note_moyenne ?? null,
    nbAcheteursCompatibles: d.nbCompatibles,
    pointsForts: d.pointsForts,
    objections: d.objections.map((o) => ({ libelle: o.libelle, nb: o.nb, recurrente: o.recurrente, action: o.action_suggeree })),
    agent: agence.nomAffiche ?? "",
    agence: agence.nom,
  };

  // Dernière analyse IA éventuelle, pour enrichir le rapport
  const { data: analyse } = await supabase.from("textes_ia").select("donnees").eq("bien_id", bienId).eq("type", "analyse_bien").order("created_at", { ascending: false }).limit(1).maybeSingle();

  let texte = brouillonRapportVendeur(base);
  let modele = "regles";
  let avertissement = "";

  if (iaDisponible()) {
    const r = await appelIA<string>({
      json: false,
      maxTokens: 900,
      systeme: `${CONSIGNES_STYLE}
Tu rédiges un compte rendu de commercialisation envoyé par e-mail au vendeur.
Structure : une ligne « Objet : … », salutation, un paragraphe d'activité chiffrée, ce que les visiteurs apprécient, les freins exprimés, une recommandation claire (2 à 3 actions numérotées), proposition d'échange, signature.
Si le prix est un frein récurrent et que le bien est en ligne depuis longtemps, recommande une révision de prix avec tact, sans chiffre de baisse précis.
200 à 280 mots. Texte brut, sans markdown ni astérisques.`,
      utilisateur: `Données (n'utilise que celles-ci) :
${JSON.stringify({ ...base, analyse_ia: analyse?.donnees ?? null }, null, 2)}`,
    });
    if (r.ok) {
      texte = r.data;
      modele = r.modele;
    } else avertissement = r.erreur;
  }

  await supabase.from("textes_ia").insert({
    agence_id: agence.id,
    type: "rapport_vendeur",
    bien_id: bienId,
    contact_id: d.bien.vendeur_id,
    texte,
    modele,
    donnees: base,
  });

  revalidatePath("/", "layout");
  const sep = retour.includes("?") ? "&" : "?";
  redirect(`${retour}${sep}ok=rapport${avertissement ? `&erreur=${encodeURIComponent("IA indisponible, modèle standard utilisé : " + avertissement)}` : ""}#rapport`);
}

// ---------------------------------------------------------------------
// 3. Relance d'un acheteur
// ---------------------------------------------------------------------
export async function genererRelance(formData: FormData) {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();
  const contactId = String(formData.get("contact_id"));
  const url = `/prospects/${contactId}`;

  const [{ data: c }, { data: rappro }, { data: visites }] = await Promise.all([
    supabase.from("contacts").select("nom, dernier_contact_at, notes, recherches(budget_max, villes, surface_min, pieces_min, active)").eq("id", contactId).single(),
    supabase.from("v_rapprochements").select("bien_id, score").eq("acheteur_id", contactId).order("score", { ascending: false }),
    supabase.from("visites").select("date_visite, note, retour, bien:biens(reference, ville, type, pieces)").eq("acheteur_id", contactId).eq("statut", "faite").order("date_visite", { ascending: false }).limit(3),
  ]);
  if (!c) err("/prospects", "Contact introuvable");

  const ids = (rappro ?? []).map((r) => r.bien_id as string);
  const { data: biens } = ids.length
    ? await supabase.from("biens").select("id, reference, titre, type, pieces, ville, surface, prix, description").in("id", ids).eq("statut", "en_vente")
    : { data: [] as never[] };
  const recherche = ((c!.recherches ?? []) as { budget_max: number; villes: string[]; surface_min: number | null; pieces_min: number | null; active: boolean }[]).find((r) => r.active) ?? null;
  const jours = c!.dernier_contact_at ? Math.floor((Date.now() - new Date(c!.dernier_contact_at).getTime()) / 86_400_000) : null;
  const biensTries = ((biens ?? []) as { id: string; reference: string; titre: string; type: string; pieces: number; ville: string; surface: number; prix: number; description: string }[]).slice(0, 3);

  let texte = brouillonRelance({ nom: c!.nom, joursSansContact: jours, recherche, biens: biensTries, agent: agence.nomAffiche ?? "", agence: agence.nom });
  let modele = "regles";
  let avertissement = "";

  if (iaDisponible()) {
    const r = await appelIA<string>({
      json: false,
      maxTokens: 700,
      systeme: `${CONSIGNES_STYLE}
Tu rédiges un e-mail de relance à un acheteur sans contact depuis un moment.
But : obtenir une réponse (visite ou mise à jour de ses critères). Personnalise à partir de ses critères et de ses visites passées ;
présente au plus 3 biens adaptés en une ligne chacun avec la référence, et dis en quelques mots pourquoi ils lui correspondent.
Termine par une question simple. 120 à 180 mots. Une ligne « Objet : … » en premier. Texte brut, sans markdown. Signe avec le nom de l'agent et de l'agence fournis.`,
      utilisateur: JSON.stringify(
        {
          prenom: c!.nom.split(" ")[0],
          jours_sans_contact: jours,
          recherche,
          visites_passees: (visites ?? []).map((v) => ({ note: v.note, retour: v.retour, bien: v.bien })),
          biens_adaptes: biensTries.map((b) => ({ reference: b.reference, typologie: typologie(b.type, b.pieces), ville: b.ville, surface: b.surface, prix: b.prix, titre: b.titre, extrait: (b.description ?? "").slice(0, 220) })),
          agent: agence.nomAffiche,
          agence: agence.nom,
        },
        null,
        2
      ),
    });
    if (r.ok) {
      texte = r.data;
      modele = r.modele;
    } else avertissement = r.erreur;
  }

  await supabase.from("textes_ia").insert({ agence_id: agence.id, type: "relance_acheteur", contact_id: contactId, texte, modele });
  revalidatePath("/", "layout");
  redirect(`${url}?ok=brouillon${avertissement ? `&erreur=${encodeURIComponent("IA indisponible, modèle standard utilisé : " + avertissement)}` : ""}#relance`);
}

// ---------------------------------------------------------------------
// Brouillon envoyé : soit par e-mail depuis l'app (Resend), soit copié ailleurs.
// Dans les deux cas le contact est mis à jour par la base (déclencheur).
// ---------------------------------------------------------------------
export async function marquerTexteEnvoye(formData: FormData) {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();
  const id = String(formData.get("texte_id"));
  const retour = String(formData.get("retour") ?? "/assistant");
  const texte = String(formData.get("texte") ?? "");
  const parEmail = formData.get("mode") === "email";
  const sep = retour.includes("?") ? "&" : "?";

  const { data: t } = await supabase.from("textes_ia").select("id, type, contact_id, donnees").eq("id", id).maybeSingle();
  if (!t) err(retour, "Brouillon introuvable.");

  let donnees = (t!.donnees ?? {}) as Record<string, unknown>;
  if (parEmail) {
    const a = String(formData.get("destinataire") ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) err(retour, "Adresse du destinataire invalide.");
    const defaut = t!.type === "rapport_vendeur" ? `Compte rendu de commercialisation · ${agence.nom}` : `Votre recherche immobilière · ${agence.nom}`;
    const { objet, corps } = separerObjet(texte, defaut);
    const r = await envoyerEmail({ a, objet, corps, repondreA: agence.email });
    if (!r.ok) err(retour, r.erreur);
    donnees = { ...donnees, envoi: { canal: "email", a, objet, id_resend: (r as { id: string }).id, le: new Date().toISOString() } };

    // Enregistre l'adresse sur la fiche si elle n'y était pas
    if (t!.contact_id) {
      const { data: c } = await supabase.from("contacts").select("email").eq("id", t!.contact_id).maybeSingle();
      if (c && !c.email) await supabase.from("contacts").update({ email: a }).eq("id", t!.contact_id);
    }
  } else {
    donnees = { ...donnees, envoi: { canal: "manuel", le: new Date().toISOString() } };
  }

  const { error } = await supabase.from("textes_ia").update({ texte, envoye_le: new Date().toISOString(), donnees }).eq("id", id);
  if (error) err(retour, error.message);
  await supabase.rpc("rafraichir_alertes", { p_agence: agence.id });
  revalidatePath("/", "layout");
  redirect(`${retour}${sep}ok=${parEmail ? "email" : "envoye"}`);
}
