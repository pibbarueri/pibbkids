"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { sortClasses } from "@/lib/classes";

type ClassGroup = { id: string; name: string };
type Child = {
  id: string;
  name: string;
  frequency: string;
  classGroupId: string | null;
  classGroup: ClassGroup | null;
};
type Attendance = { childId: string; type: string; present: boolean };

export function AttendanceViewClient({
  children,
  initialAttendance,
  currentSunday,
}: {
  children: Child[];
  initialAttendance: Attendance[];
  currentSunday: string;
}) {
  // weekOffset: 0 = current sunday, -1 = last sunday, +1 = next sunday, ...
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [horarioTab, setHorarioTab] = useState<"EBD" | "CULTO">("EBD");

  const selectedSunday = new Date(currentSunday);
  selectedSunday.setDate(selectedSunday.getDate() + weekOffset * 7);
  const selectedISO = selectedSunday.toISOString();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selDay = new Date(selectedSunday);
  selDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((selDay.getTime() - today.getTime()) / 86400000);
  const dayLabel = (() => {
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Amanhã";
    if (diffDays === (7 - today.getDay()) % 7) return "Próximo domingo";
    return null;
  })();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attendance?date=${encodeURIComponent(selectedISO)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAttendance(data);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedISO]);

  const classOptions = sortClasses(
    Array.from(
      new Map(
        children
          .filter((c) => c.classGroup)
          .map((c) => [c.classGroup!.id, c.classGroup!])
      ).values()
    )
  );

  const eligibleForTab = children.filter(
    (c) => c.frequency === "AMBOS" || c.frequency === horarioTab
  );

  function isPresent(childId: string) {
    return attendance.some((a) => a.childId === childId && a.type === horarioTab && a.present);
  }

  const presentChildren = eligibleForTab.filter((c) => isPresent(c.id));

  const presentCountByClass = new Map<string, number>();
  for (const c of presentChildren) {
    if (!c.classGroupId) continue;
    presentCountByClass.set(c.classGroupId, (presentCountByClass.get(c.classGroupId) ?? 0) + 1);
  }

  const filtered = presentChildren.filter(
    (c) => classFilter === "all" || c.classGroupId === classFilter
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Domingo anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-medium">
            {selectedSunday.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "UTC" })}
          </p>
          {dayLabel && <p className="text-[11px] text-muted-foreground">{dayLabel}</p>}
        </div>
        <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Próximo domingo">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={horarioTab} onValueChange={(v) => setHorarioTab(v as "EBD" | "CULTO")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="EBD">EBD</TabsTrigger>
          <TabsTrigger value="CULTO">Culto</TabsTrigger>
        </TabsList>
      </Tabs>

      {classOptions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setClassFilter("all")}
            className={cn(
              "h-8 rounded-full border px-3 text-xs font-medium transition-all active:scale-95",
              classFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "border-input"
            )}
          >
            Todas ({presentChildren.length})
          </button>
          {classOptions.map((c) => (
            <button
              key={c.id}
              onClick={() => setClassFilter(c.id)}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-medium transition-all active:scale-95",
                classFilter === c.id ? "border-primary bg-primary text-primary-foreground" : "border-input"
              )}
            >
              {c.name} ({presentCountByClass.get(c.id) ?? 0})
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((child) => (
          <div key={child.id} className="flex items-center gap-2 p-3 border rounded-lg bg-background">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{child.name}</p>
              <p className="text-xs text-muted-foreground truncate">{child.classGroup?.name ?? "Sem turma"}</p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma criança presente nesse horário{selectedSunday > today ? " ainda" : ""}.
        </p>
      )}
    </div>
  );
}
