import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { STATUT_BIEN } from "@/lib/format";
import { FormulaireBien } from "../formulaire";
import { ajouterPhoto, modifierBien, publierAnnonce, signalerPhoto, supprimerPhoto } from "../actions";

type Controle = { niveau: "info" | "warn" | "crit"; categorie: string; message: string };
const CATEGORIES: Record<string, string> = { manquant: "Informations manquantes", incoherence: "Incohérences", photos: "Photos" };
const SIGNALEMENTS = [
  ["", "Correcte"],
  ["floue", "Floue"],
  ["sombre", "Trop sombre"],
  ["doublon", "En double"],
  ["personne", "Personne visible"],
  ["autre", "Autre problème"],
];

export default async function FicheAnnonce({
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

  const { data: b } = await supabase.from("biens").select("*").eq("id", id).maybeSingle();
  if (!b) notFound();

  const [{ data: controle }, { data: photos }, { data: vendeurs }, { data: villes }] = await Promise.all([
    supabase.rpc("controle_annonce_par_id", { p_bien: id }),
    supabase.from("photos").select("id, libelle, position, signalement").eq("bien_id", id).order("position"),
    supabase.from("contacts").select("id, nom").eq("agence_id", agence.id).eq("est_vendeur", true).order("nom"),
    supabase.from("marche_reference").select("ville").order("ville"),
  ]);

  const ctl = (controle ?? []) as Controle[];
  const n = (l: string) => ctl.filter((x) => x.niveau === l).length;
  const score = Math.max(0, 100 - 20 * n("crit") - 8 * n("warn") - 3 * n("info"));
  const couleur = score >= 80 ? "var(--ok)" : score >= 55 ? "var(--warn)" : "var(--crit)";
  const s = STATUT_BIEN[b.statut as string];

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow"><Link href="/annonces">Annonces</Link> · {b.reference}</p>
          <h1>{b.titre}</h1>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            <span className={`pill ${s.cls}`}>{s.label}</span>
            <Link className="tag" href={`/biens/${id}`}>Voir le suivi du bien</Link>
          </div>
        </div>
      </header>

      {erreur && <p className="notice crit">{erreur}</p>}
      {ok === "cree" && <p className="notice ok">Bien enregistré en brouillon. Voici ce que le contrôle a relevé.</p>}
      {ok === "enregistre" && <p className="notice ok">Fiche enregistrée et contrôlée à nouveau.</p>}

      <div className="grid-60" style={{ alignItems: "start" }}>
        <section className="card">
          <div className="card-h"><h2>Fiche</h2></div>
          <FormulaireBien
            bien={b}
            vendeurs={(vendeurs ?? []) as { id: string; nom: string }[]}
            villes={(villes ?? []).map((v) => v.ville as string)}
            action={modifierBien}
            libelle="Enregistrer et contrôler"
          />
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 16 }}>
          <section className="card">
            <div className="card-h">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className="ring" style={{ background: `conic-gradient(${couleur} ${score}%, var(--sunk) 0)` }}><span>{score}</span></div>
                <div><h2>Contrôle</h2><span className="muted" style={{ fontSize: 12.5 }}>{n("crit")} critique · {n("warn")} à vérifier · {n("info")} conseil</span></div>
              </div>
            </div>
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
            {b.statut === "brouillon" && (
              <form action={publierAnnonce}>
                <input type="hidden" name="bien_id" value={id} />
                <button className="btn primary" type="submit" disabled={n("crit") > 0} style={{ width: "100%", justifyContent: "center" }}>
                  {n("crit") ? `Publication bloquée (${n("crit")} point${n("crit") > 1 ? "s" : ""} critique${n("crit") > 1 ? "s" : ""})` : "Publier l'annonce"}
                </button>
              </form>
            )}
          </section>

          <section className="card" id="photos">
            <div className="card-h"><h2>Photos</h2><span className="muted">{(photos ?? []).length} · 8 conseillées</span></div>
            <div className="list">
              {(photos ?? []).length === 0 && <p className="empty">Aucune photo.</p>}
              {(photos ?? []).map((p) => (
                <div className="row" key={p.id as string} style={{ gridTemplateColumns: "4px minmax(0,1fr) auto" }}>
                  <span className={`stripe ${p.signalement ? "s-warn" : "s-ok"}`} />
                  <div className="main"><b>{p.libelle as string}</b></div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <form action={signalerPhoto} style={{ display: "flex", gap: 6 }}>
                      <input type="hidden" name="bien_id" value={id} />
                      <input type="hidden" name="photo_id" value={p.id as string} />
                      <select name="signalement" defaultValue={(p.signalement as string) ?? ""} aria-label={`État de la photo ${p.libelle}`} style={{ width: "auto", padding: "4px 6px", fontSize: 12.5 }}>
                        {SIGNALEMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <button className="btn small" type="submit">OK</button>
                    </form>
                    <form action={supprimerPhoto}>
                      <input type="hidden" name="bien_id" value={id} />
                      <input type="hidden" name="photo_id" value={p.id as string} />
                      <button className="btn small" type="submit" aria-label={`Retirer la photo ${p.libelle}`}>Retirer</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
            <form action={ajouterPhoto} style={{ display: "flex", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <input type="hidden" name="bien_id" value={id} />
              <input type="text" name="libelle" placeholder="Séjour, Cuisine, Chambre 1…" aria-label="Libellés des photos, séparés par des virgules" />
              <button className="btn" type="submit">Ajouter</button>
            </form>
            <p className="muted" style={{ fontSize: 12.5 }}>Pour l&apos;instant on enregistre le libellé de chaque photo et son état. L&apos;envoi des fichiers images viendra avec le stockage Supabase.</p>
          </section>
        </div>
      </div>
    </>
  );
}
