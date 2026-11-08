import { OFFRES, type EtatAcces } from "@/lib/abonnement";
import { gererAbonnement, souscrire } from "./actions";

const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

// Choix de la formule et gestion de l'abonnement. Utilisé par /abonnement et par l'écran d'essai terminé.
export function PanneauAbonnement({ etat, estAdmin, paiementActif }: { etat: EtatAcces; estAdmin: boolean; paiementActif: boolean }) {
  const l = etat.ligne;
  const abonne = etat.type === "actif" || etat.type === "impaye";

  return (
    <div className="abo">
      <section className="card">
        <div className="card-h"><h2>Votre situation</h2></div>
        {etat.type === "offert" && <p>Accès offert : votre agence utilise IMMO Suite sans abonnement.</p>}
        {etat.type === "inconnu" && <p className="muted">Les abonnements ne sont pas encore activés sur cette installation.</p>}
        {etat.type === "essai" && (
          <p>
            Essai gratuit en cours : <b>{etat.joursRestants} jour{etat.joursRestants > 1 ? "s" : ""} restant{etat.joursRestants > 1 ? "s" : ""}</b>, jusqu&apos;au {date(l?.essai_fin)}. Si vous choisissez une formule maintenant, le premier prélèvement n&apos;aura lieu qu&apos;à la fin de l&apos;essai.
          </p>
        )}
        {etat.type === "expire" && (
          <p className="notice crit">
            {l?.statut === "canceled" ? "Votre abonnement est terminé." : "Votre essai gratuit est terminé."} Choisissez une formule pour retrouver l&apos;accès à vos données : rien n&apos;a été supprimé.
          </p>
        )}
        {etat.type === "impaye" && <p className="notice crit">Le dernier paiement a échoué. Mettez à jour votre carte bancaire pour éviter la suspension de l&apos;accès.</p>}
        {abonne && l && (
          <p>
            Formule <b>{OFFRES.find((o) => o.id === l.formule)?.nom ?? "—"}</b>
            {l.statut === "trialing" && <> · période d&apos;essai jusqu&apos;au {date(l.fin_periode)}</>}
            {l.statut === "active" && l.fin_periode && <> · {l.resiliation_prevue ? "se termine" : "prochain renouvellement"} le {date(l.fin_periode)}</>}
          </p>
        )}
        {abonne && l?.resiliation_prevue && <p className="muted">Résiliation programmée : l&apos;accès reste ouvert jusqu&apos;à la fin de la période payée.</p>}
      </section>

      {!estAdmin && etat.type !== "offert" && (
        <p className="notice" style={{ background: "var(--sunk)" }}>Seul un administrateur de l&apos;agence peut choisir ou modifier l&apos;abonnement.</p>
      )}

      {estAdmin && abonne && paiementActif && (
        <section className="card">
          <div className="card-h"><h2>Gérer l&apos;abonnement</h2></div>
          <p className="muted" style={{ fontSize: 13.5 }}>Changer de formule ou de carte bancaire, télécharger vos factures, résilier : tout se fait dans l&apos;espace sécurisé de notre prestataire de paiement, Stripe.</p>
          <form action={gererAbonnement}><button className="btn primary" type="submit">Ouvrir l&apos;espace de facturation</button></form>
        </section>
      )}

      {!abonne && etat.type !== "offert" && etat.type !== "inconnu" && (
        <section className="abo-offres">
          {OFFRES.map((o) => (
            <form key={o.id} action={souscrire} className={`card abo-offre${o.id === "agence" ? " vedette" : ""}`}>
              <input type="hidden" name="formule" value={o.id} />
              <h3>{o.nom}</h3>
              <p className="abo-prix">{o.prix}<small> HT / mois</small></p>
              <p className="muted" style={{ fontSize: 13.5 }}>{o.detail}</p>
              {estAdmin && (
                <button className={`btn${o.id === "agence" ? " primary" : ""}`} type="submit" disabled={!paiementActif} style={{ justifyContent: "center" }}>
                  Choisir {o.nom}
                </button>
              )}
            </form>
          ))}
          <p className="muted abo-note">
            Sans engagement, résiliable à tout moment. Paiement sécurisé par Stripe. TVA non applicable, art. 293 B du CGI.
            {!paiementActif && " Le paiement en ligne sera bientôt disponible : contactez-nous pour vous abonner."}
          </p>
        </section>
      )}
    </div>
  );
}
