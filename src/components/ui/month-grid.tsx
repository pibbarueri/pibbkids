"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function toDateKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** First and last day ("YYYY-MM-DD") of the month `offset` months from the current one. */
export function monthRange(offset: number, now = new Date()) {
  const first = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  return { first, from: toDateKey(first), to: toDateKey(last) };
}

/**
 * Month header + weekday row + day grid. The caller renders each day cell, so the same grid
 * serves a plain clickable calendar and a drag-and-drop one.
 */
export function MonthGrid({
  offset,
  onOffsetChange,
  renderDay,
}: {
  offset: number;
  onOffsetChange: (offset: number) => void;
  renderDay: (date: Date, key: string) => React.ReactNode;
}) {
  const { first } = monthRange(offset);
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const firstWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onOffsetChange(offset - 1)} aria-label="Mês anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm">
          {MONTH_LABELS[month]} {year}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onOffsetChange(offset + 1)} aria-label="Próximo mês">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-[10px] text-muted-foreground font-medium">
            {w}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = new Date(Date.UTC(year, month, i + 1));
          const key = toDateKey(d);
          return <div key={key}>{renderDay(d, key)}</div>;
        })}
      </div>
    </div>
  );
}
