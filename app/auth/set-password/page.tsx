import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { getAuthUser, getProfile } from "@/lib/auth/session";
import { hasCompletedInvitation } from "@/lib/auth/member-status";

export const metadata: Metadata = {
  title: "Passwort festlegen — NexAgency CRM",
  description: "Passwort für Ihr NexAgency CRM Konto festlegen.",
  robots: { index: false, follow: false },
};

export default async function SetPasswordPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login?error=invitation_pending");
  }

  const profile = await getProfile();

  if (profile && hasCompletedInvitation(profile)) {
    redirect("/dashboard");
  }

  return (
    <div className="auth-shell relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.12)_0%,_transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(34,211,238,0.06)_0%,_transparent_45%)]"
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300/70">
              NexAgency
            </span>
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              Passwort festlegen
            </span>
          </Link>
          <p className="mt-3 text-sm text-muted">
            Willkommen! Legen Sie ein Passwort fest, um Ihr Konto zu aktivieren.
          </p>
          {user.email && (
            <p className="mt-1 text-xs text-muted-soft">{user.email}</p>
          )}
        </div>

        <div className="glass-card auth-card rounded-2xl p-6 sm:p-8">
          <SetPasswordForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-soft">
          Nach der Aktivierung werden Sie automatisch angemeldet.
        </p>
      </div>
    </div>
  );
}
