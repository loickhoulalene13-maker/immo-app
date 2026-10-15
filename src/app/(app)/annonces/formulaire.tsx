type Bien = {
  id?: string; type?: string; titre?: string; description?: string; adresse?: string | null; code_postal?: string | null; ville?: string;
  surface?: number; pieces?: number; chambres?: number; etage?: number | null; ascenseur?: boolean; prix?: number;
  dpe?: string | null; ges?: string | null; charges_annuelles?: number | null; taxe_fonciere?: number | null;
  mandat_signe_le?: string | null; vendeur_id?: string | null;
};

const CLASSES = ["A", "B", "C", "D", "E", "F", "G"];

// Formulaire de fiche bien, partagé entre création et modification
export function FormulaireBien({
  bien,
  vendeurs,
  villes,
  action,
  libelle,
}: {
  bien: Bien | null;
  vendeurs: { id: string; nom: string }[];
  villes: string[];
  action: (f: FormData) => Promise<void>;
  libelle: string;
}) {
  const b = bien ?? {};
  const desc = b.description ?? "";
  return (
    <form className="form" action={action}>
      {b.id && <input type="hidden" name="bien_id" value={b.id} />}

      <p className="full eyebrow">Le bien</p>
      <div className="field">
        <label htmlFor="type">Type</label>
        <select id="type" name="type" defaultValue={b.type ?? "appartement"}>
          <option value="appartement">Appartement</option>
          <option value="maison">Maison</option>
          <option value="terrain">Terrain</option>
          <option value="local">Local</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="prix">Prix de vente (€)</label>
        <input id="prix" name="prix" type="number" min={1000} step={1000} required defaultValue={b.prix ?? ""} />
      </div>
      <div className="field full">
        <label htmlFor="titre">Titre de l&apos;annonce</label>
        <input id="titre" name="titre" type="text" required maxLength={120} defaultValue={b.titre ?? ""} placeholder="T3 avec balcon, quartier Mazarin" />
      </div>
      <div className="field">
        <label htmlFor="surface">Surface Carrez (m²)</label>
        <input id="surface" name="surface" type="number" min={1} step={0.01} required defaultValue={b.surface ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="pieces">Pièces</label>
        <input id="pieces" name="pieces" type="number" min={1} required defaultValue={b.pieces ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="chambres">Chambres</label>
        <input id="chambres" name="chambres" type="number" min={0} defaultValue={b.chambres ?? 0} />
      </div>
      <div className="field">
        <label htmlFor="etage">Étage</label>
        <input id="etage" name="etage" type="number" min={-2} defaultValue={b.etage ?? ""} />
      </div>
      <div className="field full">
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ink)" }}>
          <input type="checkbox" name="ascenseur" defaultChecked={!!b.ascenseur} style={{ accentColor: "var(--accent)" }} /> Immeuble avec ascenseur
        </label>
      </div>

      <p className="full eyebrow">Adresse</p>
      <div className="field full">
        <label htmlFor="adresse">Adresse (non publiée)</label>
        <input id="adresse" name="adresse" type="text" defaultValue={b.adresse ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="code_postal">Code postal</label>
        <input id="code_postal" name="code_postal" type="text" inputMode="numeric" maxLength={5} defaultValue={b.code_postal ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="ville">Ville ou secteur</label>
        <input id="ville" name="ville" type="text" required list="villes" defaultValue={b.ville ?? ""} />
        <datalist id="villes">{villes.map((v) => <option key={v} value={v} />)}</datalist>
      </div>

      <p className="full eyebrow">Diagnostics et charges</p>
      <div className="field">
        <label htmlFor="dpe">Classe énergie (DPE)</label>
        <select id="dpe" name="dpe" defaultValue={b.dpe ?? ""}>
          <option value="">Non renseignée</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="ges">Classe climat (GES)</label>
        <select id="ges" name="ges" defaultValue={b.ges ?? ""}>
          <option value="">Non renseignée</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="charges_annuelles">Charges de copropriété (€ / an)</label>
        <input id="charges_annuelles" name="charges_annuelles" type="number" min={0} defaultValue={b.charges_annuelles ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="taxe_fonciere">Taxe foncière (€ / an)</label>
        <input id="taxe_fonciere" name="taxe_fonciere" type="number" min={0} defaultValue={b.taxe_fonciere ?? ""} />
      </div>

      <p className="full eyebrow">Description</p>
      <div className="field full">
        <label htmlFor="description">Texte de l&apos;annonce ({desc.length} caractères enregistrés, 250 conseillés)</label>
        <textarea id="description" name="description" rows={7} defaultValue={desc} />
      </div>

      <p className="full eyebrow">Mandat</p>
      <div className="field">
        <label htmlFor="vendeur_id">Vendeur</label>
        <select id="vendeur_id" name="vendeur_id" defaultValue={b.vendeur_id ?? (vendeurs.length ? "" : "nouveau")}>
          <option value="">Choisir…</option>
          {vendeurs.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}
          <option value="nouveau">Nouveau vendeur…</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="mandat_signe_le">Mandat signé le</label>
        <input id="mandat_signe_le" name="mandat_signe_le" type="date" defaultValue={b.mandat_signe_le ?? ""} />
      </div>
      <details className="full">
        <summary className="muted" style={{ cursor: "pointer", fontSize: 13 }}>Nouveau vendeur (si « Nouveau vendeur… » est choisi)</summary>
        <div className="form" style={{ marginTop: 10 }}>
          <div className="field full"><label htmlFor="vendeur_nom">Nom</label><input id="vendeur_nom" name="vendeur_nom" type="text" /></div>
          <div className="field"><label htmlFor="vendeur_tel">Téléphone</label><input id="vendeur_tel" name="vendeur_tel" type="text" /></div>
          <div className="field"><label htmlFor="vendeur_email">E-mail</label><input id="vendeur_email" name="vendeur_email" type="email" /></div>
        </div>
      </details>

      <div className="full"><button className="btn primary" type="submit">{libelle}</button></div>
    </form>
  );
}
