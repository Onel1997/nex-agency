import type { ProfitPeriod } from "./constants";
import type {
  ClientRevenueRecord,
  ExpenseRecord,
  FreelancerInvoiceRecord,
  ProfitBreakdown,
} from "./types";

import { isContractRevenueActive } from "./contract-status";

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

/**
 * Contract-based customer revenue — same basis as Gesamtumsatz KPI.
 * Setup → Vertragsbeginn; Retainer → bezahlte Abrechnungsperiode.
 */
export function sumCustomerRevenueFromClients(
  clients: ClientRevenueRecord[],
  period: ProfitPeriod,
): number {
  if (period === "total") {
    return clients.reduce(
      (sum, client) => sum + (client.total_revenue_cents ?? 0),
      0,
    );
  }

  let total = 0;

  for (const client of clients) {
    if (!isContractRevenueActive(client)) continue;

    const setup = client.setup_fee_cents ?? 0;
    if (setup > 0 && client.contract_start_date) {
      const setupDate = parseDate(client.contract_start_date);
      if (isInPeriod(setupDate, period)) {
        total += setup;
      }
    }

    const monthly = client.monthly_revenue_cents ?? 0;
    if (monthly <= 0) continue;

    for (const retainerPeriod of client.retainer_periods) {
      if (retainerPeriod.status !== "paid") continue;

      const periodDate = new Date(
        retainerPeriod.period_year,
        retainerPeriod.period_month - 1,
        1,
      );
      if (isInPeriod(periodDate, period)) {
        total += monthly;
      }
    }
  }

  return total;
}

/**
 * Provisionen werden dem Vertragsbeginn zugeordnet (Setup-Provision),
 * nicht dem Auszahlungsdatum — dieselbe Datumsregel wie Setup-Umsatz.
 */
export function sumCommissionFromClients(
  clients: ClientRevenueRecord[],
  period: ProfitPeriod,
): number {
  if (period === "total") {
    return clients.reduce((sum, client) => sum + client.commission_total_cents, 0);
  }

  let total = 0;

  for (const client of clients) {
    if (client.commission_total_cents <= 0) continue;
    if (!isContractRevenueActive(client)) continue;

    const setup = client.setup_fee_cents ?? 0;
    if (setup <= 0 || !client.contract_start_date) continue;

    const setupDate = parseDate(client.contract_start_date);
    if (isInPeriod(setupDate, period)) {
      total += client.commission_total_cents;
    }
  }

  return total;
}

/**
 * Client-scoped freelancer payouts (Setup-Anteil) — dem Vertragsbeginn zugeordnet.
 */
export function sumClientFreelancerCostsFromClients(
  clients: ClientRevenueRecord[],
  period: ProfitPeriod,
): number {
  if (period === "total") {
    return clients.reduce((sum, client) => sum + client.freelancer_payout_cents, 0);
  }

  let total = 0;

  for (const client of clients) {
    if (client.freelancer_payout_cents <= 0) continue;
    if (!isContractRevenueActive(client)) continue;

    const setup = client.setup_fee_cents ?? 0;
    if (setup <= 0 || !client.contract_start_date) continue;

    const setupDate = parseDate(client.contract_start_date);
    if (isInPeriod(setupDate, period)) {
      total += client.freelancer_payout_cents;
    }
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

export function computeProfitBreakdown(params: {
  period: ProfitPeriod;
  clients: ClientRevenueRecord[];
  freelancerInvoices: FreelancerInvoiceRecord[];
  expenses: ExpenseRecord[];
}): ProfitBreakdown {
  const customerRevenueCents = sumCustomerRevenueFromClients(
    params.clients,
    params.period,
  );
  const freelancerCostsCents =
    sumFreelancerCosts(params.freelancerInvoices, params.period) +
    sumClientFreelancerCostsFromClients(params.clients, params.period);
  const agencyCostsCents = sumAgencyCosts(params.expenses, params.period);
  const commissionsCents = sumCommissionFromClients(params.clients, params.period);

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
  clients: ClientRevenueRecord[];
  freelancerInvoices: FreelancerInvoiceRecord[];
  expenses: ExpenseRecord[];
}): ProfitBreakdown[] {
  const periods: ProfitPeriod[] = ["month", "quarter", "year", "total"];
  return periods.map((period) => computeProfitBreakdown({ ...params, period }));
}
