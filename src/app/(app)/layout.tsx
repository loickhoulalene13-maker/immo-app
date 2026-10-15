import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { deconnexion } from "@/app/login/actions";
import { Nav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agence = await getAgence();

  if (!agence) {
    return (
      <div className="login">
        <div className="card">
          <h2>Compte non rattaché</h2>
          <p className="muted">
            Le compte {user.email} n&apos;appartient à aucune agence. Ajoutez-le dans la table <code>membres</code> depuis Supabase, puis rechargez la page.
          </p>
          <form action={deconnexion}><button className="btn">Se déconnecter</button></form>
        </div>
      </div>
    );
  }

  const [{ count: alertesCrit }, { count: stagnants }, { count: oublies }, { data: txRetard }, { count: bloquees }] = await Promise.all([
    supabase.from("alertes").select("id", { count: "exact", head: true }).eq("agence_id", agence.id).is("resolue_le", null).eq("niveau", "crit"),
    supabase.from("v_biens_stagnants").select("bien_id", { count: "exact", head: true }).eq("agence_id", agence.id),
    supabase.from("v_prospects_oublies").select("contact_id", { count: "exact", head: true }).eq("agence_id", agence.id),
    supabase.from("v_transactions_suivi").select("etapes_en_retard").eq("agence_id", agence.id).eq("statut", "en_cours"),
    supabase.from("alertes").select("id", { count: "exact", head: true }).eq("agence_id", agence.id).is("resolue_le", null).eq("module", "qualite"),
  ]);
  const retards = (txRetard ?? []).reduce((s, t) => s + Number(t.etapes_en_retard ?? 0), 0);

  return (
    <div className="app">
      <nav className="side" aria-label="Navigation principale">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
          </div>
          <div><b>IMMO Suite</b><small>{agence.nom}</small></div>
        </div>
        <Nav counts={{ dash: alertesCrit ?? 0, opps: oublies ?? 0, pilot: stagnants ?? 0, securite: retards, qualite: bloquees ?? 0 }} />
        <div className="side-foot">
          <span>{agence.nomAffiche ?? agence.email}</span>
          <form action={deconnexion}><button className="linkbtn" type="submit">Se déconnecter</button></form>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
