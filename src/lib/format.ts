export const eur = (n: number | null | undefined) =>
  n == null ? "–" : Math.round(n).toLocaleString("fr-FR") + " €";

export const dateCourte = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "–";

export const dateLongue = (d: string | Date = new Date()) =>
  new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const heure = (d: string | Date) =>
  new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function ilYa(d: string | Date | null | undefined) {
  if (!d) return "jamais";
  const j = Math.round((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (j === 0) return "aujourd'hui";
  if (j === 1) return "hier";
  if (j < 0) return `dans ${-j} j`;
  return `il y a ${j} j`;
}

export function typologie(type: string, pieces: number) {
  if (type === "maison") return `Maison ${pieces} p.`;
  if (pieces === 1) return "Studio";
  return `T${pieces}`;
}

export const STATUT_BIEN: Record<string, { label: string; cls: string }> = {
  brouillon: { label: "Brouillon", cls: "p-neutral" },
  en_vente: { label: "En vente", cls: "p-accent" },
  sous_offre: { label: "Sous offre", cls: "p-ochre" },
  vendu: { label: "Vendu", cls: "p-ok" },
  retire: { label: "Retiré", cls: "p-neutral" },
};

export const MODULE: Record<string, string> = {
  pilot: "IMMO Pilot",
  securite: "IMMO Sécurité",
  qualite: "IMMO Qualité",
  opportunites: "IMMO Opportunités",
};
