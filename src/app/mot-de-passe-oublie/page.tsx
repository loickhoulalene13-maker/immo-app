import Link from "next/link";
import { CarteAuth, messageErreur } from "../login/carte";
import { demanderReinitialisation } from "../login/comptes";

export default async function MotDePasseOublie({ searchParams }: { searchParams: Promise<{ envoye?: string; erreur?: string }> }) {
  const { envoye, erreur } = await searchParams;
  return (
    <CarteAuth sousTitre="Mot de passe oublié">
      {envoye ? (
        <>
          <p className="notice ok">Si un compte existe pour cette adresse, un e-mail vient d&apos;être envoyé avec un lien pour choisir un nouveau mot de passe.</p>
          <p className="muted" style={{ fontSize: 13 }}>Ouvrez le lien dans ce même navigateur. Pensez à regarder dans les indésirables. Le lien expire au bout d&apos;une heure.</p>
        </>
      ) : (
        <form action={demanderReinitialisation} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {erreur && <p className="notice crit">{messageErreur(erreur)}</p>}
          <p className="muted" style={{ fontSize: 13.5 }}>Indiquez l&apos;adresse de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <button className="btn primary" type="submit" style={{ justifyContent: "center" }}>Envoyer le lien</button>
        </form>
      )}
      <Link className="linkbtn" href="/login" style={{ fontSize: 13 }}>Retour à la connexion</Link>
    </CarteAuth>
  );
}
