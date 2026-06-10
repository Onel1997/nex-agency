import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { activateProfile } from "@/lib/auth/activate-profile";
import { resolvePostAuthRedirect } from "@/lib/auth/password-setup";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();
  let authenticated = false;

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    authenticated = !error && Boolean(data.user);
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    authenticated = !error && Boolean(data.user);
  }

  if (!authenticated) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const redirectPath = await resolvePostAuthRedirect(supabase, type, next);

  if (redirectPath !== "/auth/set-password") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await activateProfile(user.id);
    }
  }

  return NextResponse.redirect(`${origin}${redirectPath}`);
}
