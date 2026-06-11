export type RetainerPaymentStatus = "paid" | "open";

export interface RetainerPaymentRecord {
  period_year: number;
  period_month: number;
  status: RetainerPaymentStatus;
  paid_at?: string | null;
}

export interface RetainerPeriodView {
  period_year: number;
  period_month: number;
  label: string;
  status: RetainerPaymentStatus;
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

export function buildRetainerPeriodViews(
  contractStartDate: string | null,
  monthlyRevenueCents: number | null,
  payments: RetainerPaymentRecord[],
  referenceDate: Date = new Date(),
): RetainerPeriodView[] {
  if (!contractStartDate || !hasActiveRetainer(monthlyRevenueCents)) return [];

  const paymentMap = new Map(
    payments.map((payment) => [
      periodKey(payment.period_year, payment.period_month),
      payment.status,
    ]),
  );
  const current = startOfMonth(referenceDate);
  const periods = getBillingPeriods(contractStartDate, referenceDate, 1);

  return periods.map(({ period_year, period_month }) => {
    const periodDate = new Date(period_year, period_month - 1, 1);
    const isUpcoming = periodDate > current;
    const status = paymentMap.get(periodKey(period_year, period_month)) ?? "open";

    return {
      period_year,
      period_month,
      label: formatRetainerPeriodLabel(period_year, period_month),
      status,
      isUpcoming,
    };
  });
}

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
  setup_fee_cents: number | null;
  monthly_revenue_cents: number | null;
  payments: RetainerPaymentRecord[];
  referenceDate?: Date;
}): RetainerStats {
  const setup = input.setup_fee_cents ?? 0;
  const monthly = input.monthly_revenue_cents ?? 0;
  const payments = input.payments;
  const paidMonths = countPaidRetainerMonths(payments);
  const retainerRevenue = monthly * paidMonths;
  const totalRevenue =
    computeRetainerTotalRevenueCents(setup, monthly, paidMonths) ?? 0;

  if (!input.contract_start_date || monthly <= 0) {
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
  const current = startOfMonth(referenceDate);
  const periodViews = buildRetainerPeriodViews(
    input.contract_start_date,
    monthly,
    payments,
    referenceDate,
  );
  const activePeriods = periodViews.filter((period) => !period.isUpcoming);
  const openActivePeriods = activePeriods.filter(
    (period) => period.status === "open",
  );
  const nextOpenPeriod = periodViews.find((period) => period.status === "open");

  return {
    contract_start_date: input.contract_start_date,
    months_active: activePeriods.length,
    months_paid: paidMonths,
    months_open: openActivePeriods.length,
    next_payment_due: nextOpenPeriod?.label ?? null,
    outstanding_retainer_cents: openActivePeriods.length * monthly,
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
  payments?: RetainerPaymentRecord[];
}): number {
  const setup = input.setup_fee_cents ?? 0;
  const monthly = input.monthly_revenue_cents ?? 0;
  const payments = input.payments ?? [];
  const paidMonths = countPaidRetainerMonths(payments);

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
