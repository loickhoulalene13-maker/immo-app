import Link from "next/link";
import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { FormulaireBien } from "../formulaire";
import { creerBien } from "../actions";

export default async function NouveauBien({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();

  const [{ data: vendeurs }, { data: villes }] = await Promise.all([
    supabase.from("contacts").select("id, nom").eq("agence_id", agence.id).eq("est_vendeur", true).order("nom"),
    supabase.from("marche_reference").select("ville").order("ville"),
  ]);

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow"><Link href="/annonces">Annonces</Link></p>
          <h1>Ajouter un bien</h1>
          <p className="sub">La fiche est enregistrée en brouillon, puis contrôlée. Elle ne sera publiée qu&apos;une fois les points critiques corrigés.</p>
        </div>
      </header>
      {erreur && <p className="notice crit">{erreur}</p>}
      <section className="card">
        <FormulaireBien
          bien={null}
          vendeurs={(vendeurs ?? []) as { id: string; nom: string }[]}
          villes={(villes ?? []).map((v) => v.ville as string)}
          action={creerBien}
          libelle="Enregistrer et contrôler"
        />
      </section>
    </>
  );
}
