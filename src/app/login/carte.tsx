import { LogoNom, LogoSymbole } from "../logo";

// Cadre commun aux écrans de connexion, inscription et mot de passe
export function CarteAuth({ sousTitre, children }: { sousTitre: string; children: React.ReactNode }) {
  return (
    <div className="login">
      <div className="card">
        <div className="brand">
          <LogoSymbole taille={38} />
          <div><LogoNom /><small>{sousTitre}</small></div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function messageErreur(e: string) {
  if (e === "Invalid login credentials") return "E-mail ou mot de passe incorrect.";
  if (e === "Email not confirmed") return "Adresse e-mail pas encore confirmée : cliquez sur le lien reçu par e-mail.";
  if (/fetch failed/i.test(e)) return "Supabase est injoignable. Vérifiez NEXT_PUBLIC_SUPABASE_URL et votre connexion.";
  if (/rate limit|too many/i.test(e)) return "Trop de demandes en peu de temps. Réessayez dans quelques minutes.";
  if (/at least 6|weak password|should be at least/i.test(e)) return "Mot de passe trop faible : 8 caractères minimum, avec lettres et chiffres.";
  if (/same.*password|different from the old/i.test(e)) return "Le nouveau mot de passe doit être différent de l'ancien.";
  return e;
}
