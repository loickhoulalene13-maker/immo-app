import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import { cookies } from "next/headers";

// Client Supabase côté serveur (composants serveur, actions).
// Utilise la clé anon + la session de l'utilisateur : la RLS s'applique.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un composant serveur : le middleware rafraîchit déjà la session.
          }
        },
      },
    }
  );
}
