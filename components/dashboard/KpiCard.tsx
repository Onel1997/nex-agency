import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  trend?: string;
  size?: "default" | "hero";
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  trend,
  size = "default",
}: KpiCardProps) {
  const isHero = size === "hero";

  const content = (
    <div
      className={`dashboard-kpi glass-card group rounded-2xl ${
        isHero ? "p-6 sm:p-8" : "p-5 sm:p-6"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p
            className={`font-medium text-muted ${
              isHero ? "text-sm uppercase tracking-wider" : "text-sm"
            }`}
          >
            {label}
          </p>
          <p
            className={`mt-2 font-semibold tracking-tight text-foreground ${
              isHero ? "text-4xl sm:text-5xl" : "text-3xl"
            }`}
          >
            {value}
          </p>
          {trend && (
            <p className={`mt-2 text-muted-soft ${isHero ? "text-sm" : "text-xs"}`}>
              {trend}
            </p>
          )}
        </div>
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/10 ring-1 ring-violet-500/20 ${
            isHero ? "h-14 w-14" : "h-11 w-11"
          }`}
        >
          <Icon className={`text-violet-300 ${isHero ? "h-6 w-6" : "h-5 w-5"}`} />
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
