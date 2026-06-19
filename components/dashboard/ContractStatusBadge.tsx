import {
  CONTRACT_STATUS_COLORS,
  CONTRACT_STATUS_LABELS,
  type ContractStatus,
} from "@/lib/dashboard/contract-constants";

interface ContractStatusBadgeProps {
  status: ContractStatus;
  className?: string;
}

export function ContractStatusBadge({ status, className = "" }: ContractStatusBadgeProps) {
  const colors = CONTRACT_STATUS_COLORS[status];

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ring-1 ${colors.bg} ${colors.text} ${colors.ring} ${className}`}
    >
      {CONTRACT_STATUS_LABELS[status]}
    </span>
  );
}
