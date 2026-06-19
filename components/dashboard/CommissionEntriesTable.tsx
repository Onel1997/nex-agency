"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CommissionGroupStatusBadge } from "@/components/dashboard/CommissionGroupStatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatCommissionEntryPeriod, formatRetainerPlanPeriod } from "@/lib/dashboard/commission-display";
import {
  collectRetainerPlanEntriesByStatus,
  getActiveRetainerEntries,
  getLatestRetainerEntry,
  groupCommissionEntriesForCenter,
  splitCommissionGroups,
} from "@/lib/dashboard/commission-center-groups";
import { formatCents } from "@/lib/dashboard/format";
import {
  partitionRetainerPlanRows,
  resolveRetainerPlanRowDisplay,
  type RetainerPlanRowDisplay,
} from "@/lib/dashboard/retainer-plan-row-display";
import type { RetainerPeriodInvoiceRef } from "@/lib/dashboard/retainer";
import type { CommissionEntryGroup, CommissionEntryRecord, RetainerMonthPlanRow } from "@/lib/dashboard/types";
import { Banknote, ChevronDown, ChevronRight } from "lucide-react";

interface CommissionEntriesTableProps {
  entries: CommissionEntryRecord[];
  retainerInvoicesByClient: Record<string, RetainerPeriodInvoiceRef[]>;
  pending: boolean;
  onApprove: (entryId: string) => void;
  onPay: (entryId: string) => void;
  onApproveMany: (entryIds: string[]) => void;
  onPayMany: (entryIds: string[]) => void;
}

function EntryActions({
  entry,
  pending,
  onApprove,
  onPay,
  stopPropagation = false,
}: {
  entry: CommissionEntryRecord;
  pending: boolean;
  onApprove: (entryId: string) => void;
  onPay: (entryId: string) => void;
  stopPropagation?: boolean;
}) {
  const wrap = (node: ReactNode) =>
    stopPropagation ? (
      <div onClick={(event) => event.stopPropagation()}>{node}</div>
    ) : (
      node
    );

  if (entry.status === "pending") {
    return wrap(
      <button
        type="button"
        disabled={pending}
        onClick={() => onApprove(entry.id)}
        className="dashboard-btn-secondary px-2.5 py-1.5 text-xs"
      >
        Freigeben
      </button>,
    );
  }

  if (entry.status === "approved") {
    return wrap(
      <button
        type="button"
        disabled={pending}
        onClick={() => onPay(entry.id)}
        className="dashboard-btn-primary px-2.5 py-1.5 text-xs"
      >
        Auszahlen
      </button>,
    );
  }

  return <span className="text-xs text-muted-soft">—</span>;
}

export function CommissionEntriesTable({
  entries,
  retainerInvoicesByClient,
  pending,
  onApprove,
  onPay,
  onApproveMany,
  onPayMany,
}: CommissionEntriesTableProps) {
  const { retainerGroups, setupGroups } = useMemo(() => {
    const groups = groupCommissionEntriesForCenter(entries);
    return splitCommissionGroups(groups);
  }, [entries]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  if (retainerGroups.length === 0 && setupGroups.length === 0) {
    return (
      <div className="glass-card overflow-hidden rounded-2xl">
        <EmptyState
          icon={Banknote}
          title="Keine Provisionen"
          description="Provisionen entstehen automatisch, wenn Setup- oder Retainer-Rechnungen als bezahlt markiert werden."
        />
      </div>
    );
  }

  const toggleExpanded = (key: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {retainerGroups.length > 0 ? (
        <section className="glass-card overflow-hidden rounded-2xl">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-sm font-medium text-foreground">
              Retainer-Provisionen
            </h2>
            <p className="mt-1 text-sm text-muted">
              Kompakte Übersicht pro Kunde. Provisionen entstehen erst nach
              erstellter und bezahlter Retainer-Rechnung. Zeile anklicken für
              Monatsdetails.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="dashboard-table w-full min-w-[1040px] text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 px-4 py-3.5 sm:px-5" aria-hidden />
                  <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft sm:px-5">
                    Kunde
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-soft sm:px-5">
                    Offene Provisionen
                  </th>
                  <th className="hidden px-4 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-soft md:table-cell sm:px-5">
                    Ausbezahlte Provisionen
                  </th>
                  <th className="hidden px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft lg:table-cell sm:px-5">
                    Provisionsmonate
                  </th>
                  <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft sm:px-5">
                    Status
                  </th>
                  <th className="hidden px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft xl:table-cell sm:px-5">
                    Letzte Periode
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {retainerGroups.map((group) => (
                  <RetainerGroupRows
                    key={group.key}
                    group={group}
                    retainerInvoices={
                      retainerInvoicesByClient[group.client_id] ?? []
                    }
                    isExpanded={expandedKeys.has(group.key)}
                    pending={pending}
                    onToggle={() => toggleExpanded(group.key)}
                    onApprove={onApprove}
                    onPay={onPay}
                    onApproveMany={onApproveMany}
                    onPayMany={onPayMany}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {setupGroups.length > 0 ? (
        <section className="glass-card overflow-hidden rounded-2xl">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-sm font-medium text-foreground">
              Setup-Provisionen
            </h2>
            <p className="mt-1 text-sm text-muted">
              Einmalige Setup-Provisionen pro Kunde.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="dashboard-table w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft sm:px-5">
                    Kunde
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-soft sm:px-5">
                    Provision
                  </th>
                  <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft sm:px-5">
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft sm:px-5">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {setupGroups.map((group) => {
                  const entry = group.entries[0];
                  if (!entry) return null;

                  return (
                    <tr
                      key={group.key}
                      className="transition-colors hover:bg-surface-hover/50"
                    >
                      <td className="px-4 py-3.5 font-medium text-foreground sm:px-5">
                        {group.client_name}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-foreground sm:px-5">
                        {formatCents(group.totalCents)}
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <CommissionGroupStatusBadge status={group.displayStatus} />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <EntryActions
                          entry={entry}
                          pending={pending}
                          onApprove={onApprove}
                          onPay={onPay}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function RetainerGroupRows({
  group,
  retainerInvoices,
  isExpanded,
  pending,
  onToggle,
  onApprove,
  onPay,
  onApproveMany,
  onPayMany,
}: {
  group: CommissionEntryGroup;
  retainerInvoices: RetainerPeriodInvoiceRef[];
  isExpanded: boolean;
  pending: boolean;
  onToggle: () => void;
  onApprove: (entryId: string) => void;
  onPay: (entryId: string) => void;
  onApproveMany: (entryIds: string[]) => void;
  onPayMany: (entryIds: string[]) => void;
}) {
  const monthEntries = getActiveRetainerEntries(group);
  const latestEntry = getLatestRetainerEntry(group);
  const isExpandable = group.expandable && monthEntries.length > 0;

  return (
    <>
      <tr
        className={
          isExpandable
            ? "cursor-pointer transition-colors hover:bg-surface-hover/50"
            : "transition-colors hover:bg-surface-hover/50"
        }
        onClick={isExpandable ? onToggle : undefined}
        onKeyDown={
          isExpandable
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
        tabIndex={isExpandable ? 0 : undefined}
        role={isExpandable ? "button" : undefined}
        aria-expanded={isExpandable ? isExpanded : undefined}
      >
        <td className="px-4 py-3.5 sm:px-5">
          {isExpandable ? (
            <span className="text-muted-soft">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          ) : null}
        </td>
        <td className="px-4 py-3.5 font-medium text-foreground sm:px-5">
          {group.client_name}
        </td>
        <td className="px-4 py-3.5 text-right tabular-nums text-foreground/90 sm:px-5">
          {formatCents(group.openCents)}
        </td>
        <td className="hidden px-4 py-3.5 text-right tabular-nums text-foreground/90 md:table-cell sm:px-5">
          {formatCents(group.paidCents)}
        </td>
        <td className="hidden px-4 py-3.5 lg:table-cell sm:px-5">
          <RetainerProgressCell group={group} />
        </td>
        <td className="px-4 py-3.5 sm:px-5">
          <CommissionGroupStatusBadge status={group.displayStatus} />
        </td>
        <td className="hidden px-4 py-3.5 text-foreground/90 xl:table-cell sm:px-5">
          {latestEntry ? formatCommissionEntryPeriod(latestEntry) : "—"}
        </td>
      </tr>

      {isExpandable && isExpanded ? (
        <tr className="bg-white/[0.02]">
          <td colSpan={7} className="px-4 py-3 sm:px-5">
            <RetainerMonthsTable
              rows={group.plannedMonths}
              retainerInvoices={retainerInvoices}
              pending={pending}
              onApprove={onApprove}
              onPay={onPay}
              onApproveMany={onApproveMany}
              onPayMany={onPayMany}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function RetainerProgressCell({ group }: { group: CommissionEntryGroup }) {
  if (!group.retainerProgress) return <>—</>;

  return (
    <div className="space-y-0.5">
      <p className="text-foreground">{group.retainerProgress.primary}</p>
      {group.retainerProgress.secondary ? (
        <span className="inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-200 ring-1 ring-amber-500/20">
          {group.retainerProgress.secondary}
        </span>
      ) : null}
    </div>
  );
}

const RETAINER_PLAN_STATUS_BADGE_CLASS: Record<
  RetainerPlanRowDisplay["statusTone"],
  string
> = {
  muted:
    "bg-slate-500/10 text-muted-soft ring-slate-500/15 px-1.5 py-0 text-[10px] leading-4",
  amber: "bg-amber-500/15 text-amber-200 ring-amber-500/20",
  sky: "bg-sky-500/15 text-sky-200 ring-sky-500/20",
  violet: "bg-violet-500/15 text-violet-200 ring-violet-500/20",
  emerald: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/20",
};

function RetainerPlanRowStatus({
  display,
  dimmed = false,
}: {
  display: RetainerPlanRowDisplay;
  dimmed?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${RETAINER_PLAN_STATUS_BADGE_CLASS[display.statusTone]} ${dimmed ? "opacity-80" : ""}`}
    >
      {display.statusLabel}
    </span>
  );
}

function RetainerPlanPeriodCell({
  row,
  display,
  dimmed = false,
}: {
  row: RetainerMonthPlanRow;
  display: RetainerPlanRowDisplay;
  dimmed?: boolean;
}) {
  const showInvoice =
    display.group === "billed" && display.invoiceNumber != null;

  return (
    <div className={`space-y-0.5 ${dimmed ? "text-muted-soft" : ""}`}>
      <p className={dimmed ? "font-medium" : "font-medium text-foreground"}>
        {formatRetainerPlanPeriod(row)}
      </p>
      {showInvoice ? (
        <p className="text-xs text-muted-soft">
          Rechnung: {display.invoiceNumber}
        </p>
      ) : null}
    </div>
  );
}

function PlanRowActions({
  row,
  display,
  pending,
  onApprove,
  onPay,
  dimmed = false,
}: {
  row: RetainerMonthPlanRow;
  display: RetainerPlanRowDisplay;
  pending: boolean;
  onApprove: (entryId: string) => void;
  onPay: (entryId: string) => void;
  dimmed?: boolean;
}) {
  if (display.canApprove && row.entry) {
    return (
      <div onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          disabled={pending}
          onClick={() => onApprove(row.entry!.id)}
          className="dashboard-btn-secondary px-2.5 py-1.5 text-xs"
        >
          Freigeben
        </button>
      </div>
    );
  }

  if (display.canPay && row.entry) {
    return (
      <div onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          disabled={pending}
          onClick={() => onPay(row.entry!.id)}
          className="dashboard-btn-primary px-2.5 py-1.5 text-xs"
        >
          Auszahlen
        </button>
      </div>
    );
  }

  return (
    <span className={`text-xs ${dimmed ? "text-muted-soft/80" : "text-muted-soft"}`}>
      {display.actionLabel}
    </span>
  );
}

function RetainerPlanRowsSection({
  title,
  rows,
  retainerInvoices,
  pending,
  onApprove,
  onPay,
  dimmed = false,
}: {
  title: string;
  rows: RetainerMonthPlanRow[];
  retainerInvoices: RetainerPeriodInvoiceRef[];
  pending: boolean;
  onApprove: (entryId: string) => void;
  onPay: (entryId: string) => void;
  dimmed?: boolean;
}) {
  if (rows.length === 0) return null;

  return (
    <>
      <tr className={dimmed ? "bg-white/[0.01]" : "bg-white/[0.02]"}>
        <td
          colSpan={5}
          className={`px-4 py-2 text-xs font-medium uppercase tracking-wider ${dimmed ? "text-muted-soft/70" : "text-muted-soft"}`}
        >
          {title}
        </td>
      </tr>
      {rows.map((row) => {
        const display = resolveRetainerPlanRowDisplay(row, retainerInvoices);

        return (
          <tr
            key={row.id}
            className={dimmed ? "opacity-55" : undefined}
          >
            <td className="px-4 py-2.5">
              <RetainerPlanPeriodCell
                row={row}
                display={display}
                dimmed={dimmed}
              />
            </td>
            <td
              className={`px-4 py-2.5 text-right tabular-nums ${dimmed ? "text-muted-soft" : ""}`}
            >
              {display.showCommissionAmounts
                ? formatCents(row.setter_commission_cents)
                : "—"}
            </td>
            <td
              className={`px-4 py-2.5 text-right tabular-nums ${dimmed ? "text-muted-soft" : ""}`}
            >
              {display.showCommissionAmounts
                ? formatCents(row.closer_commission_cents)
                : "—"}
            </td>
            <td className="px-4 py-2.5">
              <RetainerPlanRowStatus display={display} dimmed={dimmed} />
            </td>
            <td className="px-4 py-2.5">
              <PlanRowActions
                row={row}
                display={display}
                pending={pending}
                onApprove={onApprove}
                onPay={onPay}
                dimmed={dimmed}
              />
            </td>
          </tr>
        );
      })}
    </>
  );
}

function RetainerMonthsTable({
  rows,
  retainerInvoices,
  pending,
  onApprove,
  onPay,
  onApproveMany,
  onPayMany,
}: {
  rows: RetainerMonthPlanRow[];
  retainerInvoices: RetainerPeriodInvoiceRef[];
  pending: boolean;
  onApprove: (entryId: string) => void;
  onPay: (entryId: string) => void;
  onApproveMany: (entryIds: string[]) => void;
  onPayMany: (entryIds: string[]) => void;
}) {
  const { billedRows, plannedRows } = useMemo(
    () => partitionRetainerPlanRows(rows, retainerInvoices),
    [rows, retainerInvoices],
  );
  const openEntries = collectRetainerPlanEntriesByStatus(rows, "pending");
  const approvedEntries = collectRetainerPlanEntriesByStatus(rows, "approved");
  const showPlannedSection = plannedRows.length > 0;
  const showBilledSection = billedRows.length > 0;

  return (
    <div className="space-y-3">
      {openEntries.length > 0 || approvedEntries.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {openEntries.length > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                onApproveMany(openEntries.map((entry) => entry.id))
              }
              className="dashboard-btn-secondary px-3 py-1.5 text-xs"
            >
              Alle offenen freigeben
            </button>
          ) : null}
          {approvedEntries.length > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onPayMany(approvedEntries.map((entry) => entry.id))}
              className="dashboard-btn-primary px-3 py-1.5 text-xs"
            >
              Alle freigegebenen auszahlen
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl ring-1 ring-border/60">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border/70 text-xs uppercase tracking-wider text-muted-soft">
              <th className="px-4 py-2.5 font-medium">Periode</th>
              <th className="px-4 py-2.5 text-right font-medium">Setter</th>
              <th className="px-4 py-2.5 text-right font-medium">Closer</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {showBilledSection ? (
              <RetainerPlanRowsSection
                title={
                  showPlannedSection ? "Abgerechnete Monate" : "Retainer-Monate"
                }
                rows={billedRows}
                retainerInvoices={retainerInvoices}
                pending={pending}
                onApprove={onApprove}
                onPay={onPay}
              />
            ) : null}
            {showPlannedSection ? (
              <RetainerPlanRowsSection
                title="Geplante Monate"
                rows={plannedRows}
                retainerInvoices={retainerInvoices}
                pending={pending}
                onApprove={onApprove}
                onPay={onPay}
                dimmed
              />
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
