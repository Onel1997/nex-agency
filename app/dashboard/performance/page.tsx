import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { requirePerformanceAccess } from "@/lib/auth/session";
import {
  getPerformanceDashboardData,
  getTeamPerformanceStats,
} from "@/lib/dashboard/performance";
import { parsePerformancePeriod } from "@/lib/dashboard/performance-period";
import { PerformancePageClient } from "@/components/dashboard/PerformancePageClient";

interface PerformancePageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function PerformancePage({
  searchParams,
}: PerformancePageProps) {
  const profile = await requirePerformanceAccess();
  const params = await searchParams;
  const period = parsePerformancePeriod(params.period);

  let error: string | null = null;
  let data = null;
  let commissionMembers = null;

  try {
    data = await getPerformanceDashboardData(period);
    if (canAccessFinanceRoutes(profile)) {
      commissionMembers = await getTeamPerformanceStats();
    }
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Performance-Daten konnten nicht geladen werden";
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error ?? "Performance-Daten konnten nicht geladen werden"}
      </div>
    );
  }

  return (
    <PerformancePageClient
      data={data}
      showCommissionEditor={canAccessFinanceRoutes(profile)}
      commissionMembers={commissionMembers ?? []}
    />
  );
}
