import type { BillingCycle } from "./constants";

export interface BillingPeriod {
  year: number;
  month: number;
}

export function resolveRetainerAmountCents(client: {
  monthly_retainer_cents: number | null;
  monthly_revenue_cents?: number | null;
}): number {
  return (
    client.monthly_revenue_cents ??
    client.monthly_retainer_cents ??
    0
  );
}

export function isActiveRetainerContract(client: {
  contract_start_date: string | null;
  monthly_retainer_cents: number | null;
  monthly_revenue_cents?: number | null;
  auto_invoice_enabled: boolean;
}): boolean {
  return (
    Boolean(client.contract_start_date) &&
    resolveRetainerAmountCents(client) > 0 &&
    client.auto_invoice_enabled
  );
}

export function getBillingPeriodForDate(date: Date, cycle: BillingCycle): BillingPeriod {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (cycle === "monthly") {
    return { year, month };
  }

  if (cycle === "quarterly") {
    const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
    return { year, month: quarterStartMonth };
  }

  return { year, month };
}

export function advanceBillingDate(date: Date, cycle: BillingCycle): Date {
  const next = new Date(date);
  if (cycle === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else if (cycle === "quarterly") {
    next.setMonth(next.getMonth() + 3);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export function formatBillingPeriodLabel(period: BillingPeriod, cycle: BillingCycle): string {
  const monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

  if (cycle === "yearly") {
    return String(period.year);
  }

  if (cycle === "quarterly") {
    const quarter = Math.floor((period.month - 1) / 3) + 1;
    return `Q${quarter} ${period.year}`;
  }

  return `${monthNames[period.month - 1]} ${period.year}`;
}
