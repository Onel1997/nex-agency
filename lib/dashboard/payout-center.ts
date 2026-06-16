import { canManageCommissions, isManagement } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import type { CommissionEntryStatus } from "./commission-constants";
import { COMMISSION_ENTRY_TYPE_LABELS } from "./commission-constants";
import { formatCommissionEntryPeriod } from "./commission-display";
import { isCommissionFreelancerInvoiceSchemaMissingError } from "./commission-freelancer-invoices";
import { isCommissionCenterSchemaMissingError } from "./commission-entry-service";
import { fetchCommissionEntries } from "./commission-entries-data";
import {
  COMMISSION_PAYOUT_ROLE_LABELS,
  type CommissionPayoutRole,
} from "./commission-freelancer-invoice-constants";
import {
  DEFAULT_PAYOUT_CENTER_TAB,
  type PayoutDerivedStatus,
} from "./payout-center-constants";
import type {
  CommissionEntryRecord,
  PayoutCenterData,
  PayoutCenterLineItem,
  PayoutCenterStats,
} from "./types";
import { createClient } from "@/lib/supabase/server";

interface CommissionPayoutRow {
  id: string;
  commission_entry_id: string;
  profile_id: string;
  amount_cents: number;
  paid_at: string;
}

interface CommissionFreelancerInvoiceRow {
  id: string;
  commission_payout_id: string;
  invoice_number: string;
  pdf_url: string | null;
  status: string;
  amount_cents: number;
}

export function derivePayoutLineStatus(input: {
  entryStatus: CommissionEntryStatus;
  rolePaid: boolean;
  hasInvoice: boolean;
}): PayoutDerivedStatus | null {
  if (input.entryStatus === "cancelled") return null;

  if (!input.rolePaid) {
    if (input.entryStatus === "pending") return "offen";
    return "freigegeben";
  }

  if (!input.hasInvoice) return "ausgezahlt";
  return "abgeschlossen";
}

function emptyStats(): PayoutCenterStats {
  return {
    offenCents: 0,
    freigegebenCents: 0,
    ausgezahltCents: 0,
    abgeschlossenCents: 0,
    freelancerInvoiceCount: 0,
    freelancerCostsCents: 0,
  };
}

export function computePayoutCenterStats(
  lines: PayoutCenterLineItem[],
): Pick<
  PayoutCenterStats,
  "offenCents" | "freigegebenCents" | "ausgezahltCents" | "abgeschlossenCents"
> {
  return lines.reduce(
    (stats, line) => {
      if (line.derivedStatus === "offen") stats.offenCents += line.amountCents;
      if (line.derivedStatus === "freigegeben") {
        stats.freigegebenCents += line.amountCents;
      }
      if (line.derivedStatus === "ausgezahlt") {
        stats.ausgezahltCents += line.amountCents;
      }
      if (line.derivedStatus === "abgeschlossen") {
        stats.abgeschlossenCents += line.amountCents;
      }
      return stats;
    },
    {
      offenCents: 0,
      freigegebenCents: 0,
      ausgezahltCents: 0,
      abgeschlossenCents: 0,
    },
  );
}

export function computePayoutInvoiceMetrics(
  invoices: Pick<CommissionFreelancerInvoiceRow, "amount_cents">[],
): Pick<PayoutCenterStats, "freelancerInvoiceCount" | "freelancerCostsCents"> {
  return invoices.reduce(
    (metrics, invoice) => ({
      freelancerInvoiceCount: metrics.freelancerInvoiceCount + 1,
      freelancerCostsCents: metrics.freelancerCostsCents + invoice.amount_cents,
    }),
    { freelancerInvoiceCount: 0, freelancerCostsCents: 0 },
  );
}

export function buildPayoutCenterKpis(input: {
  lines: PayoutCenterLineItem[];
  invoices: Pick<CommissionFreelancerInvoiceRow, "amount_cents">[];
}): PayoutCenterStats {
  return {
    ...computePayoutCenterStats(input.lines),
    ...computePayoutInvoiceMetrics(input.invoices),
  };
}

function resolveApprovedAt(entry: CommissionEntryRecord): string | null {
  if (entry.status === "pending" || entry.status === "cancelled") return null;
  return entry.updated_at;
}

function buildRoleLine(input: {
  entry: CommissionEntryRecord;
  role: CommissionPayoutRole;
  profileId: string;
  profileName: string;
  amountCents: number;
  commissionRate: number;
  payout: CommissionPayoutRow | null;
  invoice: CommissionFreelancerInvoiceRow | null;
  triggeredInvoiceNumber: string | null;
}): PayoutCenterLineItem | null {
  if (input.amountCents <= 0) return null;

  const rolePaid = Boolean(input.payout);
  const hasInvoice = Boolean(input.invoice);
  const derivedStatus = derivePayoutLineStatus({
    entryStatus: input.entry.status,
    rolePaid,
    hasInvoice,
  });

  if (!derivedStatus) return null;

  return {
    lineKey: `${input.entry.id}:${input.role}`,
    entryId: input.entry.id,
    profileId: input.profileId,
    profileName: input.profileName,
    role: input.role,
    roleLabel: COMMISSION_PAYOUT_ROLE_LABELS[input.role],
    clientId: input.entry.client_id,
    clientName: input.entry.client_name,
    entryType: input.entry.entry_type,
    entryTypeLabel: COMMISSION_ENTRY_TYPE_LABELS[input.entry.entry_type],
    billingPeriodLabel: formatCommissionEntryPeriod(input.entry),
    amountCents: input.amountCents,
    commissionRate: input.commissionRate,
    derivedStatus,
    entryStatus: input.entry.status,
    payoutId: input.payout?.id ?? null,
    payoutPaidAt: input.payout?.paid_at ?? null,
    invoiceId: input.invoice?.id ?? null,
    invoiceNumber: input.invoice?.invoice_number ?? null,
    invoicePdfUrl: input.invoice?.pdf_url ?? null,
    triggeredInvoiceId: input.entry.triggered_by_invoice_id,
    triggeredInvoiceNumber: input.triggeredInvoiceNumber,
    approvedAt: resolveApprovedAt(input.entry),
    entryCreatedAt: input.entry.created_at,
  };
}

export function buildPayoutCenterLines(input: {
  entries: CommissionEntryRecord[];
  payouts: CommissionPayoutRow[];
  invoices: CommissionFreelancerInvoiceRow[];
  triggeredInvoiceNumbers: Map<string, string>;
}): PayoutCenterLineItem[] {
  const payoutsByEntryProfile = new Map<string, CommissionPayoutRow>();
  for (const payout of input.payouts) {
    payoutsByEntryProfile.set(
      `${payout.commission_entry_id}:${payout.profile_id}`,
      payout,
    );
  }

  const invoicesByPayoutId = new Map<string, CommissionFreelancerInvoiceRow>();
  for (const invoice of input.invoices) {
    invoicesByPayoutId.set(invoice.commission_payout_id, invoice);
  }

  const lines: PayoutCenterLineItem[] = [];

  for (const entry of input.entries) {
    if (entry.status === "cancelled") continue;

    const triggeredInvoiceNumber = entry.triggered_by_invoice_id
      ? input.triggeredInvoiceNumbers.get(entry.triggered_by_invoice_id) ?? null
      : null;

    if (entry.setter_id && entry.setter_commission_cents > 0) {
      const payout =
        payoutsByEntryProfile.get(`${entry.id}:${entry.setter_id}`) ?? null;
      const invoice = payout ? invoicesByPayoutId.get(payout.id) ?? null : null;
      const line = buildRoleLine({
        entry,
        role: "setter",
        profileId: entry.setter_id,
        profileName: entry.setter_name ?? "Setter",
        amountCents: entry.setter_commission_cents,
        commissionRate: entry.setter_rate,
        payout,
        invoice,
        triggeredInvoiceNumber,
      });
      if (line) lines.push(line);
    }

    if (entry.closer_id && entry.closer_commission_cents > 0) {
      const payout =
        payoutsByEntryProfile.get(`${entry.id}:${entry.closer_id}`) ?? null;
      const invoice = payout ? invoicesByPayoutId.get(payout.id) ?? null : null;
      const line = buildRoleLine({
        entry,
        role: "closer",
        profileId: entry.closer_id,
        profileName: entry.closer_name ?? "Closer",
        amountCents: entry.closer_commission_cents,
        commissionRate: entry.closer_rate,
        payout,
        invoice,
        triggeredInvoiceNumber,
      });
      if (line) lines.push(line);
    }
  }

  lines.sort((a, b) => {
    const dateA = a.payoutPaidAt ?? a.entryCreatedAt;
    const dateB = b.payoutPaidAt ?? b.entryCreatedAt;
    return dateB.localeCompare(dateA);
  });

  return lines;
}

export function filterPayoutCenterLinesByStatus(
  lines: PayoutCenterLineItem[],
  status: PayoutDerivedStatus,
): PayoutCenterLineItem[] {
  return lines.filter((line) => line.derivedStatus === status);
}

async function fetchCommissionPayoutRows(): Promise<CommissionPayoutRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commission_payouts")
    .select("id, commission_entry_id, profile_id, amount_cents, paid_at");

  if (error) {
    if (isCommissionCenterSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []) as CommissionPayoutRow[];
}

async function fetchCommissionFreelancerInvoiceRows(): Promise<
  CommissionFreelancerInvoiceRow[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commission_freelancer_invoices")
    .select("id, commission_payout_id, invoice_number, pdf_url, status, amount_cents");

  if (error) {
    if (isCommissionFreelancerInvoiceSchemaMissingError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []) as CommissionFreelancerInvoiceRow[];
}

interface PayoutCenterSnapshot {
  allLines: PayoutCenterLineItem[];
  invoices: CommissionFreelancerInvoiceRow[];
}

async function loadPayoutCenterSnapshot(): Promise<PayoutCenterSnapshot> {
  const supabase = await createClient();
  const [entries, payouts, invoices] = await Promise.all([
    fetchCommissionEntries(supabase),
    fetchCommissionPayoutRows(),
    fetchCommissionFreelancerInvoiceRows(),
  ]);

  const triggeredInvoiceIds = [
    ...new Set(
      entries
        .map((entry) => entry.triggered_by_invoice_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const triggeredInvoiceNumbers = await fetchTriggeredInvoiceNumbers(
    triggeredInvoiceIds,
  );

  const allLines = buildPayoutCenterLines({
    entries,
    payouts,
    invoices,
    triggeredInvoiceNumbers,
  });

  return { allLines, invoices };
}

export async function getPayoutDashboardKpis(): Promise<PayoutCenterStats | null> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) return null;

  try {
    const snapshot = await loadPayoutCenterSnapshot();
    return buildPayoutCenterKpis(snapshot);
  } catch (error) {
    if (
      isCommissionCenterSchemaMissingError(
        error instanceof Error ? error.message : "",
      ) ||
      isCommissionFreelancerInvoiceSchemaMissingError(
        error instanceof Error ? error.message : "",
      )
    ) {
      return emptyStats();
    }
    throw error;
  }
}

async function fetchTriggeredInvoiceNumbers(
  invoiceIds: string[],
): Promise<Map<string, string>> {
  if (invoiceIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .in("id", invoiceIds);

  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.id as string, row.invoice_number as string);
  }
  return map;
}

export async function getPayoutCenterData(
  status: PayoutDerivedStatus = DEFAULT_PAYOUT_CENTER_TAB,
): Promise<PayoutCenterData> {
  const profile = await getProfile();
  if (!profile || !canManageCommissions(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const snapshot = await loadPayoutCenterSnapshot();

  return {
    lines: filterPayoutCenterLinesByStatus(snapshot.allLines, status),
    allLines: snapshot.allLines,
    stats: buildPayoutCenterKpis(snapshot),
    activeStatus: status,
  };
}
