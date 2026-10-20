import type { Metadata } from "next";
import Link from "next/link";
import { EDITEUR } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales · IMMO Suite" };

export default function MentionsLegales() {
  return (
    <>
      <h1>Mentions légales</h1>
      <p className="lg-intro">Informations prévues par l&apos;article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique (LCEN).</p>

      <h2>Éditeur du site et du service</h2>
      <div className="lg-box">
        <p>
          <b>{EDITEUR.nomCommercial}</b> ({EDITEUR.marque})<br />
          {EDITEUR.responsable}, {EDITEUR.statut}<br />
          SIRET : {EDITEUR.siret}<br />
          Adresse : {EDITEUR.adresse}<br />
          E-mail : <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a>
          {EDITEUR.telephone && (
            <>
              <br />
              Téléphone : {EDITEUR.telephone}
            </>
          )}
          <br />
          {EDITEUR.tva}
        </p>
      </div>
      <p>Directeur de la publication : {EDITEUR.responsable}.</p>

      <h2>Hébergement</h2>
      <p>
        Le site et l&apos;application sont hébergés par <b>Vercel Inc.</b>, 440 North Barranca Avenue, Suite 4133, Covina, CA 91723, États-Unis (vercel.com). Les traitements sont exécutés sur des serveurs situés à Dublin (Irlande).
      </p>
      <p>
        Les données de l&apos;application (base de données, comptes et fichiers) sont hébergées par <b>Supabase Inc.</b> (supabase.com) sur des serveurs situés en Irlande.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        La marque {EDITEUR.marque}, le logo, les textes, la charte graphique et le logiciel sont la propriété de {EDITEUR.responsable} ({EDITEUR.nomCommercial}). Toute reproduction ou réutilisation, totale ou partielle, sans autorisation écrite préalable est interdite.
      </p>
      <p>Les données saisies par les utilisateurs dans l&apos;application restent la propriété de leurs auteurs ou de l&apos;agence cliente.</p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement de vos données personnelles est décrit dans notre <Link href="/confidentialite">politique de confidentialité</Link>. Vous pouvez exercer vos droits en écrivant à <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a>.
      </p>

      <h2>Cookies</h2>
      <p>
        Le site n&apos;utilise ni cookie publicitaire ni outil de mesure d&apos;audience. Seuls des cookies strictement nécessaires sont déposés lorsque vous vous connectez, pour maintenir votre session. Ils ne nécessitent pas votre consentement.
      </p>

      <h2>Conditions d&apos;utilisation du service</h2>
      <p>
        L&apos;utilisation de l&apos;application est régie par nos <Link href="/cgv">conditions générales de vente et d&apos;utilisation</Link>.
      </p>
    </>
  );
}
