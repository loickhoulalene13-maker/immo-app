// Informations légales affichées dans les mentions légales, les CGV et la politique de confidentialité.
// ⚠️ Complétez les champs « À COMPLÉTER » avant de mettre en ligne (voir votre avis de situation SIRENE / l'INPI).

export const EDITEUR = {
  marque: "IMMO Suite",
  nomCommercial: "All Connect",
  responsable: "Loïc Khoulalene",
  statut: "Entrepreneur individuel (micro-entreprise)",
  siret: "À COMPLÉTER (14 chiffres)",
  adresse: "À COMPLÉTER (adresse postale ou de domiciliation)",
  villeTribunal: "À COMPLÉTER (ville de votre adresse, ex. Marseille)",
  email: "contact@allconnect-pro.com",
  telephone: "", // facultatif : laissez vide pour ne pas l'afficher
  tva: "TVA non applicable, article 293 B du Code général des impôts",
  site: "https://immo-app-flax.vercel.app",
};

// Date de dernière mise à jour des documents (à changer quand vous les modifiez)
export const MISE_A_JOUR = "20 octobre 2026";

// Prestataires techniques (sous-traitants au sens du RGPD)
export const PRESTATAIRES = [
  { nom: "Vercel Inc.", role: "Hébergement et exécution de l'application", lieu: "Serveurs en Irlande (Dublin) ; société établie aux États-Unis" },
  { nom: "Supabase Inc.", role: "Base de données, authentification et stockage des fichiers", lieu: "Serveurs en Irlande (région eu-west-1)" },
  { nom: "Resend", role: "Envoi des e-mails (confirmation, mot de passe, invitations, messages envoyés depuis l'app)", lieu: "États-Unis" },
  { nom: "OpenAI", role: "Rédaction assistée par IA, uniquement quand vous utilisez l'assistant", lieu: "États-Unis" },
  { nom: "Google (Google Fonts)", role: "Chargement des polices d'écriture du site", lieu: "États-Unis" },
];
