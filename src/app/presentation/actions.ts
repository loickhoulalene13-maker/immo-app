"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailDisponible, envoyerEmail } from "@/lib/email";

const retour = (q: string): never => redirect(`/presentation?${q}#demo`);
const champ = (f: FormData, n: string, max: number) => String(f.get(n) ?? "").trim().slice(0, max);

// Formulaire « Demander une démo » : enregistre la demande et vous prévient par e-mail.
export async function demanderDemo(f: FormData) {
  // Champ piège invisible : seuls les robots le remplissent
  if (champ(f, "site_web", 200)) retour("demo=ok");

  const nom = champ(f, "nom", 120);
  const agence = champ(f, "agence", 160);
  const email = champ(f, "email", 200).toLowerCase();
  const telephone = champ(f, "telephone", 40);
  const tailleBrute = champ(f, "taille", 10);
  const taille = ["1", "2-5", "6-15", "16+"].includes(tailleBrute) ? tailleBrute : null;
  const message = champ(f, "message", 2000);

  if (nom.length < 2) retour(`erreur=${encodeURIComponent("Indiquez votre nom.")}`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) retour(`erreur=${encodeURIComponent("Adresse e-mail invalide.")}`);

  const supabase = await createClient();
  const { error } = await supabase.from("demandes_demo").insert({
    nom,
    agence: agence || null,
    email,
    telephone: telephone || null,
    taille,
    message: message || null,
  });
  if (error) {
    console.error("[demande de démo]", error.message);
    retour(`erreur=${encodeURIComponent("La demande n'a pas pu être enregistrée. Écrivez-nous directement par e-mail.")}`);
  }

  // Notification interne (facultative) : CONTACT_EMAIL = votre adresse de réception
  const destinataire = process.env.CONTACT_EMAIL?.trim();
  if (destinataire && emailDisponible()) {
    const r = await envoyerEmail({
      a: destinataire,
      objet: `Nouvelle demande de démo : ${agence || nom}`,
      corps: [
        "Nouvelle demande de démo IMMO Suite :",
        "",
        `• Nom : ${nom}`,
        `• Agence : ${agence || "non précisée"}`,
        `• E-mail : ${email}`,
        `• Téléphone : ${telephone || "non précisé"}`,
        `• Taille de l'équipe : ${taille ?? "non précisée"}`,
        "",
        message ? `Message :\n${message}` : "Pas de message.",
      ].join("\n"),
      repondreA: email,
    });
    if (!r.ok) console.error("[demande de démo] notification", r.erreur);
  }

  retour("demo=ok");
}
