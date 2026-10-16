import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { dateCourte, eur, ilYa, STATUT_BIEN, typologie } from "@/lib/format";
import { ajouterVisite, publierBien } from "../../actions";
import { enregistrerOffre, repondreOffre } from "../../transactions/actions";
import { analyserBien, genererRapportVendeur } from "../../assistant/actions";
import { Brouillon } from "../../brouillon";
import { iaDisponible } from "@/lib/ia";

type Controle = { niveau: "info" | "warn" | "crit"; categorie: string; message: string };
type Objection = { categorie: string; libelle: string; action_suggeree: string; nb: number; nb_visites: number; recurrente: boolean };
type Visite = { id: string; date_visite: string; note: number | null; retour: string | null; acheteur: { nom: string } | null };

// Surligne les mots qui ont déclenché une objection (mêmes motifs que la base)
function surligner(texte: string, motifs: string[]) {
  if (!motifs.length) return texte;
  const re = new RegExp(`(${motifs.join("|")})`, "gi");
  return texte.split(re).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}

const STATUT_OFFRE: Record<string, { label: string; cls: string }> = {
  en_attente: { label: "En attente", cls: "p-warn" },
  acceptee: { label: "Acceptée", cls: "p-ok" },
  refusee: { label: "Refusée", cls: "p-neutral" },
  retiree: { label: "Retirée", cls: "p-neutral" },
};

const CATEGORIES: Record<string, string> = { manquant: "Informations manquantes", incoherence: "Incohérences", photos: "Photos" };

export default async function FicheBien({
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

  const { data: b } = await supabase.from("biens").select("*, vendeur:contacts(nom, email)").eq("id", id).maybeSingle();
  if (!b) notFound();

  const [{ data: suivi }, { data: controle }, { data: objections }, { data: visites }, { data: rappro }, { data: acheteurs }, { data: cats }, { data: stag }, { data: offres }, { data: txs }, { data: textes }] =
    await Promise.all([
      supabase.from("v_biens_suivi").select("jours_en_ligne, nb_visites, note_moyenne, score_qualite, prix_m2").eq("bien_id", id).maybeSingle(),
      supabase.rpc("controle_annonce_par_id", { p_bien: id }),
      supabase.from("v_objections_bien").select("categorie, libelle, action_suggeree, nb, nb_visites, recurrente").eq("bien_id", id).order("nb", { ascending: false }),
      supabase.from("visites").select("id, date_visite, note, retour, acheteur:contacts(nom)").eq("bien_id", id).eq("statut", "faite").order("date_visite", { ascending: false }),
      supabase.from("v_rapprochements").select("acheteur_id, score").eq("bien_id", id).order("score", { ascending: false }),
      supabase.from("contacts").select("id, nom, dernier_contact_at").eq("agence_id", agence.id).eq("est_acheteur", true).order("nom"),
      supabase.from("categories_objection").select("motif"),
      supabase.from("v_biens_stagnants").select("bien_id").eq("bien_id", id).maybeSingle(),
      supabase.from("offres").select("id, montant, statut, faite_le, conditions, acheteur:contacts(nom)").eq("bien_id", id).order("faite_le", { ascending: false }),
      supabase.from("transactions").select("id, statut").eq("bien_id", id).neq("statut", "annulee").order("created_at", { ascending: false }).limit(1),
      supabase.from("textes_ia").select("id, type, texte, donnees, modele, created_at, envoye_le").eq("bien_id", id).in("type", ["analyse_bien", "rapport_vendeur"]).order("created_at", { ascending: false }).limit(20),
    ]);

  const ctl = (controle ?? []) as Controle[];
  const nbCrit = ctl.filter((c) => c.niveau === "crit").length;
  const obj = (objections ?? []) as Objection[];
  const max = Math.max(1, ...obj.map((o) => o.nb));
  const vis = (visites ?? []) as unknown as Visite[];
  const motifs = (cats ?? []).map((c) => c.motif as string);
  const ach = new Map((acheteurs ?? []).map((a) => [a.id as string, a]));
  const vendeur = b.vendeur as unknown as { nom: string; email: string | null } | null;
  const statut = STATUT_BIEN[b.statut as string];
  const tx = (txs ?? [])[0] as { id: string; statut: string } | undefined;
  const ia = iaDisponible();
  type Texte = { id: string; type: string; texte: string; donnees: Record<string, unknown> | null; modele: string | null; created_at: string; envoye_le: string | null };
  const tous = (textes ?? []) as Texte[];
  const analyse = tous.find((t) => t.type === "analyse_bien");
  const dernierEnvoi = tous.find((t) => t.type === "rapport_vendeur" && t.envoye_le);
  const rapport = tous.find((t) => t.type === "rapport_vendeur" && !t.envoye_le && (!dernierEnvoi || t.created_at > (dernierEnvoi.envoye_le as string)));
  const an = (analyse?.donnees ?? null) as { synthese?: string; actions?: string[]; points_forts?: { libelle: string; nb: number }[]; autres?: { libelle: string; nb: number }[]; nb_visites?: number } | null;

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow"><Link href="/biens">Biens</Link> · {b.reference}{vendeur ? ` · ${vendeur.nom}` : ""}</p>
          <h1>{b.titre}</h1>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {stag ? <span className="pill p-crit">Stagne</span> : <span className={`pill ${statut.cls}`}>{statut.label}</span>}
            <span className="tag">DPE {b.dpe ?? "?"}</span>
            <span className="tag">GES {b.ges ?? "?"}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="btn" href={`/annonces/${b.id}`}>Modifier la fiche</Link>
        {b.statut === "brouillon" && (
          <form action={publierBien}>
            <input type="hidden" name="bien_id" value={b.id} />
            <button className="btn primary" type="submit" disabled={nbCrit > 0} title={nbCrit ? "Corrigez les points critiques" : undefined}>Publier l&apos;annonce</button>
          </form>
        )}
        </div>
      </header>

      {erreur && <p className="notice crit">{erreur}</p>}
      {ok === "publie" && <p className="notice ok">Annonce publiée.</p>}
      {ok === "analyse" && <p className="notice ok">Analyse IA terminée : les objections détectées sont ajoutées aux compteurs.</p>}
      {ok === "rapport" && <p className="notice ok">Compte rendu prêt, plus bas.</p>}
      {ok === "envoye" && <p className="notice ok">Compte rendu enregistré comme envoyé.</p>}
      {ok === "email" && <p className="notice ok">Compte rendu envoyé par e-mail au vendeur.</p>}
      {ok === "offre" && <p className="notice ok">Offre enregistrée.</p>}
      {ok === "visite" && <p className="notice ok">Retour de visite enregistré. Les objections ont été analysées.</p>}

      <div className="facts">
        <div><small>Prix</small><span className="num">{eur(b.prix)}</span></div>
        <div><small>Surface</small><span className="num">{b.surface} m²</span></div>
        <div><small>Prix au m²</small><span className="num">{eur(suivi?.prix_m2)}</span></div>
        <div><small>Typologie</small><span className="num">{typologie(b.type, b.pieces)} · {b.chambres} ch.</span></div>
        <div><small>En ligne</small><span className="num">{suivi?.jours_en_ligne != null ? `${suivi.jours_en_ligne} j` : "–"}</span></div>
        <div><small>Qualité</small><span className="num" style={{ color: nbCrit ? "var(--crit)" : undefined }}>{suivi?.score_qualite ?? "–"}/100</span></div>
      </div>

      <p style={{ maxWidth: "70ch" }}>{b.description}</p>

      <div className="grid2">
        <section className="card">
          <div className="card-h"><h2>Contrôle de l&apos;annonce</h2><span className="muted">{ctl.length} point{ctl.length > 1 ? "s" : ""}</span></div>
          {ctl.length === 0 && <p className="notice ok">Annonce complète et cohérente.</p>}
          {Object.entries(CATEGORIES).map(([k, label]) => {
            const items = ctl.filter((c) => c.categorie === k);
            if (!items.length) return null;
            return (
              <div key={k}>
                <span className="eyebrow">{label}</span>
                {items.map((c, i) => (
                  <div className="issue" key={i}><span className={`stripe s-${c.niveau === "info" ? "info" : c.niveau}`} /><span>{c.message}</span></div>
                ))}
              </div>
            );
          })}
        </section>

        <section className="card">
          <div className="card-h"><h2>Acheteurs compatibles</h2><span className="muted">{(rappro ?? []).length}</span></div>
          <div className="list">
            {(rappro ?? []).length === 0 && <p className="empty">Aucun acheteur du fichier ne correspond.</p>}
            {(rappro ?? []).map((r) => {
              const a = ach.get(r.acheteur_id as string);
              return (
                <div className="row" key={r.acheteur_id as string}>
                  <span className={`stripe ${(r.score as number) >= 85 ? "s-ok" : "s-info"}`} />
                  <div className="main"><b>{a?.nom ?? "Acheteur"}</b><small>Dernier contact {ilYa(a?.dernier_contact_at as string | null)}</small></div>
                  <span className="num">{r.score as number} %</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid2">
        <section className="card" id="visites">
          <div className="card-h"><h2>Visites et retours</h2><span className="muted">{vis.length} · note moy. {suivi?.note_moyenne ?? "–"}</span></div>
          <div className="list">
            {vis.length === 0 && <p className="empty">Pas encore de visite.</p>}
            {vis.map((v) => (
              <div className="visit" key={v.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <b>{v.acheteur?.nom ?? "Acheteur"}</b>
                  <span className="muted num" style={{ fontSize: 12 }}>
                    {dateCourte(v.date_visite)}{v.note ? <> · <span className="stars">{"★".repeat(v.note)}{"☆".repeat(5 - v.note)}</span></> : null}
                  </span>
                </div>
                {v.retour && <span style={{ fontSize: 13.5 }}>{surligner(v.retour, motifs)}</span>}
              </div>
            ))}
          </div>

          <form className="form" action={ajouterVisite} style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <input type="hidden" name="bien_id" value={b.id} />
            <div className="field">
              <label htmlFor="acheteur_id">Acheteur</label>
              <select id="acheteur_id" name="acheteur_id">
                {(acheteurs ?? []).map((a) => <option key={a.id as string} value={a.id as string}>{a.nom as string}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="note">Note</label>
              <select id="note" name="note" defaultValue="3">
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sur 5</option>)}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="retour">Retour de l&apos;acheteur</label>
              <textarea id="retour" name="retour" rows={2} required placeholder="Ce qui a plu, ce qui freine…" />
            </div>
            <div className="full"><button className="btn primary" type="submit">Enregistrer le retour</button></div>
          </form>
        </section>

        <section className="card">
          <div className="card-h"><h2>Objections relevées</h2></div>
          {obj.length === 0 && <p className="empty">Aucune objection dans les retours.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {obj.map((o) => (
              <div className={`obj ${o.recurrente ? "rec" : ""}`} key={o.categorie}>
                <span style={{ fontWeight: 500 }}>{o.libelle}</span>
                <div className="track"><span style={{ width: `${(o.nb / max) * 100}%` }} /></div>
                <span className="num muted">{o.nb}/{o.nb_visites}{o.recurrente ? " · récurrent" : ""}</span>
              </div>
            ))}
          </div>
          {obj.some((o) => o.recurrente) && (
            <div>
              <span className="eyebrow">Actions suggérées</span>
              <ol style={{ margin: "8px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                {obj.filter((o) => o.recurrente).map((o) => <li key={o.categorie}>{o.action_suggeree}</li>)}
              </ol>
            </div>
          )}
        </section>
      </div>
      <div className="grid2">
        <section className="card" id="ia">
          <div className="card-h">
            <h2>Analyse IA des visites</h2>
            {vis.length > 0 && (
              <form action={analyserBien}>
                <input type="hidden" name="bien_id" value={b.id} />
                <button className="btn" type="submit" disabled={!ia} title={ia ? undefined : "Ajoutez OPENAI_API_KEY dans .env.local"}>{analyse ? "Relancer l'analyse" : "Analyser avec l'IA"}</button>
              </form>
            )}
          </div>
          {!ia && <p className="muted" style={{ fontSize: 13 }}>Ajoutez OPENAI_API_KEY dans .env.local pour analyser les retours avec l&apos;IA. Les objections ci-dessus restent détectées par mots-clés.</p>}
          {ia && !analyse && <p className="empty">{vis.length ? "Lancez l'analyse : l'IA lit tous les retours, repère les freins que les mots-clés ratent et propose des actions." : "Aucun retour de visite à analyser."}</p>}
          {an && (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="pill p-accent">{analyse!.modele}</span>
                <span className="muted" style={{ fontSize: 12.5 }}>{an.nb_visites} retour{(an.nb_visites ?? 0) > 1 ? "s" : ""} analysé{(an.nb_visites ?? 0) > 1 ? "s" : ""} le {dateCourte(analyse!.created_at)}</span>
              </div>
              {an.synthese && <p>{an.synthese}</p>}
              {!!an.autres?.length && (
                <div><span className="eyebrow">Autres freins repérés</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{an.autres.map((x) => <span key={x.libelle} className="pill p-warn">{x.libelle} · {x.nb}</span>)}</div>
                </div>
              )}
              {!!an.points_forts?.length && (
                <div><span className="eyebrow">Points appréciés</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{an.points_forts.map((x) => <span key={x.libelle} className="pill p-ok">{x.libelle} · {x.nb}</span>)}</div>
                </div>
              )}
              {!!an.actions?.length && (
                <div><span className="eyebrow">Actions proposées</span>
                  <ol style={{ margin: "8px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>{an.actions.map((x, i) => <li key={i}>{x}</li>)}</ol>
                </div>
              )}
            </>
          )}
        </section>

        <section className="card" id="rapport">
          <div className="card-h">
            <div><h2>Compte rendu vendeur</h2><span className="muted" style={{ fontSize: 12.5 }}>{dernierEnvoi ? `Dernier envoi le ${dateCourte(dernierEnvoi.envoye_le)}` : "Aucun compte rendu envoyé"}</span></div>
            <form action={genererRapportVendeur}>
              <input type="hidden" name="bien_id" value={b.id} />
              <input type="hidden" name="retour" value={`/biens/${b.id}`} />
              <button className="btn" type="submit">{rapport ? "Régénérer" : ia ? "Rédiger avec l'IA" : "Préparer le compte rendu"}</button>
            </form>
          </div>
          {rapport ? (
            <Brouillon id={rapport.id} texte={rapport.texte} modele={rapport.modele} creeLe={rapport.created_at} retour={`/biens/${b.id}`} champ="texte-rapport" destinataire={vendeur?.email} nomDestinataire={vendeur?.nom} />
          ) : (
            <p className="empty">Préparez un compte rendu : activité, points appréciés, freins et recommandation, à partir des visites de ce bien{ia && analyse ? " et de la dernière analyse IA" : ""}.</p>
          )}
        </section>
      </div>

      <section className="card" id="offres">
        <div className="card-h">
          <h2>Offres</h2>
          {tx && <Link className="btn small primary" href={`/transactions/${tx.id}`}>{tx.statut === "signee" ? "Voir la vente signée" : "Suivre la transaction"}</Link>}
        </div>
        <div className="list">
          {(offres ?? []).length === 0 && <p className="empty">Aucune offre reçue.</p>}
          {(offres ?? []).map((o) => {
            const st = STATUT_OFFRE[o.statut as string];
            const acheteurOffre = o.acheteur as unknown as { nom: string } | null;
            return (
              <div className="row" key={o.id as string}>
                <span className={`stripe ${o.statut === "acceptee" ? "s-ok" : o.statut === "en_attente" ? "s-warn" : "s-info"}`} />
                <div className="main">
                  <b>{acheteurOffre?.nom ?? "Acheteur"} · <span className="num">{eur(o.montant as number)}</span> <span className="muted num" style={{ fontWeight: 400 }}>({Math.round(((o.montant as number) / b.prix - 1) * 1000) / 10} %)</span></b>
                  <small>Reçue le {dateCourte(o.faite_le as string)}{o.conditions ? ` · ${o.conditions}` : ""}</small>
                </div>
                {o.statut === "en_attente" && !tx ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <form action={repondreOffre}>
                      <input type="hidden" name="bien_id" value={b.id} /><input type="hidden" name="offre_id" value={o.id as string} /><input type="hidden" name="decision" value="refusee" />
                      <button className="btn small" type="submit">Refuser</button>
                    </form>
                    <form action={repondreOffre}>
                      <input type="hidden" name="bien_id" value={b.id} /><input type="hidden" name="offre_id" value={o.id as string} /><input type="hidden" name="decision" value="acceptee" />
                      <button className="btn small primary" type="submit">Accepter</button>
                    </form>
                  </div>
                ) : <span className={`pill ${st.cls}`}>{st.label}</span>}
              </div>
            );
          })}
        </div>
        {b.statut === "en_vente" && !tx && (
          <form className="form" action={enregistrerOffre} style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <input type="hidden" name="bien_id" value={b.id} />
            <div className="field">
              <label htmlFor="offre-acheteur">Acheteur</label>
              <select id="offre-acheteur" name="acheteur_id" required>
                {(acheteurs ?? []).map((a) => <option key={a.id as string} value={a.id as string}>{a.nom as string}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="offre-montant">Montant (€)</label><input id="offre-montant" name="montant" type="number" min={1000} step={1000} required defaultValue={b.prix} /></div>
            <div className="field"><label htmlFor="offre-compromis">Compromis prévu le</label><input id="offre-compromis" name="compromis_prevu_le" type="date" /></div>
            <div className="field"><label htmlFor="offre-conditions">Conditions</label><input id="offre-conditions" name="conditions" type="text" placeholder="Sous condition de prêt…" /></div>
            <div className="full"><button className="btn" type="submit">Enregistrer l&apos;offre</button></div>
            <p className="full muted" style={{ fontSize: 12.5 }}>Accepter une offre crée la transaction : le bien passe « Sous offre », les autres offres en attente sont refusées, et les 7 étapes sont planifiées à partir du compromis (J+10 par défaut).</p>
          </form>
        )}
      </section>
    </>
  );
}
