import Link from "next/link";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { dateCourte, ilYa } from "@/lib/format";
import { iaDisponible, modeleIA } from "@/lib/ia";
import { genererRapportVendeur, genererRelance } from "./actions";

const TYPE: Record<string, string> = {
  relance_acheteur: "Relance acheteur",
  rapport_vendeur: "Compte rendu vendeur",
  analyse_bien: "Analyse des visites",
  synthese_visite: "Synthèse de visite",
  proposition_bien: "Proposition de bien",
};

type Texte = {
  id: string; type: string; modele: string | null; created_at: string; envoye_le: string | null;
  bien: { id: string; reference: string } | null; contact: { id: string; nom: string } | null;
};

export default async function Assistant({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();
  const ia = iaDisponible();
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [{ data: stagnants }, { data: vendeurs }, { data: oublies }, { data: textes }, { count: nbIA }] = await Promise.all([
    supabase.from("v_biens_stagnants").select("bien_id, reference, titre, jours_en_ligne, nb_visites").eq("agence_id", agence.id),
    supabase.from("v_vendeurs_suivi").select("nom, bien_id, reference, statut, dernier_rapport_le").eq("agence_id", agence.id).eq("statut", "en_vente"),
    supabase.from("v_prospects_oublies").select("contact_id, nom, jours_sans_contact, nb_biens_adaptes").eq("agence_id", agence.id).order("jours_sans_contact", { ascending: false, nullsFirst: true }),
    supabase.from("textes_ia").select("id, type, modele, created_at, envoye_le, bien:biens(id, reference), contact:contacts(id, nom)").eq("agence_id", agence.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("textes_ia").select("id", { count: "exact", head: true }).eq("agence_id", agence.id).neq("modele", "regles").gte("created_at", debutMois),
  ]);

  // Vendeurs à informer : bien qui stagne, ou pas de compte rendu depuis 21 jours
  const stag = new Set((stagnants ?? []).map((s) => s.bien_id as string));
  const aInformer = (vendeurs ?? [])
    .map((v) => ({ ...v, jours: v.dernier_rapport_le ? Math.floor((Date.now() - new Date(v.dernier_rapport_le as string).getTime()) / 86_400_000) : null, stagne: stag.has(v.bien_id as string) }))
    .filter((v) => v.stagne || v.jours == null || v.jours > 21)
    .sort((a, b) => Number(b.stagne) - Number(a.stagne) || (b.jours ?? 999) - (a.jours ?? 999));

  const tx = (textes ?? []) as unknown as Texte[];
  const brouillons = tx.filter((t) => !t.envoye_le && t.type !== "analyse_bien");
  const historique = tx.filter((t) => t.envoye_le || t.type === "analyse_bien").slice(0, 10);
  const lienTexte = (t: Texte) => (t.type === "relance_acheteur" && t.contact ? `/prospects/${t.contact.id}#relance` : t.bien ? `/biens/${t.bien.id}#${t.type === "analyse_bien" ? "ia" : "rapport"}` : "#");

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow">Assistant IA</p>
          <h1>Ce que l&apos;assistant peut préparer</h1>
          <p className="sub">Comptes rendus pour les vendeurs, relances pour les acheteurs oubliés, analyse des retours de visite. Tout reste en brouillon jusqu&apos;à ce que vous le relisiez et le marquiez comme envoyé.</p>
        </div>
      </header>

      {erreur && <p className="notice crit">{erreur}</p>}

      <section className="card">
        <div className="card-h">
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <h2>Connexion OpenAI</h2>
            {ia ? <span className="pill p-ok">Active · {modeleIA()}</span> : <span className="pill p-warn">Non configurée</span>}
          </div>
          {ia && <span className="muted">{nbIA ?? 0} texte{(nbIA ?? 0) > 1 ? "s" : ""} rédigé{(nbIA ?? 0) > 1 ? "s" : ""} par l&apos;IA ce mois-ci</span>}
        </div>
        {!ia && (
          <p className="muted">
            Ajoutez la ligne <code>OPENAI_API_KEY=sk-…</code> dans <code>.env.local</code>, puis redémarrez le serveur. En attendant, les brouillons utilisent les modèles standard.
          </p>
        )}
      </section>

      <div className="grid2">
        <section className="card">
          <div className="card-h"><h2>Vendeurs à informer</h2><span className="muted">{aInformer.length}</span></div>
          <div className="list">
            {aInformer.length === 0 && <p className="empty">Tous les vendeurs ont reçu un compte rendu récent.</p>}
            {aInformer.map((v) => (
              <div className="row" key={v.bien_id as string}>
                <span className={`stripe ${v.stagne ? "s-crit" : "s-warn"}`} />
                <div className="main">
                  <b>{v.nom as string} · <Link href={`/biens/${v.bien_id}`} className="num">{v.reference as string}</Link></b>
                  <small>{v.stagne ? "Le bien stagne · " : ""}Dernier compte rendu {ilYa(v.dernier_rapport_le as string | null)}</small>
                </div>
                <form action={genererRapportVendeur}>
                  <input type="hidden" name="bien_id" value={v.bien_id as string} />
                  <input type="hidden" name="retour" value={`/biens/${v.bien_id}`} />
                  <button className="btn small" type="submit">{ia ? "Rédiger" : "Préparer"}</button>
                </form>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-h"><h2>Acheteurs à relancer</h2><span className="muted">{(oublies ?? []).length}</span></div>
          <div className="list">
            {(oublies ?? []).length === 0 && <p className="empty">Aucun acheteur oublié.</p>}
            {(oublies ?? []).map((o) => (
              <div className="row" key={o.contact_id as string}>
                <span className="stripe s-warn" />
                <div className="main">
                  <b><Link href={`/prospects/${o.contact_id}`}>{o.nom as string}</Link></b>
                  <small>Sans contact depuis {o.jours_sans_contact ?? "?"} jours · {o.nb_biens_adaptes as number} bien(s) adapté(s)</small>
                </div>
                <form action={genererRelance}>
                  <input type="hidden" name="contact_id" value={o.contact_id as string} />
                  <button className="btn small" type="submit">{ia ? "Rédiger" : "Préparer"}</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid2">
        <section className="card">
          <div className="card-h"><h2>Brouillons à relire</h2><span className="muted">{brouillons.length}</span></div>
          <div className="list">
            {brouillons.length === 0 && <p className="empty">Aucun brouillon en attente.</p>}
            {brouillons.map((t) => (
              <Link className="row" key={t.id} href={lienTexte(t)}>
                <span className="stripe s-info" />
                <div className="main"><b>{TYPE[t.type] ?? t.type} · {t.contact?.nom ?? t.bien?.reference}</b><small>{t.modele === "regles" ? "Modèle standard" : `IA · ${t.modele}`} · {ilYa(t.created_at)}</small></div>
                <span className="btn small">Relire</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-h"><h2>Historique</h2></div>
          <div className="list">
            {historique.length === 0 && <p className="empty">Rien d&apos;envoyé ni d&apos;analysé pour l&apos;instant.</p>}
            {historique.map((t) => (
              <Link className="row" key={t.id} href={lienTexte(t)}>
                <span className="stripe s-ok" />
                <div className="main"><b>{TYPE[t.type] ?? t.type} · {t.contact?.nom ?? t.bien?.reference}</b><small>{t.envoye_le ? `Envoyé le ${dateCourte(t.envoye_le)}` : `Fait le ${dateCourte(t.created_at)}`}{t.modele && t.modele !== "regles" ? ` · ${t.modele}` : ""}</small></div>
                <span />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
