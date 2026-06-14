import {
  SALES_DEAL_ATTRIBUTION_LABELS,
  type SalesDealAttributionType,
} from "@/lib/dashboard/sales-attribution";

const DEAL_TYPE_STYLES: Record<SalesDealAttributionType, string> = {
  split: "bg-slate-500/15 text-slate-200 ring-slate-500/20",
  full_cycle: "bg-cyan-500/15 text-cyan-200 ring-cyan-500/20",
  owner_full_cycle: "bg-violet-500/15 text-violet-200 ring-violet-500/20",
};

export function SalesDealAttributionBadge({
  dealType,
}: {
  dealType: SalesDealAttributionType | null | undefined;
}) {
  if (!dealType || dealType === "split") return null;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${DEAL_TYPE_STYLES[dealType]}`}
    >
      {SALES_DEAL_ATTRIBUTION_LABELS[dealType]}
    </span>
  );
}
