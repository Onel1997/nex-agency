import {
  FREELANCER_PAYOUT_STATUS_LABELS,
  type FreelancerPayoutStatus,
} from "@/lib/dashboard/constants";

const STATUS_STYLES: Record<FreelancerPayoutStatus, string> = {
  offen: "bg-amber-500/15 text-amber-200 ring-amber-500/25",
  ausgezahlt: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
};

export function FreelancerPayoutStatusBadge({
  status,
}: {
  status: FreelancerPayoutStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {FREELANCER_PAYOUT_STATUS_LABELS[status]}
    </span>
  );
}
