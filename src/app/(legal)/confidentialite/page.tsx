import type { Metadata } from "next";
import Link from "next/link";
import { EDITEUR, PRESTATAIRES } from "@/lib/legal";

export const metadata: Metadata = { title: "Politique de confidentialité · IMMO Suite" };

const TRAITEMENTS = [
  {
    quoi: "Demandes de démo et de contact",
    donnees: "Nom, agence, e-mail, téléphone, taille de l'équipe, message",
    pourquoi: "Vous recontacter et vous présenter le Service",
    base: "Intérêt légitime (répondre à votre demande)",
    duree: "3 ans après le dernier contact",
  },
  {
    quoi: "Comptes utilisateurs",
    donnees: "E-mail, mot de passe (chiffré), nom affiché, agence, rôle, dates de connexion",
    pourquoi: "Créer et sécuriser votre accès, gérer l'équipe de l'agence",
    base: "Exécution du contrat",
    duree: "Durée de l'abonnement, puis 30 jours",
  },
  {
    quoi: "Facturation",
    donnees: "Raison sociale, adresse, factures, paiements",
    pourquoi: "Facturer l'abonnement et tenir la comptabilité",
    base: "Obligation légale et exécution du contrat",
    duree: "10 ans (obligation comptable)",
  },
  {
    quoi: "Journaux techniques",
    donnees: "Adresse IP, navigateur, date et heure des requêtes, erreurs",
    pourquoi: "Sécurité, prévention des abus, correction des erreurs",
    base: "Intérêt légitime (sécurité du Service)",
    duree: "Quelques semaines, selon les prestataires techniques",
  },
];

export default function Confidentialite() {
  const e = EDITEUR;
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="lg-intro">
        Cette page explique quelles données personnelles nous traitons, pourquoi, combien de temps, et comment exercer vos droits. Elle s&apos;applique au site de présentation et à l&apos;application {e.marque}.
      </p>

      <h2>Qui est responsable ?</h2>
      <p>
        {e.responsable}, {e.statut}, exerçant sous le nom {e.nomCommercial}, {e.adresse}. Contact : <a href={`mailto:${e.email}`}>{e.email}</a>.
      </p>

      <h2>Deux situations différentes</h2>
      <div className="lg-box">
        <p>
          <b>Vos données de visiteur, de client et d&apos;utilisateur</b> (demande de démo, compte, facturation) : nous en sommes <b>responsable de traitement</b>. Elles sont décrites ci-dessous.
        </p>
        <p>
          <b>Les données que les agences enregistrent dans l&apos;application</b> (leurs prospects, vendeurs, acquéreurs, biens et transactions) : l&apos;agence en est <b>responsable de traitement</b> et nous agissons comme <b>sous-traitant</b>, uniquement sur ses instructions. Si vous êtes client ou prospect d&apos;une agence, adressez vos demandes à cette agence ; nous l&apos;aiderons à y répondre. Nos engagements de sous-traitant figurent dans l&apos;<Link href="/cgv#annexe">annexe des CGV</Link>.
        </p>
      </div>

      <h2>Données traitées</h2>
      <div className="lg-scroll">
        <table className="lg-table">
          <thead>
            <tr><th>Traitement</th><th>Données</th><th>Finalité</th><th>Base légale</th><th>Conservation</th></tr>
          </thead>
          <tbody>
            {TRAITEMENTS.map((t) => (
              <tr key={t.quoi}><td><b>{t.quoi}</b></td><td>{t.donnees}</td><td>{t.pourquoi}</td><td>{t.base}</td><td>{t.duree}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>Nous ne vendons aucune donnée, ne faisons aucune publicité ciblée et ne prenons aucune décision automatisée produisant des effets juridiques à votre égard.</p>

      <h2>Intelligence artificielle</h2>
      <p>
        Lorsqu&apos;un utilisateur demande une rédaction à l&apos;assistant, les informations utiles (par exemple les caractéristiques d&apos;un bien ou les retours de visite) sont transmises à notre prestataire d&apos;IA pour générer le texte. Ces données ne sont pas utilisées pour entraîner ses modèles. Le prestataire peut les conserver pendant une durée limitée (30 jours au plus) pour prévenir les abus, puis les supprime.
      </p>

      <h2>Destinataires et prestataires</h2>
      <p>Vos données sont accessibles uniquement à l&apos;éditeur et, pour les données d&apos;une agence, aux membres de cette agence. Nous faisons appel aux prestataires techniques suivants :</p>
      <div className="lg-scroll">
        <table className="lg-table">
          <thead>
            <tr><th>Prestataire</th><th>Rôle</th><th>Localisation</th></tr>
          </thead>
          <tbody>
            {PRESTATAIRES.map((p) => (
              <tr key={p.nom}><td>{p.nom}</td><td>{p.role}</td><td>{p.lieu}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Transferts hors de l&apos;Union européenne</h2>
      <p>
        Les données de l&apos;application sont stockées en Irlande. Certains prestataires sont des sociétés américaines susceptibles d&apos;y accéder ou de traiter certaines données aux États-Unis (envoi des e-mails, IA, polices d&apos;écriture). Ces transferts sont encadrés par le cadre de protection des données UE–États-Unis (Data Privacy Framework) lorsque le prestataire y adhère, ou par les clauses contractuelles types de la Commission européenne.
      </p>

      <h2>Cookies</h2>
      <p>
        Nous n&apos;utilisons ni cookie publicitaire ni outil de mesure d&apos;audience. Seuls des cookies strictement nécessaires sont déposés lorsque vous vous connectez à l&apos;application, pour maintenir votre session ; ils sont exemptés de consentement. Les polices d&apos;écriture du site sont chargées depuis les serveurs de Google, qui reçoivent à cette occasion votre adresse IP.
      </p>

      <h2>Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS), les mots de passe ne sont jamais stockés en clair, et les données sont cloisonnées par agence : chaque utilisateur n&apos;accède qu&apos;aux données des agences dont il est membre.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité de vos données, ainsi que du droit de définir des directives sur leur sort après votre décès. Pour les exercer, écrivez à <a href={`mailto:${e.email}`}>{e.email}</a>. Nous répondons dans un délai d&apos;un mois. Nous pouvons vous demander de justifier de votre identité en cas de doute.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (cnil.fr), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.
      </p>
    </>
  );
}
