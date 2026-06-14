import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingCycle } from "./constants";
import {
  advanceBillingDate,
  formatBillingPeriodLabel,
  getBillingPeriodForDate,
  isActiveRetainerContract,
  resolveRetainerAmountCents,
} from "./billing-cycle";
import { createInvoiceRecord } from "./invoice-create";
import { isClientSoftDeleteSchemaMissingError } from "./client-soft-delete";

export interface RecurringContractRow {
  id: string;
  company_name: string;
  contract_start_date: string;
  monthly_retainer_cents: number | null;
  monthly_revenue_cents: number | null;
  billing_cycle: BillingCycle;
  next_invoice_date: string;
  last_invoice_date: string | null;
  auto_invoice_enabled: boolean;
}

export interface GenerateRecurringInvoicesResult {
  processed: number;
  created: number;
  skipped: number;
  errors: string[];
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function hasRetainerInvoiceForPeriod(
  supabase: ReturnType<typeof createAdminClient>,
  contractId: string,
  period: { year: number; month: number },
): Promise<boolean> {
  const { count, error } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contractId)
    .eq("invoice_type", "retainer")
    .eq("billing_period_year", period.year)
    .eq("billing_period_month", period.month)
    .neq("status", "cancelled");

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

async function fetchDueRecurringContracts(
  supabase: ReturnType<typeof createAdminClient>,
  today: string,
): Promise<RecurringContractRow[]> {
  const select = `
      id,
      company_name,
      contract_start_date,
      monthly_retainer_cents,
      monthly_revenue_cents,
      billing_cycle,
      next_invoice_date,
      last_invoice_date,
      auto_invoice_enabled
    `;

  const buildQuery = () =>
    supabase
      .from("clients")
      .select(select)
      .eq("auto_invoice_enabled", true)
      .not("contract_start_date", "is", null)
      .not("next_invoice_date", "is", null)
      .lte("next_invoice_date", today);

  let { data, error } = await buildQuery().is("deleted_at", null);

  if (error && isClientSoftDeleteSchemaMissingError(error.message)) {
    ({ data, error } = await buildQuery());
  }

  if (error) {
    if (error.message.includes("billing_cycle") || error.message.includes("next_invoice_date")) {
      return [];
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as RecurringContractRow[];
  return rows.filter((row) => isActiveRetainerContract(row) && resolveRetainerAmountCents(row) > 0);
}

export async function generateRecurringInvoices(
  referenceDate: Date = new Date(),
): Promise<GenerateRecurringInvoicesResult> {
  const supabase = createAdminClient();
  const today = toDateOnlyString(referenceDate);
  const result: GenerateRecurringInvoicesResult = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: [],
  };

  let contracts: RecurringContractRow[];
  try {
    contracts = await fetchDueRecurringContracts(supabase, today);
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Verträge konnten nicht geladen werden");
    return result;
  }

  for (const contract of contracts) {
    result.processed += 1;

    try {
      const invoiceDate = parseDateOnly(contract.next_invoice_date);
      const period = getBillingPeriodForDate(invoiceDate, contract.billing_cycle);
      const retainerCents = resolveRetainerAmountCents(contract);

      const duplicate = await hasRetainerInvoiceForPeriod(supabase, contract.id, period);
      if (duplicate) {
        result.skipped += 1;
        const nextDate = advanceBillingDate(invoiceDate, contract.billing_cycle);
        await supabase
          .from("clients")
          .update({
            next_invoice_date: toDateOnlyString(nextDate),
            last_invoice_date: contract.next_invoice_date,
          })
          .eq("id", contract.id);
        continue;
      }

      const periodLabel = formatBillingPeriodLabel(period, contract.billing_cycle);
      await createInvoiceRecord(supabase, {
        clientId: contract.id,
        contractId: contract.id,
        subtotalCents: retainerCents,
        status: "draft",
        description: `Retainer-Leistung — ${contract.company_name} (${periodLabel})`,
        invoiceType: "retainer",
        billingPeriodYear: period.year,
        billingPeriodMonth: period.month,
        invoiceDate,
      });

      const nextDate = advanceBillingDate(invoiceDate, contract.billing_cycle);
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          last_invoice_date: contract.next_invoice_date,
          next_invoice_date: toDateOnlyString(nextDate),
        })
        .eq("id", contract.id);

      if (updateError) throw new Error(updateError.message);
      result.created += 1;
    } catch (error) {
      result.errors.push(
        `${contract.company_name}: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
      );
    }
  }

  return result;
}
