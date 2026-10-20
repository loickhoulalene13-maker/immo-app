import type { Metadata } from "next";
import Link from "next/link";
import { EDITEUR, PRESTATAIRES } from "@/lib/legal";

export const metadata: Metadata = { title: "Conditions générales de vente et d'utilisation · IMMO Suite" };

export default function CGV() {
  const e = EDITEUR;
  return (
    <>
      <h1>Conditions générales de vente et d&apos;utilisation</h1>
      <p className="lg-intro">
        Les présentes conditions (les « CGV ») encadrent l&apos;abonnement au logiciel {e.marque} édité par {e.responsable}, {e.statut}, exerçant sous le nom commercial {e.nomCommercial} (« nous », « l&apos;éditeur »).
      </p>

      <h2>1. Objet et acceptation</h2>
      <p>
        Les CGV définissent les conditions dans lesquelles l&apos;éditeur fournit à ses clients un accès en ligne au logiciel {e.marque} (le « Service »). Elles s&apos;appliquent à toute création de compte, à tout essai et à tout abonnement. Le client les accepte en cochant la case prévue lors de la création de son compte ou en signant un bon de commande qui y renvoie. Elles prévalent sur tout autre document, sauf accord écrit contraire.
      </p>

      <h2>2. Service réservé aux professionnels</h2>
      <p>
        Le Service est destiné exclusivement aux professionnels de l&apos;immobilier (agences, agents, mandataires, réseaux) agissant dans le cadre de leur activité. Le droit de rétractation prévu pour les consommateurs ne s&apos;applique donc pas. Le « client » désigne l&apos;entreprise qui souscrit ; les « utilisateurs » sont les personnes qu&apos;elle autorise à accéder au Service.
      </p>

      <h2>3. Description du Service</h2>
      <p>
        {e.marque} est un logiciel en ligne de suivi de l&apos;activité d&apos;une agence immobilière : gestion des prospects acheteurs et vendeurs, suivi des biens et des visites, contrôle de la qualité des annonces, suivi des transactions, tableau de bord, alertes, envoi d&apos;e-mails et assistant de rédaction par intelligence artificielle. Le contenu exact de chaque formule est décrit sur la <Link href="/presentation#tarifs">page de présentation</Link> à la date de la souscription.
      </p>
      <p>Le Service évolue régulièrement. L&apos;éditeur peut ajouter, modifier ou retirer des fonctionnalités, sans réduire de façon substantielle les fonctions essentielles de la formule souscrite en cours d&apos;abonnement.</p>

      <h2>4. Compte et accès</h2>
      <p>
        Le client crée un compte avec une adresse e-mail valide et un mot de passe personnel. Il désigne un ou plusieurs administrateurs qui invitent et gèrent les utilisateurs de l&apos;agence. Les identifiants sont strictement personnels et confidentiels : le client est responsable de leur usage et doit signaler sans délai toute utilisation non autorisée à {e.email}.
      </p>

      <h2>5. Essai gratuit</h2>
      <p>
        Le Service peut être essayé gratuitement pendant la durée indiquée sur la page de présentation, sans moyen de paiement et sans engagement. À la fin de l&apos;essai, l&apos;accès est suspendu si aucun abonnement n&apos;est souscrit. Les données saisies pendant l&apos;essai sont conservées 30 jours, puis supprimées.
      </p>

      <h2>6. Prix, facturation et paiement</h2>
      <p>
        Les prix sont ceux affichés sur la page de présentation ou sur le devis accepté, exprimés en euros hors taxes. {e.tva}. L&apos;abonnement est facturé mensuellement, à l&apos;avance, au début de chaque période.
      </p>
      <p>
        Les factures sont payables à réception, par prélèvement, carte bancaire ou virement. Conformément à l&apos;article L441-10 du Code de commerce, tout retard de paiement entraîne de plein droit des pénalités égales à trois fois le taux d&apos;intérêt légal, ainsi qu&apos;une indemnité forfaitaire de 40 € pour frais de recouvrement. Aucun escompte n&apos;est accordé en cas de paiement anticipé.
      </p>
      <p>
        L&apos;éditeur peut modifier ses prix. Le client en est informé par e-mail au moins 30 jours avant leur application ; il peut résilier avant cette date s&apos;il les refuse.
      </p>

      <h2>7. Durée, résiliation et suspension</h2>
      <p>
        L&apos;abonnement est conclu pour une durée d&apos;un mois, renouvelée automatiquement chaque mois. Le client peut résilier à tout moment, par e-mail à {e.email} ou depuis son espace lorsque cette option est disponible. La résiliation prend effet à la fin de la période mensuelle en cours, déjà payée, qui n&apos;est pas remboursée.
      </p>
      <p>
        En cas de défaut de paiement ou de manquement grave aux CGV, l&apos;éditeur peut suspendre l&apos;accès au Service après une mise en demeure par e-mail restée sans effet pendant 15 jours, puis résilier l&apos;abonnement. En cas d&apos;usage manifestement illicite ou menaçant la sécurité du Service, la suspension peut être immédiate.
      </p>

      <h2>8. Obligations du client</h2>
      <ul>
        <li>Utiliser le Service conformément à sa destination, aux lois en vigueur et aux règles de sa profession (notamment la loi Hoguet et les obligations d&apos;information des annonces immobilières).</li>
        <li>Disposer d&apos;une base légale pour les données personnelles qu&apos;il enregistre (prospects, vendeurs, acquéreurs) et informer les personnes concernées, en sa qualité de responsable de traitement.</li>
        <li>Respecter les règles applicables à la prospection par e-mail lorsqu&apos;il envoie des messages depuis le Service, et ne pas envoyer de messages non sollicités en masse.</li>
        <li>Vérifier l&apos;exactitude des informations qu&apos;il saisit et publie, dont il reste seul responsable.</li>
        <li>Ne pas tenter de contourner les mesures de sécurité, d&apos;accéder aux données d&apos;autres clients, ni de copier ou revendre le Service.</li>
      </ul>

      <h2>9. Assistant de rédaction par IA</h2>
      <p>
        Les textes proposés par l&apos;assistant (analyses, relances, comptes rendus) sont générés automatiquement à partir des données du client. Ce sont des suggestions : elles peuvent contenir des erreurs ou des imprécisions et doivent être relues avant tout envoi. Le client reste seul responsable des messages qu&apos;il envoie. Les données transmises au prestataire d&apos;IA ne sont pas utilisées pour entraîner ses modèles.
      </p>

      <h2>10. Disponibilité et assistance</h2>
      <p>
        L&apos;éditeur met en œuvre les moyens raisonnables pour assurer l&apos;accès au Service 24 h/24 et 7 j/7, sans garantie de disponibilité permanente (obligation de moyens). Des interruptions peuvent survenir pour maintenance, mise à jour ou en raison de défaillances des prestataires techniques ou des réseaux. L&apos;éditeur s&apos;efforce de prévenir le client des maintenances programmées.
      </p>
      <p>L&apos;assistance est assurée par e-mail à {e.email}, les jours ouvrés. L&apos;éditeur s&apos;efforce de répondre sous un jour ouvré.</p>

      <h2>11. Données du client</h2>
      <p>
        Le client reste propriétaire des données qu&apos;il saisit dans le Service. L&apos;éditeur ne les utilise que pour fournir le Service, ne les vend pas et ne les communique à aucun tiers en dehors des prestataires techniques nécessaires (article 13).
      </p>
      <p>
        À la fin de l&apos;abonnement, le client peut demander, dans les 30 jours, une exportation de ses données dans un format courant (CSV). Passé ce délai, les données sont supprimées définitivement, à l&apos;exception des sauvegardes techniques, effacées selon leur cycle normal, et des documents que l&apos;éditeur doit conserver en vertu de la loi (factures).
      </p>

      <h2>12. Sécurité</h2>
      <p>
        Les données sont hébergées dans l&apos;Union européenne (Irlande), chiffrées lors de leur transfert, et cloisonnées par agence : un utilisateur n&apos;accède qu&apos;aux données des agences dont il est membre. L&apos;éditeur applique des mesures techniques et organisationnelles adaptées et informe le client sans délai de toute violation de données le concernant.
      </p>

      <h2>13. Protection des données personnelles</h2>
      <p>
        Pour les données de ses propres clients et prospects, le client est responsable de traitement et l&apos;éditeur agit en tant que sous-traitant au sens de l&apos;article 28 du RGPD. Leurs obligations respectives figurent dans l&apos;<a href="#annexe">annexe ci-dessous</a>, qui fait partie des CGV. Pour les données de compte et de facturation, l&apos;éditeur est responsable de traitement : voir la <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>14. Responsabilité</h2>
      <p>
        L&apos;éditeur est responsable des dommages directs et prévisibles résultant d&apos;un manquement prouvé à ses obligations. Il n&apos;est pas responsable des dommages indirects (perte de chiffre d&apos;affaires, de clientèle, de chance ou d&apos;une vente), ni des conséquences d&apos;une utilisation non conforme du Service, des contenus saisis par le client ou des textes envoyés sans relecture.
      </p>
      <p>
        Sauf faute lourde ou dolosive, la responsabilité totale de l&apos;éditeur est limitée aux sommes effectivement payées par le client au titre du Service au cours des 12 mois précédant le fait générateur.
      </p>
      <p>Aucune des parties n&apos;est responsable d&apos;un manquement dû à un cas de force majeure au sens de l&apos;article 1218 du Code civil.</p>

      <h2>15. Propriété intellectuelle</h2>
      <p>
        Le Service, son code, sa marque et ses contenus restent la propriété exclusive de l&apos;éditeur. L&apos;abonnement confère au client un droit d&apos;utilisation personnel, non exclusif et non transférable, pour la durée de l&apos;abonnement et pour les besoins de son activité.
      </p>

      <h2>16. Confidentialité et référence commerciale</h2>
      <p>
        Chaque partie garde confidentielles les informations non publiques de l&apos;autre. Sauf refus exprimé par écrit, le client autorise l&apos;éditeur à citer son nom et son logo comme référence commerciale.
      </p>

      <h2>17. Modification des CGV</h2>
      <p>
        L&apos;éditeur peut modifier les CGV. Les clients sont informés par e-mail au moins 30 jours avant l&apos;entrée en vigueur de modifications importantes et peuvent résilier avant cette date. La version applicable est celle en ligne sur cette page.
      </p>

      <h2>18. Droit applicable et litiges</h2>
      <p>
        Les CGV sont soumises au droit français. En cas de différend, les parties recherchent d&apos;abord une solution amiable. À défaut d&apos;accord dans un délai de 30 jours, le litige sera porté devant les tribunaux compétents du ressort de {e.villeTribunal}.
      </p>

      <h2 id="annexe">Annexe : accord de sous-traitance des données (article 28 du RGPD)</h2>
      <h3>Objet et durée</h3>
      <p>
        L&apos;éditeur (sous-traitant) traite des données personnelles pour le compte du client (responsable de traitement), uniquement pour fournir le Service, pendant la durée de l&apos;abonnement et jusqu&apos;à la suppression des données prévue à l&apos;article 11.
      </p>
      <h3>Nature des traitements</h3>
      <p>Hébergement, stockage, consultation, organisation, rapprochement automatique, envoi d&apos;e-mails à la demande du client, génération de textes par IA à la demande du client, sauvegarde et suppression.</p>
      <h3>Données et personnes concernées</h3>
      <ul>
        <li>Personnes : prospects acquéreurs et vendeurs, propriétaires, acquéreurs, utilisateurs du client.</li>
        <li>Données : identité, coordonnées (e-mail, téléphone), critères de recherche et budget, informations sur les biens, comptes rendus de visite, notes, étapes et documents de transaction.</li>
        <li>Le client s&apos;engage à ne pas enregistrer de données sensibles (santé, opinions, etc.) ni de numéros de pièce d&apos;identité ou de compte bancaire en dehors des documents strictement nécessaires à une transaction.</li>
      </ul>
      <h3>Engagements du sous-traitant</h3>
      <ul>
        <li>Ne traiter les données que sur instruction documentée du client, constituée par les CGV et l&apos;usage du Service.</li>
        <li>Garantir la confidentialité des données et la limiter aux personnes qui en ont besoin.</li>
        <li>Mettre en œuvre des mesures de sécurité adaptées (article 12).</li>
        <li>Aider le client à répondre aux demandes d&apos;exercice des droits (accès, rectification, effacement, etc.).</li>
        <li>Notifier au client toute violation de données dans les meilleurs délais, et au plus tard 48 heures après en avoir pris connaissance.</li>
        <li>Supprimer ou restituer les données à la fin du contrat, selon le choix du client (article 11).</li>
        <li>Mettre à disposition les informations nécessaires pour démontrer le respect de ces obligations.</li>
      </ul>
      <h3>Sous-traitants ultérieurs</h3>
      <p>Le client autorise l&apos;éditeur à recourir aux prestataires suivants. Il est informé par e-mail de tout ajout ou remplacement et peut s&apos;y opposer en résiliant son abonnement.</p>
      <div className="lg-scroll">
        <table className="lg-table">
          <thead>
            <tr><th>Prestataire</th><th>Rôle</th><th>Localisation</th></tr>
          </thead>
          <tbody>
            {PRESTATAIRES.filter((p) => !p.nom.startsWith("Google")).map((p) => (
              <tr key={p.nom}><td>{p.nom}</td><td>{p.role}</td><td>{p.lieu}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Les transferts éventuels hors de l&apos;Union européenne sont encadrés par le cadre de protection des données UE–États-Unis (Data Privacy Framework) lorsque le prestataire y adhère, ou par les clauses contractuelles types de la Commission européenne.
      </p>
    </>
  );
}
