"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ClassFilterChips } from "@/components/reports/class-filter-chips";
import { DateRangeFilter } from "@/components/reports/date-range-filter";
import { ReportFilterSheet } from "@/components/reports/report-filter-sheet";

const LESSON_TYPE_LABELS: Record<string, string> = {
  WORKBOOK: "Apostila",
  EXTRA_CLASS: "Aula Extra",
  REVIEW: "Revisão",
  QUIZ_GAME: "Quiz/Gincana",
  NO_CLASS: "Sem aula",
  FREE_TOPIC: "Tema Livre",
};

type ClassGroup = { id: string; name: string };
type Plan = {
  date: string;
  classGroupId: string;
  type: string;
  journal: { id: string; title: string; edition: number } | null;
  lessonNumber: number | null;
  lessonType: string;
  specialTitle: string | null;
  done: boolean;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function planLabel(p: Plan | undefined) {
  if (!p) return "—";
  if (p.lessonType !== "WORKBOOK") return p.specialTitle || LESSON_TYPE_LABELS[p.lessonType];
  if (p.journal) return `L${p.lessonNumber ?? "?"} — ${p.journal.title}`;
  return "Sem plano";
}

export function OverviewClient({
  plans: rawPlans,
  classes,
  sundays,
}: {
  plans: Plan[];
  classes: ClassGroup[];
  sundays: string[];
}) {
  const plans = rawPlans.map((p) => ({ ...p, date: new Date(p.date).toISOString() }));
  const [selectedClasses, setSelectedClasses] = useState<Set<string> | null>(null);
  const [dateRange, setDateRange] = useState<{ min: string | null; max: string | null }>({ min: null, max: null });

  const visibleClasses = classes.filter((c) => selectedClasses === null || selectedClasses.has(c.id));
  const visibleSundays = sundays.filter((sunday) => {
    const key = sunday.slice(0, 10);
    if (dateRange.min && key < dateRange.min) return false;
    if (dateRange.max && key > dateRange.max) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <ReportFilterSheet className="fixed bottom-20 left-4 z-40 shadow-lg bg-background">
        <ClassFilterChips classes={classes} selected={selectedClasses} onChange={setSelectedClasses} />
        <DateRangeFilter min={dateRange.min} max={dateRange.max} onChange={setDateRange} />
      </ReportFilterSheet>
      <div className="overflow-auto border rounded-lg max-h-[70vh]">
        <table className="text-sm w-max">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky top-0 left-0 bg-muted p-2 text-left border-r z-20 min-w-[80px]">Domingo</th>
              {visibleClasses.map((cls) => (
                <th key={cls.id} className="sticky top-0 bg-muted p-2 text-left border-r z-10 min-w-[180px]">{cls.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleSundays.map((sunday) => {
              const key = sunday.slice(0, 10);
              const dayPlans = plans.filter((p) => p.date.startsWith(key));
              return (
                <tr key={sunday} className="border-t">
                  <td className="sticky left-0 bg-background p-2 border-r font-medium z-10">
                    {formatDate(sunday)}
                  </td>
                  {visibleClasses.map((cls) => {
                    const ebd = dayPlans.find((p) => p.classGroupId === cls.id && p.type === "EBD");
                    const culto = dayPlans.find((p) => p.classGroupId === cls.id && p.type === "CULTO");
                    return (
                      <td key={cls.id} className="p-2 border-r align-top">
                        <p className={cn("text-xs", ebd?.done && "text-muted-foreground line-through")}>
                          EBD: {planLabel(ebd)}
                        </p>
                        <p className={cn("text-xs", culto?.done && "text-muted-foreground line-through")}>
                          Culto: {planLabel(culto)}
                        </p>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
