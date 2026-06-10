"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarViewMode } from "@/lib/dashboard/calendar";
import { formatMonthYear, formatWeekRange } from "@/lib/dashboard/calendar";

interface CalendarToolbarProps {
  viewMode: CalendarViewMode;
  viewDate: Date;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarToolbar({
  viewMode,
  viewDate,
  onViewModeChange,
  onPrevious,
  onNext,
  onToday,
}: CalendarToolbarProps) {
  const label =
    viewMode === "month"
      ? formatMonthYear(viewDate)
      : formatWeekRange(
          (() => {
            const d = new Date(viewDate);
            const offset = (d.getDay() + 6) % 7;
            d.setDate(d.getDate() - offset);
            return d;
          })(),
        );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          className="dashboard-icon-btn rounded-xl p-2.5"
          aria-label={viewMode === "month" ? "Vorheriger Monat" : "Vorherige Woche"}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          className="dashboard-icon-btn rounded-xl p-2.5"
          aria-label={viewMode === "month" ? "Nächster Monat" : "Nächste Woche"}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="dashboard-btn-secondary px-3 py-2 text-xs"
        >
          Heute
        </button>
        <h2 className="ml-1 text-lg font-semibold capitalize tracking-tight text-foreground">
          {label}
        </h2>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-black/20 p-1">
        <ViewToggle
          active={viewMode === "month"}
          onClick={() => onViewModeChange("month")}
          label="Monat"
        />
        <ViewToggle
          active={viewMode === "week"}
          onClick={() => onViewModeChange("week")}
          label="Woche"
        />
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-gradient-to-r from-violet-600/80 to-cyan-600/60 text-white shadow-[0_0_20px_rgba(139,92,246,0.25)]"
          : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
