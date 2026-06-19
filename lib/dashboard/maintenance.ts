import type { SupabaseClient } from "@supabase/supabase-js";

export const RESET_TEST_DATA_CONFIRMATION = "RESET TEST DATA";

export interface MaintenanceStats {
  leads: number;
  clients: number;
  appointments: number;
  contracts: number;
  invoices: number;
  commissionEntries: number;
  commissionPayouts: number;
  teamMembers: number;
}

export interface ResetTestDataResult {
  deleted: Record<string, number>;
}

const RESET_DELETE_ORDER = [
  "commission_payouts",
  "commission_entries",
  "freelancer_profile_invoices",
  "invoice_items",
  "invoices",
  "clients",
  "leads",
  "appointments",
  "activity_logs",
  "contracts",
] as const;

type ResetTable = (typeof RESET_DELETE_ORDER)[number];

export function isResetConfirmationValid(confirmation: string): boolean {
  return confirmation === RESET_TEST_DATA_CONFIRMATION;
}

async function countTable(
  admin: SupabaseClient,
  table: string,
): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(`Statistik für ${table} fehlgeschlagen: ${error.message}`);
  }

  return count ?? 0;
}

export async function getMaintenanceStats(
  admin: SupabaseClient,
): Promise<MaintenanceStats> {
  const [
    leads,
    clients,
    appointments,
    contracts,
    invoices,
    commissionEntries,
    commissionPayouts,
    teamMembers,
  ] = await Promise.all([
    countTable(admin, "leads"),
    countTable(admin, "clients"),
    countTable(admin, "appointments"),
    countTable(admin, "contracts"),
    countTable(admin, "invoices"),
    countTable(admin, "commission_entries"),
    countTable(admin, "commission_payouts"),
    countTable(admin, "profiles"),
  ]);

  return {
    leads,
    clients,
    appointments,
    contracts,
    invoices,
    commissionEntries,
    commissionPayouts,
    teamMembers,
  };
}

async function deleteAllRows(
  admin: SupabaseClient,
  table: ResetTable,
): Promise<number> {
  const { count, error: countError } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(
      `Zählen in ${table} fehlgeschlagen: ${countError.message}`,
    );
  }

  const rowCount = count ?? 0;
  if (rowCount === 0) {
    return 0;
  }

  const { error } = await admin.from(table).delete().gte("created_at", "1970-01-01");

  if (error) {
    throw new Error(`Löschen in ${table} fehlgeschlagen: ${error.message}`);
  }

  return rowCount;
}

export async function resetOperationalTestData(
  admin: SupabaseClient,
): Promise<ResetTestDataResult> {
  const deleted: Record<string, number> = {};

  for (const table of RESET_DELETE_ORDER) {
    deleted[table] = await deleteAllRows(admin, table);
  }

  return { deleted };
}
