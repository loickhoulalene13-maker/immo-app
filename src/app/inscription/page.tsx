import Link from "next/link";
import { CarteAuth, messageErreur } from "../login/carte";
import { inscrire } from "../login/comptes";

export default async function Inscription({ searchParams }: { searchParams: Promise<{ email?: string; envoye?: string; erreur?: string }> }) {
  const { email, envoye, erreur } = await searchParams;
  return (
    <CarteAuth sousTitre="Créer un compte">
      {envoye ? (
        <>
          <p className="notice ok">Compte créé. Un e-mail de confirmation a été envoyé à {email}.</p>
          <p className="muted" style={{ fontSize: 13 }}>Cliquez sur le lien de cet e-mail, dans ce même navigateur. Si vous avez été invité par une agence, vous y serez rattaché automatiquement.</p>
        </>
      ) : (
        <form action={inscrire} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {erreur && <p className="notice crit">{messageErreur(erreur)}</p>}
          <p className="muted" style={{ fontSize: 13.5 }}>Si votre agence vous a invité, utilisez exactement l&apos;adresse e-mail de l&apos;invitation.</p>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" defaultValue={email ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe (8 caractères minimum)</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div className="field">
            <label htmlFor="confirmation">Confirmer le mot de passe</label>
            <input id="confirmation" name="confirmation" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <button className="btn primary" type="submit" style={{ justifyContent: "center" }}>Créer mon compte</button>
        </form>
      )}
      <Link className="linkbtn" href="/login" style={{ fontSize: 13 }}>J&apos;ai déjà un compte</Link>
    </CarteAuth>
  );
}
