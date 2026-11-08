// Stripe sans dépendance : appels HTTP directs, côté serveur uniquement.
// Variables (Vercel + .env.local, sans préfixe NEXT_PUBLIC_) :
//   STRIPE_SECRET_KEY        clé secrète (sk_test_… puis sk_live_…)
//   STRIPE_WEBHOOK_SECRET    secret de signature du webhook (whsec_…)
//   STRIPE_PRICE_ESSENTIEL   identifiant du prix mensuel Essentiel (price_…)
//   STRIPE_PRICE_AGENCE      identifiant du prix mensuel Agence (price_…)
//   CLE_SYNCHRO_ABONNEMENT   clé affichée par la migration abonnements (Supabase)
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase/env";

export type Formule = "essentiel" | "agence";

export const stripeDisponible = () =>
  Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_ESSENTIEL?.trim() && process.env.STRIPE_PRICE_AGENCE?.trim());

export const prixDe = (f: Formule) => (f === "agence" ? process.env.STRIPE_PRICE_AGENCE : process.env.STRIPE_PRICE_ESSENTIEL)?.trim() ?? "";

export function formuleDuPrix(prix: string | null | undefined): Formule | null {
  if (!prix) return null;
  if (prix === process.env.STRIPE_PRICE_AGENCE?.trim()) return "agence";
  if (prix === process.env.STRIPE_PRICE_ESSENTIEL?.trim()) return "essentiel";
  return null;
}

// Encode un objet imbriqué au format attendu par l'API Stripe (a[b][0][c]=…)
function encoder(obj: Record<string, unknown>, prefixe = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const cle = prefixe ? `${prefixe}[${k}]` : k;
    if (typeof v === "object") encoder(v as Record<string, unknown>, cle, out);
    else out.append(cle, String(v));
  }
  return out;
}

export async function stripe<T = Record<string, unknown>>(methode: "GET" | "POST", chemin: string, params?: Record<string, unknown>): Promise<T> {
  const cle = process.env.STRIPE_SECRET_KEY?.trim();
  if (!cle) throw new Error("Paiement en ligne non configuré (STRIPE_SECRET_KEY).");
  const corps = params ? encoder(params).toString() : "";
  const url = `https://api.stripe.com/v1/${chemin}${methode === "GET" && corps ? `?${corps}` : ""}`;
  const res = await fetch(url, {
    method: methode,
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: methode === "POST" ? corps : undefined,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? `Erreur Stripe ${res.status}`;
    console.error("[stripe]", chemin, res.status, msg);
    throw new Error(msg);
  }
  return json as T;
}

// Vérifie la signature d'un webhook (en-tête Stripe-Signature), tolérance 5 minutes
export function verifierSignature(corps: string, entete: string | null, secret: string) {
  if (!entete) return false;
  const morceaux = Object.fromEntries(entete.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(morceaux.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const attendu = createHmac("sha256", secret).update(`${t}.${corps}`).digest("hex");
  return entete
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .some((p) => {
      const sig = p.slice(3);
      return sig.length === attendu.length && timingSafeEqual(Buffer.from(sig), Buffer.from(attendu));
    });
}

type Abonnement = {
  id: string;
  status: string;
  customer: string;
  cancel_at_period_end: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items: { data: { current_period_end?: number; price: { id: string } }[] };
};

// Recopie l'état d'un abonnement Stripe dans Supabase
export async function synchroniserAbonnement(sub: Abonnement, agenceId?: string | null) {
  const agence = agenceId || sub.metadata?.agence_id;
  if (!agence) {
    console.error("[stripe] abonnement sans agence_id", sub.id);
    return;
  }
  const cle = process.env.CLE_SYNCHRO_ABONNEMENT?.trim();
  if (!cle) throw new Error("CLE_SYNCHRO_ABONNEMENT manquante.");
  const item = sub.items?.data?.[0];
  const fin = sub.current_period_end ?? item?.current_period_end; // selon la version de l'API Stripe
  const { url, key } = supabaseEnv();
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await db.rpc("abonnement_synchro", {
    p_cle: cle,
    p_agence: agence,
    p_customer: sub.customer,
    p_subscription: sub.id,
    p_statut: sub.status,
    p_formule: formuleDuPrix(item?.price?.id),
    p_fin_periode: fin ? new Date(fin * 1000).toISOString() : null,
    p_resiliation: sub.cancel_at_period_end,
  });
  if (error) throw new Error(`Synchronisation de l'abonnement : ${error.message}`);
}

export const lireAbonnementStripe = (id: string) => stripe<Abonnement>("GET", `subscriptions/${id}`);
