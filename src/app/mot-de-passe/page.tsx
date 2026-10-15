import Link from "next/link";
import { CarteAuth, messageErreur } from "../login/carte";
import { changerMotDePasse } from "../login/comptes";

export default async function NouveauMotDePasse({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return (
    <CarteAuth sousTitre="Nouveau mot de passe">
      {erreur && <p className="notice crit">{messageErreur(erreur)}</p>}
      <form action={changerMotDePasse} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="field">
          <label htmlFor="password">Nouveau mot de passe (8 caractères minimum)</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div className="field">
          <label htmlFor="confirmation">Confirmer le mot de passe</label>
          <input id="confirmation" name="confirmation" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <button className="btn primary" type="submit" style={{ justifyContent: "center" }}>Enregistrer</button>
      </form>
      <Link className="linkbtn" href="/" style={{ fontSize: 13 }}>Annuler</Link>
    </CarteAuth>
  );
}
