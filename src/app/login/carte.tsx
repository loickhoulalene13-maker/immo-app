// Cadre commun aux écrans de connexion, inscription et mot de passe
export function CarteAuth({ sousTitre, children }: { sousTitre: string; children: React.ReactNode }) {
  return (
    <div className="login">
      <div className="card">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
          </div>
          <div><b>IMMO Suite</b><small>{sousTitre}</small></div>
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
