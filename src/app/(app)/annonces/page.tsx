import Link from "next/link";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { eur, STATUT_BIEN, typologie } from "@/lib/format";

type Controle = { niveau: "info" | "warn" | "crit"; categorie: string; message: string };

const FILTRES = [
  { k: "", label: "Toutes" },
  { k: "bloquees", label: "Bloquées" },
  { k: "ameliorer", label: "À améliorer" },
  { k: "pretes", label: "Prêtes" },
];

export default async function Annonces({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const { filtre = "" } = await searchParams;
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();

  const { data: biens } = await supabase
    .from("biens")
    .select("id, reference, titre, type, pieces, ville, surface, prix, statut")
    .eq("agence_id", agence.id)
    .in("statut", ["brouillon", "en_vente", "sous_offre"]);

  // Un contrôle par annonce (le portefeuille d'une agence reste de taille raisonnable)
  const controles = await Promise.all(
    (biens ?? []).map(async (b) => {
      const { data } = await supabase.rpc("controle_annonce_par_id", { p_bien: b.id });
      const c = (data ?? []) as Controle[];
      const n = (l: string) => c.filter((x) => x.niveau === l).length;
      const score = Math.max(0, 100 - 20 * n("crit") - 8 * n("warn") - 3 * n("info"));
      return { b, c, crit: n("crit"), warn: n("warn"), info: n("info"), score };
    })
  );

  const tous = controles.sort((x, y) => x.score - y.score);
  const groupe = (x: (typeof tous)[number]) => (x.crit ? "bloquees" : x.warn ? "ameliorer" : "pretes");
  const compte = (k: string) => tous.filter((x) => groupe(x) === k).length;
  const liste = filtre ? tous.filter((x) => groupe(x) === filtre) : tous;
  const moyenne = tous.length ? Math.round(tous.reduce((s, x) => s + x.score, 0) / tous.length) : 0;

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow">IMMO Qualité</p>
          <h1>Contrôle des annonces</h1>
          <p className="sub">Chaque annonce est vérifiée : informations obligatoires, cohérence des chiffres avec le marché local, photos. Un point critique bloque la publication.</p>
        </div>
        <Link className="btn primary" href="/annonces/nouveau">Ajouter un bien</Link>
      </header>

      <section className="kpis" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="kpi"><span className="v">{moyenne}</span><span className="l">Score moyen sur 100</span></div>
        <Link className={`kpi ${compte("bloquees") ? "alert" : ""}`} href="/annonces?filtre=bloquees"><span className="v">{compte("bloquees")}</span><span className="l">Bloquées</span></Link>
        <Link className="kpi" href="/annonces?filtre=ameliorer"><span className="v">{compte("ameliorer")}</span><span className="l">À améliorer</span></Link>
        <Link className="kpi" href="/annonces?filtre=pretes"><span className="v">{compte("pretes")}</span><span className="l">Prêtes</span></Link>
      </section>

      <div className="tabs">
        {FILTRES.map((f) => (
          <Link key={f.k} aria-selected={filtre === f.k} href={f.k ? `/annonces?filtre=${f.k}` : "/annonces"}>{f.label}{f.k ? ` · ${compte(f.k)}` : ""}</Link>
        ))}
      </div>

      <section className="card">
        <div className="list">
          {liste.length === 0 && <p className="empty">Aucune annonce dans cette catégorie.</p>}
          {liste.map(({ b, c, crit, warn, info, score }) => {
            const couleur = score >= 80 ? "var(--ok)" : score >= 55 ? "var(--warn)" : "var(--crit)";
            const s = STATUT_BIEN[b.statut as string];
            return (
              <Link className="row" key={b.id as string} href={`/annonces/${b.id}`} style={{ gridTemplateColumns: "auto minmax(0,1fr) auto", alignItems: "start" }}>
                <div className="ring" style={{ background: `conic-gradient(${couleur} ${score}%, var(--sunk) 0)` }}><span>{score}</span></div>
                <div className="main" style={{ gap: 4 }}>
                  <b>{typologie(b.type as string, b.pieces as number)} {b.ville as string} · <span className="num muted" style={{ fontWeight: 400 }}>{b.reference as string}</span></b>
                  <small>{b.titre as string} · {b.surface as number} m² · {eur(b.prix as number)}</small>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className={`pill ${s.cls}`}>{s.label}</span>
                    {crit > 0 && <span className="pill p-crit">{crit} critique{crit > 1 ? "s" : ""}</span>}
                    {warn > 0 && <span className="pill p-warn">{warn} à vérifier</span>}
                    {info > 0 && <span className="pill p-neutral">{info} conseil{info > 1 ? "s" : ""}</span>}
                    {!c.length && <span className="pill p-ok">Rien à signaler</span>}
                  </div>
                  {crit > 0 && <small style={{ color: "var(--crit)" }}>{c.filter((x) => x.niveau === "crit").map((x) => x.message).join(" ")}</small>}
                </div>
                <span className="btn small">Corriger</span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
