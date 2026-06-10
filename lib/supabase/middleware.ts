import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SET_PASSWORD_PATH } from "@/lib/auth/password-setup";

async function getProfileActivation(
  supabase: ReturnType<typeof createServerClient>,
) {
  const { data, error } = await supabase.rpc("get_current_profile");
  if (error || !data || typeof data !== "object") {
    return null;
  }

  const profile = data as {
    status: string;
    activated_at: string | null;
  };

  return {
    status: profile.status,
    completed: profile.activated_at !== null,
  };
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isLogin = pathname === "/login";
  const isSetPassword = pathname === SET_PASSWORD_PATH;

  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (!user && isSetPassword) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "invitation_pending");
    return NextResponse.redirect(url);
  }

  if (user && (isLogin || isSetPassword)) {
    const profile = await getProfileActivation(supabase);

    if (isLogin && profile && !profile.completed) {
      const url = request.nextUrl.clone();
      url.pathname = SET_PASSWORD_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isSetPassword && profile?.completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
