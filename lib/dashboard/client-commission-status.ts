import type { CommissionEntryStatus } from "./commission-constants";
import type { CommissionEntryRecord } from "./types";

export interface ClientCommissionPayoutStatus {
  entry: CommissionEntryRecord | null;
  setterPaid: boolean;
  closerPaid: boolean;
}

export function resolveClientCommissionPayoutStatus(
  entry: CommissionEntryRecord | null,
  paidProfileIds: Set<string>,
): ClientCommissionPayoutStatus {
  if (!entry) {
    return { entry: null, setterPaid: false, closerPaid: false };
  }

  const setterPaid =
    !entry.setter_id ||
    entry.setter_commission_cents <= 0 ||
    paidProfileIds.has(entry.setter_id);
  const closerPaid =
    !entry.closer_id ||
    entry.closer_commission_cents <= 0 ||
    paidProfileIds.has(entry.closer_id);

  return { entry, setterPaid, closerPaid };
}

export function isCommissionEntryOpen(status: CommissionEntryStatus | null): boolean {
  return status === "pending" || status === "approved";
}
