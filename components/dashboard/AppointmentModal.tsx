"use client";

import { useEffect, useId, useState } from "react";
import {
  AppointmentForm,
  appointmentToFormData,
  emptyAppointmentForm,
  validateAppointmentForm,
  type AppointmentFormData,
} from "./AppointmentForm";
import { Modal } from "./Modal";
import type { Appointment, Lead, TeamMember } from "@/lib/dashboard/types";

interface AppointmentModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  appointment?: Appointment | null;
  onSave: (data: AppointmentFormData) => Promise<void>;
  canAssign?: boolean;
  teamMembers?: TeamMember[];
  leads?: Lead[];
  currentUserId: string;
  defaultDate?: Date;
  defaultLeadId?: string;
}

export function AppointmentModal({
  open,
  onClose,
  mode,
  appointment,
  onSave,
  canAssign = false,
  teamMembers = [],
  leads = [],
  currentUserId,
  defaultDate,
  defaultLeadId,
}: AppointmentModalProps) {
  const formId = useId();
  const [data, setData] = useState<AppointmentFormData>(emptyAppointmentForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && appointment) {
      setData(appointmentToFormData(appointment));
    } else {
      const next = { ...emptyAppointmentForm };
      if (defaultDate) {
        next.date = `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, "0")}-${String(defaultDate.getDate()).padStart(2, "0")}`;
      }
      if (defaultLeadId) next.lead_id = defaultLeadId;
      next.assigned_user_id = currentUserId;
      setData(next);
    }

    setError(null);
    setIsSubmitting(false);
  }, [open, mode, appointment, defaultDate, defaultLeadId, currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateAppointmentForm(data);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Termin erstellen" : "Termin bearbeiten"}
      size="lg"
    >
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <AppointmentForm
        formId={formId}
        data={data}
        onChange={setData}
        onSubmit={handleSubmit}
        submitLabel={mode === "create" ? "Termin erstellen" : "Änderungen speichern"}
        isSubmitting={isSubmitting}
        canAssign={canAssign}
        teamMembers={teamMembers}
        leads={leads}
        defaultAssigneeId={currentUserId}
        defaultLeadId={defaultLeadId}
      />
    </Modal>
  );
}
