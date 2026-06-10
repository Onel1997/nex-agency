"use client";

import Link from "next/link";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/lib/dashboard/constants";
import { formatDateLong, formatTime } from "@/lib/dashboard/format";
import type { Appointment } from "@/lib/dashboard/types";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { Modal } from "./Modal";

interface AppointmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  canEdit?: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onStatusChange: (status: AppointmentStatus) => Promise<void>;
}

export function AppointmentDetailModal({
  open,
  onClose,
  appointment,
  canEdit = true,
  onEdit,
  onDelete,
  onStatusChange,
}: AppointmentDetailModalProps) {
  if (!appointment) return null;

  const handleDelete = async () => {
    if (!confirm(`Termin „${appointment.title}“ wirklich löschen?`)) return;
    await onDelete();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={appointment.title} size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <AppointmentStatusBadge status={appointment.status} />
          {canEdit && (
            <select
              value={appointment.status}
              onChange={(e) =>
                onStatusChange(e.target.value as AppointmentStatus)
              }
              className="dashboard-select-sm"
              aria-label="Terminstatus ändern"
            >
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {APPOINTMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem label="Datum">
            {formatDateLong(appointment.start_time)}
          </DetailItem>
          <DetailItem label="Uhrzeit">
            {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
          </DetailItem>
          <DetailItem label="Verantwortlich">
            {appointment.assignee_name || "—"}
          </DetailItem>
          <DetailItem label="Lead">
            {appointment.lead_id ? (
              <Link
                href={`/dashboard/leads/${appointment.lead_id}`}
                className="dashboard-link inline-flex items-center gap-1"
              >
                {appointment.lead_company_name || "Lead ansehen"}
              </Link>
            ) : (
              "—"
            )}
          </DetailItem>
        </div>

        {appointment.description && (
          <DetailItem label="Beschreibung">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {appointment.description}
            </p>
          </DetailItem>
        )}

        {canEdit && (
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onEdit}
              className="dashboard-btn-secondary"
            >
              <Pencil className="h-4 w-4" />
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="dashboard-btn-secondary text-red-300 hover:border-red-500/35 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-soft">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

export function AppointmentListItem({
  appointment,
  onClick,
}: {
  appointment: Appointment;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="appointment-chip group w-full rounded-xl border border-violet-500/15 bg-violet-500/10 px-3 py-2 text-left transition-all hover:border-violet-400/30 hover:bg-violet-500/15"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-1 text-sm font-medium text-foreground">
          {appointment.title}
        </span>
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-violet-300/70" />
      </div>
      <p className="mt-0.5 text-xs text-muted">
        {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
      </p>
    </button>
  );
}
