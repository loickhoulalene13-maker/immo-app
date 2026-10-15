import { eur, typologie } from "./format";

// Rédaction par règles, en attendant le branchement d'OpenAI.
// Même structure de sortie que celle attendue plus tard du modèle : un texte modifiable.

export type BienPropose = { reference: string; type: string; pieces: number; ville: string; surface: number; prix: number; titre: string };
export type Recherche = { budget_max: number; villes: string[]; surface_min: number | null; pieces_min: number | null };

const jourPlus = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
};

export function brouillonRelance(opts: {
  nom: string;
  joursSansContact: number | null;
  recherche: Recherche | null;
  biens: BienPropose[];
  agent: string;
  agence: string;
}) {
  const { nom, joursSansContact, recherche, biens, agent, agence } = opts;
  const prenom = nom.split(" ")[0];
  const villes = recherche?.villes.length ? recherche.villes.join(" ou ") : "votre secteur";

  const intro =
    joursSansContact != null && joursSansContact > 0
      ? `Nous n'avons pas échangé depuis ${joursSansContact} jours et je voulais faire le point sur votre projet.`
      : "Je reviens vers vous au sujet de votre projet.";

  const criteres = recherche
    ? ` Votre recherche est-elle toujours d'actualité, avec un budget autour de ${eur(recherche.budget_max)}${recherche.pieces_min ? ` pour au moins ${recherche.pieces_min} pièce${recherche.pieces_min > 1 ? "s" : ""}` : ""}${recherche.surface_min ? ` et ${recherche.surface_min} m²` : ""} ?`
    : "";

  const liste = biens.length
    ? `Voici les biens de notre portefeuille qui correspondent à vos critères :\n${biens
        .slice(0, 3)
        .map((b) => `• ${typologie(b.type, b.pieces)} ${b.ville}, ${b.surface} m², ${eur(b.prix)} (réf. ${b.reference})`)
        .join("\n")}`
    : "De nouveaux biens arrivent chaque semaine ; je vous les transmets dès leur rentrée.";

  return `Objet : Votre recherche à ${villes}

Bonjour ${prenom},

${intro}${criteres}

${liste}

Je peux vous proposer une visite dès ${jourPlus(1)}. Dites-moi aussi si vos critères ont évolué, je mettrai votre recherche à jour.

Bien cordialement,
${agent}
${agence}`;
}

export type DonneesRapport = {
  vendeur: string;
  bien: { reference: string; titre: string; prix: number };
  joursEnLigne: number | null;
  nbVisites: number;
  nbVisites30j: number;
  noteMoyenne: number | null;
  nbAcheteursCompatibles: number;
  pointsForts: { libelle: string; nb: number }[];
  objections: { libelle: string; nb: number; recurrente: boolean; action: string }[];
  agent: string;
  agence: string;
};

export function brouillonRapportVendeur(d: DonneesRapport) {
  const s = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
  const forts = d.pointsForts.length
    ? d.pointsForts.map((p) => `• ${p.libelle} (cité ${p.nb} fois)`).join("\n")
    : "• Pas de point fort cité de façon récurrente pour l'instant";
  const freins = d.objections.length
    ? d.objections.map((o) => `• ${o.libelle} : évoqué lors de ${o.nb} visite${o.nb > 1 ? "s" : ""} sur ${d.nbVisites}`).join("\n")
    : "• Aucun frein récurrent";
  const actions = d.objections.filter((o) => o.recurrente).map((o) => o.action);
  if (!actions.length) actions.push("Les retours sont encourageants : nous relançons les visiteurs les mieux disposés pour une contre-visite.");
  return `Objet : Compte rendu de commercialisation, ${d.bien.titre}

Bonjour ${d.vendeur},

Voici le point sur la commercialisation de votre bien (réf. ${d.bien.reference})${d.joursEnLigne != null ? `, en ligne depuis ${d.joursEnLigne} jours` : ""} au prix de ${eur(d.bien.prix)}.

Activité
• ${s(d.nbVisites, "visite")} au total, dont ${d.nbVisites30j} sur les 30 derniers jours
${d.noteMoyenne != null ? `• Note moyenne donnée par les visiteurs : ${String(d.noteMoyenne).replace(".", ",")} sur 5\n` : ""}• ${s(d.nbAcheteursCompatibles, "acheteur")} de notre fichier ${d.nbAcheteursCompatibles > 1 ? "correspondent" : "correspond"} à votre bien

Ce que les visiteurs apprécient
${forts}

Les freins exprimés
${freins}

Notre recommandation
${actions.map((a, i) => `${i + 1}. ${a}`).join("\n")}

Je vous propose d'en parler cette semaine, par téléphone ou à l'agence, à l'heure qui vous convient.

Bien cordialement,
${d.agent}
${d.agence}`;
}
