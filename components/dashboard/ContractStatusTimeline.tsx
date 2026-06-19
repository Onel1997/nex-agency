import { ContractStatusBadge } from "@/components/dashboard/ContractStatusBadge";
import {
  CONTRACT_DETAIL_TIMELINE_STEPS,
  resolveContractLifecycleStepIndex,
  resolveContractTimelineTimestamp,
} from "@/lib/dashboard/contract-lifecycle";
import type { ContractStatus } from "@/lib/dashboard/contract-constants";
import { formatDateTime } from "@/lib/dashboard/format";

interface ContractStatusTimelineProps {
  status: ContractStatus;
  timestamps: {
    created_at: string;
    sent_at: string | null;
    signed_at: string | null;
    agency_signed_at: string | null;
    partner_signed_at: string | null;
    activated_at: string | null;
    terminated_at: string | null;
    archived_at: string | null;
  };
}

export function ContractStatusTimeline({
  status,
  timestamps,
}: ContractStatusTimelineProps) {
  const currentIndex = resolveContractLifecycleStepIndex(status);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">Verlauf</h3>
        <ContractStatusBadge status={status} />
      </div>
      <ol className="space-y-2">
        {CONTRACT_DETAIL_TIMELINE_STEPS.map((step, index) => {
          const timestamp = resolveContractTimelineTimestamp(step.field, timestamps);
          const isComplete = index <= currentIndex || Boolean(timestamp);
          const isCurrent =
            index === currentIndex ||
            (status === "expired" && step.field === "terminated_at");

          return (
            <li
              key={step.field}
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
                {timestamp ? (
                  <p className="text-xs text-muted-soft">{formatDateTime(timestamp)}</p>
                ) : (
                  <p className="text-xs text-muted-soft">—</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
