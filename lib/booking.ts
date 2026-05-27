/** Mock availability for the optional booking preview widget. */
export const MEETING_DURATION_MIN = 30;

export const MEETING_TIMEZONE = "Europe/Berlin";

export type MeetingSlot = {
  id: string;
  time: string;
  available: boolean;
};

export const defaultMeetingSlots: MeetingSlot[] = [
  { id: "0930", time: "09:30", available: true },
  { id: "1100", time: "11:00", available: true },
  { id: "1400", time: "14:00", available: true },
  { id: "1530", time: "15:30", available: false },
  { id: "1630", time: "16:30", available: true },
  { id: "1730", time: "17:30", available: true },
];

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export function getWeekdayLabels() {
  return WEEKDAY_LABELS;
}

export type CalendarDay = {
  date: Date;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelectable: boolean;
};

export function buildMonthGrid(viewDate: Date, selectableDayNumbers: number[]): CalendarDay[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Monday-first offset (0 = Mon … 6 = Sun)
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastOfMonth.getDate();

  const today = new Date();
  const todayKey =
    today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  const cells: CalendarDay[] = [];

  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, -startOffset + i + 1);
    cells.push({
      date: d,
      day: d.getDate(),
      inMonth: false,
      isToday: false,
      isSelectable: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = year * 10000 + (month + 1) * 100 + day;
    const isPast = key < todayKey;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const inAllowList = selectableDayNumbers.includes(day);

    cells.push({
      date,
      day,
      inMonth: true,
      isToday: key === todayKey,
      isSelectable: !isPast && !isWeekend && inAllowList,
    });
  }

  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    const d = new Date(year, month + 1, i);
    cells.push({
      date: d,
      day: d.getDate(),
      inMonth: false,
      isToday: false,
      isSelectable: false,
    });
  }

  return cells;
}

export function formatMonthYear(date: Date, locale = "de-DE") {
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function formatSelectedDate(date: Date, locale = "de-DE") {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Business days with mock openings for the current view month */
export function getSelectableDays(viewDate: Date): number[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const selectable: number[] = [];

  for (let d = 1; d <= last; d++) {
    const date = new Date(year, month, d);
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) continue;
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    // ~3 open days per week for a realistic mock
    if (d % 2 === 0 || d % 5 === 0) selectable.push(d);
  }

  return selectable;
}

export function getInitialSelectedDay(viewDate: Date): number | null {
  const days = getSelectableDays(viewDate);
  return days[0] ?? null;
}
