import type { Appointment } from "./types";

export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export type CalendarDay = {
  date: Date;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

export type CalendarViewMode = "month" | "week";

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function addWeeks(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount * 7);
  return next;
}

export function getWeekStart(date: Date): Date {
  const d = startOfDay(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function buildMonthGrid(viewDate: Date): CalendarDay[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const today = startOfDay(new Date());
  const cells: CalendarDay[] = [];

  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, -startOffset + i + 1);
    cells.push({
      date: d,
      day: d.getDate(),
      inMonth: false,
      isToday: isSameDay(d, today),
    });
  }

  for (let day = 1; day <= lastOfMonth.getDate(); day++) {
    const date = new Date(year, month, day);
    cells.push({
      date,
      day,
      inMonth: true,
      isToday: isSameDay(date, today),
    });
  }

  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    const d = new Date(year, month + 1, i);
    cells.push({
      date: d,
      day: d.getDate(),
      inMonth: false,
      isToday: isSameDay(d, today),
    });
  }

  return cells;
}

export function buildWeekDays(weekStart: Date): CalendarDay[] {
  const today = startOfDay(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      date,
      day: date.getDate(),
      inMonth: true,
      isToday: isSameDay(date, today),
    };
  });
}

export function getAppointmentsForDay(
  appointments: Appointment[],
  day: Date,
): Appointment[] {
  return appointments
    .filter((appointment) => isSameDay(new Date(appointment.start_time), day))
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
}

export function getRangeForView(
  viewDate: Date,
  mode: CalendarViewMode,
): { start: Date; end: Date } {
  if (mode === "month") {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const gridStart = getWeekStart(start);
    const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    const gridEnd = new Date(getWeekStart(end));
    gridEnd.setDate(gridEnd.getDate() + 6);
    gridEnd.setHours(23, 59, 59, 999);
    return { start: gridStart, end: gridEnd };
  }

  const start = getWeekStart(viewDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const startLabel = new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
  }).format(weekStart);
  const endLabel = new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(weekEnd);
  return `${startLabel} – ${endLabel}`;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function combineDateAndTime(dateValue: string, timeValue: string): Date {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}
