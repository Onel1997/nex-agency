import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/dashboard/constants";

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-violet-500/15 text-violet-300 ring-violet-500/25",
  contacted: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/25",
  appointment: "bg-blue-500/15 text-blue-300 ring-blue-500/25",
  proposal: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  client: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  lost: "bg-slate-500/15 text-slate-400 ring-slate-500/20",
};

interface StatusBadgeProps {
  status: LeadStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
