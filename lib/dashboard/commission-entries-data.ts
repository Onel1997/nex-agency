import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommissionEntryStatus } from "./commission-constants";
import { isCommissionCenterSchemaMissingError } from "./commission-entry-service";
import { mapResolvedCommissionEntryRow } from "./commission-entry-attribution";
import { computeEntryCommissionTotals } from "./sales-metrics";
import type { CommissionEntryRecord } from "./types";

const COMMISSION_ENTRY_SELECT = `
  id,
  client_id,
  setter_id,
  closer_id,
  project_value_cents,
  setter_rate,
  closer_rate,
  setter_commission_cents,
  closer_commission_cents,
  status,
  entry_type,
  triggered_by_invoice_id,
  created_at,
  updated_at,
  paid_at,
  client:clients!commission_entries_client_id_fkey(
    company_name,
    acquired_by,
    lead:leads!clients_lead_id_fkey(
      owner_id,
      created_by,
      setter_id,
      creator:profiles!leads_created_by_fkey(full_name, email, agency_role)
    )
  ),
  setter:profiles!commission_entries_setter_id_fkey(full_name, email, agency_role),
  closer:profiles!commission_entries_closer_id_fkey(full_name, email, agency_role)
`;

export async function fetchCommissionEntries(
  supabase: SupabaseClient,
): Promise<CommissionEntryRecord[]> {
  const { data, error } = await supabase
    .from("commission_entries")
    .select(COMMISSION_ENTRY_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    if (isCommissionCenterSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapResolvedCommissionEntryRow(row as Record<string, unknown>),
  );
}

export function groupLatestCommissionEntryByClient(
  entries: CommissionEntryRecord[],
): Map<string, CommissionEntryRecord> {
  const grouped = new Map<string, CommissionEntryRecord>();

  for (const entry of entries) {
    if (!grouped.has(entry.client_id)) {
      grouped.set(entry.client_id, entry);
    }
  }

  return grouped;
}

export function groupCommissionEntriesByClient(
  entries: CommissionEntryRecord[],
): Map<string, CommissionEntryRecord[]> {
  const grouped = new Map<string, CommissionEntryRecord[]>();

  for (const entry of entries) {
    const current = grouped.get(entry.client_id) ?? [];
    current.push(entry);
    grouped.set(entry.client_id, current);
  }

  return grouped;
}

export function aggregateCommissionTotalsForClient(
  entries: CommissionEntryRecord[],
  paidProfilesByEntry: Map<string, Set<string>>,
): {
  commissionTotalCents: number;
  commissionPaidCents: number;
  commissionOutstandingCents: number;
} {
  let commissionTotalCents = 0;
  let commissionPaidCents = 0;
  let commissionOutstandingCents = 0;

  for (const entry of entries) {
    if (entry.status === ("cancelled" as CommissionEntryStatus)) continue;
    const totals = computeEntryCommissionTotals(
      entry,
      paidProfilesByEntry.get(entry.id) ?? new Set<string>(),
    );
    commissionTotalCents += totals.commissionTotalCents;
    commissionPaidCents += totals.commissionPaidCents;
    commissionOutstandingCents += totals.commissionOutstandingCents;
  }

  return {
    commissionTotalCents,
    commissionPaidCents,
    commissionOutstandingCents,
  };
}

export function mergePaidProfilesForClientEntries(
  entries: CommissionEntryRecord[],
  paidProfilesByEntry: Map<string, Set<string>>,
): Set<string> {
  const merged = new Set<string>();

  for (const entry of entries) {
    const paid = paidProfilesByEntry.get(entry.id);
    if (!paid) continue;
    for (const profileId of paid) merged.add(profileId);
  }

  return merged;
}

export async function fetchCommissionPayoutProfileIds(
  supabase: SupabaseClient,
): Promise<Map<string, Set<string>>> {
  const { data, error } = await supabase
    .from("commission_payouts")
    .select("commission_entry_id, profile_id");

  if (error) {
    if (isCommissionCenterSchemaMissingError(error.message)) {
      return new Map();
    }
    throw new Error(error.message);
  }

  const payoutsByEntry = new Map<string, Set<string>>();

  for (const row of data ?? []) {
    const entryId = row.commission_entry_id as string;
    const profileId = row.profile_id as string;
    const current = payoutsByEntry.get(entryId) ?? new Set<string>();
    current.add(profileId);
    payoutsByEntry.set(entryId, current);
  }

  return payoutsByEntry;
}

export function groupPaidProfilesByClient(
  entriesByClient: Map<string, CommissionEntryRecord>,
  payoutsByEntry: Map<string, Set<string>>,
): Map<string, Set<string>> {
  const paidByClient = new Map<string, Set<string>>();

  for (const [clientId, entry] of entriesByClient.entries()) {
    paidByClient.set(clientId, payoutsByEntry.get(entry.id) ?? new Set<string>());
  }

  return paidByClient;
}
