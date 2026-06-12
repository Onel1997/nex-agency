import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import type { FreelancerRecord } from "./types";
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

function computeFreelancerStats(
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

  outstanding = Math.max(0, outstanding - payouts
    .filter((p) => p.status === "ausgezahlt")
    .reduce((sum, p) => sum + p.amount_cents, 0));

  return {
    total_earned_cents: totalEarned,
    total_paid_out_cents: totalPaidOut,
    outstanding_cents: outstanding,
  };
}

function mapFreelancerRow(
  row: Record<string, unknown>,
  stats: ReturnType<typeof computeFreelancerStats>,
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
  };
}

export async function getAllFreelancers(): Promise<FreelancerRecord[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data: freelancers, error } = await supabase
    .from("freelancers")
    .select("*")
    .order("name");

  if (error) {
    if (isFreelancerSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  const ids = (freelancers ?? []).map((f) => f.id as string);
  if (ids.length === 0) return [];

  const [invoicesResult, payoutsResult] = await Promise.all([
    supabase
      .from("freelancer_invoices")
      .select("freelancer_id, status, total_amount_cents")
      .in("freelancer_id", ids),
    supabase
      .from("freelancer_payouts")
      .select("freelancer_id, status, amount_cents")
      .in("freelancer_id", ids),
  ]);

  const invoicesByFreelancer = new Map<string, { status: string; total_amount_cents: number }[]>();
  for (const inv of invoicesResult.data ?? []) {
    const list = invoicesByFreelancer.get(inv.freelancer_id as string) ?? [];
    list.push({
      status: inv.status as string,
      total_amount_cents: inv.total_amount_cents as number,
    });
    invoicesByFreelancer.set(inv.freelancer_id as string, list);
  }

  const payoutsByFreelancer = new Map<string, { status: string; amount_cents: number }[]>();
  for (const payout of payoutsResult.data ?? []) {
    const list = payoutsByFreelancer.get(payout.freelancer_id as string) ?? [];
    list.push({
      status: payout.status as string,
      amount_cents: payout.amount_cents as number,
    });
    payoutsByFreelancer.set(payout.freelancer_id as string, list);
  }

  return (freelancers ?? []).map((row) => {
    const id = row.id as string;
    const stats = computeFreelancerStats(
      invoicesByFreelancer.get(id) ?? [],
      payoutsByFreelancer.get(id) ?? [],
    );
    return mapFreelancerRow(row, stats);
  });
}

export async function getFreelancerById(
  id: string,
): Promise<FreelancerRecord | null> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) return null;

  const supabase = await createClient();
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

  const stats = computeFreelancerStats(
    (invoicesResult.data ?? []).map((inv) => ({
      status: inv.status as string,
      total_amount_cents: inv.total_amount_cents as number,
    })),
    (payoutsResult.data ?? []).map((p) => ({
      status: p.status as string,
      amount_cents: p.amount_cents as number,
    })),
  );

  return mapFreelancerRow(data, stats);
}
