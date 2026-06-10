"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import type { Profile } from "@/lib/auth/types";
import { ROLE_LABELS } from "@/lib/auth/types";

interface UserMenuProps {
  profile: Profile;
}

export function UserMenu({ profile }: UserMenuProps) {
  const displayName =
    profile.full_name?.trim() || profile.email.split("@")[0] || "Benutzer";

  return (
    <div className="dashboard-user-menu">
      <div className="mb-3">
        <p className="truncate text-sm font-medium text-foreground">
          {displayName}
        </p>
        <p className="mt-0.5 text-xs text-muted-soft">{profile.email}</p>
        <span className="dashboard-role-badge mt-2 inline-flex">
          {ROLE_LABELS[profile.role]}
        </span>
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="dashboard-logout-btn flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </form>
    </div>
  );
}
