import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import {
  isClientFreelancerPayoutsSchemaMissingError,
  isClientFreelancerSchemaMissingError,
} from "./client-freelancer-payout";
import { getClientFreelancerPayoutsByFreelancerId } from "./client-freelancer-payout-history";
import { getOrCreateFreelancerProfile } from "./freelancer-profiles";
import { getFreelancerProfileInvoicesByProfileId } from "./freelancer-profile-invoices";
import type { FreelancerDetailData, FreelancerRecord } from "./types";
import { createClient } from "@/lib/supabase/server";

export function isFreelancerSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table") ||
    normalized.includes("freelancers") ||
    normalized.includes("freelancer_invoices") ||
    normalized.includes("freelancer_payouts") ||
    normalized.includes("freelancer_payout_clients") ||
    normalized.includes("freelancer_payout_invoices") ||
    normalized.includes("next_freelancer_invoice_number")
  );
}

export const PHASE14_MIGRATION_HINT =
  "Phase-14-Migration fehlt. Bitte `supabase db push` ausführen oder die Migration 20250619120000_phase14_finance_center.sql anwenden.";

interface FreelancerProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  commission_rate: number;
  status: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface FreelancerClientAggregate {
  total_earned_cents: number;
  total_paid_out_cents: number;
  outstanding_cents: number;
  project_volume_cents: number;
  assigned_project_names: string[];
  last_payout_at: string | null;
}

const EMPTY_AGGREGATE: FreelancerClientAggregate = {
  total_earned_cents: 0,
  total_paid_out_cents: 0,
  outstanding_cents: 0,
  project_volume_cents: 0,
  assigned_project_names: [],
  last_payout_at: null,
};

function formatFreelancerDisplayName(profile: {
  full_name: string | null;
  email: string;
}): string {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

function resolveProjectVolumeCents(client: Record<string, unknown>) {
  const oneTime = (client.one_time_project_value_cents as number | null) ?? 0;
  if (oneTime > 0) return oneTime;
  return (client.setup_fee_cents as number | null) ?? 0;
}

function mapProfileToFreelancerRecord(
  profile: FreelancerProfileRow,
  aggregate: FreelancerClientAggregate,
): FreelancerRecord {
  return {
    id: profile.id,
    name: formatFreelancerDisplayName(profile),
    company_name: null,
    contact_person: null,
    email: profile.email,
    phone: null,
    street: null,
    postal_code: null,
    city: null,
    country: null,
    tax_number: null,
    vat_id: null,
    iban: null,
    bic: null,
    default_commission_rate: Number(profile.commission_rate ?? 0),
    is_active: profile.status === "active",
    last_payout_at: aggregate.last_payout_at,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    total_earned_cents: aggregate.total_earned_cents,
    total_paid_out_cents: aggregate.total_paid_out_cents,
    outstanding_cents: aggregate.outstanding_cents,
    assigned_project_count: aggregate.assigned_project_names.length,
    assigned_project_names: aggregate.assigned_project_names,
    project_volume_cents: aggregate.project_volume_cents,
    profile_status: profile.status,
    role: profile.role,
  };
}

async function fetchActiveFreelancerProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<FreelancerProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, commission_rate, status, role, employment_type, agency_role, created_at, updated_at")
    .eq("employment_type", "freelancer")
    .eq("status", "active")
    .not("activated_at", "is", null)
    .order("full_name");

  if (error) throw new Error(error.message);
  return (data ?? []) as FreelancerProfileRow[];
}

async function fetchFreelancerClientAggregatesByProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, FreelancerClientAggregate>> {
  const aggregates = new Map<string, FreelancerClientAggregate>();

  const clientsResult = await supabase
    .from("clients")
    .select(
      "assigned_freelancer_id, company_name, setup_fee_cents, one_time_project_value_cents, freelancer_payout_cents, freelancer_paid_cents, freelancer_outstanding_cents",
    )
    .not("assigned_freelancer_id", "is", null);

  if (clientsResult.error) {
    if (isClientFreelancerSchemaMissingError(clientsResult.error.message)) {
      return aggregates;
    }
    throw new Error(clientsResult.error.message);
  }

  for (const client of clientsResult.data ?? []) {
    const freelancerId = client.assigned_freelancer_id as string;
    const current = aggregates.get(freelancerId) ?? {
      ...EMPTY_AGGREGATE,
      assigned_project_names: [],
    };

    current.total_earned_cents += (client.freelancer_payout_cents as number) ?? 0;
    current.total_paid_out_cents += (client.freelancer_paid_cents as number) ?? 0;
    current.outstanding_cents += (client.freelancer_outstanding_cents as number) ?? 0;
    current.project_volume_cents += resolveProjectVolumeCents(client);

    const companyName = String(client.company_name ?? "").trim();
    if (companyName) {
      current.assigned_project_names.push(companyName);
    }

    aggregates.set(freelancerId, current);
  }

  const payoutsResult = await supabase
    .from("client_freelancer_payouts")
    .select("freelancer_id, paid_at")
    .order("paid_at", { ascending: false });

  if (payoutsResult.error) {
    if (isClientFreelancerPayoutsSchemaMissingError(payoutsResult.error.message)) {
      return aggregates;
    }
    throw new Error(payoutsResult.error.message);
  }

  for (const payout of payoutsResult.data ?? []) {
    const freelancerId = payout.freelancer_id as string;
    const current = aggregates.get(freelancerId);
    if (!current || current.last_payout_at) continue;
    current.last_payout_at = payout.paid_at as string;
  }

  return aggregates;
}

export async function fetchFreelancerFinanceTotals(): Promise<{
  totalEarnedCents: number;
  totalPaidOutCents: number;
  openPayoutsCents: number;
}> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "freelancer_payout_cents, freelancer_paid_cents, freelancer_outstanding_cents",
    )
    .not("assigned_freelancer_id", "is", null);

  if (error) {
    if (isClientFreelancerSchemaMissingError(error.message)) {
      return {
        totalEarnedCents: 0,
        totalPaidOutCents: 0,
        openPayoutsCents: 0,
      };
    }
    throw new Error(error.message);
  }

  let totalEarnedCents = 0;
  let totalPaidOutCents = 0;
  let openPayoutsCents = 0;

  for (const client of data ?? []) {
    totalEarnedCents += (client.freelancer_payout_cents as number) ?? 0;
    totalPaidOutCents += (client.freelancer_paid_cents as number) ?? 0;
    openPayoutsCents += (client.freelancer_outstanding_cents as number) ?? 0;
  }

  return {
    totalEarnedCents,
    totalPaidOutCents,
    openPayoutsCents,
  };
}

function computeVendorFreelancerStats(
  invoices: { status: string; total_amount_cents: number }[],
  payouts: { status: string; amount_cents: number }[],
): {
  total_earned_cents: number;
  total_paid_out_cents: number;
  outstanding_cents: number;
} {
  let totalEarned = 0;
  let outstanding = 0;

  for (const invoice of invoices) {
    if (invoice.status === "submitted" || invoice.status === "paid") {
      totalEarned += invoice.total_amount_cents;
    }
    if (invoice.status === "submitted") {
      outstanding += invoice.total_amount_cents;
    }
  }

  let totalPaidOut = 0;
  for (const payout of payouts) {
    if (payout.status === "ausgezahlt") {
      totalPaidOut += payout.amount_cents;
    }
  }

  for (const invoice of invoices) {
    if (invoice.status === "paid") {
      totalPaidOut += invoice.total_amount_cents;
    }
  }

  outstanding = Math.max(
    0,
    outstanding -
      payouts
        .filter((p) => p.status === "ausgezahlt")
        .reduce((sum, p) => sum + p.amount_cents, 0),
  );

  return {
    total_earned_cents: totalEarned,
    total_paid_out_cents: totalPaidOut,
    outstanding_cents: outstanding,
  };
}

function mapVendorFreelancerRow(
  row: Record<string, unknown>,
  stats: ReturnType<typeof computeVendorFreelancerStats>,
): FreelancerRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    company_name: (row.company_name as string | null) ?? null,
    contact_person: (row.contact_person as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    street: (row.street as string | null) ?? null,
    postal_code: (row.postal_code as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    tax_number: (row.tax_number as string | null) ?? null,
    vat_id: (row.vat_id as string | null) ?? null,
    iban: (row.iban as string | null) ?? null,
    bic: (row.bic as string | null) ?? null,
    default_commission_rate: Number(row.default_commission_rate ?? 0),
    is_active: Boolean(row.is_active),
    last_payout_at: (row.last_payout_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    ...stats,
    assigned_project_count: 0,
    assigned_project_names: [],
    project_volume_cents: 0,
  };
}

async function getVendorFreelancerById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<FreelancerRecord | null> {
  const { data, error } = await supabase
    .from("freelancers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isFreelancerSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const [invoicesResult, payoutsResult] = await Promise.all([
    supabase
      .from("freelancer_invoices")
      .select("status, total_amount_cents")
      .eq("freelancer_id", id),
    supabase
      .from("freelancer_payouts")
      .select("status, amount_cents")
      .eq("freelancer_id", id),
  ]);

  const stats = computeVendorFreelancerStats(
    (invoicesResult.data ?? []).map((inv) => ({
      status: inv.status as string,
      total_amount_cents: inv.total_amount_cents as number,
    })),
    (payoutsResult.data ?? []).map((p) => ({
      status: p.status as string,
      amount_cents: p.amount_cents as number,
    })),
  );

  return mapVendorFreelancerRow(data, stats);
}

export async function getAllFreelancers(): Promise<FreelancerRecord[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const [freelancerProfiles, aggregatesByProfileId] = await Promise.all([
    fetchActiveFreelancerProfiles(supabase),
    fetchFreelancerClientAggregatesByProfileId(supabase),
  ]);

  return freelancerProfiles.map((freelancerProfile) =>
    mapProfileToFreelancerRecord(
      freelancerProfile,
      aggregatesByProfileId.get(freelancerProfile.id) ?? EMPTY_AGGREGATE,
    ),
  );
}

export async function getFreelancerById(
  id: string,
): Promise<FreelancerRecord | null> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) return null;

  const supabase = await createClient();
  const { data: freelancerProfile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, commission_rate, status, role, employment_type, created_at, updated_at")
    .eq("id", id)
    .eq("employment_type", "freelancer")
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (freelancerProfile) {
    const aggregatesByProfileId =
      await fetchFreelancerClientAggregatesByProfileId(supabase);

    return mapProfileToFreelancerRecord(
      freelancerProfile as FreelancerProfileRow,
      aggregatesByProfileId.get(id) ?? EMPTY_AGGREGATE,
    );
  }

  return getVendorFreelancerById(supabase, id);
}

export async function getFreelancerDetailData(
  id: string,
): Promise<FreelancerDetailData | null> {
  const freelancer = await getFreelancerById(id);
  if (!freelancer) return null;

  const [billingProfile, payouts, invoices] = await Promise.all([
    getOrCreateFreelancerProfile(id),
    getClientFreelancerPayoutsByFreelancerId(id),
    getFreelancerProfileInvoicesByProfileId(id),
  ]);

  return {
    freelancer,
    billingProfile,
    payouts,
    invoices,
  };
}
