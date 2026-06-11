import { FreelancersPageClient } from "@/components/dashboard/FreelancersPageClient";
import { getAllFreelancers } from "@/lib/dashboard/freelancers";
import type { FreelancerRecord } from "@/lib/dashboard/types";

export default async function FreelancersPage() {
  let freelancers: FreelancerRecord[] = [];
  let error: string | null = null;

  try {
    freelancers = await getAllFreelancers();
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

  return <FreelancersPageClient freelancers={freelancers} />;
}
