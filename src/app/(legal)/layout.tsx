import Link from "next/link";
import { LogoNom, LogoSymbole } from "../logo";
import { EDITEUR, MISE_A_JOUR } from "@/lib/legal";
import "./legal.css";

// Cadre commun des pages légales (mentions légales, CGV, confidentialité)
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg">
      <header className="lg-top">
        <div className="lg-wrap lg-top-in">
          <Link href="/presentation" className="brand" aria-label="IMMO Suite, accueil">
            <LogoSymbole taille={30} />
            <LogoNom />
          </Link>
          <nav className="lg-nav" aria-label="Documents légaux">
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/cgv">CGV</Link>
            <Link href="/confidentialite">Confidentialité</Link>
          </nav>
        </div>
      </header>
      <main className="lg-wrap lg-doc">
        {children}
        <p className="lg-maj">Dernière mise à jour : {MISE_A_JOUR}. Une question ? <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a></p>
      </main>
    </div>
  );
}
