import {
  formatCommissionEntryStatusLabel,
  ROLE_COMMISSION_STATUS_ICONS,
  ROLE_COMMISSION_STATUS_LABELS,
  type RoleCommissionDisplayStatus,
} from "@/lib/dashboard/commission-display";
import type { CommissionEntryStatus } from "@/lib/dashboard/commission-constants";
import { COMMISSION_ENTRY_STATUS_LABELS } from "@/lib/dashboard/commission-constants";

const DISPLAY_STATUS_STYLES: Record<
  Exclude<RoleCommissionDisplayStatus, null>,
  string
> = {
  open: "bg-amber-500/15 text-amber-200 ring-amber-500/20",
  ready: "bg-violet-500/15 text-violet-200 ring-violet-500/20",
  paid: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/20",
};

const ENTRY_STATUS_STYLES: Record<CommissionEntryStatus, string> = {
  pending: DISPLAY_STATUS_STYLES.open,
  approved: DISPLAY_STATUS_STYLES.ready,
  paid: DISPLAY_STATUS_STYLES.paid,
  cancelled: "bg-slate-500/15 text-slate-200 ring-slate-500/20",
};

export function CommissionEntryStatusBadge({
  status,
}: {
  status: CommissionEntryStatus;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${ENTRY_STATUS_STYLES[status]}`}
    >
      {formatCommissionEntryStatusLabel(status)}
    </span>
  );
}

export function RoleCommissionStatusBadge({
  role,
  displayStatus,
}: {
  role: "setter" | "closer";
  displayStatus: RoleCommissionDisplayStatus;
}) {
  if (!displayStatus) return null;

  const roleLabel = role === "setter" ? "Setter" : "Closer";
  const label =
    displayStatus === "paid"
      ? `${roleLabel}-Provision bezahlt`
      : ROLE_COMMISSION_STATUS_LABELS[displayStatus];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${DISPLAY_STATUS_STYLES[displayStatus]}`}
    >
      <span aria-hidden>{ROLE_COMMISSION_STATUS_ICONS[displayStatus]}</span>
      {label}
    </span>
  );
}

export function CommissionEntryStatusLabel({
  status,
}: {
  status: CommissionEntryStatus;
}) {
  if (status === "cancelled") {
    return (
      <span className="text-xs text-muted">
        {COMMISSION_ENTRY_STATUS_LABELS.cancelled}
      </span>
    );
  }

  return (
    <span className="text-xs text-foreground">
      {formatCommissionEntryStatusLabel(status)}
    </span>
  );
}
