import { dateCourte } from "@/lib/format";
import { CopyButton } from "./copy-button";
import { marquerTexteEnvoye } from "./assistant/actions";

// Brouillon modifiable (relance, compte rendu) : copier, puis marquer comme envoyé
export function Brouillon({
  id,
  texte,
  modele,
  creeLe,
  retour,
  champ,
}: {
  id: string;
  texte: string;
  modele: string | null;
  creeLe: string;
  retour: string;
  champ: string;
}) {
  const parIA = modele && modele !== "regles";
  return (
    <form action={marquerTexteEnvoye} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="texte_id" value={id} />
      <input type="hidden" name="retour" value={retour} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span className={`pill ${parIA ? "p-accent" : "p-neutral"}`}>{parIA ? `Rédigé par l'IA · ${modele}` : "Modèle standard"}</span>
        <span className="muted" style={{ fontSize: 12.5 }}>Brouillon du {dateCourte(creeLe)}, à relire avant envoi</span>
      </div>
      <textarea key={id} id={champ} name="texte" rows={16} defaultValue={texte} aria-label="Texte du brouillon" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <CopyButton target={champ} />
        <button className="btn primary" type="submit">Marquer comme envoyé</button>
      </div>
    </form>
  );
}
