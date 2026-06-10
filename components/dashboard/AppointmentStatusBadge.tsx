import {
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/lib/dashboard/constants";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  planned: "bg-blue-500/15 text-blue-200 ring-blue-500/25",
  confirmed: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
  completed: "bg-violet-500/15 text-violet-200 ring-violet-500/25",
  cancelled: "bg-red-500/15 text-red-300 ring-red-500/25",
};

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
}

export function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {APPOINTMENT_STATUS_LABELS[status]}
    </span>
  );
}
