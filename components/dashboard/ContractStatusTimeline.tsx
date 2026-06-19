import { ContractStatusBadge } from "@/components/dashboard/ContractStatusBadge";
import { CONTRACT_STATUS_TIMELINE } from "@/lib/dashboard/contract-lifecycle";
import type { ContractStatus } from "@/lib/dashboard/contract-constants";
import { formatDateTime } from "@/lib/dashboard/format";

interface ContractStatusTimelineProps {
  status: ContractStatus;
  timestamps: {
    sent_at: string | null;
    signed_at: string | null;
    activated_at: string | null;
    terminated_at: string | null;
    archived_at: string | null;
  };
}

const STATUS_ORDER: ContractStatus[] = [
  "draft",
  "sent",
  "signed",
  "active",
  "terminated",
  "archived",
];

function resolveTimelineIndex(status: ContractStatus): number {
  if (status === "expired") {
    return STATUS_ORDER.indexOf("terminated");
  }
  return STATUS_ORDER.indexOf(status);
}

export function ContractStatusTimeline({
  status,
  timestamps,
}: ContractStatusTimelineProps) {
  const currentIndex = resolveTimelineIndex(status);
  const visibleSteps =
    status === "expired"
      ? [
          ...CONTRACT_STATUS_TIMELINE.slice(0, 4),
          { status: "expired" as ContractStatus, label: "Ausgelaufen", timestampKey: null },
        ]
      : CONTRACT_STATUS_TIMELINE;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">Status-Verlauf</h3>
        <ContractStatusBadge status={status} />
      </div>
      <ol className="space-y-2">
        {visibleSteps.map((step, index) => {
          const isComplete = index <= currentIndex;
          const isCurrent = step.status === status || (status === "expired" && step.status === "expired");
          const timestamp =
            step.timestampKey != null ? timestamps[step.timestampKey] : null;

          return (
            <li
              key={step.status}
              className={`flex items-start gap-3 rounded-xl px-3 py-2 ring-1 ${
                isCurrent
                  ? "bg-violet-500/10 ring-violet-500/25"
                  : isComplete
                    ? "bg-white/[0.03] ring-white/10"
                    : "bg-transparent ring-white/5 opacity-60"
              }`}
            >
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  isComplete ? "bg-violet-400" : "bg-white/20"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                {timestamp && (
                  <p className="text-xs text-muted-soft">{formatDateTime(timestamp)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
