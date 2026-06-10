"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import { createAppointment } from "@/app/dashboard/appointments/actions";
import { AppointmentModal } from "./AppointmentModal";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { EmptyState } from "./EmptyState";
import type { AppointmentFormData } from "./AppointmentForm";
import { formatDateLong, formatTime } from "@/lib/dashboard/format";
import type { Appointment, Lead, TeamMember } from "@/lib/dashboard/types";

interface LeadDetailClientProps {
  leadId: string;
  upcomingAppointments: Appointment[];
  leads: Lead[];
  teamMembers: TeamMember[];
  canAssign: boolean;
  currentUserId: string;
}

export function LeadDetailClient({
  leadId,
  upcomingAppointments,
  leads,
  teamMembers,
  canAssign,
  currentUserId,
}: LeadDetailClientProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const handleCreate = async (data: AppointmentFormData) => {
    await createAppointment(data);
    router.refresh();
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
            Anstehende Termine
          </h2>
          <p className="mt-2 text-sm text-muted">
            Geplante und bestätigte Termine für diesen Lead.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="dashboard-btn-secondary shrink-0"
        >
          <Plus className="h-4 w-4" />
          Termin
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {upcomingAppointments.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Keine anstehenden Termine"
            description="Planen Sie den ersten Termin für diesen Lead."
          />
        ) : (
          upcomingAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-xl border border-border bg-black/20 p-4 transition-colors hover:border-violet-500/25"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">{appointment.title}</p>
                <AppointmentStatusBadge status={appointment.status} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {formatDateLong(appointment.start_time)}
              </p>
              <p className="text-sm text-muted-soft">
                {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
              </p>
              <p className="mt-2 text-xs text-muted-soft">
                Verantwortlich: {appointment.assignee_name || "—"}
              </p>
            </div>
          ))
        )}
      </div>

      <AppointmentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        onSave={handleCreate}
        canAssign={canAssign}
        teamMembers={teamMembers}
        leads={leads}
        currentUserId={currentUserId}
        defaultLeadId={leadId}
      />
    </div>
  );
}
