import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoNom, LogoSymbole } from "../logo";
import { demanderDemo } from "./actions";
import { Animations } from "./animations";
import "./presentation.css";

export const metadata: Metadata = {
  title: "IMMO Suite · Le copilote des agences immobilières",
  description:
    "Prospects, biens, annonces et transactions au même endroit. IMMO Suite repère les acheteurs oubliés, les biens qui stagnent et les compromis en retard, et vous dit quoi faire chaque matin.",
  openGraph: {
    title: "IMMO Suite · Le copilote des agences immobilières",
    description: "Ne laissez plus filer un acheteur, un mandat ou une vente.",
    images: ["/apple-icon.png"],
  },
};

// ——— Modifiez ici vos tarifs et votre adresse de contact ———
const CONTACT = "contact@allconnect-pro.com";
const ESSAI = "30 jours";
const FORMULES = [
  {
    nom: "Essentiel",
    prix: "59 €",
    pour: "Pour l'agent indépendant",
    points: ["2 utilisateurs", "Biens, prospects, annonces et transactions", "Alertes et tâches du jour", "Assistant IA (100 rédactions / mois)"],
    vedette: false,
  },
  {
    nom: "Agence",
    prix: "119 €",
    pour: "Pour une agence de 3 à 10 personnes",
    points: ["Jusqu'à 10 utilisateurs", "Tout Essentiel, sans limite de rédactions IA", "Envoi des e-mails depuis l'app", "Prise en main d'une heure en visio"],
    vedette: true,
  },
  {
    nom: "Réseau",
    prix: "Sur devis",
    pour: "Plusieurs agences ou un réseau",
    points: ["Utilisateurs illimités", "Plusieurs agences, un seul compte", "Reprise de vos données existantes", "Interlocuteur dédié"],
    vedette: false,
  },
];
// ————————————————————————————————————————————————

const MODULES = [
  {
    tag: "Opportunités",
    titre: "Aucun acheteur oublié",
    texte: "Chaque nouveau bien est rapproché automatiquement des acheteurs qui correspondent. Ceux sans nouvelles depuis 3 semaines remontent en tête de liste, avec une relance déjà rédigée.",
  },
  {
    tag: "Pilot",
    titre: "Des biens qui ne stagnent pas",
    texte: "Visites, retours et objections sont suivis bien par bien. Au-delà de 60 jours ou de 5 visites sans offre, l'app vous alerte et prépare le compte rendu pour le vendeur.",
  },
  {
    tag: "Qualité",
    titre: "Des annonces complètes avant publication",
    texte: "Un score de qualité contrôle photos, surface, DPE, prix et description. Une annonce incomplète ne peut pas partir en ligne par erreur.",
  },
  {
    tag: "Sécurité",
    titre: "Des ventes suivies jusqu'à l'acte",
    texte: "Dès qu'une offre est acceptée, les étapes du compromis à l'acte sont créées avec leurs échéances. Les retards sont signalés avant de devenir des problèmes.",
  },
  {
    tag: "Assistant IA",
    titre: "Les textes rédigés pour vous",
    texte: "Analyse des objections, relances d'acheteurs, comptes rendus vendeurs : l'assistant rédige à partir de vos vraies données. Vous relisez, vous envoyez.",
  },
];

const ETAPES = [
  ["Le bien est saisi", "Le mandat arrive : vous créez la fiche en quelques minutes."],
  ["L'annonce est contrôlée", "Il manque le DPE ? La publication attend qu'il soit ajouté."],
  ["Les acheteurs sont trouvés", "L'app propose les acheteurs compatibles et rédige les messages."],
  ["Les visites sont suivies", "Chaque retour est noté, les objections sont repérées."],
  ["Le bien stagne ? Vous le savez", "Alerte et compte rendu prêt à envoyer au vendeur."],
  ["L'offre est acceptée", "Le suivi de la vente démarre tout seul, étape par étape."],
];

const FAQ = [
  ["Où sont stockées mes données ?", "Dans l'Union européenne (Irlande), sur une base de données sécurisée. Chaque agence ne voit que ses propres données, et vos données ne servent pas à entraîner des modèles d'IA."],
  ["Est-ce que ça remplace mon logiciel de transaction ou ma passerelle ?", "Non, IMMO Suite se concentre sur le suivi : prospects, relances, qualité des annonces et dossiers de vente. Il s'utilise à côté de vos outils de diffusion."],
  ["Combien de temps pour démarrer ?", "Une agence est opérationnelle en une heure. Nous vous accompagnons pour la prise en main et pour reprendre vos biens et contacts existants."],
  ["Y a-t-il un engagement ?", `Non. L'essai de ${ESSAI} est gratuit, puis l'abonnement est mensuel et résiliable à tout moment.`],
  ["Faut-il savoir utiliser l'IA ?", "Non. Les textes sont proposés au bon moment, dans la fiche concernée. Vous pouvez les modifier avant de les envoyer."],
];

export default async function Presentation({ searchParams }: { searchParams: Promise<{ demo?: string; erreur?: string }> }) {
  const { demo, erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="lp">
      <Animations />
      <header className="lp-top">
        <div className="lp-wrap lp-top-in">
          <Link href="/presentation" className="brand" aria-label="IMMO Suite, accueil">
            <LogoSymbole taille={34} />
            <LogoNom />
          </Link>
          <nav className="lp-nav" aria-label="Sections">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#faq">Questions</a>
          </nav>
          <div className="lp-top-cta">
            {user ? (
              <Link className="btn primary" href="/">Ouvrir l&apos;app</Link>
            ) : (
              <>
                <Link className="lp-link" href="/login">Se connecter</Link>
                <a className="btn primary" href="#demo">Demander une démo</a>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Accroche */}
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-in">
            <div className="lp-hero-txt" data-reveal>
              <p className="lp-eyebrow">Logiciel de suivi pour agences immobilières</p>
              <h1>Ne laissez plus filer un acheteur, un mandat ou une vente.</h1>
              <p className="lp-lead">
                IMMO Suite surveille vos biens, vos prospects, vos annonces et vos compromis. Chaque matin, il vous dit quoi faire en priorité, et rédige les messages à votre place.
              </p>
              <div className="lp-ctas">
                <a className="btn primary lp-big" href="#demo">Demander une démo</a>
                <a className="btn lp-big" href="#fonctionnalites">Voir les fonctionnalités</a>
              </div>
              <ul className="lp-trust">
                <li>Essai gratuit {ESSAI}</li>
                <li>Sans engagement</li>
                <li>Données hébergées en Europe</li>
              </ul>
            </div>

            {/* Aperçu stylisé du tableau de bord */}
            <div className="lp-mock" aria-hidden="true" data-reveal style={{ "--d": "180ms" } as React.CSSProperties}>
              <div className="lp-mock-h">
                <span className="lp-mock-t">Ce matin</span>
                <span className="lp-mock-d">4 actions</span>
              </div>
              <ul className="lp-mock-l">
                <li><i className="crit" /><div><b>Compromis rue Thiers</b><small>Prêt de l&apos;acquéreur : échéance dépassée de 2 jours</small></div></li>
                <li><i className="warn" /><div><b>T3 Cours Mirabeau</b><small>64 jours en ligne, 6 visites, aucune offre</small></div></li>
                <li><i className="warn" /><div><b>M. et Mme Bernard</b><small>Acheteurs sans nouvelles depuis 23 jours · relance prête</small></div></li>
                <li><i className="ok" /><div><b>Maison Le Tholonet</b><small>3 acheteurs compatibles trouvés</small></div></li>
              </ul>
              <div className="lp-mock-f">
                <span>Annonce Villa Puyricard</span>
                <span className="lp-score">Score 62<small>/100 · DPE manquant</small></span>
              </div>
            </div>
          </div>
        </section>

        {/* Le problème */}
        <section className="lp-sec lp-pain">
          <div className="lp-wrap">
            <h2 data-reveal>Ce qui fait perdre des ventes, ce n&apos;est pas le manque de biens.</h2>
            <div className="lp-pain-g lp-cascade" data-reveal>
              <p><b>L&apos;acheteur qu&apos;on oublie de rappeler</b> et qui signe ailleurs.</p>
              <p><b>Le bien qui stagne</b> sans qu&apos;on prévienne le vendeur à temps.</p>
              <p><b>L&apos;annonce publiée sans DPE</b> ou avec trois photos floues.</p>
              <p><b>Le compromis</b> dont une échéance passe sans que personne ne s&apos;en aperçoive.</p>
            </div>
            <p className="lp-pain-c" data-reveal>IMMO Suite repère tout ça pour vous, automatiquement.</p>
          </div>
        </section>

        {/* Modules */}
        <section className="lp-sec" id="fonctionnalites">
          <div className="lp-wrap">
            <p className="lp-eyebrow" data-reveal>Fonctionnalités</p>
            <h2 data-reveal>Cinq modules, un seul outil.</h2>
            <div className="lp-mods lp-cascade" data-reveal>
              {MODULES.map((m) => (
                <article key={m.tag} className="lp-mod">
                  <span className="lp-tag">IMMO {m.tag}</span>
                  <h3>{m.titre}</h3>
                  <p>{m.texte}</p>
                </article>
              ))}
              <article className="lp-mod lp-mod-dash">
                <span className="lp-tag">Tableau de bord</span>
                <h3>Vos priorités du jour</h3>
                <p>Alertes, tâches et chiffres clés de l&apos;agence sur un seul écran, partagé avec toute l&apos;équipe.</p>
              </article>
            </div>
          </div>
        </section>

        {/* Parcours */}
        <section className="lp-sec lp-flow">
          <div className="lp-wrap">
            <p className="lp-eyebrow" data-reveal>Concrètement</p>
            <h2 data-reveal>Un bien, du mandat à la vente.</h2>
            <ol className="lp-steps lp-cascade" data-reveal>
              {ETAPES.map(([t, d], i) => (
                <li key={t}>
                  <span className="lp-n">{i + 1}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Tarifs */}
        <section className="lp-sec" id="tarifs">
          <div className="lp-wrap">
            <p className="lp-eyebrow" data-reveal>Tarifs</p>
            <h2 data-reveal>Simple, mensuel, sans engagement.</h2>
            <p className="lp-sub">Prix hors taxes par agence et par mois. Essai gratuit de {ESSAI}, sans carte bancaire.</p>
            <div className="lp-prices lp-cascade" data-reveal>
              {FORMULES.map((p) => (
                <article key={p.nom} className={`lp-price${p.vedette ? " vedette" : ""}`}>
                  {p.vedette && <span className="lp-badge">Le plus choisi</span>}
                  <h3>{p.nom}</h3>
                  <p className="lp-pour">{p.pour}</p>
                  <p className="lp-amount">
                    {p.prix}
                    {p.prix.includes("€") && <small> HT / mois</small>}
                  </p>
                  <ul>
                    {p.points.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  <a className={`btn${p.vedette ? " primary" : ""}`} href="#demo">
                    {p.prix.includes("€") ? "Essayer gratuitement" : "Nous contacter"}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="lp-sec" id="faq">
          <div className="lp-wrap lp-faq-w">
            <div>
              <p className="lp-eyebrow">Questions fréquentes</p>
              <h2>Ce qu&apos;on nous demande souvent.</h2>
            </div>
            <div className="lp-faq" data-reveal>
              {FAQ.map(([q, r]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Démo */}
        <section className="lp-sec lp-demo" id="demo">
          <div className="lp-wrap lp-demo-in">
            <div className="lp-demo-txt" data-reveal>
              <h2>Voyez IMMO Suite avec vos propres biens.</h2>
              <p>
                Une démo de 20 minutes en visio, sur vos cas réels. Ensuite, si ça vous convient, votre agence est prête dans la journée.
              </p>
              <p className="lp-demo-mail">
                Vous préférez écrire ? <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
              </p>
            </div>

            <div className="card lp-form-card" data-reveal style={{ "--d": "150ms" } as React.CSSProperties}>
              {demo === "ok" ? (
                <div className="lp-merci">
                  <h3>Merci, c&apos;est noté !</h3>
                  <p>Nous vous recontactons sous 24 h ouvrées pour fixer un créneau.</p>
                </div>
              ) : (
                <form action={demanderDemo} className="lp-form">
                  {erreur && <p className="notice crit">{erreur}</p>}
                  <div className="field">
                    <label htmlFor="d-nom">Nom et prénom</label>
                    <input id="d-nom" name="nom" required minLength={2} maxLength={120} autoComplete="name" />
                  </div>
                  <div className="field">
                    <label htmlFor="d-agence">Agence</label>
                    <input id="d-agence" name="agence" maxLength={160} autoComplete="organization" />
                  </div>
                  <div className="lp-2">
                    <div className="field">
                      <label htmlFor="d-email">E-mail</label>
                      <input id="d-email" name="email" type="email" required maxLength={200} autoComplete="email" />
                    </div>
                    <div className="field">
                      <label htmlFor="d-tel">Téléphone</label>
                      <input id="d-tel" name="telephone" type="tel" maxLength={40} autoComplete="tel" />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="d-taille">Taille de l&apos;équipe</label>
                    <select id="d-taille" name="taille" defaultValue="">
                      <option value="">Choisir…</option>
                      <option value="1">Je travaille seul(e)</option>
                      <option value="2-5">2 à 5 personnes</option>
                      <option value="6-15">6 à 15 personnes</option>
                      <option value="16+">Plus de 15 personnes</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="d-msg">Message (facultatif)</label>
                    <textarea id="d-msg" name="message" rows={3} maxLength={2000} />
                  </div>
                  {/* Champ piège pour les robots, invisible pour les visiteurs */}
                  <div className="lp-hp" aria-hidden="true">
                    <label htmlFor="d-site">Site web</label>
                    <input id="d-site" name="site_web" tabIndex={-1} autoComplete="off" />
                  </div>
                  <button className="btn primary lp-big" type="submit">Demander ma démo</button>
                  <p className="lp-rgpd">Vos coordonnées servent uniquement à vous recontacter au sujet d&apos;IMMO Suite.</p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <div className="brand">
            <LogoSymbole taille={28} />
            <div>
              <LogoNom />
              <small>une solution All Connect</small>
            </div>
          </div>
          <p>
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
            <span> · </span>
            <Link href="/login">Espace client</Link>
          </p>
          <p className="lp-copy">© {new Date().getFullYear()} All Connect</p>
        </div>
      </footer>
    </div>
  );
}
