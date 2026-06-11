import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import type { FreelancerPayoutRecord } from "./types";
import { createClient } from "@/lib/supabase/server";
import { isFreelancerSchemaMissingError } from "./freelancers";

function mapPayoutRow(row: Record<string, unknown>): FreelancerPayoutRecord {
  const freelancer = Array.isArray(row.freelancer)
    ? row.freelancer[0]
    : row.freelancer;

  const payoutClients = Array.isArray(row.freelancer_payout_clients)
    ? row.freelancer_payout_clients
    : [];

  const projectNames: string[] = [];
  const projectIds: string[] = [];

  for (const link of payoutClients) {
    const client = Array.isArray(link.client) ? link.client[0] : link.client;
    if (client) {
      projectIds.push((link.client_id as string) ?? (client as { id: string }).id);
      projectNames.push((client as { company_name: string }).company_name);
    }
  }

  return {
    id: row.id as string,
    freelancer_id: row.freelancer_id as string,
    amount_cents: row.amount_cents as number,
    payout_date: row.payout_date as string,
    status: row.status as FreelancerPayoutRecord["status"],
    notes: (row.notes as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    freelancer_name: (freelancer as { name: string } | null)?.name,
    project_names: projectNames,
    project_ids: projectIds,
  };
}

export async function getAllFreelancerPayouts(): Promise<FreelancerPayoutRecord[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("freelancer_payouts")
    .select(
      `
      *,
      freelancer:freelancers(name),
      freelancer_payout_clients(
        client_id,
        client:clients(company_name)
      )
    `,
    )
    .order("payout_date", { ascending: false });

  if (error) {
    if (isFreelancerSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapPayoutRow(row));
}

export async function getFreelancerPayoutsByFreelancerId(
  freelancerId: string,
): Promise<FreelancerPayoutRecord[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("freelancer_payouts")
    .select(
      `
      *,
      freelancer:freelancers(name),
      freelancer_payout_clients(
        client_id,
        client:clients(company_name)
      )
    `,
    )
    .eq("freelancer_id", freelancerId)
    .order("payout_date", { ascending: false });

  if (error) {
    if (isFreelancerSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapPayoutRow(row));
}
