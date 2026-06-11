import {
  countPaidRetainerMonths,
  computeRetainerTotalRevenueCents,
  resolveClientTotalRevenueCents,
  type RetainerPaymentRecord,
} from "./retainer";

export { resolveClientTotalRevenueCents } from "./retainer";

export function computeTotalRevenueCents(
  setupFeeCents: number | null,
  monthlyRevenueCents: number | null,
  paidMonthsCount = 0,
): number | null {
  return computeRetainerTotalRevenueCents(
    setupFeeCents,
    monthlyRevenueCents,
    paidMonthsCount,
  );
}

export function calculateCommissionCents(
  setupFeeCents: number | null,
  rate: number | null,
): number {
  const setup = setupFeeCents ?? 0;
  if (setup <= 0 || !rate || rate <= 0) return 0;
  return Math.round((setup * rate) / 100);
}

export function resolveLegacyClientTotalRevenueCents(client: {
  monthly_revenue_cents?: number | null;
  setup_fee_cents?: number | null;
  total_revenue_cents?: number | null;
  contract_start_date?: string | null;
  payments?: RetainerPaymentRecord[];
}): number {
  return resolveClientTotalRevenueCents(client);
}

export function countPaidMonthsFromPayments(
  payments: RetainerPaymentRecord[],
): number {
  return countPaidRetainerMonths(payments);
}
