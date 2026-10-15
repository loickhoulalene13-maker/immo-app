// Lit l'URL et la clé publique Supabase.
// Accepte l'ancien nom (ANON_KEY) et les nouveaux noms proposés par le bouton « Connect » (PUBLISHABLE).
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();

  if (!url || !key) {
    throw new Error(
      "Variables Supabase introuvables. Créez .env.local à la racine du projet avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY, puis relancez npm run dev."
    );
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) && !url.startsWith("http://localhost") && !url.startsWith("http://127.0.0.1")) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL a un format inattendu (« ${url} »). Attendu : https://<identifiant>.supabase.co, sans rien après.`
    );
  }
  return { url: url.replace(/\/$/, ""), key };
}
