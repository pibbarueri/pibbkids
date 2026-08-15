"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type PresentChild = { id: string; type: "EBD" | "CULTO"; childName: string; className: string | null };

function toDateKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function AttendanceReportClient() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [dayChildren, setDayChildren] = useState<PresentChild[]>([]);

  const today = new Date();
  const viewDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + monthOffset, 1));
  const year = viewDate.getUTCFullYear();
  const month = viewDate.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const todayKey = toDateKey(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));

  const cells: (Date | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(Date.UTC(year, month, i + 1))),
  ];

  useEffect(() => {
    const from = toDateKey(new Date(Date.UTC(year, month, 1)));
    const to = toDateKey(new Date(Date.UTC(year, month, daysInMonth)));
    let cancelled = false;
    fetch(`/api/attendance/report?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((counts: Record<string, number>) => {
        if (!cancelled) setDayCounts(counts);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month, daysInMonth]);

  function openDayList(key: string) {
    setListOpen(true);
    fetch(`/api/attendance/report?date=${key}`)
      .then((r) => r.json())
      .then(setDayChildren);
  }

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
          const count = dayCounts[key] ?? 0;
          const isToday = key === todayKey;
          return (
            <button
              key={i}
              onClick={() => setSelectedKey(key === selectedKey ? null : key)}
              className={cn(
                "aspect-square rounded-md text-xs flex items-center justify-center relative transition-transform active:scale-90",
                isToday && "font-bold border border-primary",
                key === selectedKey && "bg-primary text-primary-foreground",
                count > 0 && key !== selectedKey && "bg-muted"
              )}
            >
              {d.getUTCDate()}
              {count > 0 && (
                <span className="absolute bottom-0.5">
                  <span className={cn("h-1 w-1 rounded-full block", key === selectedKey ? "bg-primary-foreground" : "bg-orange-500")} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedKey && (
        <div className="mt-3 pt-3 border-t">
          {(dayCounts[selectedKey] ?? 0) > 0 ? (
            <button
              onClick={() => openDayList(selectedKey)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-muted text-left transition-transform active:scale-[0.98]"
            >
              <span className="text-sm">{dayCounts[selectedKey]} crianças presentes</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma presença registrada nesse dia.</p>
          )}
        </div>
      )}

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Presença — {selectedKey && new Date(`${selectedKey}T00:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {dayChildren.map((c) => (
              <div key={c.id} className="p-3 border rounded-lg bg-background">
                <p className="font-medium text-sm wrap-anywhere">{c.childName}</p>
                <p className="text-xs text-muted-foreground">
                  {c.className ?? "Sem turma"} · {c.type === "CULTO" ? "Culto" : "EBD"}
                </p>
              </div>
            ))}
            {dayChildren.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma presença registrada nesse dia.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
