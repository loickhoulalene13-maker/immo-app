"use client";

import { useState } from "react";

// Copie le contenu d'un champ texte (repéré par son id) dans le presse-papiers
export function CopyButton({ target, label = "Copier le texte" }: { target: string; label?: string }) {
  const [etat, setEtat] = useState<"" | "ok" | "select">("");

  async function copier() {
    const el = document.getElementById(target) as HTMLTextAreaElement | null;
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.value);
      setEtat("ok");
    } catch {
      el.focus();
      el.select();
      setEtat("select");
    }
    setTimeout(() => setEtat(""), 2500);
  }

  return (
    <button type="button" className="btn" onClick={copier}>
      {etat === "ok" ? "Copié" : etat === "select" ? "Sélectionné : Ctrl+C" : label}
    </button>
  );
}
