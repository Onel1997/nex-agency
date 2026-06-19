import { isContractRevenueActive } from "./contract-status";
import type { ContractStatus } from "./constants";
import { resolveInvoiceType } from "./invoice-type";
import type { InvoiceRecord } from "./types";

export type RetainerPaymentStatus = "paid" | "open";

export type RetainerPeriodStatus =
  | "paid"
  | "open"
  | "invoice_created"
  | "upcoming";

export interface RetainerPaymentRecord {
  period_year: number;
  period_month: number;
  status: RetainerPaymentStatus;
  paid_at?: string | null;
}

export interface RetainerPeriodInvoiceRef {
  billing_period_year: number | null;
  billing_period_month: number | null;
  status: string;
  invoice_type?: string | null;
  invoice_number?: string | null;
}

export interface RetainerPeriodView {
  period_year: number;
  period_month: number;
  label: string;
  status: RetainerPeriodStatus;
  isUpcoming: boolean;
}

export interface RetainerStats {
  contract_start_date: string | null;
  months_active: number;
  months_paid: number;
  months_open: number;
  next_payment_due: string | null;
  outstanding_retainer_cents: number;
  setup_revenue_cents: number;
  retainer_revenue_cents: number;
  total_revenue_cents: number;
}

export const RETAINER_PERIOD_STATUS_LABELS: Record<RetainerPeriodStatus, string> = {
  paid: "Bezahlt",
  open: "Offen",
  invoice_created: "Rechnung erstellt",
  upcoming: "Bevorstehend",
};

export function formatRetainerPeriodStatus(status: RetainerPeriodStatus): string {
  return RETAINER_PERIOD_STATUS_LABELS[status];
}

export function retainerPeriodStatusClassName(status: RetainerPeriodStatus): string {
  switch (status) {
    case "paid":
      return "text-emerald-300";
    case "invoice_created":
      return "text-sky-300";
    case "upcoming":
      return "text-muted-soft";
    default:
      return "text-amber-300";
  }
}

function periodKey(year: number, month: number) {
  return `${year}-${month}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function formatRetainerPeriodLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function hasActiveRetainer(
  monthlyRevenueCents: number | null | undefined,
): boolean {
  return (monthlyRevenueCents ?? 0) > 0;
}

export function getBillingPeriods(
  contractStartDate: string,
  referenceDate: Date = new Date(),
  futureMonths = 1,
) {
  const start = startOfMonth(new Date(`${contractStartDate}T12:00:00`));
  const current = startOfMonth(referenceDate);
  const end = addMonths(current, futureMonths);
  const periods: Array<{ period_year: number; period_month: number }> = [];

  for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
    periods.push({
      period_year: cursor.getFullYear(),
      period_month: cursor.getMonth() + 1,
    });
  }

  return periods;
}

function isRetainerInvoice(invoice: RetainerPeriodInvoiceRef): boolean {
  return resolveInvoiceType(invoice as InvoiceRecord) === "retainer";
}

export function resolveRetainerPeriodStatus(
  periodYear: number,
  periodMonth: number,
  retainerInvoices: RetainerPeriodInvoiceRef[],
  isUpcoming: boolean,
): RetainerPeriodStatus {
  if (isUpcoming) return "upcoming";

  const matching = retainerInvoices.filter(
    (invoice) =>
      isRetainerInvoice(invoice) &&
      invoice.billing_period_year === periodYear &&
      invoice.billing_period_month === periodMonth,
  );

  if (matching.some((invoice) => invoice.status === "paid")) return "paid";
  if (matching.length > 0) return "invoice_created";
  return "open";
}

export function buildRetainerPeriodViews(
  contractStartDate: string | null,
  monthlyRevenueCents: number | null,
  retainerInvoices: RetainerPeriodInvoiceRef[],
  referenceDate: Date = new Date(),
): RetainerPeriodView[] {
  if (!contractStartDate || !hasActiveRetainer(monthlyRevenueCents)) return [];

  const current = startOfMonth(referenceDate);
  const periods = getBillingPeriods(contractStartDate, referenceDate, 1);

  return periods.map(({ period_year, period_month }) => {
    const periodDate = new Date(period_year, period_month - 1, 1);
    const isUpcoming = periodDate > current;
    const status = resolveRetainerPeriodStatus(
      period_year,
      period_month,
      retainerInvoices,
      isUpcoming,
    );

    return {
      period_year,
      period_month,
      label: formatRetainerPeriodLabel(period_year, period_month),
      status,
      isUpcoming,
    };
  });
}

export function getNextOpenRetainerPeriod(
  periods: RetainerPeriodView[],
): RetainerPeriodView | null {
  return (
    periods.find(
      (period) => !period.isUpcoming && period.status !== "paid",
    ) ?? null
  );
}

export function countPaidRetainerPeriodsFromInvoices(
  retainerInvoices: RetainerPeriodInvoiceRef[],
): number {
  return listPaidRetainerPeriods(retainerInvoices).length;
}

export function listPaidRetainerPeriods(
  retainerInvoices: RetainerPeriodInvoiceRef[],
): Array<{ period_year: number; period_month: number }> {
  const paidPeriods = new Map<string, { period_year: number; period_month: number }>();

  for (const invoice of retainerInvoices) {
    if (!isRetainerInvoice(invoice) || invoice.status !== "paid") continue;
    if (invoice.billing_period_year == null || invoice.billing_period_month == null) {
      continue;
    }
    paidPeriods.set(
      periodKey(invoice.billing_period_year, invoice.billing_period_month),
      {
        period_year: invoice.billing_period_year,
        period_month: invoice.billing_period_month,
      },
    );
  }

  return [...paidPeriods.values()];
}

/** @deprecated Use countPaidRetainerPeriodsFromInvoices */
export function countPaidRetainerMonths(payments: RetainerPaymentRecord[]) {
  return payments.filter((payment) => payment.status === "paid").length;
}

export function computeRetainerTotalRevenueCents(
  setupFeeCents: number | null,
  monthlyRevenueCents: number | null,
  paidMonthsCount: number,
): number | null {
  const setup = setupFeeCents ?? 0;
  const monthly = monthlyRevenueCents ?? 0;
  const retainer = monthly * paidMonthsCount;

  if (setup === 0 && retainer === 0) return null;
  return setup + retainer;
}

export function buildRetainerStats(input: {
  contract_start_date: string | null;
  contract_status?: ContractStatus | string | null;
  setup_fee_cents: number | null;
  monthly_revenue_cents: number | null;
  retainerInvoices: RetainerPeriodInvoiceRef[];
  referenceDate?: Date;
}): RetainerStats {
  const revenueActive = isContractRevenueActive(input);
  const setup = revenueActive ? (input.setup_fee_cents ?? 0) : 0;
  const monthly = revenueActive ? (input.monthly_revenue_cents ?? 0) : 0;
  const paidMonths = countPaidRetainerPeriodsFromInvoices(input.retainerInvoices);
  const retainerRevenue = monthly * paidMonths;
  const totalRevenue =
    computeRetainerTotalRevenueCents(setup, monthly, paidMonths) ?? 0;

  if (!revenueActive || !input.contract_start_date || monthly <= 0) {
    return {
      contract_start_date: input.contract_start_date,
      months_active: paidMonths > 0 ? paidMonths : monthly > 0 ? 0 : 0,
      months_paid: paidMonths,
      months_open: 0,
      next_payment_due: null,
      outstanding_retainer_cents: 0,
      setup_revenue_cents: setup,
      retainer_revenue_cents: retainerRevenue,
      total_revenue_cents: totalRevenue,
    };
  }

  const referenceDate = input.referenceDate ?? new Date();
  const periodViews = buildRetainerPeriodViews(
    input.contract_start_date,
    monthly,
    input.retainerInvoices,
    referenceDate,
  );
  const activePeriods = periodViews.filter((period) => !period.isUpcoming);
  const openActivePeriods = activePeriods.filter(
    (period) => period.status === "open",
  );
  const unpaidActivePeriods = activePeriods.filter(
    (period) => period.status !== "paid",
  );
  const nextOpenPeriod = getNextOpenRetainerPeriod(periodViews);

  return {
    contract_start_date: input.contract_start_date,
    months_active: activePeriods.length,
    months_paid: paidMonths,
    months_open: openActivePeriods.length,
    next_payment_due: nextOpenPeriod?.label ?? null,
    outstanding_retainer_cents: unpaidActivePeriods.length * monthly,
    setup_revenue_cents: setup,
    retainer_revenue_cents: retainerRevenue,
    total_revenue_cents: totalRevenue,
  };
}

export function resolveClientTotalRevenueCents(input: {
  contract_start_date?: string | null;
  monthly_revenue_cents?: number | null;
  setup_fee_cents?: number | null;
  total_revenue_cents?: number | null;
  retainerInvoices?: RetainerPeriodInvoiceRef[];
  payments?: RetainerPaymentRecord[];
}): number {
  const setup = input.setup_fee_cents ?? 0;
  const monthly = input.monthly_revenue_cents ?? 0;
  const paidMonths = input.retainerInvoices
    ? countPaidRetainerPeriodsFromInvoices(input.retainerInvoices)
    : countPaidRetainerMonths(input.payments ?? []);

  if (input.contract_start_date && monthly > 0) {
    return computeRetainerTotalRevenueCents(setup, monthly, paidMonths) ?? 0;
  }

  if (paidMonths > 0) {
    return computeRetainerTotalRevenueCents(setup, monthly, paidMonths) ?? 0;
  }

  if (setup > 0 || monthly > 0) {
    return setup + monthly;
  }

  return 0;
}
