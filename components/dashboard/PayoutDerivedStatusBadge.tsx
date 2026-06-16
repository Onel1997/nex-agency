import {
  PAYOUT_DERIVED_STATUS_LABELS,
  type PayoutDerivedStatus,
} from "@/lib/dashboard/payout-center-constants";

const VARIANTS: Record<
  PayoutDerivedStatus,
  string
> = {
  offen: "bg-amber-500/15 text-amber-200 ring-amber-500/25",
  freigegeben: "bg-sky-500/15 text-sky-200 ring-sky-500/25",
  ausgezahlt: "bg-violet-500/15 text-violet-200 ring-violet-500/25",
  abgeschlossen: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
};

interface PayoutDerivedStatusBadgeProps {
  status: PayoutDerivedStatus;
}

export function PayoutDerivedStatusBadge({ status }: PayoutDerivedStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ring-1 ${VARIANTS[status]}`}
    >
      {PAYOUT_DERIVED_STATUS_LABELS[status]}
    </span>
  );
}
