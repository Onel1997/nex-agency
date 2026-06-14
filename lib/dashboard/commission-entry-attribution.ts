import type { CommissionEntryStatus } from "./commission-constants";
import {
  detectSalesDealAttributionType,
  formatAttributionMemberName,
  resolveCommissionEntryAttribution,
} from "./sales-attribution";
import type { CommissionEntryRecord } from "./types";

function readProfile(
  row: Record<string, unknown> | null | undefined,
  key: "setter" | "closer" | "creator",
) {
  if (!row) return null;
  const profile = Array.isArray(row[key]) ? row[key][0] : row[key];
  return profile as {
    full_name: string | null;
    email: string;
    agency_role?: string | null;
  } | null;
}

export function mapResolvedCommissionEntryRow(
  row: Record<string, unknown>,
): CommissionEntryRecord {
  const client = Array.isArray(row.client) ? row.client[0] : row.client;
  const nestedLead = (client as { lead?: unknown } | null)?.lead;
  const lead = Array.isArray(nestedLead) ? nestedLead[0] : nestedLead;
  const creatorProfile = readProfile(
    lead as Record<string, unknown> | null | undefined,
    "creator",
  );
  const setterProfile = readProfile(row, "setter");
  const closerProfile = readProfile(row, "closer");

  const rawSetterId = (row.setter_id as string | null) ?? null;
  const rawCloserId = (row.closer_id as string | null) ?? null;
  const rawSetterName =
    formatAttributionMemberName(setterProfile) ??
    (rawSetterId &&
    (lead as { created_by?: string | null } | null)?.created_by === rawSetterId
      ? formatAttributionMemberName(creatorProfile)
      : null) ??
    ((client as { acquired_by?: string | null } | null)?.acquired_by?.trim() &&
    rawSetterId
      ? (client as { acquired_by?: string | null }).acquired_by!.trim()
      : null);
  const rawCloserName = closerProfile
    ? formatAttributionMemberName(closerProfile)
    : null;

  const resolved = resolveCommissionEntryAttribution({
    setterId: rawSetterId,
    closerId: rawCloserId,
    setterName: rawSetterName,
    closerName: rawCloserName,
    setterAgencyRole: setterProfile?.agency_role,
    closerAgencyRole: closerProfile?.agency_role,
    leadOwnerId: (lead as { owner_id?: string | null } | null)?.owner_id ?? null,
  });

  return {
    id: row.id as string,
    client_id: row.client_id as string,
    client_name:
      (client as { company_name?: string } | null)?.company_name ?? "—",
    setter_id: resolved.setterId,
    setter_name: resolved.setterName,
    closer_id: resolved.closerId,
    closer_name: resolved.closerName,
    project_value_cents: Number(row.project_value_cents ?? 0),
    setter_rate: Number(row.setter_rate ?? 0),
    closer_rate: Number(row.closer_rate ?? 0),
    setter_commission_cents: Number(row.setter_commission_cents ?? 0),
    closer_commission_cents: Number(row.closer_commission_cents ?? 0),
    status: row.status as CommissionEntryStatus,
    deal_type: resolved.dealType,
    triggered_by_invoice_id:
      (row.triggered_by_invoice_id as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    paid_at: (row.paid_at as string | null) ?? null,
  };
}

export function resolveCommissionEntryDealType(
  entry: Pick<
    CommissionEntryRecord,
    "setter_id" | "closer_id" | "deal_type"
  >,
): CommissionEntryRecord["deal_type"] {
  return (
    entry.deal_type ??
    detectSalesDealAttributionType({
      setterId: entry.setter_id,
      closerId: entry.closer_id,
    })
  );
}
