import type { ProfitPeriod } from "./constants";
import type {
  CommissionPayoutRecord,
  ExpenseRecord,
  FreelancerInvoiceRecord,
  InvoiceRecord,
  ProfitBreakdown,
} from "./types";

function parseDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T12:00:00`);
}

function isInPeriod(date: Date, period: ProfitPeriod, now = new Date()): boolean {
  if (period === "total") return true;

  const year = now.getFullYear();
  const month = now.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;

  if (period === "year") {
    return date.getFullYear() === year;
  }

  if (period === "month") {
    return date.getFullYear() === year && date.getMonth() === month;
  }

  if (period === "quarter") {
    return (
      date.getFullYear() === year &&
      date.getMonth() >= quarterStartMonth &&
      date.getMonth() < quarterStartMonth + 3
    );
  }

  return true;
}

function sumPaidCustomerRevenue(
  invoices: InvoiceRecord[],
  period: ProfitPeriod,
): number {
  let total = 0;
  for (const invoice of invoices) {
    if (invoice.status !== "paid") continue;
    const date = parseDate(invoice.updated_at ?? invoice.created_at);
    if (!isInPeriod(date, period)) continue;
    total += invoice.subtotal_cents;
  }
  return total;
}

function sumFreelancerCosts(
  invoices: FreelancerInvoiceRecord[],
  period: ProfitPeriod,
): number {
  let total = 0;
  for (const invoice of invoices) {
    if (invoice.status !== "paid") continue;
    const date = parseDate(invoice.paid_at ?? invoice.updated_at);
    if (!isInPeriod(date, period)) continue;
    total += invoice.subtotal_cents;
  }
  return total;
}

function sumAgencyCosts(expenses: ExpenseRecord[], period: ProfitPeriod): number {
  let total = 0;
  for (const expense of expenses) {
    const date = parseDate(expense.expense_date);
    if (!isInPeriod(date, period)) continue;
    total += expense.amount_cents;
  }
  return total;
}

function sumCommissionPayouts(
  payouts: CommissionPayoutRecord[],
  period: ProfitPeriod,
): number {
  let total = 0;
  for (const payout of payouts) {
    const date = parseDate(payout.payout_date);
    if (!isInPeriod(date, period)) continue;
    total += payout.amount_cents;
  }
  return total;
}

export function computeProfitBreakdown(params: {
  period: ProfitPeriod;
  customerInvoices: InvoiceRecord[];
  freelancerInvoices: FreelancerInvoiceRecord[];
  commissionPayouts: CommissionPayoutRecord[];
  expenses: ExpenseRecord[];
}): ProfitBreakdown {
  const customerRevenueCents = sumPaidCustomerRevenue(
    params.customerInvoices,
    params.period,
  );
  const freelancerCostsCents = sumFreelancerCosts(
    params.freelancerInvoices,
    params.period,
  );
  const agencyCostsCents = sumAgencyCosts(params.expenses, params.period);
  const commissionsCents = sumCommissionPayouts(
    params.commissionPayouts,
    params.period,
  );

  const profitCents =
    customerRevenueCents -
    freelancerCostsCents -
    commissionsCents -
    agencyCostsCents;

  return {
    period: params.period,
    customerRevenueCents,
    freelancerCostsCents,
    commissionsCents,
    agencyCostsCents,
    profitCents,
  };
}

export function computeAllProfitBreakdowns(params: {
  customerInvoices: InvoiceRecord[];
  freelancerInvoices: FreelancerInvoiceRecord[];
  commissionPayouts: CommissionPayoutRecord[];
  expenses: ExpenseRecord[];
}): ProfitBreakdown[] {
  const periods: ProfitPeriod[] = ["month", "quarter", "year", "total"];
  return periods.map((period) => computeProfitBreakdown({ ...params, period }));
}
