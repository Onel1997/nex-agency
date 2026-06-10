"use client";

import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/lib/dashboard/constants";
import type { Appointment, Lead, TeamMember } from "@/lib/dashboard/types";
import {
  combineDateAndTime,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/dashboard/calendar";

export interface AppointmentFormData {
  title: string;
  description: string;
  lead_id: string;
  date: string;
  start_time: string;
  end_time: string;
  assigned_user_id: string;
  status: AppointmentStatus;
}

export const emptyAppointmentForm: AppointmentFormData = {
  title: "",
  description: "",
  lead_id: "",
  date: toDateInputValue(new Date()),
  start_time: "09:00",
  end_time: "10:00",
  assigned_user_id: "",
  status: "planned",
};

export function appointmentToFormData(
  appointment: Appointment,
): AppointmentFormData {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);

  return {
    title: appointment.title,
    description: appointment.description ?? "",
    lead_id: appointment.lead_id ?? "",
    date: toDateInputValue(start),
    start_time: toTimeInputValue(start),
    end_time: toTimeInputValue(end),
    assigned_user_id: appointment.assigned_user_id,
    status: appointment.status,
  };
}

function memberLabel(member: TeamMember) {
  return member.full_name?.trim() || member.email.split("@")[0];
}

interface AppointmentFormProps {
  formId: string;
  data: AppointmentFormData;
  onChange: (data: AppointmentFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  canAssign?: boolean;
  teamMembers?: TeamMember[];
  leads?: Lead[];
  defaultAssigneeId?: string;
  defaultLeadId?: string;
}

export function AppointmentForm({
  formId,
  data,
  onChange,
  onSubmit,
  submitLabel,
  isSubmitting,
  canAssign = false,
  teamMembers = [],
  leads = [],
  defaultAssigneeId,
  defaultLeadId,
}: AppointmentFormProps) {
  const assigneeValue = data.assigned_user_id || defaultAssigneeId || "";
  const leadValue = data.lead_id || defaultLeadId || "";

  const handleDateTimeChange = (
    patch: Partial<Pick<AppointmentFormData, "date" | "start_time" | "end_time">>,
  ) => {
    onChange({ ...data, ...patch });
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      <Field label="Titel" required>
        <input
          required
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className="dashboard-input"
          placeholder="Erstgespräch, Demo, Follow-up..."
        />
      </Field>

      <Field label="Beschreibung">
        <textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="dashboard-input min-h-[88px] resize-y"
          placeholder="Agenda, Notizen, Vorbereitung..."
          rows={3}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Datum" required>
          <input
            required
            type="date"
            value={data.date}
            onChange={(e) => handleDateTimeChange({ date: e.target.value })}
            className="dashboard-input"
          />
        </Field>

        <Field label="Status">
          <select
            value={data.status}
            onChange={(e) =>
              onChange({ ...data, status: e.target.value as AppointmentStatus })
            }
            className="dashboard-input"
          >
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {APPOINTMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Startzeit" required>
          <input
            required
            type="time"
            value={data.start_time}
            onChange={(e) => handleDateTimeChange({ start_time: e.target.value })}
            className="dashboard-input"
          />
        </Field>

        <Field label="Endzeit" required>
          <input
            required
            type="time"
            value={data.end_time}
            onChange={(e) => handleDateTimeChange({ end_time: e.target.value })}
            className="dashboard-input"
          />
        </Field>
      </div>

      <Field label="Lead (optional)">
        <select
          value={leadValue}
          onChange={(e) => onChange({ ...data, lead_id: e.target.value })}
          className="dashboard-input"
        >
          <option value="">— Kein Lead —</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.company_name}
            </option>
          ))}
        </select>
      </Field>

      {canAssign && (
        <Field label="Zugewiesen an" required>
          <select
            value={assigneeValue}
            onChange={(e) =>
              onChange({ ...data, assigned_user_id: e.target.value })
            }
            className="dashboard-input"
            required
          >
            <option value="">— Teammitglied wählen —</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {memberLabel(member)}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="dashboard-btn-primary"
        >
          {isSubmitting ? "Speichern..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
        {required && <span className="text-violet-400"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function validateAppointmentForm(data: AppointmentFormData): string | null {
  if (!data.title.trim()) return "Titel ist erforderlich.";
  if (!data.date || !data.start_time || !data.end_time) {
    return "Datum und Uhrzeit sind erforderlich.";
  }

  const start = combineDateAndTime(data.date, data.start_time);
  const end = combineDateAndTime(data.date, data.end_time);
  if (end <= start) return "Endzeit muss nach der Startzeit liegen.";

  return null;
}
