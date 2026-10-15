"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function connexion(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Visible dans le terminal (jamais le mot de passe, seulement sa longueur)
    console.error("[connexion]", {
      email,
      longueurMotDePasse: password.length,
      projet: process.env.NEXT_PUBLIC_SUPABASE_URL,
      code: error.code,
      message: error.message,
    });
    redirect(`/login?erreur=${encodeURIComponent(error.message)}`);
  }
  redirect("/");
}

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
