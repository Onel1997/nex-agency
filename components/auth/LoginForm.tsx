"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/auth/actions";

interface LoginFormProps {
  redirectTo: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="redirect" value={redirectTo} />

      {state?.error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {state.error}
        </div>
      )}

      <div className="space-y-4">
        <Field label="E-Mail" required>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="dashboard-input"
            placeholder="name@nexagency.de"
          />
        </Field>

        <Field label="Passwort" required>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="dashboard-input"
            placeholder="••••••••"
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="dashboard-btn-primary w-full"
      >
        {isPending ? "Anmelden..." : "Anmelden"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
        {required && <span className="text-violet-400"> *</span>}
      </span>
      {children}
    </label>
  );
}
