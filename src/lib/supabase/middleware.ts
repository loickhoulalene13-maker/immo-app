import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import { NextResponse, type NextRequest } from "next/server";

// Rafraîchit la session à chaque requête. Visiteur non connecté : / → /presentation, autres pages → /login.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url: supabaseUrl, key: supabaseKey } = supabaseEnv();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pages accessibles sans être connecté
  const chemin = request.nextUrl.pathname;
  const publique = ["/login", "/mot-de-passe-oublie", "/inscription", "/presentation"].includes(chemin) || chemin.startsWith("/auth/");
  const pourVisiteurs = chemin === "/login" || chemin === "/inscription" || chemin === "/mot-de-passe-oublie";

  if (!user && !publique) {
    const url = request.nextUrl.clone();
    // Un visiteur qui arrive sur l'accueil découvre la présentation ; ailleurs, la connexion
    url.pathname = chemin === "/" ? "/presentation" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && pourVisiteurs) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
