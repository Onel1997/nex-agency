import type { CommissionGroupDisplayStatus } from "@/lib/dashboard/types";

const VARIANT_STYLES: Record<
  CommissionGroupDisplayStatus["variant"],
  string
> = {
  open: "bg-amber-500/15 text-amber-200 ring-amber-500/20",
  partial: "bg-sky-500/15 text-sky-200 ring-sky-500/20",
  approved: "bg-violet-500/15 text-violet-200 ring-violet-500/20",
  paid: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/20",
  active: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/20",
  limit: "bg-amber-500/15 text-amber-200 ring-amber-500/20",
  cancelled: "bg-slate-500/15 text-slate-200 ring-slate-500/20",
};

export function CommissionGroupStatusBadge({
  status,
}: {
  status: CommissionGroupDisplayStatus;
}) {
  return (
    <div className="space-y-1">
      <span
        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${VARIANT_STYLES[status.variant]}`}
      >
        {status.label}
      </span>
      {status.detail ? (
        <p className="text-xs text-muted-soft">{status.detail}</p>
      ) : null}
    </div>
  );
}
