import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { dateCourte, eur, ilYa, typologie } from "@/lib/format";
import { brouillonRelance, type BienPropose } from "@/lib/redaction";
import { CopyButton } from "../../copy-button";
import { marquerRelanceEnvoyee } from "../actions";
import { genererRelance } from "../../assistant/actions";
import { Brouillon } from "../../brouillon";
import { iaDisponible } from "@/lib/ia";
import { emailDisponible } from "@/lib/email";

type Recherche = { id: string; budget_max: number; villes: string[]; surface_min: number | null; pieces_min: number | null; active: boolean };

export default async function FicheProspect({
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

  const { data: c } = await supabase
    .from("contacts")
    .select("id, nom, email, telephone, source, notes, est_acheteur, est_vendeur, dernier_contact_at, recherches(id, budget_max, villes, surface_min, pieces_min, active)")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  const [{ data: rappro }, { data: visites }, { data: messages }, { data: ag }] = await Promise.all([
    supabase.from("v_rapprochements").select("bien_id, score").eq("acheteur_id", id).order("score", { ascending: false }),
    supabase.from("visites").select("id, date_visite, statut, note, retour, bien:biens(id, reference, type, pieces, ville)").eq("acheteur_id", id).order("date_visite", { ascending: false }),
    supabase.from("textes_ia").select("id, type, envoye_le, created_at, texte, modele").eq("contact_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("agences").select("seuil_relance_jours").eq("id", agence.id).maybeSingle(),
  ]);

  const ids = (rappro ?? []).map((r) => r.bien_id as string);
  const { data: biens } = ids.length
    ? await supabase.from("biens").select("id, reference, titre, type, pieces, ville, surface, prix, statut").in("id", ids).eq("statut", "en_vente")
    : { data: [] as never[] };
  const score = new Map((rappro ?? []).map((r) => [r.bien_id as string, r.score as number]));
  const adaptes = ((biens ?? []) as (BienPropose & { id: string })[]).sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0));

  const recherches = (c.recherches ?? []) as Recherche[];
  const active = recherches.find((r) => r.active) ?? null;
  const seuil = (ag?.seuil_relance_jours as number | undefined) ?? 21;
  const joursSans = c.dernier_contact_at ? Math.floor((Date.now() - new Date(c.dernier_contact_at).getTime()) / 86_400_000) : null;
  const oublie = active != null && (joursSans == null || joursSans > seuil);

  const ia = iaDisponible();
  const brouillonEnCours = (messages ?? []).find((m) => m.type === "relance_acheteur" && !m.envoye_le && new Date(m.created_at as string).getTime() > new Date(c.dernier_contact_at ?? 0).getTime());
  const brouillon = brouillonRelance({
    nom: c.nom,
    joursSansContact: joursSans,
    recherche: active,
    biens: adaptes,
    agent: agence.nomAffiche ?? "",
    agence: agence.nom,
  });

  const vis = (visites ?? []) as unknown as { id: string; date_visite: string; statut: string; note: number | null; retour: string | null; bien: { id: string; reference: string; type: string; pieces: number; ville: string } | null }[];

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow"><Link href="/prospects">Prospects</Link>{c.source ? ` · ${c.source}` : ""}</p>
          <h1>{c.nom}</h1>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {c.est_acheteur && <span className="pill p-accent">Acheteur</span>}
            {c.est_vendeur && <span className="pill p-ochre">Vendeur</span>}
            {oublie ? <span className="pill p-crit">Sans contact {ilYa(c.dernier_contact_at)}</span> : <span className="pill p-neutral">Dernier contact {ilYa(c.dernier_contact_at)}</span>}
          </div>
        </div>
      </header>

      {erreur && <p className="notice crit">{erreur}</p>}
      {ok === "cree" && <p className="notice ok">Acheteur ajouté. Les biens adaptés sont calculés automatiquement.</p>}
      {ok === "brouillon" && <p className="notice ok">Brouillon de relance prêt, plus bas.</p>}
      {ok === "envoye" && <p className="notice ok">Relance enregistrée comme envoyée. Le dernier contact est mis à jour.</p>}
      {ok === "email" && <p className="notice ok">Relance envoyée par e-mail. Le dernier contact est mis à jour.</p>}
      {ok === "relance" && <p className="notice ok">Relance enregistrée. Le dernier contact est mis à jour et l&apos;alerte est levée.</p>}

      <div className="facts">
        <div><small>E-mail</small><span style={{ userSelect: "all", overflowWrap: "anywhere" }}>{c.email ?? "–"}</span></div>
        <div><small>Téléphone</small><span className="num" style={{ userSelect: "all" }}>{c.telephone ?? "–"}</span></div>
        <div><small>Biens adaptés en vente</small><span className="num">{adaptes.length}</span></div>
      </div>

      <div className="grid2">
        <section className="card">
          <div className="card-h"><h2>Recherche</h2></div>
          {recherches.length === 0 && <p className="empty">Aucune recherche enregistrée.</p>}
          {recherches.map((r) => (
            <div className="facts" key={r.id} style={{ opacity: r.active ? 1 : 0.55 }}>
              <div><small>Budget max.</small><span className="num">{eur(r.budget_max)}</span></div>
              <div><small>Surface min.</small><span className="num">{r.surface_min ? `${r.surface_min} m²` : "–"}</span></div>
              <div><small>Pièces min.</small><span className="num">{r.pieces_min ?? "–"}</span></div>
              <div style={{ gridColumn: "1 / -1" }}><small>Villes{r.active ? "" : " · recherche inactive"}</small><span>{r.villes.join(", ") || "Toutes"}</span></div>
            </div>
          ))}
        </section>

        <section className="card">
          <div className="card-h"><h2>Biens adaptés</h2><span className="muted">{adaptes.length}</span></div>
          <div className="list">
            {adaptes.length === 0 && <p className="empty">Aucun bien en vente ne correspond aujourd&apos;hui.</p>}
            {adaptes.map((b) => (
              <Link className="row" key={b.id} href={`/biens/${b.id}`}>
                <span className={`stripe ${(score.get(b.id) ?? 0) >= 85 ? "s-ok" : "s-info"}`} />
                <div className="main"><b>{typologie(b.type, b.pieces)} {b.ville} · {b.surface} m²</b><small>{b.reference} · {eur(b.prix)}</small></div>
                <span className="num">{score.get(b.id)} %</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="card" id="relance">
        <div className="card-h">
          <div><h2>Relance</h2><p className="muted" style={{ fontSize: 12.5 }}>Préparée à partir de la recherche, des visites passées et des biens adaptés. Relisez-la avant envoi.</p></div>
          <form action={genererRelance}>
            <input type="hidden" name="contact_id" value={c.id} />
            <button className="btn" type="submit">{ia ? (brouillonEnCours ? "Régénérer avec l'IA" : "Rédiger avec l'IA") : "Préparer un brouillon"}</button>
          </form>
        </div>
        {brouillonEnCours ? (
          <Brouillon id={brouillonEnCours.id as string} texte={brouillonEnCours.texte as string} modele={brouillonEnCours.modele as string | null} creeLe={brouillonEnCours.created_at as string} retour={`/prospects/${c.id}`} champ="texte-relance" destinataire={c.email} nomDestinataire={c.nom} />
        ) : (
          <form action={marquerRelanceEnvoyee} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="hidden" name="contact_id" value={c.id} />
            <span className="pill p-neutral" style={{ alignSelf: "flex-start" }}>Modèle standard</span>
            {emailDisponible() && <p className="muted" style={{ fontSize: 12.5 }}>Pour l&apos;envoyer par e-mail depuis l&apos;app, cliquez d&apos;abord sur « {ia ? "Rédiger avec l'IA" : "Préparer un brouillon"} ».</p>}
            <textarea id="texte-relance" name="texte" rows={16} defaultValue={brouillon} aria-label="Texte de la relance" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CopyButton target="texte-relance" />
              <button className="btn primary" type="submit">Marquer comme envoyée</button>
            </div>
          </form>
        )}
        {!ia && <p className="muted" style={{ fontSize: 12.5 }}>Ajoutez OPENAI_API_KEY dans .env.local pour une relance rédigée par l&apos;IA.</p>}
      </section>

      <div className="grid2">
        <section className="card">
          <div className="card-h"><h2>Visites</h2><span className="muted">{vis.length}</span></div>
          <div className="list">
            {vis.length === 0 && <p className="empty">Aucune visite.</p>}
            {vis.map((v) => (
              <div className="visit" key={v.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <b>{v.bien ? <Link href={`/biens/${v.bien.id}`}>{typologie(v.bien.type, v.bien.pieces)} {v.bien.ville} · {v.bien.reference}</Link> : "Bien"}</b>
                  <span className="muted num" style={{ fontSize: 12 }}>
                    {dateCourte(v.date_visite)}{v.statut === "planifiee" ? " · prévue" : v.note ? <> · <span className="stars">{"★".repeat(v.note)}{"☆".repeat(5 - v.note)}</span></> : null}
                  </span>
                </div>
                {v.retour && <span style={{ fontSize: 13.5 }}>{v.retour}</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-h"><h2>Messages</h2><span className="muted">{(messages ?? []).length}</span></div>
          <div className="list">
            {(messages ?? []).length === 0 && <p className="empty">Aucun message enregistré.</p>}
            {(messages ?? []).map((m) => (
              <details className="visit" key={m.id as string}>
                <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <b>{m.type === "relance_acheteur" ? "Relance" : m.type === "rapport_vendeur" ? "Compte rendu vendeur" : String(m.type).replace(/_/g, " ")}</b>
                  <span className="muted num" style={{ fontSize: 12 }}>{m.envoye_le ? `Envoyé le ${dateCourte(m.envoye_le as string)}` : "Brouillon"}</span>
                </summary>
                <p style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 6 }}>{m.texte as string}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
