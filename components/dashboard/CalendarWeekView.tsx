"use client";

import {
  WEEKDAY_LABELS,
  buildWeekDays,
  getWeekStart,
  getAppointmentsForDay,
} from "@/lib/dashboard/calendar";
import type { Appointment } from "@/lib/dashboard/types";
import { AppointmentListItem } from "./AppointmentDetailModal";
import { EmptyState } from "./EmptyState";
import { CalendarDays } from "lucide-react";

interface CalendarWeekViewProps {
  viewDate: Date;
  appointments: Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
  onSelectDay: (date: Date) => void;
}

export function CalendarWeekView({
  viewDate,
  appointments,
  onSelectAppointment,
  onSelectDay,
}: CalendarWeekViewProps) {
  const weekStart = getWeekStart(viewDate);
  const days = buildWeekDays(weekStart);
  const weekHasAppointments = days.some(
    (day) => getAppointmentsForDay(appointments, day.date).length > 0,
  );

  if (!weekHasAppointments) {
    return (
      <div className="glass-card rounded-2xl">
        <EmptyState
          icon={CalendarDays}
          title="Keine Termine in dieser Woche"
          description="Erstellen Sie einen Termin oder wechseln Sie die Woche."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-7">
      {days.map((day) => {
        const dayAppointments = getAppointmentsForDay(appointments, day.date);

        return (
          <div
            key={day.date.toISOString()}
            className={`glass-card rounded-2xl p-3 sm:p-4 ${
              day.isToday ? "ring-1 ring-violet-400/30" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectDay(day.date)}
              className="mb-3 w-full text-left"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-muted-soft">
                {WEEKDAY_LABELS[(day.date.getDay() + 6) % 7]}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {day.day}.{" "}
                {day.date.toLocaleDateString("de-DE", { month: "short" })}
              </p>
            </button>

            <div className="space-y-2">
              {dayAppointments.length === 0 ? (
                <p className="text-xs text-muted-soft">Keine Termine</p>
              ) : (
                dayAppointments.map((appointment) => (
                  <AppointmentListItem
                    key={appointment.id}
                    appointment={appointment}
                    onClick={() => onSelectAppointment(appointment)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
