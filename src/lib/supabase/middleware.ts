import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Paths that don't require authentication
  const isAuthPage = pathname === "/login";
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/auth") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/.test(pathname);

  const isPublic = isAuthPage || isPublicAsset;

  // Unauthenticated users can only access public pages
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If not authenticated and on public page, just pass through
  if (!user) {
    return supabaseResponse;
  }

  // ── Fetch platform role once for all authenticated checks ──
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("user_id", user.id)
    .single();

  const isAdmin = profile?.is_platform_admin === true;

  // Authenticated users on login page get redirected to their area
  if (isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = isAdmin ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Root path redirect
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = isAdmin ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── Platform Admin routes: /admin/* ──
  if (pathname.startsWith("/admin")) {
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // ── Platform Admin must NOT access customer routes ──
  // If a platform admin hits any non-admin route, redirect to /admin
  if (isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // ── Customer routes from here on ──

  // Allow /suspended page to be accessible for suspended users
  if (pathname === "/suspended") {
    return supabaseResponse;
  }

  // Check workspace status for suspended accounts
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("status")
      .eq("id", membership.workspace_id)
      .single();

    if (workspace && workspace.status === "suspended") {
      const url = request.nextUrl.clone();
      url.pathname = "/suspended";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
