import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Anmelden — NexAgency CRM",
  description: "Anmeldung für das interne NexAgency CRM Dashboard.",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect ?? "/dashboard";

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
              CRM Anmeldung
            </span>
          </Link>
          <p className="mt-3 text-sm text-muted">
            Melden Sie sich an, um auf das interne Dashboard zuzugreifen.
          </p>
        </div>

        <div className="glass-card auth-card rounded-2xl p-6 sm:p-8">
          {params.error === "auth_callback_failed" && (
            <div className="mb-5 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/20">
              Authentifizierung fehlgeschlagen. Bitte erneut anmelden.
            </div>
          )}

          {params.error === "account_deactivated" && (
            <div className="mb-5 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/20">
              Ihr Konto wurde deaktiviert. Bitte wenden Sie sich an einen Administrator.
            </div>
          )}

          {params.error === "invitation_pending" && (
            <div className="mb-5 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/20">
              Bitte nehmen Sie zuerst die Einladung per E-Mail an und setzen Sie Ihr Passwort.
            </div>
          )}

          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-soft">
          Nur für autorisierte Teammitglieder.
        </p>
      </div>
    </div>
  );
}
