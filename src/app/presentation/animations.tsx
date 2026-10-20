"use client";

import { useEffect } from "react";

// Animations de la page de présentation :
// - les éléments [data-reveal] apparaissent en douceur quand ils entrent à l'écran ;
// - l'en-tête prend une ombre dès qu'on a défilé.
// Sans JavaScript (ou avec « réduire les animations »), tout reste simplement visible.
export function Animations() {
  useEffect(() => {
    const racine = document.querySelector(".lp");
    if (!racine) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const haut = document.querySelector(".lp-top");
    const surDefilement = () => haut?.classList.toggle("defile", window.scrollY > 8);
    surDefilement();
    window.addEventListener("scroll", surDefilement, { passive: true });

    if (reduit || !("IntersectionObserver" in window)) return () => window.removeEventListener("scroll", surDefilement);

    racine.classList.add("lp-anime");
    const elements = Array.from(racine.querySelectorAll<HTMLElement>("[data-reveal]"));
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) {
            e.target.classList.add("vu");
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    elements.forEach((el) => obs.observe(el));

    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", surDefilement);
    };
  }, []);

  return null;
}
