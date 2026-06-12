import {
  CLIENT_FREELANCER_PAYOUT_STATUS_LABELS,
  type ClientFreelancerPayoutStatus,
} from "@/lib/dashboard/constants";

const STATUS_CLASS: Record<ClientFreelancerPayoutStatus, string> = {
  pending: "bg-amber-500/15 text-amber-200 ring-amber-500/25",
  partially_paid: "bg-sky-500/15 text-sky-200 ring-sky-500/25",
  paid: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
};

export function ClientFreelancerPayoutStatusBadge({
  status,
}: {
  status: ClientFreelancerPayoutStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[status]}`}
    >
      {CLIENT_FREELANCER_PAYOUT_STATUS_LABELS[status]}
    </span>
  );
}
