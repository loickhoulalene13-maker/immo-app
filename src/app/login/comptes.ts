"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { urlDuSite } from "@/lib/site";

const MIN = 8;

// Envoie le lien de réinitialisation. Supabase répond pareil que l'adresse
// existe ou non : on ne révèle donc pas quels e-mails ont un compte.
// En revanche, si l'envoi échoue (SMTP, domaine non vérifié…), on l'affiche.
export async function demanderReinitialisation(f: FormData) {
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/mot-de-passe-oublie");
  const supabase = await createClient();
  const site = await urlDuSite();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${site}/auth/callback?next=/mot-de-passe` });
  if (error) {
    console.error("[mot de passe oublié]", error.status, error.message);
    redirect(`/mot-de-passe-oublie?erreur=${encodeURIComponent(
      /rate limit|too many/i.test(error.message)
        ? error.message
        : "L'e-mail n'a pas pu être envoyé. Réessayez plus tard ou contactez l'administrateur.")}`);
  }
  redirect("/mot-de-passe-oublie?envoye=1");
}

export async function changerMotDePasse(f: FormData) {
  const mdp = String(f.get("password") ?? "");
  const conf = String(f.get("confirmation") ?? "");
  if (mdp.length < MIN) redirect(`/mot-de-passe?erreur=${encodeURIComponent(`Au moins ${MIN} caractères.`)}`);
  if (mdp !== conf) redirect(`/mot-de-passe?erreur=${encodeURIComponent("Les deux mots de passe ne sont pas identiques.")}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: mdp });
  if (error) redirect(`/mot-de-passe?erreur=${encodeURIComponent(error.message)}`);
  redirect("/?ok=mdp");
}

export async function inscrire(f: FormData) {
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const mdp = String(f.get("password") ?? "");
  const conf = String(f.get("confirmation") ?? "");
  const retour = `/inscription?email=${encodeURIComponent(email)}`;
  if (mdp.length < MIN) redirect(`${retour}&erreur=${encodeURIComponent(`Mot de passe : au moins ${MIN} caractères.`)}`);
  if (mdp !== conf) redirect(`${retour}&erreur=${encodeURIComponent("Les deux mots de passe ne sont pas identiques.")}`);

  const supabase = await createClient();
  const site = await urlDuSite();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: mdp,
    options: { emailRedirectTo: `${site}/auth/callback?next=/` },
  });
  if (error) redirect(`${retour}&erreur=${encodeURIComponent(error.message)}`);
  // Confirmation par e-mail désactivée dans Supabase : la session est déjà ouverte
  if (data.session) redirect("/");
  redirect(`/inscription?envoye=1&email=${encodeURIComponent(email)}`);
}