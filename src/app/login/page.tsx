import { connexion } from "./actions";

function messageErreur(e: string) {
  if (e === "Invalid login credentials") return "E-mail ou mot de passe incorrect.";
  if (e === "Email not confirmed") return "Ce compte n'est pas encore confirmé.";
  if (/fetch failed/i.test(e)) return "Supabase est injoignable. Vérifiez NEXT_PUBLIC_SUPABASE_URL dans .env.local et votre connexion.";
  return e;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return (
    <div className="login">
      <form className="card" action={connexion}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
          </div>
          <div><b>IMMO Suite</b><small>Connexion</small></div>
        </div>
        {erreur && <p className="notice crit">{messageErreur(erreur)}</p>}
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button className="btn primary" type="submit" style={{ justifyContent: "center" }}>Se connecter</button>
      </form>
    </div>
  );
}
