"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON: Record<string, React.ReactNode> = {
  dash: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  opps: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.4 3.5 5.2" /></>,
  pilot: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  qualite: <><path d="M9 12l2 2 4-4" /><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /></>,
  securite: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>,
  assistant: <><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>,
};

const ITEMS = [
  { k: "dash", href: "/", label: "Tableau de bord", sub: "" },
  { k: "opps", href: "/prospects", label: "Prospects", sub: "IMMO Opportunités" },
  { k: "pilot", href: "/biens", label: "Biens", sub: "IMMO Pilot" },
  { k: "qualite", href: "/annonces", label: "Annonces", sub: "IMMO Qualité" },
  { k: "securite", href: "/transactions", label: "Transactions", sub: "IMMO Sécurité" },
  { k: "assistant", href: "/assistant", label: "Assistant IA", sub: "" },
];

export function Nav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  return (
    <div className="nav">
      {ITEMS.map((it) => {
        const icon = (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[it.k]}</svg>
        );
        const lbl = <span className="lbl"><span>{it.label}</span>{it.sub && <small>{it.sub}</small>}</span>;
        if (!it.href) {
          return <span key={it.k} className="off" title="Module à venir">{icon}{lbl}<span className="soon">bientôt</span></span>;
        }
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        const c = counts[it.k] ?? 0;
        return (
          <Link key={it.k} href={it.href} aria-current={active ? "page" : undefined}>
            {icon}{lbl}{c > 0 ? <span className="pill p-crit" style={{ padding: "0 7px" }}>{c}</span> : <span />}
          </Link>
        );
      })}
    </div>
  );
}
