import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import {
  fetchFreelancerFinanceTotals,
  getAllFreelancers,
} from "./freelancers";

export interface FreelancerDashboardStats {
  totalFreelancers: number;
  totalEarnedCents: number;
  totalPaidOutCents: number;
  openPayoutsCents: number;
}

export async function getFreelancerDashboardStats(): Promise<FreelancerDashboardStats> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const [freelancers, totals] = await Promise.all([
    getAllFreelancers(),
    fetchFreelancerFinanceTotals(),
  ]);

  return {
    totalFreelancers: freelancers.length,
    totalEarnedCents: totals.totalEarnedCents,
    totalPaidOutCents: totals.totalPaidOutCents,
    openPayoutsCents: totals.openPayoutsCents,
  };
}
