import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  trend?: string;
}

export function KpiCard({ label, value, icon: Icon, href, trend }: KpiCardProps) {
  const content = (
    <div className="dashboard-kpi glass-card group rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {trend && (
            <p className="mt-1.5 text-xs text-muted-soft">{trend}</p>
          )}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/10 ring-1 ring-violet-500/20">
          <Icon className="h-5 w-5 text-violet-300" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-transform hover:scale-[1.01]">
        {content}
      </Link>
    );
  }

  return content;
}
