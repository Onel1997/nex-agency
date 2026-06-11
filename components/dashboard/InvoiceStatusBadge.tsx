import {
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
} from "@/lib/dashboard/constants";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-slate-500/15 text-slate-300 ring-slate-500/25",
  sent: "bg-blue-500/15 text-blue-200 ring-blue-500/25",
  paid: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
  overdue: "bg-red-500/15 text-red-200 ring-red-500/25",
  cancelled: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/25",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}
