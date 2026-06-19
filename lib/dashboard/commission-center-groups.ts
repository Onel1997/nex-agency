import type { CommissionEntryStatus } from "./commission-constants";
import type { CommissionEntryType } from "./commission-constants";
import type {
  CommissionEntryGroup,
  CommissionEntryRecord,
  CommissionGroupDisplayStatus,
  CommissionRetainerProgress,
  RetainerMonthPlanRow,
} from "./types";
import { buildPlannedRetainerMonths } from "./retainer-commission-plan";

function entryTotalCents(entry: CommissionEntryRecord): number {
  return entry.setter_commission_cents + entry.closer_commission_cents;
}

function compareEntriesByPeriod(
  left: CommissionEntryRecord,
  right: CommissionEntryRecord,
): number {
  const leftYear = left.billing_period_year ?? 0;
  const rightYear = right.billing_period_year ?? 0;
  if (leftYear !== rightYear) return leftYear - rightYear;

  const leftMonth = left.billing_period_month ?? 0;
  const rightMonth = right.billing_period_month ?? 0;
  if (leftMonth !== rightMonth) return leftMonth - rightMonth;

  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

export function resolveCommissionGroupStatus(
  entries: CommissionEntryRecord[],
): CommissionEntryStatus {
  const active = entries.filter((entry) => entry.status !== "cancelled");
  if (active.length === 0) return "cancelled";
  if (active.some((entry) => entry.status === "pending")) return "pending";
  if (active.some((entry) => entry.status === "approved")) return "approved";
  if (active.every((entry) => entry.status === "paid")) return "paid";
  return "pending";
}

export function formatRetainerProgressLabel(
  billedMonths: number,
  allowedMonths: number,
): CommissionRetainerProgress {
  if (billedMonths >= allowedMonths) {
    return {
      primary: `${billedMonths} von ${allowedMonths} Provisionsmonaten abgerechnet`,
      secondary: "Provisionslimit erreicht",
    };
  }

  return {
    primary: `${billedMonths} von ${allowedMonths} Provisionsmonaten abgerechnet`,
    secondary: null,
  };
}

export function resolveGroupDisplayStatus(input: {
  entry_type: CommissionEntryType;
  entries: CommissionEntryRecord[];
  openEntryCount: number;
  paidEntryCount: number;
  retainerMonthCount: number;
  allowedRetainerMonths: number | null;
}): CommissionGroupDisplayStatus {
  const active = input.entries.filter((entry) => entry.status !== "cancelled");

  if (active.length === 0) {
    return { label: "Storniert", detail: null, variant: "cancelled" };
  }

  if (input.entry_type === "setup") {
    const entry = active[0];
    if (entry.status === "paid") {
      return { label: "Ausbezahlt", detail: null, variant: "paid" };
    }
    if (entry.status === "approved") {
      return { label: "Freigegeben", detail: "Bereit zur Auszahlung", variant: "approved" };
    }
    return { label: "Offen", detail: "Noch nicht freigegeben", variant: "open" };
  }

  const { openEntryCount, paidEntryCount } = input;

  if (paidEntryCount > 0 && openEntryCount > 0) {
    return {
      label: "Teilweise ausgezahlt",
      detail: `${openEntryCount} offen / ${paidEntryCount} bezahlt`,
      variant: "partial",
    };
  }

  if (openEntryCount > 0 && paidEntryCount === 0) {
    return { label: "Offen", detail: null, variant: "open" };
  }

  if (paidEntryCount > 0 && openEntryCount === 0) {
    return { label: "Bezahlt", detail: null, variant: "paid" };
  }

  return { label: "Offen", detail: null, variant: "open" };
}

function buildGroup(
  key: string,
  sortedEntries: CommissionEntryRecord[],
): CommissionEntryGroup {
  const first = sortedEntries[0];
  const activeEntries = sortedEntries.filter(
    (entry) => entry.status !== "cancelled",
  );

  let openCents = 0;
  let paidCents = 0;
  let totalCents = 0;
  let openEntryCount = 0;
  let paidEntryCount = 0;

  for (const entry of activeEntries) {
    const total = entryTotalCents(entry);
    totalCents += total;

    if (entry.status === "pending" || entry.status === "approved") {
      openCents += total;
      openEntryCount += 1;
    }
    if (entry.status === "paid") {
      paidCents += total;
      paidEntryCount += 1;
    }
  }

  const entryType = first.entry_type;
  const allowedRetainerMonths =
    entryType === "retainer"
      ? first.allowed_retainer_months ?? activeEntries.length
      : null;

  const displayStatus = resolveGroupDisplayStatus({
    entry_type: entryType,
    entries: sortedEntries,
    openEntryCount,
    paidEntryCount,
    retainerMonthCount: activeEntries.length,
    allowedRetainerMonths,
  });

  return {
    key,
    client_id: first.client_id,
    client_name: first.client_name,
    entry_type: entryType,
    entries: sortedEntries,
    openCents,
    paidCents,
    totalCents,
    openEntryCount,
    paidEntryCount,
    retainerMonthCount: activeEntries.length,
    allowedRetainerMonths,
    status: resolveCommissionGroupStatus(sortedEntries),
    displayStatus,
    retainerProgress:
      entryType === "retainer" && allowedRetainerMonths != null
        ? formatRetainerProgressLabel(
            activeEntries.length,
            allowedRetainerMonths,
          )
        : null,
    plannedMonths:
      entryType === "retainer" && allowedRetainerMonths != null
        ? buildPlannedRetainerMonths({
            contractStartDate: first.contract_start_date,
            allowedMonths: allowedRetainerMonths,
            entries: sortedEntries,
          })
        : [],
    expandable: entryType === "retainer" && activeEntries.length > 0,
  };
}

export function groupCommissionEntriesForCenter(
  entries: CommissionEntryRecord[],
): CommissionEntryGroup[] {
  const retainerByClient = new Map<string, CommissionEntryRecord[]>();
  const setupGroups: CommissionEntryGroup[] = [];

  for (const entry of entries) {
    if (entry.entry_type === "setup") {
      setupGroups.push(buildGroup(entry.id, [entry]));
      continue;
    }

    const current = retainerByClient.get(entry.client_id) ?? [];
    current.push(entry);
    retainerByClient.set(entry.client_id, current);
  }

  const retainerGroups = [...retainerByClient.entries()].map(([clientId, groupEntries]) =>
    buildGroup(
      `${clientId}:retainer`,
      [...groupEntries].sort(compareEntriesByPeriod),
    ),
  );

  const sortByLatest = (left: CommissionEntryGroup, right: CommissionEntryGroup) => {
    const leftLatest = left.entries[left.entries.length - 1]?.created_at ?? "";
    const rightLatest = right.entries[right.entries.length - 1]?.created_at ?? "";
    return new Date(rightLatest).getTime() - new Date(leftLatest).getTime();
  };

  return [...retainerGroups.sort(sortByLatest), ...setupGroups.sort(sortByLatest)];
}

export function getActiveRetainerEntries(
  group: CommissionEntryGroup,
): CommissionEntryRecord[] {
  return group.entries.filter((entry) => entry.status !== "cancelled");
}

export function getLatestRetainerEntry(
  group: CommissionEntryGroup,
): CommissionEntryRecord | null {
  const activeEntries = getActiveRetainerEntries(group);
  return activeEntries[activeEntries.length - 1] ?? null;
}

export function collectRetainerPlanEntriesByStatus(
  rows: RetainerMonthPlanRow[],
  status: CommissionEntryStatus,
): CommissionEntryRecord[] {
  const entries: CommissionEntryRecord[] = [];

  for (const row of rows) {
    if (row.entry?.status === status) {
      entries.push(row.entry);
    }
  }

  return entries;
}

export function splitCommissionGroups(groups: CommissionEntryGroup[]): {
  retainerGroups: CommissionEntryGroup[];
  setupGroups: CommissionEntryGroup[];
} {
  return {
    retainerGroups: groups.filter((group) => group.entry_type === "retainer"),
    setupGroups: groups.filter((group) => group.entry_type === "setup"),
  };
}
