import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import type {
  FreelancerInvoiceRecord,
  FreelancerInvoiceWithDetails,
} from "./types";
import { createClient } from "@/lib/supabase/server";
import { getFreelancerById, isFreelancerSchemaMissingError } from "./freelancers";

function mapInvoiceRow(row: Record<string, unknown>): FreelancerInvoiceRecord {
  const freelancer = Array.isArray(row.freelancer)
    ? row.freelancer[0]
    : row.freelancer;

  return {
    id: row.id as string,
    freelancer_id: row.freelancer_id as string,
    invoice_number: row.invoice_number as string,
    description: row.description as string,
    subtotal_cents: row.subtotal_cents as number,
    tax_amount_cents: row.tax_amount_cents as number,
    total_amount_cents: row.total_amount_cents as number,
    vat_rate: Number(row.vat_rate ?? 19),
    status: row.status as FreelancerInvoiceRecord["status"],
    due_date: (row.due_date as string | null) ?? null,
    submitted_at: (row.submitted_at as string | null) ?? null,
    paid_at: (row.paid_at as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    freelancer_name: (freelancer as { name: string } | null)?.name,
  };
}

export async function getAllFreelancerInvoices(): Promise<FreelancerInvoiceRecord[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("freelancer_invoices")
    .select("*, freelancer:freelancers(name)")
    .order("created_at", { ascending: false });

  if (error) {
    if (isFreelancerSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapInvoiceRow(row));
}

export async function getFreelancerInvoicesByFreelancerId(
  freelancerId: string,
): Promise<FreelancerInvoiceRecord[]> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("freelancer_invoices")
    .select("*, freelancer:freelancers(name)")
    .eq("freelancer_id", freelancerId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isFreelancerSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapInvoiceRow(row));
}

export async function getFreelancerInvoiceWithDetails(
  id: string,
): Promise<FreelancerInvoiceWithDetails | null> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("freelancer_invoices")
    .select("*, freelancer:freelancers(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isFreelancerSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const freelancer = await getFreelancerById(data.freelancer_id as string);
  if (!freelancer) return null;

  return {
    ...mapInvoiceRow(data),
    freelancer,
  };
}

export function computeFreelancerInvoiceStats(
  invoices: FreelancerInvoiceRecord[],
): {
  openFreelancerInvoicesCents: number;
  paidFreelancerInvoicesCents: number;
  outstandingFreelancerInvoicesCents: number;
} {
  let openFreelancerInvoicesCents = 0;
  let paidFreelancerInvoicesCents = 0;
  let outstandingFreelancerInvoicesCents = 0;

  for (const invoice of invoices) {
    if (invoice.status === "submitted") {
      openFreelancerInvoicesCents += invoice.total_amount_cents;
      outstandingFreelancerInvoicesCents += invoice.total_amount_cents;
    } else if (invoice.status === "paid") {
      paidFreelancerInvoicesCents += invoice.total_amount_cents;
    }
  }

  return {
    openFreelancerInvoicesCents,
    paidFreelancerInvoicesCents,
    outstandingFreelancerInvoicesCents,
  };
}
