"use client";

import { useActionState } from "react";
import { setPasswordAction } from "@/app/auth/actions";

export function SetPasswordForm() {
  const [state, formAction, isPending] = useActionState(setPasswordAction, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {state.error}
        </div>
      )}

      <div className="space-y-4">
        <Field label="Neues Passwort" required>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="dashboard-input"
            placeholder="Mindestens 8 Zeichen"
          />
        </Field>

        <Field label="Passwort bestätigen" required>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="dashboard-input"
            placeholder="Passwort wiederholen"
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="dashboard-btn-primary w-full"
      >
        {isPending ? "Wird gespeichert..." : "Passwort festlegen & anmelden"}
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
