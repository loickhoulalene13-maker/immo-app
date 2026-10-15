import Link from "next/link";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { dateCourte, dateLongue, eur, heure, MODULE, typologie } from "@/lib/format";
import { basculerTache, recalculerAlertes } from "./actions";

type Alerte = { id: string; niveau: "info" | "warn" | "crit"; module: string; titre: string; detail: string | null; bien_id: string | null; contact_id: string | null; transaction_id: string | null };
type Tache = { id: string; titre: string; detail: string | null; priorite: number; faite_le: string | null; bien_id: string | null; contact_id: string | null; transaction_id: string | null };
type Visite = { id: string; date_visite: string; bien: { id: string; reference: string; type: string; pieces: number; ville: string } | null; acheteur: { nom: string } | null };

export default async function TableauDeBord() {
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();

  const [{ data: kpi }, { data: alertes }, { data: taches }, { data: agenda }] = await Promise.all([
    supabase.from("v_tableau_de_bord").select("*").eq("agence_id", agence.id).maybeSingle(),
    supabase.from("alertes").select("id, niveau, module, titre, detail, bien_id, contact_id, transaction_id").eq("agence_id", agence.id).is("resolue_le", null).order("niveau", { ascending: false }).order("created_at"),
    supabase.from("taches").select("id, titre, detail, priorite, faite_le, bien_id, contact_id, transaction_id").eq("agence_id", agence.id).order("faite_le", { ascending: true, nullsFirst: true }).order("priorite").limit(10),
    supabase.from("visites").select("id, date_visite, bien:biens(id, reference, type, pieces, ville), acheteur:contacts(nom)").eq("agence_id", agence.id).eq("statut", "planifiee").gte("date_visite", new Date().toISOString()).order("date_visite").limit(6),
  ]);

  const al = (alertes ?? []) as Alerte[];
  const tk = (taches ?? []) as Tache[];
  const vis = (agenda ?? []) as unknown as Visite[];
  const nbCrit = al.filter((a) => a.niveau === "crit").length;
  const nbP1 = tk.filter((t) => !t.faite_le && t.priorite === 1).length;
  const prenom = (agence.nomAffiche ?? "").split(" ")[0];

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow">{dateLongue()}</p>
          <h1>Bonjour{prenom ? ` ${prenom}` : ""}</h1>
          <p className="sub">{nbCrit} alerte{nbCrit > 1 ? "s" : ""} critique{nbCrit > 1 ? "s" : ""} et {nbP1} tâche{nbP1 > 1 ? "s" : ""} prioritaire{nbP1 > 1 ? "s" : ""} aujourd&apos;hui.</p>
        </div>
        <form action={recalculerAlertes}><button className="btn" type="submit">Recalculer les alertes</button></form>
      </header>

      <section className="kpis">
        <Link className="kpi" href="/biens"><span className="v">{kpi?.biens_en_vente ?? 0}</span><span className="l">Biens en vente · {eur(kpi?.volume_en_vente)}</span></Link>
        <div className="kpi"><span className="v">{kpi?.acheteurs ?? 0}</span><span className="l">Acheteurs</span></div>
        <div className="kpi"><span className="v">{kpi?.visites_30j ?? 0}</span><span className="l">Visites sur 30 jours</span></div>
        <div className="kpi"><span className="v">{kpi?.transactions_en_cours ?? 0}</span><span className="l">Transactions en cours</span></div>
        <a className="kpi alert" href="#alertes"><span className="v">{kpi?.alertes_ouvertes ?? 0}</span><span className="l">Alertes ouvertes</span></a>
      </section>

      <div className="grid2">
        <section className="card" id="alertes">
          <div className="card-h"><h2>Alertes</h2><span className="muted">{al.length} ouvertes</span></div>
          <div className="list">
            {al.length === 0 && <p className="empty">Aucune alerte.</p>}
            {al.map((a) => (
              <div className="row" key={a.id}>
                <span className={`stripe s-${a.niveau === "info" ? "info" : a.niveau}`} />
                <div className="main"><span className="mod">{MODULE[a.module] ?? a.module}</span><b>{a.titre}</b>{a.detail && <small>{a.detail}</small>}</div>
                {a.transaction_id ? <Link className="btn small" href={`/transactions/${a.transaction_id}`}>Voir</Link> : a.module === "qualite" && a.bien_id ? <Link className="btn small" href={`/annonces/${a.bien_id}`}>Corriger</Link> : a.module === "opportunites" && a.contact_id ? <Link className="btn small" href={`/prospects/${a.contact_id}#relance`}>Relancer</Link> : a.bien_id ? <Link className="btn small" href={`/biens/${a.bien_id}`}>Voir</Link> : <span />}
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-h"><h2>Tâches prioritaires</h2><span className="muted">{tk.filter((t) => !t.faite_le).length} à faire</span></div>
          <div className="list">
            {tk.length === 0 && <p className="empty">Aucune tâche.</p>}
            {tk.map((t) => (
              <div className={`task ${t.faite_le ? "done" : ""}`} key={t.id}>
                <form action={basculerTache}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="faite" value={t.faite_le ? "1" : "0"} />
                  <button className={`check ${t.faite_le ? "on" : ""}`} type="submit" aria-label={t.faite_le ? "Marquer à faire" : "Marquer comme faite"}>
                    {t.faite_le && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>}
                  </button>
                </form>
                <div className="main"><b>{t.titre}</b>{t.detail && <small>{t.detail}</small>}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className={`prio prio-${t.priorite}`}>P{t.priorite}</span>
                  {t.transaction_id ? <Link className="btn small" href={`/transactions/${t.transaction_id}`}>Ouvrir</Link> : t.bien_id && t.titre.startsWith("Compléter") ? <Link className="btn small" href={`/annonces/${t.bien_id}`}>Ouvrir</Link> : t.bien_id ? <Link className="btn small" href={`/biens/${t.bien_id}`}>Ouvrir</Link> : t.contact_id ? <Link className="btn small" href={`/prospects/${t.contact_id}#relance`}>Ouvrir</Link> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-h"><h2>Visites à venir</h2></div>
        <div className="list">
          {vis.length === 0 && <p className="empty">Aucune visite planifiée.</p>}
          {vis.map((v) => (
            <div className="row" key={v.id}>
              <span className="stripe s-info" />
              <div className="main">
                <b>{v.bien ? `${typologie(v.bien.type, v.bien.pieces)} ${v.bien.ville}` : "Bien"}</b>
                <small>{v.acheteur?.nom ?? "Acheteur"} · réf. {v.bien?.reference}</small>
              </div>
              <span className="num" style={{ textAlign: "right" }}>{dateCourte(v.date_visite)}<br /><span className="muted">{heure(v.date_visite)}</span></span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
