import { FreelancersPageClient } from "@/components/dashboard/FreelancersPageClient";
import { getFreelancerDashboardStats } from "@/lib/dashboard/freelancer-stats";
import { getAllFreelancers } from "@/lib/dashboard/freelancers";
import type { FreelancerDashboardStats } from "@/lib/dashboard/freelancer-stats";
import type { FreelancerRecord } from "@/lib/dashboard/types";

export default async function FreelancersPage() {
  let freelancers: FreelancerRecord[] = [];
  let stats: FreelancerDashboardStats = {
    totalFreelancers: 0,
    totalEarnedCents: 0,
    totalPaidOutCents: 0,
    openPayoutsCents: 0,
  };
  let error: string | null = null;

  try {
    [freelancers, stats] = await Promise.all([
      getAllFreelancers(),
      getFreelancerDashboardStats(),
    ]);
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Freelancer konnten nicht geladen werden";
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error}
      </div>
    );
  }

  return <FreelancersPageClient freelancers={freelancers} stats={stats} />;
}
