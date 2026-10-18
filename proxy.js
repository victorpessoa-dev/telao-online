import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_PATHS = [
  "/admin",
  "/configuracoes",
  "/editor",
  "/overlay",
  "/painel-igreja",
  "/painel-telao",
];
const SETUP_PATH = "/configurar-igreja";
const PUBLIC_PATHS = [
  "/",
  "/anunciantes",
  "/login",
  "/shared",
  "/ads-telao",
  "/esqueci-senha",
  "/redefinir-senha",
  "/confirmar-convite",
];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isProtectedPath(pathname) {
  if (isPublicPath(pathname)) return false;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api")
  )
    return false;
  return (
    pathname === SETUP_PATH ||
    ADMIN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  );
}

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;

  const desktopToken = process.env.V_PLAYCAST_DESKTOP_TOKEN;
  const isTrustedDesktopRequest = Boolean(
    desktopToken &&
      request.nextUrl.hostname === "127.0.0.1" &&
      request.headers.get("x-v-playcast-desktop") === desktopToken,
  );

  if (isTrustedDesktopRequest) return NextResponse.next();

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "missing_supabase_env");
    url.searchParams.set("redirectTo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Newly invited administrators authenticate before creating their first
  // church, so this setup route intentionally bypasses the ownership check.
  if (pathname === SETUP_PATH) return response;

  const { data: church, error: churchError } = await supabase
    .from("churches")
    .select("id")
    .eq("admin_id", data.user.id)
    .limit(1)
    .maybeSingle();

  if (churchError || !church) {
    const url = request.nextUrl.clone();
    // An authenticated account without a church is a new administrator who
    // still needs to complete the initial church setup. Do not send it back
    // to login as if its credentials lacked administrative permission.
    url.pathname = SETUP_PATH;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
