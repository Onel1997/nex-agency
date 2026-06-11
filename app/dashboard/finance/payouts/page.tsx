import { PayoutsPageClient } from "@/components/dashboard/PayoutsPageClient";
import { getClients } from "@/lib/dashboard/clients";
import { getAllFreelancerPayouts } from "@/lib/dashboard/freelancer-payouts";
import { getAllFreelancers } from "@/lib/dashboard/freelancers";
import type {
  ClientRecord,
  FreelancerPayoutRecord,
  FreelancerRecord,
} from "@/lib/dashboard/types";

export default async function PayoutsPage() {
  let payouts: FreelancerPayoutRecord[] = [];
  let freelancers: FreelancerRecord[] = [];
  let clients: ClientRecord[] = [];
  let error: string | null = null;

  try {
    [payouts, freelancers, clients] = await Promise.all([
      getAllFreelancerPayouts(),
      getAllFreelancers(),
      getClients(),
    ]);
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Auszahlungen konnten nicht geladen werden";
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error}
      </div>
    );
  }

  return (
    <PayoutsPageClient
      payouts={payouts}
      freelancers={freelancers}
      clients={clients}
    />
  );
}
