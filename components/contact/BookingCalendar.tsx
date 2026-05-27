"use client";

import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Video,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  buildMonthGrid,
  defaultMeetingSlots,
  formatMonthYear,
  formatSelectedDate,
  getInitialSelectedDay,
  getSelectableDays,
  getWeekdayLabels,
  MEETING_DURATION_MIN,
  MEETING_TIMEZONE,
  type MeetingSlot,
} from "@/lib/booking";
import { handleBookingClick } from "@/lib/openBooking";
import { easePremium, viewport } from "@/lib/motion";
import { useMotionProfile } from "@/lib/useMotionProfile";

function shiftMonth(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

type BookingCalendarProps = {
  className?: string;
};

export function BookingCalendar({ className = "" }: BookingCalendarProps) {
  const reduced = useReducedMotion();
  const { lite } = useMotionProfile();

  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const selectableDays = useMemo(() => getSelectableDays(viewDate), [viewDate]);

  const [selectedDay, setSelectedDay] = useState<number | null>(() =>
    getInitialSelectedDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );

  const [selectedSlot, setSelectedSlot] = useState<string | null>(
    defaultMeetingSlots.find((s) => s.available)?.id ?? null
  );

  const grid = useMemo(
    () => buildMonthGrid(viewDate, selectableDays),
    [viewDate, selectableDays]
  );

  const selectedDate = useMemo(() => {
    if (selectedDay == null) return null;
    return new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDay);
  }, [viewDate, selectedDay]);

  const monthLabel = formatMonthYear(viewDate);
  const weekdayLabels = getWeekdayLabels();

  const onPrevMonth = useCallback(() => {
    setViewDate((d) => {
      const next = shiftMonth(d, -1);
      setSelectedDay(getInitialSelectedDay(next));
      return next;
    });
  }, []);

  const onNextMonth = useCallback(() => {
    setViewDate((d) => {
      const next = shiftMonth(d, 1);
      setSelectedDay(getInitialSelectedDay(next));
      return next;
    });
  }, []);

  const onSelectDay = useCallback((day: number, selectable: boolean) => {
    if (!selectable) return;
    setSelectedDay(day);
    setSelectedSlot(defaultMeetingSlots.find((s) => s.available)?.id ?? null);
  }, []);

  const panelVariants = reduced
    ? undefined
    : {
        hidden: { opacity: 0, y: 28 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.75, ease: easePremium },
        },
      };

  const slotTap = lite || reduced ? undefined : { scale: 0.97 };

  return (
    <motion.div
      className={`booking-widget glass-card ${className}`}
      variants={panelVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      <span className="booking-widget-glow" aria-hidden />
      <span className="booking-widget-shine" aria-hidden />

      <div className="booking-widget-header">
        <div className="booking-widget-title-row">
          <span className="booking-widget-icon" aria-hidden>
            <CalendarDays className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <p className="booking-widget-eyebrow">Terminplanung</p>
            <h3 className="booking-widget-title">Erstgespräch buchen</h3>
          </div>
        </div>
        <span className="booking-widget-live">
          <span className="booking-widget-live-dot" aria-hidden />
          Live-Verfügbarkeit
        </span>
      </div>

      <div className="booking-widget-meta">
        <span className="booking-widget-meta-item">
          <Video className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Google Meet
        </span>
        <span className="booking-widget-meta-item">
          <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          {MEETING_DURATION_MIN} Min.
        </span>
        <span className="booking-widget-meta-item booking-widget-meta-item--muted">
          {MEETING_TIMEZONE}
        </span>
      </div>

      <div className="booking-widget-body">
        <div className="booking-calendar-pane">
          <div className="booking-calendar-nav">
            <button
              type="button"
              className="booking-calendar-nav-btn"
              onClick={onPrevMonth}
              aria-label="Vorheriger Monat"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="booking-calendar-month">{monthLabel}</p>
            <button
              type="button"
              className="booking-calendar-nav-btn"
              onClick={onNextMonth}
              aria-label="Nächster Monat"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="booking-calendar-weekdays" role="row">
            {weekdayLabels.map((label) => (
              <span key={label} className="booking-calendar-weekday" role="columnheader">
                {label}
              </span>
            ))}
          </div>

          <div className="booking-calendar-grid" role="grid" aria-label={monthLabel}>
            {grid.map((cell) => {
              const isSelected =
                cell.inMonth && selectedDay === cell.day && cell.isSelectable;

              return (
                <button
                  key={`${cell.date.toISOString()}-${cell.inMonth}`}
                  type="button"
                  role="gridcell"
                  disabled={!cell.isSelectable}
                  aria-selected={isSelected}
                  aria-label={
                    cell.inMonth
                      ? `${cell.day}. ${monthLabel}${cell.isSelectable ? ", verfügbar" : ""}`
                      : undefined
                  }
                  onClick={() => onSelectDay(cell.day, cell.isSelectable)}
                  className={[
                    "booking-calendar-day",
                    !cell.inMonth && "booking-calendar-day--muted",
                    cell.isToday && "booking-calendar-day--today",
                    cell.isSelectable && "booking-calendar-day--available",
                    isSelected && "booking-calendar-day--selected",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {cell.day}
                  {cell.isSelectable && !isSelected && (
                    <span className="booking-calendar-day-dot" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="booking-slots-pane">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDate?.toDateString() ?? "none"}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: easePremium }}
              className="booking-slots-inner"
            >
              <p className="booking-slots-label">Verfügbare Zeiten</p>
              <p className="booking-slots-date">
                {selectedDate
                  ? formatSelectedDate(selectedDate)
                  : "Bitte einen Tag wählen"}
              </p>

              <div
                className="booking-slots-grid"
                role="listbox"
                aria-label="Meeting-Zeiten"
              >
                {defaultMeetingSlots.map((slot) => (
                  <SlotButton
                    key={slot.id}
                    slot={slot}
                    selected={selectedSlot === slot.id}
                    disabled={!slot.available || selectedDay == null}
                    onSelect={() => setSelectedSlot(slot.id)}
                    whileTap={slotTap}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <motion.button
            type="button"
            data-booking-cta
            className="booking-widget-cta group"
            onClick={handleBookingClick}
            whileHover={reduced ? undefined : { scale: 1.01 }}
            whileTap={slotTap}
          >
            <span className="booking-widget-cta-glow" aria-hidden />
            <Sparkles className="h-4 w-4 shrink-0 text-violet-200/90" strokeWidth={2} aria-hidden />
            <span className="booking-widget-cta-text">Kostenloses Erstgespräch</span>
            <ArrowRight
              className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
              strokeWidth={2}
              aria-hidden
            />
          </motion.button>

          <p className="booking-widget-footnote">
            {selectedSlot && selectedDate
              ? `Vorschau: ${defaultMeetingSlots.find((s) => s.id === selectedSlot)?.time} Uhr · Bestätigung über Cal.com`
              : "Unverbindlich · Keine Kreditkarte erforderlich"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function SlotButton({
  slot,
  selected,
  disabled,
  onSelect,
  whileTap,
}: {
  slot: MeetingSlot;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  whileTap?: { scale: number };
}) {
  return (
    <motion.button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled || !slot.available}
      onClick={onSelect}
      className={[
        "booking-slot",
        slot.available && "booking-slot--available",
        selected && "booking-slot--selected",
        !slot.available && "booking-slot--unavailable",
      ]
        .filter(Boolean)
        .join(" ")}
      whileTap={whileTap}
      layout={false}
    >
      {slot.time}
      {!slot.available && (
        <span className="booking-slot-badge">Belegt</span>
      )}
    </motion.button>
  );
}
