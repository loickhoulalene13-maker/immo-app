// Envoi d'e-mails par Resend, côté serveur uniquement.
// RESEND_API_KEY : clé Resend. RESEND_FROM : expéditeur, ex. "Agence Sainte-Victoire <contact@mondomaine.fr>"
// (l'adresse doit appartenir à un domaine vérifié dans Resend).

export const emailDisponible = () => Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim());

// Les brouillons commencent par « Objet : … » : on en tire le sujet et on retire la ligne du corps.
export function separerObjet(texte: string, defaut: string) {
  const lignes = texte.replace(/\r\n/g, "\n").split("\n");
  const i = lignes.findIndex((l) => l.trim() !== "");
  const m = i >= 0 ? lignes[i].match(/^\s*objet\s*:\s*(.+)$/i) : null;
  if (!m) return { objet: defaut, corps: texte.trim() };
  return { objet: m[1].trim(), corps: lignes.slice(i + 1).join("\n").trim() };
}

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Version HTML sobre : paragraphes, puces et sauts de ligne conservés
export function texteVersHtml(corps: string) {
  const puce = /^\s*(?:[•\-]|\d+\.)\s+/;
  // Dans chaque paragraphe, les lignes à puces consécutives deviennent une liste
  const blocs = corps.split(/\n{2,}/).map((b) => {
    const morceaux: { liste: boolean; lignes: string[] }[] = [];
    for (const l of b.split("\n")) {
      const estPuce = puce.test(l);
      const dernier = morceaux[morceaux.length - 1];
      if (dernier && dernier.liste === estPuce) dernier.lignes.push(l);
      else morceaux.push({ liste: estPuce, lignes: [l] });
    }
    return morceaux
      .map((m) =>
        m.liste
          ? `<ul style="margin:0 0 14px;padding-left:20px">${m.lignes.map((l) => `<li>${echapper(l.replace(puce, ""))}</li>`).join("")}</ul>`
          : `<p style="margin:0 0 ${morceaux.length > 1 ? 4 : 14}px">${m.lignes.map(echapper).join("<br>")}</p>`
      )
      .join("");
  });
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a2628;max-width:620px">${blocs.join("")}</div>`;
}

export type ResultatEnvoi = { ok: true; id: string } | { ok: false; erreur: string };

export async function envoyerEmail(opts: { a: string; objet: string; corps: string; repondreA?: string | null }): Promise<ResultatEnvoi> {
  const cle = process.env.RESEND_API_KEY?.trim();
  const de = process.env.RESEND_FROM?.trim();
  if (!cle || !de) return { ok: false, erreur: "Envoi d'e-mails non configuré (RESEND_API_KEY et RESEND_FROM)." };
  const base = (process.env.RESEND_BASE_URL?.trim() || "https://api.resend.com").replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cle}` },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        from: de,
        to: [opts.a],
        subject: opts.objet,
        text: opts.corps,
        html: texteVersHtml(opts.corps),
        ...(opts.repondreA ? { reply_to: opts.repondreA } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg: string = json?.message ?? `Erreur ${res.status}`;
      console.error("[email]", res.status, msg);
      if (res.status === 401 || res.status === 403) {
        if (/domain|verify|testing emails/i.test(msg)) return { ok: false, erreur: `Resend refuse l'expéditeur ou le destinataire : ${msg} Vérifiez votre domaine dans Resend.` };
        return { ok: false, erreur: "Clé Resend refusée. Vérifiez RESEND_API_KEY." };
      }
      if (res.status === 422) return { ok: false, erreur: `Adresse ou contenu refusé par Resend : ${msg}` };
      if (res.status === 429) return { ok: false, erreur: "Trop d'envois en peu de temps. Réessayez dans une minute." };
      return { ok: false, erreur: `Resend a répondu ${res.status} : ${msg}` };
    }
    return { ok: true, id: String(json?.id ?? "") };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email]", msg);
    return { ok: false, erreur: /timeout|abort/i.test(msg) ? "Resend n'a pas répondu à temps. Réessayez." : `Envoi impossible : ${msg}` };
  }
}
