"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import {
  createAppointment,
  deleteAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from "@/app/dashboard/appointments/actions";
import type { AppointmentFormData } from "./AppointmentForm";
import { AppointmentDetailModal } from "./AppointmentDetailModal";
import { AppointmentModal } from "./AppointmentModal";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarToolbar } from "./CalendarToolbar";
import { CalendarWeekView } from "./CalendarWeekView";
import { DashboardHeader } from "./DashboardHeader";
import { EmptyState } from "./EmptyState";
import {
  addMonths,
  addWeeks,
  getRangeForView,
  type CalendarViewMode,
} from "@/lib/dashboard/calendar";
import type { AppointmentStatus } from "@/lib/dashboard/constants";
import type { Appointment, Lead, TeamMember } from "@/lib/dashboard/types";

interface AppointmentsPageClientProps {
  appointments: Appointment[];
  leads: Lead[];
  teamMembers: TeamMember[];
  canAssign: boolean;
  currentUserId: string;
}

export function AppointmentsPageClient({
  appointments,
  leads,
  teamMembers,
  canAssign,
  currentUserId,
}: AppointmentsPageClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>();
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const visibleAppointments = useMemo(() => {
    const { start, end } = getRangeForView(viewDate, viewMode);
    return appointments.filter((appointment) => {
      const startTime = new Date(appointment.start_time);
      return startTime >= start && startTime <= end;
    });
  }, [appointments, viewDate, viewMode]);

  const refresh = () => router.refresh();

  const handlePrevious = () => {
    setViewDate((current) =>
      viewMode === "month" ? addMonths(current, -1) : addWeeks(current, -1),
    );
  };

  const handleNext = () => {
    setViewDate((current) =>
      viewMode === "month" ? addMonths(current, 1) : addWeeks(current, 1),
    );
  };

  const openCreateForDay = (date: Date) => {
    setCreateDate(date);
    setCreateOpen(true);
  };

  const handleCreate = async (data: AppointmentFormData) => {
    await createAppointment(data);
    refresh();
  };

  const handleEdit = async (data: AppointmentFormData) => {
    if (!editAppointment) return;
    await updateAppointment(editAppointment.id, data);
    setEditAppointment(null);
    setSelectedAppointment(null);
    refresh();
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;
    await deleteAppointment(selectedAppointment.id);
    setSelectedAppointment(null);
    refresh();
  };

  const handleStatusChange = async (status: AppointmentStatus) => {
    if (!selectedAppointment) return;
    await updateAppointmentStatus(selectedAppointment.id, status);
    setSelectedAppointment({ ...selectedAppointment, status });
    refresh();
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Termine"
        description={
          canAssign
            ? "Team-Kalender mit Monats- und Wochenansicht — Termine planen und verwalten."
            : "Ihre Termine im Monats- und Wochenüberblick."
        }
        actions={
          <button
            type="button"
            onClick={() => {
              setCreateDate(new Date());
              setCreateOpen(true);
            }}
            className="dashboard-btn-primary"
          >
            <Plus className="h-4 w-4" />
            Termin erstellen
          </button>
        }
      />

      <CalendarToolbar
        viewMode={viewMode}
        viewDate={viewDate}
        onViewModeChange={setViewMode}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={() => setViewDate(new Date())}
      />

      {appointments.length === 0 ? (
        <div className="glass-card rounded-2xl">
          <EmptyState
            icon={CalendarDays}
            title="Noch keine Termine"
            description="Erstellen Sie den ersten Termin für Ihr Team oder Ihre Leads."
          />
          <div className="flex justify-center pb-8">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="dashboard-btn-primary"
            >
              <Plus className="h-4 w-4" />
              Termin erstellen
            </button>
          </div>
        </div>
      ) : viewMode === "month" ? (
        <CalendarMonthView
          viewDate={viewDate}
          appointments={visibleAppointments}
          onSelectAppointment={setSelectedAppointment}
          onSelectDay={openCreateForDay}
        />
      ) : (
        <CalendarWeekView
          viewDate={viewDate}
          appointments={visibleAppointments}
          onSelectAppointment={setSelectedAppointment}
          onSelectDay={openCreateForDay}
        />
      )}

      <AppointmentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        onSave={handleCreate}
        canAssign={canAssign}
        teamMembers={teamMembers}
        leads={leads}
        currentUserId={currentUserId}
        defaultDate={createDate}
      />

      {editAppointment && (
        <AppointmentModal
          key={editAppointment.id}
          open={Boolean(editAppointment)}
          onClose={() => setEditAppointment(null)}
          mode="edit"
          appointment={editAppointment}
          onSave={handleEdit}
          canAssign={canAssign}
          teamMembers={teamMembers}
          leads={leads}
          currentUserId={currentUserId}
        />
      )}

      <AppointmentDetailModal
        open={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
        onEdit={() => {
          if (!selectedAppointment) return;
          setEditAppointment(selectedAppointment);
          setSelectedAppointment(null);
        }}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
