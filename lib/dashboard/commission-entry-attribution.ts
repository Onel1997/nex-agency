import type { CommissionEntryStatus } from "./commission-constants";
import { resolveRetainerCommissionMonthsLimit } from "./commission-entries";
import { resolveRetainerAmountCents } from "./billing-cycle";
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
  const setterProfile = readProfile(row, "setter") as {
    full_name: string | null;
    email: string;
    agency_role?: string | null;
    retainer_commission_months?: number | null;
  } | null;
  const closerProfile = readProfile(row, "closer") as {
    full_name: string | null;
    email: string;
    agency_role?: string | null;
    retainer_commission_months?: number | null;
  } | null;

  const invoice = Array.isArray(row.invoice) ? row.invoice[0] : row.invoice;

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
    entry_type: (row.entry_type as import("./commission-constants").CommissionEntryType) ?? "setup",
    deal_type: resolved.dealType,
    triggered_by_invoice_id:
      (row.triggered_by_invoice_id as string | null) ?? null,
    billing_period_year:
      (invoice as { billing_period_year?: number | null } | null)
        ?.billing_period_year ?? null,
    billing_period_month:
      (invoice as { billing_period_month?: number | null } | null)
        ?.billing_period_month ?? null,
    allowed_retainer_months: resolveRetainerCommissionMonthsLimit({
      setterMonths: setterProfile?.retainer_commission_months,
      closerMonths: closerProfile?.retainer_commission_months,
    }),
    contract_start_date:
      (client as { contract_start_date?: string | null } | null)
        ?.contract_start_date ?? null,
    monthly_retainer_cents: resolveRetainerAmountCents({
      monthly_retainer_cents: (client as { monthly_retainer_cents?: number | null } | null)
        ?.monthly_retainer_cents ?? null,
      monthly_revenue_cents: (client as { monthly_revenue_cents?: number | null } | null)
        ?.monthly_revenue_cents ?? null,
    }) || null,
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
