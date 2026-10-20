// Symbole IMMO Suite (piste A « maison-signal ») : maison blanche sur fond vert pétrole, point orange
export function LogoSymbole({ taille = 36 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 64 64" aria-hidden="true" style={{ flex: "none", display: "block" }}>
      <rect width="64" height="64" rx="16" fill="#1D5A55" />
      <path d="M13 33 L32 17 L51 33" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 30 V47.5 H44.5 V30" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="45" cy="15.5" r="6" fill="#F2A03D" />
    </svg>
  );
}

// Nom de marque : IMMO en gras, Suite en normal
export function LogoNom() {
  return (
    <b className="brand-nom">
      <span>IMMO</span> Suite
    </b>
  );
}
