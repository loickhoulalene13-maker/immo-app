import { dateCourte } from "@/lib/format";
import { emailDisponible } from "@/lib/email";
import { CopyButton } from "./copy-button";
import { marquerTexteEnvoye } from "./assistant/actions";

// Brouillon modifiable (relance, compte rendu) : envoyer par e-mail depuis l'app,
// ou copier le texte et le marquer comme envoyé.
export function Brouillon({
  id,
  texte,
  modele,
  creeLe,
  retour,
  champ,
  destinataire,
  nomDestinataire,
}: {
  id: string;
  texte: string;
  modele: string | null;
  creeLe: string;
  retour: string;
  champ: string;
  destinataire?: string | null;
  nomDestinataire?: string | null;
}) {
  const parIA = modele && modele !== "regles";
  const email = emailDisponible();
  return (
    <form action={marquerTexteEnvoye} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="texte_id" value={id} />
      <input type="hidden" name="retour" value={retour} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span className={`pill ${parIA ? "p-accent" : "p-neutral"}`}>{parIA ? `Rédigé par l'IA · ${modele}` : "Modèle standard"}</span>
        <span className="muted" style={{ fontSize: 12.5 }}>Brouillon du {dateCourte(creeLe)}, à relire avant envoi</span>
      </div>
      <textarea key={id} id={champ} name="texte" rows={16} defaultValue={texte} aria-label="Texte du brouillon" />
      {email && (
        <div className="field">
          <label htmlFor={`${champ}-a`}>Destinataire{nomDestinataire ? ` (${nomDestinataire})` : ""}</label>
          <input id={`${champ}-a`} name="destinataire" type="email" defaultValue={destinataire ?? ""} placeholder="adresse@exemple.fr" />
          {!destinataire && <small className="muted">Aucune adresse sur la fiche : celle saisie ici y sera enregistrée.</small>}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {email && <button className="btn primary" type="submit" name="mode" value="email">Envoyer par e-mail</button>}
        <CopyButton target={champ} />
        <button className={`btn ${email ? "" : "primary"}`} type="submit" name="mode" value="manuel">{email ? "Envoyé par un autre moyen" : "Marquer comme envoyé"}</button>
      </div>
      {email && <p className="muted" style={{ fontSize: 12.5 }}>La ligne « Objet : » devient le sujet de l&apos;e-mail. Les réponses arrivent sur votre adresse.</p>}
    </form>
  );
}
