import { NextResponse } from "next/server";
import { lireAbonnementStripe, synchroniserAbonnement, verifierSignature } from "@/lib/stripe";

// Stripe appelle cette adresse à chaque changement d'abonnement :
// https://<votre-site>/api/stripe/webhook
// Événements à cocher dans Stripe : checkout.session.completed,
// customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ erreur: "Webhook non configuré" }, { status: 500 });

  const corps = await req.text();
  if (!verifierSignature(corps, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ erreur: "Signature invalide" }, { status: 400 });
  }

  const evenement = JSON.parse(corps) as { type: string; data: { object: Record<string, unknown> } };
  const objet = evenement.data.object;

  try {
    switch (evenement.type) {
      case "checkout.session.completed": {
        const id = objet.subscription as string | null;
        if (id) await synchroniserAbonnement(await lireAbonnementStripe(id), objet.client_reference_id as string | null);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // On relit l'abonnement pour avoir son état le plus récent
        await synchroniserAbonnement(await lireAbonnementStripe(objet.id as string));
        break;
      }
    }
  } catch (e) {
    console.error("[webhook stripe]", evenement.type, e instanceof Error ? e.message : e);
    // 500 : Stripe réessaiera automatiquement plus tard
    return NextResponse.json({ erreur: "Traitement impossible" }, { status: 500 });
  }
  return NextResponse.json({ recu: true });
}
