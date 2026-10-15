import Link from "next/link";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { eur, ilYa, STATUT_BIEN } from "@/lib/format";
import { ajouterAcheteur } from "./actions";

type Acheteur = {
  id: string; nom: string; source: string | null; dernier_contact_at: string | null;
  recherches: { budget_max: number; villes: string[]; surface_min: number | null; pieces_min: number | null; active: boolean }[];
};
type Vendeur = { contact_id: string; nom: string; bien_id: string; reference: string; statut: string; dernier_rapport_le: string | null };

const jours = (d: string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) : null);

export default async function Prospects({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; filtre?: string; erreur?: string }>;
}) {
  const { onglet = "acheteurs", filtre, erreur } = await searchParams;
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();

  const [{ data: ach }, { data: vend }, { data: rappro }, { data: biens }, { data: ag }] = await Promise.all([
    supabase.from("contacts").select("id, nom, source, dernier_contact_at, recherches(budget_max, villes, surface_min, pieces_min, active)").eq("agence_id", agence.id).eq("est_acheteur", true),
    supabase.from("v_vendeurs_suivi").select("*").eq("agence_id", agence.id).order("nom"),
    supabase.from("v_rapprochements").select("acheteur_id, bien_id").eq("agence_id", agence.id),
    supabase.from("biens").select("id, statut").eq("agence_id", agence.id),
    supabase.from("agences").select("seuil_relance_jours").eq("id", agence.id).maybeSingle(),
  ]);

  const seuil = (ag?.seuil_relance_jours as number | undefined) ?? 21;
  const enVente = new Set((biens ?? []).filter((b) => b.statut === "en_vente").map((b) => b.id as string));
  const adaptes = new Map<string, number>();
  (rappro ?? []).forEach((r) => {
    if (enVente.has(r.bien_id as string)) adaptes.set(r.acheteur_id as string, (adaptes.get(r.acheteur_id as string) ?? 0) + 1);
  });

  const acheteurs = ((ach ?? []) as Acheteur[])
    .map((a) => ({ ...a, j: jours(a.dernier_contact_at), r: a.recherches.find((x) => x.active) ?? null, nb: adaptes.get(a.id) ?? 0 }))
    .map((a) => ({ ...a, oublie: a.r != null && (a.j == null || a.j > seuil) }))
    .sort((x, y) => (y.j ?? 9999) - (x.j ?? 9999));
  const nbOublies = acheteurs.filter((a) => a.oublie).length;
  const liste = filtre === "oublies" ? acheteurs.filter((a) => a.oublie) : acheteurs;
  const vendeurs = (vend ?? []) as Vendeur[];

  const onglets = (
    <div className="tabs" role="tablist">
      <Link role="tab" aria-selected={onglet !== "vendeurs"} href="/prospects">Acheteurs · {acheteurs.length}</Link>
      <Link role="tab" aria-selected={onglet === "vendeurs"} href="/prospects?onglet=vendeurs">Vendeurs · {vendeurs.length}</Link>
    </div>
  );

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow">IMMO Opportunités</p>
          <h1>Prospects</h1>
          <p className="sub">
            Acheteurs et vendeurs au même endroit. Un acheteur est « oublié » au-delà de {seuil} jours sans contact. Les biens adaptés tiennent compte du budget, de la ville, de la surface et du nombre de pièces.
          </p>
        </div>
      </header>

      {erreur && <p className="notice crit">{erreur}</p>}
      {onglets}

      {onglet !== "vendeurs" ? (
        <>
          <section className="card">
            <div className="card-h">
              <div className="tabs">
                <Link aria-selected={filtre !== "oublies"} href="/prospects">Tous</Link>
                <Link aria-selected={filtre === "oublies"} href="/prospects?filtre=oublies">Oubliés · {nbOublies}</Link>
              </div>
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr><th>Acheteur</th><th>Recherche</th><th className="r">Budget</th><th>Dernier contact</th><th className="r">Biens adaptés</th><th /></tr>
                </thead>
                <tbody>
                  {liste.length === 0 && <tr><td colSpan={6}><p className="empty">Aucun acheteur dans cette liste.</p></td></tr>}
                  {liste.map((a) => (
                    <tr key={a.id}>
                      <td><Link href={`/prospects/${a.id}`}><b>{a.nom}</b></Link>{a.source && <><br /><span className="muted" style={{ fontSize: 12.5 }}>{a.source}</span></>}</td>
                      <td>
                        {a.r ? (
                          <>
                            {a.r.pieces_min === 1 ? "Studio" : a.r.pieces_min ? `${a.r.pieces_min} p.` : "Toutes typologies"}
                            {a.r.surface_min ? ` · ${a.r.surface_min} m² min.` : ""}
                            <br /><span className="muted" style={{ fontSize: 12.5 }}>{a.r.villes.join(", ") || "Toutes villes"}</span>
                          </>
                        ) : <span className="muted">Pas de recherche active</span>}
                      </td>
                      <td className="r num">{a.r ? eur(a.r.budget_max) : "–"}</td>
                      <td>{a.oublie ? <span className="pill p-crit">{ilYa(a.dernier_contact_at)}</span> : <span className="muted">{ilYa(a.dernier_contact_at)}</span>}</td>
                      <td className="r num">{a.nb}</td>
                      <td className="r"><Link className="btn small" href={`/prospects/${a.id}#relance`}>Préparer une relance</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <details className="card">
            <summary style={{ cursor: "pointer" }}><h2 style={{ display: "inline" }}>Ajouter un acheteur</h2></summary>
            <form className="form" action={ajouterAcheteur} style={{ marginTop: 12 }}>
              <div className="field full"><label htmlFor="nom">Nom</label><input id="nom" name="nom" type="text" required /></div>
              <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" /></div>
              <div className="field"><label htmlFor="telephone">Téléphone</label><input id="telephone" name="telephone" type="text" /></div>
              <div className="field"><label htmlFor="budget_max">Budget maximum (€)</label><input id="budget_max" name="budget_max" type="number" min={10000} step={1000} required /></div>
              <div className="field"><label htmlFor="villes">Villes (séparées par des virgules)</label><input id="villes" name="villes" type="text" placeholder="Aix-en-Provence, Marseille 8e" /></div>
              <div className="field"><label htmlFor="surface_min">Surface minimum (m²)</label><input id="surface_min" name="surface_min" type="number" min={0} /></div>
              <div className="field"><label htmlFor="pieces_min">Pièces minimum</label><input id="pieces_min" name="pieces_min" type="number" min={1} /></div>
              <div className="field full"><label htmlFor="source">Source</label><input id="source" name="source" type="text" placeholder="Portail, vitrine, recommandation…" /></div>
              <div className="full"><button className="btn primary" type="submit">Ajouter l&apos;acheteur</button></div>
            </form>
          </details>
        </>
      ) : (
        <section className="card">
          <div className="tablewrap">
            <table>
              <thead><tr><th>Vendeur</th><th>Bien</th><th>Statut</th><th>Dernier compte rendu</th><th /></tr></thead>
              <tbody>
                {vendeurs.length === 0 && <tr><td colSpan={5}><p className="empty">Aucun vendeur.</p></td></tr>}
                {vendeurs.map((v) => {
                  const jr = jours(v.dernier_rapport_le);
                  const s = STATUT_BIEN[v.statut];
                  return (
                    <tr key={`${v.contact_id}-${v.bien_id}`}>
                      <td><b>{v.nom}</b></td>
                      <td><Link href={`/biens/${v.bien_id}`} className="num">{v.reference}</Link></td>
                      <td><span className={`pill ${s?.cls ?? "p-neutral"}`}>{s?.label ?? v.statut}</span></td>
                      <td>{jr == null || jr > seuil ? <span className="pill p-warn">{ilYa(v.dernier_rapport_le)}</span> : <span className="muted">{ilYa(v.dernier_rapport_le)}</span>}</td>
                      <td className="r"><Link className="btn small" href={`/biens/${v.bien_id}`}>Voir le bien</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
