"use client";

import {
  Activity,
  CalendarDays,
  Euro,
  LayoutDashboard,
  Menu,
  Target,
  TrendingUp,
  UserCog,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  canAccessFinanceRoutes,
  canAccessTeamRoutes,
} from "@/lib/auth/permissions";
import { UserMenu } from "@/components/dashboard/UserMenu";
import type { Profile } from "@/lib/auth/types";

const BASE_NAV_ITEMS = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard, exact: true as const },
  { href: "/dashboard/leads", label: "Leads", icon: Target },
  { href: "/dashboard/appointments", label: "Termine", icon: CalendarDays },
  { href: "/dashboard/clients", label: "Kunden", icon: Users },
];

const MANAGEMENT_NAV_ITEMS = [
  { href: "/dashboard/team", label: "Team", icon: UserCog },
  { href: "/dashboard/activities", label: "Aktivitäten", icon: Activity },
] as const;

const FINANCE_NAV_ITEMS = [
  { href: "/dashboard/finance", label: "Finanzen", icon: Euro },
  { href: "/dashboard/performance", label: "Performance", icon: TrendingUp },
] as const;

interface DashboardSidebarProps {
  profile: Profile;
}

export function DashboardSidebar({ profile }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(canAccessTeamRoutes(profile) ? MANAGEMENT_NAV_ITEMS : []),
    ...(canAccessFinanceRoutes(profile) ? FINANCE_NAV_ITEMS : []),
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const navContent = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((item) => {
        const { href, label, icon: Icon } = item;
        const exact = "exact" in item ? item.exact : undefined;
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`dashboard-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              active
                ? "bg-violet-500/15 text-foreground ring-1 ring-violet-500/25"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${active ? "text-violet-300" : ""}`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        className="dashboard-mobile-toggle fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated text-foreground ring-1 ring-border lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Menü öffnen"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Menü schließen"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`dashboard-sidebar glass-card fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <Link href="/dashboard" className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300/70">
              NexAgency
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">
              CRM
            </span>
          </Link>
          <button
            type="button"
            className="dashboard-icon-btn rounded-lg p-2 text-muted lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Menü schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {navContent}

        <div className="mt-auto border-t border-border p-4">
          <UserMenu profile={profile} />
        </div>
      </aside>
    </>
  );
}
