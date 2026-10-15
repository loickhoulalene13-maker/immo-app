import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { dateCourte, eur, typologie } from "@/lib/format";
import { etatEtape, libelleEtat, COULEUR_ETAT, type Etape } from "@/lib/transactions";
import { ajouterDocument, basculerDocument, basculerEtape, changerEcheance } from "../actions";

type Doc = { id: string; libelle: string; obligatoire: boolean; recu_le: string | null };

const Coche = ({ on }: { on: boolean }) =>
  on ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg> : null;

export default async function FicheTransaction({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { erreur, ok } = await searchParams;
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();

  const { data: t } = await supabase
    .from("transactions")
    .select("id, prix, statut, compromis_le, acte_prevu_le, created_at, bien:biens(id, reference, titre, type, pieces, ville, surface, prix, vendeur:contacts(id, nom)), acheteur:contacts(id, nom, email, telephone), offre:offres(montant, faite_le, conditions)")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  const [{ data: etapes }, { data: docs }] = await Promise.all([
    supabase.from("etapes_transaction").select("id, ordre, code, libelle, echeance, faite_le").eq("transaction_id", id).order("ordre"),
    supabase.from("documents_transaction").select("id, libelle, obligatoire, recu_le").eq("transaction_id", id).order("libelle"),
  ]);

  const bien = t.bien as unknown as { id: string; reference: string; titre: string; type: string; pieces: number; ville: string; surface: number; prix: number; vendeur: { id: string; nom: string } | null };
  const acheteur = t.acheteur as unknown as { id: string; nom: string; email: string | null; telephone: string | null };
  const offre = t.offre as unknown as { montant: number; faite_le: string; conditions: string | null } | null;
  const ets = (etapes ?? []) as Etape[];
  const dcs = (docs ?? []) as Doc[];
  const retards = ets.filter((e) => etatEtape(e) === "retard").length;
  const faites = ets.filter((e) => e.faite_le).length;
  const recus = dcs.filter((d) => d.recu_le).length;
  const prochaine = ets.find((e) => !e.faite_le);
  const ecart = bien.prix ? Math.round(((t.prix as number) / bien.prix - 1) * 1000) / 10 : 0;

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow"><Link href="/transactions">Transactions</Link> · {bien.reference}</p>
          <h1>{typologie(bien.type, bien.pieces)} {bien.ville} · {acheteur.nom}</h1>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {t.statut === "signee" ? <span className="pill p-ok">Vente signée</span> : retards ? <span className="pill p-crit">{retards} étape{retards > 1 ? "s" : ""} en retard</span> : <span className="pill p-ok">Dans les temps</span>}
            <span className="pill p-neutral">{faites}/{ets.length} étapes</span>
            <span className={`pill ${recus === dcs.length ? "p-ok" : "p-warn"}`}>{recus}/{dcs.length} documents</span>
          </div>
        </div>
        <Link className="btn" href={`/biens/${bien.id}`}>Voir le bien</Link>
      </header>

      {erreur && <p className="notice crit">{erreur}</p>}
      {ok === "creee" && <p className="notice ok">Offre acceptée : la transaction est créée avec ses étapes, ses échéances et la liste des documents à réunir.</p>}
      {ok === "date" && <p className="notice ok">Échéance mise à jour.</p>}

      <div className="facts">
        <div><small>Prix de vente</small><span className="num">{eur(t.prix as number)}</span></div>
        <div><small>Prix affiché</small><span className="num">{eur(bien.prix)} <span className="muted">({ecart > 0 ? "+" : ""}{ecart} %)</span></span></div>
        <div><small>Prochaine étape</small><span>{prochaine ? `${prochaine.libelle.split(" (")[0]} · ${dateCourte(prochaine.echeance)}` : "Terminé"}</span></div>
        <div><small>Vendeur</small><span>{bien.vendeur?.nom ?? "–"}</span></div>
        <div><small>Acheteur</small><Link href={`/prospects/${acheteur.id}`}>{acheteur.nom}</Link></div>
        <div><small>Contact acheteur</small><span style={{ userSelect: "all", overflowWrap: "anywhere" }}>{acheteur.telephone ?? acheteur.email ?? "–"}</span></div>
      </div>

      <section className="card">
        <div className="card-h"><h2>Étapes</h2><span className="muted">Cochez une étape quand elle est faite ; ajustez la date si le notaire la décale.</span></div>
        <div className="steps" aria-hidden="true">
          {ets.map((e) => (
            <div className={`step ${etatEtape(e)}`} key={e.id}><div className="bar" /></div>
          ))}
        </div>
        <div className="list">
          {ets.map((e) => {
            const s = etatEtape(e);
            return (
              <div className={`etape ${s}`} key={e.id}>
                <form action={basculerEtape}>
                  <input type="hidden" name="transaction_id" value={id} />
                  <input type="hidden" name="etape_id" value={e.id} />
                  <input type="hidden" name="faite" value={e.faite_le ? "1" : "0"} />
                  <button className={`check ${e.faite_le ? "on" : ""}`} type="submit" aria-label={e.faite_le ? `Rouvrir : ${e.libelle}` : `Marquer fait : ${e.libelle}`}><Coche on={!!e.faite_le} /></button>
                </form>
                <div className="main">
                  <b>{e.libelle}</b>
                  <small style={{ color: COULEUR_ETAT[s], fontWeight: 500 }}>
                    {libelleEtat(e)}{e.faite_le ? ` le ${dateCourte(e.faite_le)}` : ""}
                  </small>
                </div>
                {!e.faite_le ? (
                  <form action={changerEcheance} className="date">
                    <input type="hidden" name="transaction_id" value={id} />
                    <input type="hidden" name="etape_id" value={e.id} />
                    <input type="date" name="echeance" defaultValue={e.echeance ?? ""} aria-label={`Échéance : ${e.libelle}`} />
                    <button className="btn small" type="submit">OK</button>
                  </form>
                ) : <span className="num muted">{dateCourte(e.echeance)}</span>}
              </div>
            );
          })}
        </div>
        {t.statut === "signee" && <p className="notice ok">Acte signé : le bien est passé en « Vendu ».</p>}
      </section>

      <div className="grid2">
        <section className="card" id="documents">
          <div className="card-h"><h2>Documents</h2><span className="muted num">{recus}/{dcs.length} reçus</span></div>
          <div className="progress"><span style={{ width: `${dcs.length ? (recus / dcs.length) * 100 : 0}%` }} /></div>
          <div className="docs">
            {dcs.map((d) => (
              <form action={basculerDocument} className="doc" key={d.id}>
                <input type="hidden" name="transaction_id" value={id} />
                <input type="hidden" name="document_id" value={d.id} />
                <input type="hidden" name="recu" value={d.recu_le ? "1" : "0"} />
                <button className={`check ${d.recu_le ? "on" : ""}`} type="submit" aria-label={d.recu_le ? `Marquer manquant : ${d.libelle}` : `Marquer reçu : ${d.libelle}`}><Coche on={!!d.recu_le} /></button>
                <span className={d.recu_le ? "muted" : undefined}>{d.libelle}{d.recu_le && <small className="num"> · {dateCourte(d.recu_le)}</small>}</span>
              </form>
            ))}
          </div>
          <form action={ajouterDocument} style={{ display: "flex", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <input type="hidden" name="transaction_id" value={id} />
            <input type="text" name="libelle" placeholder="Autre document (ex. attestation d'assurance emprunteur)" aria-label="Nouveau document" />
            <button className="btn" type="submit">Ajouter</button>
          </form>
        </section>

        <section className="card">
          <div className="card-h"><h2>Offre</h2></div>
          {offre ? (
            <div className="facts">
              <div><small>Montant</small><span className="num">{eur(offre.montant)}</span></div>
              <div><small>Faite le</small><span className="num">{dateCourte(offre.faite_le)}</span></div>
              <div><small>Compromis</small><span className="num">{dateCourte(t.compromis_le as string | null)}</span></div>
              {offre.conditions && <div style={{ gridColumn: "1 / -1" }}><small>Conditions</small><span>{offre.conditions}</span></div>}
            </div>
          ) : <p className="empty">Offre non retrouvée.</p>}
          <p className="muted" style={{ fontSize: 12.5 }}>
            Délais appliqués : rétractation de 10 jours après le compromis, dépôt des prêts à J+15, offre de prêt à J+45, préemption à J+55, acte à J+90. Chaque date reste modifiable.
          </p>
        </section>
      </div>
    </>
  );
}
