export type Etape = { id: string; ordre: number; code: string; libelle: string; echeance: string | null; faite_le: string | null };
export type EtatEtape = "fait" | "retard" | "proche" | "prevu";

const jour = (d: string) => {
  const x = new Date(d + "T00:00:00");
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((x.getTime() - t.getTime()) / 86_400_000);
};

export function etatEtape(e: Etape): EtatEtape {
  if (e.faite_le) return "fait";
  if (!e.echeance) return "prevu";
  const j = jour(e.echeance);
  if (j < 0) return "retard";
  if (j <= 7) return "proche";
  return "prevu";
}

export function libelleEtat(e: Etape) {
  const s = etatEtape(e);
  if (s === "fait") return "Fait";
  if (!e.echeance) return "Sans date";
  const j = jour(e.echeance);
  if (s === "retard") return `En retard de ${-j} j`;
  if (j === 0) return "Aujourd'hui";
  if (j === 1) return "Demain";
  return `Dans ${j} j`;
}

export const COULEUR_ETAT: Record<EtatEtape, string> = {
  fait: "var(--ok)",
  retard: "var(--crit)",
  proche: "var(--warn)",
  prevu: "var(--muted)",
};
