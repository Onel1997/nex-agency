import type { CommissionEntryStatus } from "./commission-constants";
import { calculateSetterCloserCommissions } from "./commission-entries";
import { resolveRetainerAmountCents } from "./billing-cycle";
import type { CommissionEntryRecord, RetainerMonthPlanRow } from "./types";

function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseContractStartPeriod(
  contractStartDate: string | null | undefined,
): { year: number; month: number } | null {
  if (!contractStartDate) return null;

  const match = contractStartDate.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

export function shiftBillingPeriod(
  year: number,
  month: number,
  offset: number,
): { year: number; month: number } {
  const date = new Date(year, month - 1 + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function resolveProjectionBasis(entries: CommissionEntryRecord[]) {
  const basis =
    entries.find((entry) => entry.status !== "cancelled") ?? entries[0];

  const projectValueCents =
    basis.project_value_cents > 0
      ? basis.project_value_cents
      : resolveRetainerAmountCents({
          monthly_retainer_cents: basis.monthly_retainer_cents,
          monthly_revenue_cents: basis.monthly_retainer_cents,
        });

  const commissions = calculateSetterCloserCommissions({
    projectValueCents,
    setterRate: basis.setter_rate,
    closerRate: basis.closer_rate,
    hasSetter: Boolean(basis.setter_id),
    hasCloser: Boolean(basis.closer_id),
  });

  return {
    setter_commission_cents: commissions.setter_commission_cents,
    closer_commission_cents: commissions.closer_commission_cents,
  };
}

function mapEntryToPlanRow(entry: CommissionEntryRecord): RetainerMonthPlanRow | null {
  if (entry.billing_period_year == null || entry.billing_period_month == null) {
    return null;
  }

  return {
    id: entry.id,
    billing_period_year: entry.billing_period_year,
    billing_period_month: entry.billing_period_month,
    setter_commission_cents: entry.setter_commission_cents,
    closer_commission_cents: entry.closer_commission_cents,
    status: entry.status,
    entry,
    isPlanned: false,
  };
}

export function buildPlannedRetainerMonths(input: {
  contractStartDate: string | null;
  allowedMonths: number;
  entries: CommissionEntryRecord[];
}): RetainerMonthPlanRow[] {
  const activeEntries = input.entries.filter(
    (entry) => entry.status !== "cancelled",
  );
  const startPeriod = parseContractStartPeriod(input.contractStartDate);

  if (!startPeriod || input.allowedMonths <= 0) {
    return activeEntries
      .map(mapEntryToPlanRow)
      .filter((row): row is RetainerMonthPlanRow => row != null)
      .sort((left, right) => {
        if (left.billing_period_year !== right.billing_period_year) {
          return left.billing_period_year - right.billing_period_year;
        }
        return left.billing_period_month - right.billing_period_month;
      });
  }

  const entriesByPeriod = new Map<string, CommissionEntryRecord>();
  for (const entry of activeEntries) {
    if (entry.billing_period_year == null || entry.billing_period_month == null) {
      continue;
    }
    entriesByPeriod.set(
      periodKey(entry.billing_period_year, entry.billing_period_month),
      entry,
    );
  }

  const projection = resolveProjectionBasis(input.entries);
  const rows: RetainerMonthPlanRow[] = [];

  for (let index = 0; index < input.allowedMonths; index += 1) {
    const period = shiftBillingPeriod(
      startPeriod.year,
      startPeriod.month,
      index,
    );
    const key = periodKey(period.year, period.month);
    const entry = entriesByPeriod.get(key) ?? null;

    if (entry) {
      const mapped = mapEntryToPlanRow(entry);
      if (mapped) rows.push(mapped);
      continue;
    }

    rows.push({
      id: `planned-${key}`,
      billing_period_year: period.year,
      billing_period_month: period.month,
      setter_commission_cents: projection.setter_commission_cents,
      closer_commission_cents: projection.closer_commission_cents,
      status: "pending" as CommissionEntryStatus,
      entry: null,
      isPlanned: true,
    });
  }

  return rows;
}
