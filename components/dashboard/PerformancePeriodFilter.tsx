"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PERFORMANCE_PERIOD_LABELS,
  PERFORMANCE_PERIODS,
  type PerformancePeriod,
} from "@/lib/dashboard/performance-period";

interface PerformancePeriodFilterProps {
  activePeriod: PerformancePeriod;
}

export function PerformancePeriodFilter({
  activePeriod,
}: PerformancePeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setPeriod = (period: PerformancePeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    if (period === "month") {
      params.delete("period");
    } else {
      params.set("period", period);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PERFORMANCE_PERIODS.map((period) => {
        const active = period === activePeriod;
        return (
          <button
            key={period}
            type="button"
            onClick={() => setPeriod(period)}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
              active
                ? "bg-violet-500/20 text-foreground ring-1 ring-violet-500/30"
                : "bg-surface-elevated text-muted hover:bg-surface-hover hover:text-foreground ring-1 ring-border"
            }`}
          >
            {PERFORMANCE_PERIOD_LABELS[period]}
          </button>
        );
      })}
    </div>
  );
}
