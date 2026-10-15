import Link from "next/link";
import { connexion } from "./actions";
import { CarteAuth, messageErreur } from "./carte";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string; info?: string }> }) {
  const { erreur, info } = await searchParams;
  return (
    <CarteAuth sousTitre="Connexion">
      {erreur && <p className="notice crit">{messageErreur(erreur)}</p>}
      {info === "mdp" && <p className="notice ok">Mot de passe modifié. Connectez-vous avec le nouveau.</p>}
      <form action={connexion} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
        <Link className="linkbtn" href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        <Link className="linkbtn" href="/inscription">Créer un compte</Link>
      </div>
    </CarteAuth>
  );
}
