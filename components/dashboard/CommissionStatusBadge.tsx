import {
  COMMISSION_STATUS_LABELS,
  type CommissionStatus,
} from "@/lib/dashboard/constants";

const STATUS_STYLES: Record<CommissionStatus, string> = {
  none: "bg-slate-500/15 text-slate-300 ring-slate-500/25",
  pending: "bg-amber-500/15 text-amber-200 ring-amber-500/25",
  outstanding: "bg-orange-500/15 text-orange-200 ring-orange-500/25",
  paid: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
};

export function CommissionStatusBadge({ status }: { status: CommissionStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {COMMISSION_STATUS_LABELS[status]}
    </span>
  );
}
