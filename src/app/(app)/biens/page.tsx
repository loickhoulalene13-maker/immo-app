import Link from "next/link";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { eur, STATUT_BIEN, typologie } from "@/lib/format";

type Suivi = {
  bien_id: string; reference: string; titre: string; ville: string; type: string; prix: number; surface: number;
  prix_m2: number; statut: string; jours_en_ligne: number | null; nb_visites: number; note_moyenne: number | null; score_qualite: number;
};

// Teinte stable par bien, en attendant les vraies photos
const teinte = (id: string) => [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;

export default async function Biens() {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();

  const [{ data: biens }, { data: pieces }, { data: stag }] = await Promise.all([
    supabase.from("v_biens_suivi").select("*").eq("agence_id", agence.id).order("statut").order("jours_en_ligne", { ascending: false, nullsFirst: false }),
    supabase.from("biens").select("id, pieces").eq("agence_id", agence.id),
    supabase.from("v_biens_stagnants").select("bien_id").eq("agence_id", agence.id),
  ]);

  const nbPieces = new Map((pieces ?? []).map((p) => [p.id as string, p.pieces as number]));
  const stagnants = new Set((stag ?? []).map((s) => s.bien_id as string));
  const liste = (biens ?? []) as Suivi[];

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow">IMMO Pilot</p>
          <h1>Biens</h1>
          <p className="sub">Annonces, visites et retours des acheteurs. Un bien est signalé quand il dépasse les seuils de stagnation de l&apos;agence.</p>
        </div>
      </header>
      {liste.length === 0 && <p className="empty">Aucun bien pour l&apos;instant.</p>}
      <div className="bgrid">
        {liste.map((b) => {
          const st = stagnants.has(b.bien_id);
          const s = STATUT_BIEN[b.statut];
          const h = teinte(b.bien_id);
          return (
            <Link key={b.bien_id} href={`/biens/${b.bien_id}`} className={`bcard ${st ? "stag" : ""}`}>
              <div className="bimg" style={{ background: `linear-gradient(135deg,hsl(${h} 30% 62%),hsl(${h + 25} 28% 42%))` }}>
                <span className="ref">{b.reference}</span>
                {st ? <span className="pill p-crit">Stagne</span> : <span className={`pill ${s.cls}`}>{s.label}</span>}
              </div>
              <div className="bbody">
                <div>
                  <span className="muted" style={{ fontSize: 12.5 }}>{typologie(b.type, nbPieces.get(b.bien_id) ?? 1)} · {b.surface} m² · {b.ville}</span>
                  <h3>{b.titre}</h3>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span className="price">{eur(b.prix)}</span>
                  <span className="num muted" style={{ fontSize: 12 }}>{eur(b.prix_m2)}/m²</span>
                </div>
                <div className="metrics">
                  <div><small>En ligne</small><span className="num">{b.jours_en_ligne != null ? `${b.jours_en_ligne} j` : "–"}</span></div>
                  <div><small>Visites</small><span className="num">{b.nb_visites}</span></div>
                  <div><small>Qualité</small><span className="num" style={{ color: b.score_qualite < 55 ? "var(--crit)" : undefined }}>{b.score_qualite}/100</span></div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
