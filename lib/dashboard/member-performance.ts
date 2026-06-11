import type { TeamPerformanceStats } from "./types";
import { getTeamPerformanceStats } from "./performance";

export interface MemberPerformanceSnapshot {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  commissionRate: number;
  leadsCount: number;
  clientsCount: number;
  revenueCents: number;
  commissionTotalCents: number;
  commissionPaidCents: number;
  commissionOutstandingCents: number;
}

function mapToSnapshot(stats: TeamPerformanceStats): MemberPerformanceSnapshot {
  return {
    userId: stats.userId,
    fullName: stats.fullName,
    email: stats.email,
    role: stats.role,
    commissionRate: stats.commissionRate,
    leadsCount: stats.leadsCreated,
    clientsCount: stats.clientsOwned,
    revenueCents: stats.revenueGeneratedCents,
    commissionTotalCents: stats.commissionsTotalCents,
    commissionPaidCents: stats.commissionsPaidCents,
    commissionOutstandingCents: stats.commissionsOutstandingCents,
  };
}

/** Aggregated per-member metrics for future performance dashboards. */
export async function getMemberPerformanceSnapshots(): Promise<
  MemberPerformanceSnapshot[] | null
> {
  const stats = await getTeamPerformanceStats();
  if (!stats) return null;
  return stats.map(mapToSnapshot);
}

export async function getMemberPerformanceSnapshot(
  userId: string,
): Promise<MemberPerformanceSnapshot | null> {
  const snapshots = await getMemberPerformanceSnapshots();
  return snapshots?.find((snapshot) => snapshot.userId === userId) ?? null;
}
