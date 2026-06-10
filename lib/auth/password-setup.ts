import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { hasCompletedInvitation } from "@/lib/auth/member-status";

export const SET_PASSWORD_PATH = "/auth/set-password";

export function isPasswordSetupType(type: EmailOtpType | string | null): boolean {
  return type === "invite" || type === "recovery";
}

export async function resolvePostAuthRedirect(
  supabase: SupabaseClient,
  type: EmailOtpType | string | null,
  next: string,
): Promise<string> {
  if (isPasswordSetupType(type)) {
    return SET_PASSWORD_PATH;
  }

  const { data: profile } = await supabase.rpc("get_current_profile");

  if (
    profile &&
    typeof profile === "object" &&
    "activated_at" in profile &&
    "status" in profile
  ) {
    const member = profile as {
      status: "pending" | "active" | "deactivated";
      activated_at: string | null;
    };

    if (!hasCompletedInvitation(member)) {
      return SET_PASSWORD_PATH;
    }
  }

  return next.startsWith("/") ? next : "/dashboard";
}

export function validatePasswordPair(
  password: string,
  confirmPassword: string,
): string | null {
  if (!password || !confirmPassword) {
    return "Bitte füllen Sie alle Felder aus.";
  }

  if (password.length < 8) {
    return "Das Passwort muss mindestens 8 Zeichen lang sein.";
  }

  if (password !== confirmPassword) {
    return "Die Passwörter stimmen nicht überein.";
  }

  return null;
}
