import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { cheminSur } from "@/lib/site";

// Point d'arrivée des liens envoyés par e-mail (confirmation d'inscription,
// réinitialisation du mot de passe). Ouvre la session puis redirige.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const suite = cheminSur(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let erreur: string | null = searchParams.get("error_description");
  if (!erreur && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) erreur = error.message;
  } else if (!erreur && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) erreur = error.message;
  } else if (!erreur) {
    erreur = "Lien incomplet.";
  }

  if (erreur) {
    console.error("[auth/callback]", erreur);
    const msg = /code verifier|both auth code and code verifier/i.test(erreur)
      ? "Ce lien doit être ouvert dans le même navigateur que celui où vous avez fait la demande. Refaites la demande depuis cet appareil."
      : /expired|invalid/i.test(erreur)
        ? "Ce lien a expiré ou a déjà servi. Refaites la demande."
        : erreur;
    return NextResponse.redirect(`${origin}/login?erreur=${encodeURIComponent(msg)}`);
  }
  return NextResponse.redirect(`${origin}${suite}`);
}
