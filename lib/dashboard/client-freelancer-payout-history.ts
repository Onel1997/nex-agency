import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { isClientFreelancerPayoutsSchemaMissingError } from "./client-freelancer-payout";
import type { ClientFreelancerPayoutHistoryRecord } from "./types";
import { createClient } from "@/lib/supabase/server";

function mapPayoutRow(row: Record<string, unknown>): ClientFreelancerPayoutHistoryRecord {
  const client = Array.isArray(row.client)
    ? row.client[0]
    : row.client;

  return {
    id: row.id as string,
    client_id: row.client_id as string,
    freelancer_id: row.freelancer_id as string,
    amount_cents: row.amount_cents as number,
    paid_at: row.paid_at as string,
    status: (row.status as string) ?? "paid",
    created_at: row.created_at as string,
    client_name: (client as { company_name: string } | null)?.company_name,
  };
}

export async function getClientFreelancerPayoutsByFreelancerId(
  freelancerId: string,
): Promise<ClientFreelancerPayoutHistoryRecord[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_freelancer_payouts")
    .select("*, client:clients(company_name)")
    .eq("freelancer_id", freelancerId)
    .order("paid_at", { ascending: false });

  if (error) {
    if (isClientFreelancerPayoutsSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapPayoutRow(row));
}
