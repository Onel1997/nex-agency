import { requireFinanceAccess } from "@/lib/auth/session";
import { getTeamPerformanceStats } from "@/lib/dashboard/performance";
import type { TeamPerformanceStats } from "@/lib/dashboard/types";
import { PerformancePageClient } from "@/components/dashboard/PerformancePageClient";

export default async function PerformancePage() {
  await requireFinanceAccess();

  let stats: TeamPerformanceStats[] = [];
  let error: string | null = null;

  try {
    stats = (await getTeamPerformanceStats()) ?? [];
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Performance-Daten konnten nicht geladen werden";
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error}
      </div>
    );
  }

  return <PerformancePageClient stats={stats} />;
}
