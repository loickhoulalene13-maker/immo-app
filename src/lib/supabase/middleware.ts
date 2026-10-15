import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import { NextResponse, type NextRequest } from "next/server";

// Rafraîchit la session à chaque requête et renvoie vers /login si l'utilisateur n'est pas connecté.
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
  const publique = ["/login", "/mot-de-passe-oublie", "/inscription"].includes(chemin) || chemin.startsWith("/auth/");
  const pourVisiteurs = chemin === "/login" || chemin === "/inscription" || chemin === "/mot-de-passe-oublie";

  if (!user && !publique) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
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
