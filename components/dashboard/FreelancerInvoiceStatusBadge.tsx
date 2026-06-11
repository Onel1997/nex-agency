import {
  FREELANCER_INVOICE_STATUS_LABELS,
  type FreelancerInvoiceStatus,
} from "@/lib/dashboard/constants";

const STATUS_STYLES: Record<FreelancerInvoiceStatus, string> = {
  draft: "bg-slate-500/15 text-slate-300 ring-slate-500/25",
  submitted: "bg-blue-500/15 text-blue-200 ring-blue-500/25",
  paid: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
};

export function FreelancerInvoiceStatusBadge({
  status,
}: {
  status: FreelancerInvoiceStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {FREELANCER_INVOICE_STATUS_LABELS[status]}
    </span>
  );
}
