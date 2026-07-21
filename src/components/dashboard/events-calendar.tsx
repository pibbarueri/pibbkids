"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type CalendarEvent = { id: string; title: string; date: string; description: string | null };
type Birthday = { name: string; day: number; month: number };

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toDateKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function EventsCalendar({
  events,
  birthdays = [],
}: {
  events: CalendarEvent[];
  birthdays?: Birthday[];
}) {
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);

  const viewDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + monthOffset, 1));
  const year = viewDate.getUTCFullYear();
  const month = viewDate.getUTCMonth();

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = toDateKey(new Date(ev.date));
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(ev);
  }

  // Birthdays recur yearly — key by month-day, matched against the viewed month.
  const birthdaysByDay = new Map<string, string[]>();
  for (const b of birthdays) {
    const key = `${b.month}-${b.day}`;
    if (!birthdaysByDay.has(key)) birthdaysByDay.set(key, []);
    birthdaysByDay.get(key)!.push(b.name);
  }
  const bdayKey = (d: Date) => `${d.getUTCMonth() + 1}-${d.getUTCDate()}`;

  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const todayKey = toDateKey(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));

  const cells: (Date | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(Date.UTC(year, month, i + 1))),
  ];

  const selectedEvents = selectedKey ? eventsByDay.get(selectedKey) ?? [] : [];
  const selectedBirthdays = (() => {
    if (!selectedKey) return [] as string[];
    const [, mm, dd] = selectedKey.split("-");
    return birthdaysByDay.get(`${Number(mm)}-${Number(dd)}`) ?? [];
  })();

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setMonthOffset((m) => m - 1); setSelectedKey(null); }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm">{MONTH_LABELS[month]} {year}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setMonthOffset((m) => m + 1); setSelectedKey(null); }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-[10px] text-muted-foreground font-medium">{w}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const key = toDateKey(d);
          const hasEvents = eventsByDay.has(key);
          const hasBirthday = birthdaysByDay.has(bdayKey(d));
          const isToday = key === todayKey;
          return (
            <button
              key={i}
              onClick={() => setSelectedKey(key === selectedKey ? null : key)}
              className={cn(
                "aspect-square rounded-md text-xs flex items-center justify-center relative",
                isToday && "font-bold border border-primary",
                key === selectedKey && "bg-primary text-primary-foreground",
                (hasEvents || hasBirthday) && key !== selectedKey && "bg-muted"
              )}
            >
              {d.getUTCDate()}
              {(hasEvents || hasBirthday) && (
                <span className="absolute bottom-0.5 flex gap-0.5">
                  {hasEvents && (
                    <span className={cn("h-1 w-1 rounded-full", key === selectedKey ? "bg-primary-foreground" : "bg-orange-500")} />
                  )}
                  {hasBirthday && (
                    <span className={cn("h-1 w-1 rounded-full", key === selectedKey ? "bg-primary-foreground" : "bg-green-600")} />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedKey && (
        <div className="space-y-1 mt-3 pt-3 border-t">
          {selectedBirthdays.map((name, i) => (
            <p key={`b-${i}`} className="text-sm px-1 py-0.5">🎂 {name}</p>
          ))}
          {selectedEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={() => setDetail(ev)}
              className="block w-full text-left text-sm rounded-md px-1 py-0.5 hover:bg-muted"
            >
              🎉 {ev.title}
            </button>
          ))}
          {selectedEvents.length === 0 && selectedBirthdays.length === 0 && (
            <p className="text-xs text-muted-foreground">Nada nesse dia.</p>
          )}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">📅 {formatFullDate(detail.date)}</p>
                {detail.description && <p className="text-sm">{detail.description}</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
