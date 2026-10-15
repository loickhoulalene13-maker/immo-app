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

  const isLogin = request.nextUrl.pathname.startsWith("/login");
  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}
