"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { sortClasses } from "@/lib/classes";
import { visitorAgeText } from "@/lib/age";
import { dayKey } from "@/lib/dates";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const ALL_CLASSES = "all";

type PresentChild = {
  id: string;
  type: "EBD" | "CULTO";
  childName: string;
  classGroupId: string | null;
  className: string | null;
};

type DayVisitor = {
  id: string;
  name: string;
  birthdate: string | null;
  ageMonths: number | null;
  type: "EBD" | "CULTO";
  classGroup: { id: string; name: string } | null;
};

function toDateKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function AttendanceReportClient() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [dayChildren, setDayChildren] = useState<PresentChild[]>([]);
  const [classFilter, setClassFilter] = useState(ALL_CLASSES);
  const [visitorCounts, setVisitorCounts] = useState<Record<string, number>>({});
  const [visitorsOpen, setVisitorsOpen] = useState(false);
  const [dayVisitors, setDayVisitors] = useState<DayVisitor[]>([]);

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
    fetch(`/api/visitors?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((rows: { createdAt: string }[]) => {
        if (cancelled) return;
        const counts: Record<string, number> = {};
        for (const row of rows) {
          // A visit is a timestamp; its day is the app-timezone day it falls on.
          const key = dayKey(new Date(row.createdAt));
          counts[key] = (counts[key] ?? 0) + 1;
        }
        setVisitorCounts(counts);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month, daysInMonth]);

  function openVisitorList(key: string) {
    setVisitorsOpen(true);
    setDayVisitors([]);
    fetch(`/api/visitors?date=${key}`)
      .then((r) => r.json())
      .then(setDayVisitors);
  }

  function openDayList(key: string) {
    setListOpen(true);
    setClassFilter(ALL_CLASSES);
    fetch(`/api/attendance/report?date=${key}`)
      .then((r) => r.json())
      .then(setDayChildren);
  }

  // Distinct classes present that day, in the canonical ministry order, each tagged with
  // how many children from it are on the list — so the tab itself answers "how many by
  // turma" without opening anything further.
  const classesPresent = sortClasses(
    Array.from(
      new Map(
        dayChildren
          .filter((c) => c.classGroupId)
          .map((c) => [c.classGroupId!, { id: c.classGroupId!, name: c.className! }])
      ).values()
    )
  );
  const visibleChildren = classFilter === ALL_CLASSES ? dayChildren : dayChildren.filter((c) => c.classGroupId === classFilter);

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
          const visitors = visitorCounts[key] ?? 0;
          const isToday = key === todayKey;
          return (
            <button
              key={i}
              onClick={() => setSelectedKey(key === selectedKey ? null : key)}
              className={cn(
                "aspect-square rounded-md text-xs flex items-center justify-center relative transition-transform active:scale-90",
                isToday && "font-bold border border-primary",
                key === selectedKey && "bg-primary text-primary-foreground",
                (count > 0 || visitors > 0) && key !== selectedKey && "bg-muted"
              )}
            >
              {d.getUTCDate()}
              {(count > 0 || visitors > 0) && (
                <span className="absolute bottom-0.5 flex gap-0.5">
                  {count > 0 && (
                    <span className={cn("h-1 w-1 rounded-full block", key === selectedKey ? "bg-primary-foreground" : "bg-orange-500")} />
                  )}
                  {visitors > 0 && (
                    <span className={cn("h-1 w-1 rounded-full block", key === selectedKey ? "bg-primary-foreground" : "bg-chart-2")} />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedKey && (
        <div className="mt-3 pt-3 border-t space-y-1">
          {(dayCounts[selectedKey] ?? 0) > 0 && (
            <button
              onClick={() => openDayList(selectedKey)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-muted text-left transition-transform active:scale-[0.98]"
            >
              <span className="text-sm">{dayCounts[selectedKey]} crianças presentes</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          )}
          {(visitorCounts[selectedKey] ?? 0) > 0 && (
            <button
              onClick={() => openVisitorList(selectedKey)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-muted text-left transition-transform active:scale-[0.98]"
            >
              <span className="text-sm">
                {visitorCounts[selectedKey]} visitante{visitorCounts[selectedKey] === 1 ? "" : "s"}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          )}
          {!(dayCounts[selectedKey] ?? 0) && !(visitorCounts[selectedKey] ?? 0) && (
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
          {classesPresent.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setClassFilter(ALL_CLASSES)}
                className={cn(
                  "h-8 rounded-full border px-3 text-xs font-medium transition-all active:scale-95",
                  classFilter === ALL_CLASSES ? "border-primary bg-primary text-primary-foreground" : "border-input"
                )}
              >
                Todas ({dayChildren.length})
              </button>
              {classesPresent.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setClassFilter(cls.id)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs font-medium transition-all active:scale-95",
                    classFilter === cls.id ? "border-primary bg-primary text-primary-foreground" : "border-input"
                  )}
                >
                  {cls.name} ({dayChildren.filter((c) => c.classGroupId === cls.id).length})
                </button>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {visibleChildren.map((c) => (
              <div key={c.id} className="p-3 border rounded-lg bg-background">
                <p className="font-medium text-sm wrap-anywhere">{c.childName}</p>
                <p className="text-xs text-muted-foreground">
                  {c.className ?? "Sem turma"} · {c.type === "CULTO" ? "Culto" : "EBD"}
                </p>
              </div>
            ))}
            {visibleChildren.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma presença registrada nesse dia.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={visitorsOpen} onOpenChange={setVisitorsOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Visitantes — {selectedKey && new Date(`${selectedKey}T00:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {dayVisitors.map((v) => (
              <Link
                key={v.id}
                href={`/reports/visitors/${v.id}`}
                className="block p-3 border rounded-lg bg-background hover:bg-muted/50 transition-all active:scale-[0.98]"
              >
                <p className="font-medium text-sm wrap-anywhere">{v.name}</p>
                <p className="text-xs text-muted-foreground">
                  {visitorAgeText(v)} · {v.classGroup?.name ?? "Sem turma"} · {v.type === "CULTO" ? "Culto" : "EBD"}
                </p>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
