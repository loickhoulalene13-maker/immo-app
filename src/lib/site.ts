import { headers } from "next/headers";

// Adresse publique du site (localhost en dev, l'adresse Vercel en ligne).
// NEXT_PUBLIC_SITE_URL permet de la fixer si besoin (domaine personnalisé).
export async function urlDuSite() {
  const fixe = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fixe) return fixe.replace(/\/$/, "");
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") || hote.startsWith("127.") ? "http" : "https");
  return `${proto}://${hote}`;
}

// N'accepte qu'un chemin interne (évite les redirections vers un autre site)
export const cheminSur = (p: string | null | undefined, defaut = "/") =>
  p && p.startsWith("/") && !p.startsWith("//") ? p : defaut;
