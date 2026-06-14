"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  approveCommissionEntry,
  payCommissionEntry,
} from "@/app/dashboard/finance/commissions/actions";
import { SalesDealAttributionBadge } from "@/components/dashboard/SalesDealAttributionBadge";
import { CommissionEntryStatusBadge } from "@/components/dashboard/CommissionEntryStatusBadge";
import { formatCents, formatPercent } from "@/lib/dashboard/format";
import {
  formatRoleCommissionStatusLabel,
  resolveRoleCommissionDisplayStatus,
} from "@/lib/dashboard/commission-display";
import type { SalesAttributionPreview } from "@/lib/dashboard/sales-attribution";
import type { CommissionEntryRecord } from "@/lib/dashboard/types";

interface SalesAttributionPanelProps {
  attribution: SalesAttributionPreview;
  commissionEntry?: CommissionEntryRecord | null;
  canManageCommissions?: boolean;
  compact?: boolean;
}

export function SalesAttributionPanel({
  attribution,
  commissionEntry = null,
  canManageCommissions = false,
  compact = false,
}: SalesAttributionPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const runAction = (action: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch {
        // Errors surface via server action throws; parent pages may add toast later.
      }
    });
  };

  const entryStatus = commissionEntry?.status ?? null;
  const setterDisplayStatus = resolveRoleCommissionDisplayStatus(
    entryStatus,
    attribution.setterCommissionCents,
  );
  const closerDisplayStatus = resolveRoleCommissionDisplayStatus(
    entryStatus,
    attribution.closerCommissionCents,
  );

  return (
    <div className={`rounded-xl border border-border bg-black/20 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
          Sales Attribution
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <SalesDealAttributionBadge dealType={attribution.dealType} />
          {commissionEntry ? (
            <CommissionEntryStatusBadge status={commissionEntry.status} />
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <AttributionCard
          title="Setter"
          name={memberLabel(attribution.setter.name, attribution.setter.id)}
          rate={attribution.setter.rate}
          commissionCents={attribution.setterCommissionCents}
          displayStatus={setterDisplayStatus}
          role="setter"
          canManageCommissions={canManageCommissions}
          entryStatus={entryStatus}
          entryId={commissionEntry?.id ?? null}
          pending={pending}
          onApprove={() => {
            if (!commissionEntry) return;
            runAction(() => approveCommissionEntry(commissionEntry.id));
          }}
          onPay={() => {
            if (!commissionEntry) return;
            runAction(() => payCommissionEntry(commissionEntry.id));
          }}
        />
        <AttributionCard
          title="Closer"
          name={memberLabel(attribution.closer.name, attribution.closer.id)}
          rate={attribution.closer.rate}
          commissionCents={attribution.closerCommissionCents}
          displayStatus={closerDisplayStatus}
          role="closer"
          canManageCommissions={canManageCommissions}
          entryStatus={entryStatus}
          entryId={commissionEntry?.id ?? null}
          pending={pending}
          onApprove={() => {
            if (!commissionEntry) return;
            runAction(() => approveCommissionEntry(commissionEntry.id));
          }}
          onPay={() => {
            if (!commissionEntry) return;
            runAction(() => payCommissionEntry(commissionEntry.id));
          }}
        />
      </div>
    </div>
  );
}

function memberLabel(name: string | null, id: string | null): string {
  if (name?.trim()) return name.trim();
  if (id) return "—";
  return "Nicht zugewiesen";
}

function AttributionCard({
  title,
  name,
  rate,
  commissionCents,
  displayStatus,
  role,
  canManageCommissions,
  entryStatus,
  entryId,
  pending,
  onApprove,
  onPay,
}: {
  title: string;
  name: string;
  rate: number;
  commissionCents: number;
  displayStatus: ReturnType<typeof resolveRoleCommissionDisplayStatus>;
  role: "setter" | "closer";
  canManageCommissions: boolean;
  entryStatus: CommissionEntryRecord["status"] | null;
  entryId: string | null;
  pending: boolean;
  onApprove: () => void;
  onPay: () => void;
}) {
  const statusLabel = formatRoleCommissionStatusLabel(role, displayStatus);
  const roleLabel = role === "setter" ? "Setter" : "Closer";
  const showApprove =
    canManageCommissions &&
    Boolean(entryId) &&
    entryStatus === "pending" &&
    commissionCents > 0;
  const showPay =
    canManageCommissions &&
    Boolean(entryId) &&
    entryStatus === "approved" &&
    commissionCents > 0;

  return (
    <div className="rounded-xl border border-border/70 bg-black/10 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-soft">
        {title}
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">{name}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <DetailRow label="Provisionssatz" value={formatPercent(rate)} />
        <DetailRow label="Provision" value={formatCents(commissionCents)} />
        {statusLabel ? (
          <div>
            <dt className="text-xs text-muted-soft">Status</dt>
            <dd className="mt-1 text-sm text-foreground">{statusLabel}</dd>
          </div>
        ) : commissionCents <= 0 ? (
          <DetailRow label="Status" value="—" />
        ) : (
          <DetailRow label="Status" value="Noch nicht ausgelöst" />
        )}
      </dl>

      {showApprove ? (
        <button
          type="button"
          disabled={pending}
          onClick={onApprove}
          className="dashboard-btn-secondary mt-4 w-full px-3 py-2 text-xs"
        >
          {pending ? "Wird freigegeben…" : "Provision freigeben"}
        </button>
      ) : null}

      {showPay ? (
        <button
          type="button"
          disabled={pending}
          onClick={onPay}
          className="dashboard-btn-primary mt-4 w-full px-3 py-2 text-xs"
        >
          {pending
            ? "Wird ausbezahlt…"
            : `${roleLabel}-Provision als bezahlt markieren`}
        </button>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
