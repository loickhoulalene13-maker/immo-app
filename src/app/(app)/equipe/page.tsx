import { redirect } from "next/navigation";
import { getAgence } from "@/lib/agence";
import { createClient } from "@/lib/supabase/server";
import { dateCourte, ilYa } from "@/lib/format";
import { urlDuSite } from "@/lib/site";
import { CopyButton } from "../copy-button";
import { annulerInvitation, changerMonNom, changerRole, inviterMembre, retirerMembre } from "./actions";

type Membre = { user_id: string; email: string; role: "admin" | "agent"; nom_affiche: string | null; membre_depuis: string; derniere_connexion: string | null };
type Invitation = { id: string; email: string; role: string; nom_affiche: string | null; created_at: string; expire_le: string };

export default async function Equipe({ searchParams }: { searchParams: Promise<{ erreur?: string; ok?: string; invite?: string; envoi?: string }> }) {
  const { erreur, ok, invite, envoi } = await searchParams;
  const agence = await getAgence();
  if (!agence) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const estAdmin = agence.role === "admin";
  const site = await urlDuSite();

  const [{ data: membres }, { data: invitations }] = await Promise.all([
    supabase.rpc("membres_agence", { p_agence: agence.id }),
    estAdmin
      ? supabase.from("invitations").select("id, email, role, nom_affiche, created_at, expire_le").eq("agence_id", agence.id).is("acceptee_le", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const ms = (membres ?? []) as Membre[];
  const invs = (invitations ?? []) as Invitation[];
  const nbAdmins = ms.filter((m) => m.role === "admin").length;
  const lien = (email: string) => `${site}/inscription?email=${encodeURIComponent(email)}`;
  const message = (email: string) =>
    `Bonjour,\n\nJe vous invite à rejoindre ${agence.nom} sur IMMO Suite.\n\nCréez votre compte avec cette adresse (${email}) ici :\n${lien(email)}\n\nVous recevrez un e-mail de confirmation ; une fois l'adresse confirmée, vous aurez accès à l'agence.\n\n${agence.nomAffiche ?? ""}`;

  return (
    <>
      <header className="vh">
        <div className="t">
          <p className="eyebrow">{agence.nom}</p>
          <h1>Équipe</h1>
          <p className="sub">Les membres de l&apos;agence partagent les mêmes biens, prospects et transactions. Les administrateurs invitent et gèrent les membres.</p>
        </div>
      </header>

      {erreur && <p className="notice crit">{erreur}</p>}
      {ok === "nom" && <p className="notice ok">Nom mis à jour.</p>}
      {ok === "role" && <p className="notice ok">Rôle modifié.</p>}
      {ok === "retire" && <p className="notice ok">Membre retiré de l&apos;agence.</p>}
      {ok === "annulee" && <p className="notice ok">Invitation annulée.</p>}

      {invite && (
        <section className="card" style={{ borderColor: "var(--accent)" }}>
          <div className="card-h"><h2>Invitation créée pour {invite}</h2></div>
          {envoi === "ok" && <p className="notice ok">L&apos;invitation a été envoyée par e-mail à {invite}. Pensez à lui dire de regarder aussi dans ses spams.</p>}
          {envoi && envoi !== "ok" && <p className="notice crit">L&apos;e-mail n&apos;a pas pu partir : {envoi} Vous pouvez copier le message ci-dessous et l&apos;envoyer vous-même.</p>}
          <p className="muted" style={{ fontSize: 13.5 }}>{envoi === "ok" ? "Vous pouvez aussi lui transmettre ce message par SMS." : "Envoyez-lui ce message par e-mail ou SMS."} Dès qu&apos;il aura créé son compte avec cette adresse et l&apos;aura confirmée, il aura accès à l&apos;agence.</p>
          <textarea id="message-invitation" rows={9} readOnly defaultValue={message(invite)} aria-label="Message d'invitation" />
          <div><CopyButton target="message-invitation" label="Copier le message" /></div>
        </section>
      )}

      <div className="grid-60" style={{ alignItems: "start" }}>
        <section className="card">
          <div className="card-h"><h2>Membres</h2><span className="muted">{ms.length}</span></div>
          <div className="list">
            {ms.map((m) => {
              const moi = m.user_id === user?.id;
              const dernierAdmin = m.role === "admin" && nbAdmins === 1;
              return (
                <div className="row" key={m.user_id} style={{ gridTemplateColumns: "4px minmax(0,1fr) auto" }}>
                  <span className={`stripe ${m.role === "admin" ? "s-info" : "s-ok"}`} />
                  <div className="main">
                    <b>{m.nom_affiche ?? m.email}{moi ? " (vous)" : ""}</b>
                    <small style={{ overflowWrap: "anywhere" }}>{m.email} · membre depuis le {dateCourte(m.membre_depuis)} · dernière connexion {ilYa(m.derniere_connexion)}</small>
                  </div>
                  {estAdmin ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <form action={changerRole} style={{ display: "flex", gap: 6 }}>
                        <input type="hidden" name="user_id" value={m.user_id} />
                        <select name="role" defaultValue={m.role} aria-label={`Rôle de ${m.email}`} style={{ width: "auto", padding: "4px 6px", fontSize: 12.5 }} disabled={dernierAdmin}>
                          <option value="agent">Agent</option>
                          <option value="admin">Administrateur</option>
                        </select>
                        {!dernierAdmin && <button className="btn small" type="submit">OK</button>}
                      </form>
                      {!dernierAdmin && (
                        <form action={retirerMembre}>
                          <input type="hidden" name="user_id" value={m.user_id} />
                          <button className="btn small" type="submit">{moi ? "Quitter" : "Retirer"}</button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <span className={`pill ${m.role === "admin" ? "p-accent" : "p-neutral"}`}>{m.role === "admin" ? "Administrateur" : "Agent"}</span>
                  )}
                </div>
              );
            })}
          </div>
          {estAdmin && nbAdmins === 1 && <p className="muted" style={{ fontSize: 12.5 }}>L&apos;agence doit garder au moins un administrateur : nommez-en un second avant de changer votre rôle.</p>}
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {estAdmin && (
            <section className="card">
              <div className="card-h"><h2>Inviter un membre</h2></div>
              <form className="form" action={inviterMembre}>
                <div className="field full"><label htmlFor="inv-email">E-mail</label><input id="inv-email" name="email" type="email" required /></div>
                <div className="field"><label htmlFor="inv-nom">Nom affiché</label><input id="inv-nom" name="nom" type="text" placeholder="Prénom Nom" /></div>
                <div className="field">
                  <label htmlFor="inv-role">Rôle</label>
                  <select id="inv-role" name="role" defaultValue="agent"><option value="agent">Agent</option><option value="admin">Administrateur</option></select>
                </div>
                <div className="full"><button className="btn primary" type="submit">Créer l&apos;invitation</button></div>
              </form>
              {invs.length > 0 && (
                <div>
                  <span className="eyebrow">En attente · {invs.length}</span>
                  <div className="list" style={{ marginTop: 6 }}>
                    {invs.map((i) => (
                      <div className="row" key={i.id} style={{ gridTemplateColumns: "4px minmax(0,1fr) auto" }}>
                        <span className={`stripe ${new Date(i.expire_le) < new Date() ? "s-crit" : "s-warn"}`} />
                        <div className="main">
                          <b style={{ overflowWrap: "anywhere" }}>{i.nom_affiche ?? i.email}</b>
                          <small>{i.role === "admin" ? "Administrateur" : "Agent"} · {new Date(i.expire_le) < new Date() ? "expirée" : `expire le ${dateCourte(i.expire_le)}`}</small>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <a className="btn small" href={`/equipe?invite=${encodeURIComponent(i.email)}`}>Message</a>
                          <form action={annulerInvitation}>
                            <input type="hidden" name="id" value={i.id} />
                            <button className="btn small" type="submit">Annuler</button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="card">
            <div className="card-h"><h2>Mon compte</h2></div>
            <form action={changerMonNom} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div className="field" style={{ flex: 1 }}><label htmlFor="mon-nom">Nom affiché (signature des messages)</label><input id="mon-nom" name="nom" type="text" defaultValue={agence.nomAffiche ?? ""} /></div>
              <button className="btn" type="submit">Enregistrer</button>
            </form>
            <a className="linkbtn" href="/mot-de-passe" style={{ fontSize: 13.5 }}>Changer mon mot de passe</a>
          </section>
        </div>
      </div>
    </>
  );
}
