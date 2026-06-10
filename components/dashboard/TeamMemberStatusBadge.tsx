import { STATUS_LABELS, type TeamMemberStatus } from "@/lib/auth/types";

const STATUS_STYLES: Record<TeamMemberStatus, string> = {
  pending: "bg-amber-500/15 text-amber-200 ring-amber-500/25",
  active: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  deactivated: "bg-red-500/15 text-red-300 ring-red-500/25",
};

interface TeamMemberStatusBadgeProps {
  status: TeamMemberStatus;
}

export function TeamMemberStatusBadge({ status }: TeamMemberStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
