"use server";

import { redirect } from "next/navigation";
import { activateProfile } from "@/lib/auth/activate-profile";
import { validatePasswordPair } from "@/lib/auth/password-setup";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  if (!email || !password) {
    return { error: "E-Mail und Passwort sind erforderlich." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen." };
  }

  redirect(redirectTo.startsWith("/dashboard") ? redirectTo : "/dashboard");
}

export async function setPasswordAction(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const validationError = validatePasswordPair(password, confirmPassword);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Ihre Sitzung ist abgelaufen. Bitte öffnen Sie den Einladungslink erneut.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error: "Passwort konnte nicht gespeichert werden. Bitte erneut versuchen.",
    };
  }

  await activateProfile(user.id);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
