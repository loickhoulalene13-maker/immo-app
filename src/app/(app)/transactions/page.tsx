import Link from "next/link";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { dateCourte, eur, ilYa } from "@/lib/format";
import { etatEtape, libelleEtat, COULEUR_ETAT, type Etape } from "@/lib/transactions";

type Suivi = {
  transaction_id: string; bien_id: string; reference: string; acheteur: string; prix: number;
  compromis_le: string | null; acte_prevu_le: string | null; statut: string;
  etapes_en_retard: number; prochaine_echeance: string | null; documents_manquants: number;
};

export default async function Transactions({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_transactions_suivi")
    .select("*")
    .eq("agence_id", agence.id)
    .eq("statut", vue === "terminees" ? "signee" : "en_cours")
    .order("acte_prevu_le");
  const liste = (data ?? []) as Suivi[];
  const ids = liste.map((t) => t.transaction_id);

  const [{ data: etapes }, { data: biens }, { count: nbSignees }] = await Promise.all([
    ids.length ? supabase.from("etapes_transaction").select("id, transaction_id, ordre, code, libelle, echeance, faite_le").in("transaction_id", ids).order("ordre") : Promise.resolve({ data: [] }),
    supabase.from("biens").select("id, titre, ville").eq("agence_id", agence.id),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("agence_id", agence.id).eq("statut", "signee"),
  ]);
  const parTx = new Map<string, Etape[]>();
  ((etapes ?? []) as (Etape & { transaction_id: string })[]).forEach((e) => parTx.set(e.transaction_id, [...(parTx.get(e.transaction_id) ?? []), e]));
  const bienInfo = new Map((biens ?? []).map((b) => [b.id as string, b]));
  const totalRetards = liste.reduce((s, t) => s + Number(t.etapes_en_retard), 0);

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow">IMMO Sécurité</p>
          <h1>Transactions</h1>
          <p className="sub">De l&apos;offre acceptée à l&apos;acte authentique. Les échéances sont calculées à partir de la date du compromis ; une étape non faite après son échéance passe en retard.</p>
        </div>
      </header>

      <div className="tabs">
        <Link aria-selected={vue !== "terminees"} href="/transactions">En cours{vue !== "terminees" ? ` · ${liste.length}` : ""}</Link>
        <Link aria-selected={vue === "terminees"} href="/transactions?vue=terminees">Signées · {nbSignees ?? 0}</Link>
      </div>

      {vue !== "terminees" && liste.length > 0 && (
        <p className={`notice ${totalRetards ? "crit" : "ok"}`}>
          {totalRetards ? `${totalRetards} étape${totalRetards > 1 ? "s" : ""} en retard sur ${liste.length} transaction${liste.length > 1 ? "s" : ""}.` : "Toutes les transactions sont dans les temps."}
        </p>
      )}

      {liste.length === 0 && (
        <p className="empty">
          {vue === "terminees" ? "Aucune vente signée pour l'instant." : "Aucune transaction en cours. Une transaction est créée automatiquement quand une offre est acceptée depuis la fiche d'un bien."}
        </p>
      )}

      {liste.map((t) => {
        const ets = parTx.get(t.transaction_id) ?? [];
        const b = bienInfo.get(t.bien_id);
        return (
          <Link key={t.transaction_id} href={`/transactions/${t.transaction_id}`} className="card txcard">
            <div className="card-h">
              <div>
                <span className="muted num" style={{ fontSize: 12 }}>{t.reference}</span>
                <h2>{(b?.titre as string) ?? t.reference} · {t.acheteur}</h2>
                <span className="muted">Prix <span className="num">{eur(t.prix)}</span> · acte prévu le {dateCourte(t.acte_prevu_le)} ({ilYa(t.acte_prevu_le)})</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {t.statut === "signee" ? <span className="pill p-ok">Signée</span> : t.etapes_en_retard > 0 ? <span className="pill p-crit">{t.etapes_en_retard} en retard</span> : <span className="pill p-ok">Dans les temps</span>}
                {t.documents_manquants > 0 && <span className="pill p-warn">{t.documents_manquants} document{t.documents_manquants > 1 ? "s" : ""} manquant{t.documents_manquants > 1 ? "s" : ""}</span>}
              </div>
            </div>
            <div className="steps">
              {ets.map((e) => {
                const s = etatEtape(e);
                return (
                  <div className={`step ${s}`} key={e.id}>
                    <div className="bar" />
                    <b>{e.libelle}</b>
                    <small className="num">{dateCourte(e.echeance)}</small>
                    <small style={{ color: COULEUR_ETAT[s], fontWeight: 500 }}>{libelleEtat(e)}</small>
                  </div>
                );
              })}
            </div>
          </Link>
        );
      })}
    </>
  );
}
