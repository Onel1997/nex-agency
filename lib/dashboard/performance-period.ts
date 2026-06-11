export const PERFORMANCE_PERIODS = [
  "today",
  "week",
  "month",
  "year",
  "all",
] as const;

export type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number];

export const PERFORMANCE_PERIOD_LABELS: Record<PerformancePeriod, string> = {
  today: "Heute",
  week: "Diese Woche",
  month: "Dieser Monat",
  year: "Dieses Jahr",
  all: "Alle Zeit",
};

export interface PerformanceDateRange {
  start: Date | null;
  end: Date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return startOfDay(monday);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

export function parsePerformancePeriod(
  value: string | null | undefined,
): PerformancePeriod {
  if (value && PERFORMANCE_PERIODS.includes(value as PerformancePeriod)) {
    return value as PerformancePeriod;
  }
  return "month";
}

export function getPerformanceDateRange(
  period: PerformancePeriod,
  referenceDate: Date = new Date(),
): PerformanceDateRange {
  const end = referenceDate;

  switch (period) {
    case "today":
      return { start: startOfDay(referenceDate), end };
    case "week":
      return { start: startOfWeek(referenceDate), end };
    case "month":
      return { start: startOfMonth(referenceDate), end };
    case "year":
      return { start: startOfYear(referenceDate), end };
    case "all":
    default:
      return { start: null, end };
  }
}

export function isTimestampInRange(
  timestamp: string | null | undefined,
  range: PerformanceDateRange,
): boolean {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  if (range.start && date < range.start) return false;
  return date <= range.end;
}

export function isPeriodMonthInRange(
  year: number,
  month: number,
  range: PerformanceDateRange,
): boolean {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
  if (range.start && periodEnd < range.start) return false;
  return periodStart <= range.end;
}
