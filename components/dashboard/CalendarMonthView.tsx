"use client";

import {
  WEEKDAY_LABELS,
  buildMonthGrid,
  getAppointmentsForDay,
} from "@/lib/dashboard/calendar";
import type { Appointment } from "@/lib/dashboard/types";
import { AppointmentListItem } from "./AppointmentDetailModal";

interface CalendarMonthViewProps {
  viewDate: Date;
  appointments: Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
  onSelectDay: (date: Date) => void;
}

export function CalendarMonthView({
  viewDate,
  appointments,
  onSelectAppointment,
  onSelectDay,
}: CalendarMonthViewProps) {
  const days = buildMonthGrid(viewDate);

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="grid grid-cols-7 border-b border-border bg-black/20">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-soft"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayAppointments = getAppointmentsForDay(appointments, day.date);
          const visible = dayAppointments.slice(0, 3);
          const hiddenCount = dayAppointments.length - visible.length;

          return (
            <div
              key={day.date.toISOString()}
              className={`calendar-day-cell min-h-[110px] border-b border-r border-border p-2 sm:min-h-[132px] ${
                day.inMonth ? "bg-transparent" : "bg-black/10 opacity-60"
              } ${day.isToday ? "ring-1 ring-inset ring-violet-400/40" : ""}`}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day.date)}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors hover:bg-violet-500/10 ${
                  day.isToday
                    ? "bg-gradient-to-br from-violet-500 to-cyan-500 text-white"
                    : "text-muted"
                }`}
              >
                {day.day}
              </button>

              <div className="mt-1 space-y-1">
                {visible.map((appointment) => (
                  <AppointmentListItem
                    key={appointment.id}
                    appointment={appointment}
                    onClick={() => onSelectAppointment(appointment)}
                  />
                ))}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(day.date)}
                    className="px-1 text-xs text-violet-300/80 hover:text-violet-200"
                  >
                    +{hiddenCount} weitere
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
