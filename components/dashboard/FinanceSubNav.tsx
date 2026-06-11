"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const FINANCE_SUB_NAV = [
  { href: "/dashboard/finance", label: "Übersicht", exact: true },
  { href: "/dashboard/finance/freelancers", label: "Freelancer" },
  { href: "/dashboard/finance/payouts", label: "Auszahlungen" },
  { href: "/dashboard/finance/expenses", label: "Ausgaben" },
] as const;

export function FinanceSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {FINANCE_SUB_NAV.map((item) => {
        const exact = "exact" in item ? item.exact : undefined;
        const active = exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              active
                ? "bg-violet-500/15 text-foreground ring-1 ring-violet-500/25"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
