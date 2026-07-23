"use client";

import { useEffect, useState } from "react";
import { Check, Search, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { sortClasses } from "@/lib/classes";

type ClassGroup = { id: string; name: string };
type Child = {
  id: string;
  name: string;
  frequency: string;
  allergies: string | null;
  restrictions: string | null;
  classGroupId: string | null;
  classGroup: ClassGroup | null;
};
type Attendance = { childId: string; type: string; present: boolean };

export function AttendanceClient({
  children,
  initialAttendance,
  currentSunday,
  isAdmin,
}: {
  children: Child[];
  initialAttendance: Attendance[];
  currentSunday: string;
  isAdmin: boolean;
}) {
  // weekOffset: 0 = current sunday, -1 = last sunday, +1 = next sunday, ...
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [horarioTab, setHorarioTab] = useState<"EBD" | "CULTO">("EBD");

  // Distinct turmas present among the children, in canonical order.
  const classOptions = sortClasses(
    Array.from(
      new Map(
        children
          .filter((c) => c.classGroup)
          .map((c) => [c.classGroup!.id, c.classGroup!])
      ).values()
    )
  );

  const selectedSunday = new Date(currentSunday);
  selectedSunday.setDate(selectedSunday.getDate() + weekOffset * 7);
  const selectedISO = selectedSunday.toISOString();

  // Days between selected sunday and today (0 = today, >0 future, <0 past).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selDay = new Date(selectedSunday);
  selDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((selDay.getTime() - today.getTime()) / 86400000);

  const isFuture = diffDays > 0;
  const isPast = diffDays < 0;
  // Only today is freely editable; past sundays admin-only; future never.
  const editable = isFuture ? false : isPast ? isAdmin : true;

  // Label shows only for the next upcoming sunday: "Hoje" / "Amanhã" / "Próximo domingo".
  const dayLabel = (() => {
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Amanhã";
    if (diffDays === (7 - today.getDay()) % 7) return "Próximo domingo";
    return null;
  })();

  // Always refetch the selected sunday from the API so local edits (and edits on
  // other sundays) aren't clobbered by the stale server snapshot on return.
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

  // Only children whose frequency includes the active tab's tipo show up at all.
  const eligibleForTab = children.filter(
    (c) => c.frequency === "AMBOS" || c.frequency === horarioTab
  );

  function isPresent(childId: string) {
    return attendance.some((a) => a.childId === childId && a.type === horarioTab && a.present);
  }

  // Count of present children per turma, for the active tab — shown next to each filter chip.
  const presentCountByClass = new Map<string, number>();
  for (const c of eligibleForTab) {
    if (!c.classGroupId || !isPresent(c.id)) continue;
    presentCountByClass.set(c.classGroupId, (presentCountByClass.get(c.classGroupId) ?? 0) + 1);
  }
  const totalPresent = eligibleForTab.filter((c) => isPresent(c.id)).length;

  const filtered = eligibleForTab.filter(
    (c) =>
      c.name.toLowerCase().includes(search.trim().toLowerCase()) &&
      (classFilter === "all" || c.classGroupId === classFilter)
  );

  async function toggle(childId: string, current: boolean) {
    if (!editable) return;
    const present = !current;
    setSaving(childId);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, date: selectedISO, type: horarioTab, present }),
    });
    if (res.ok) {
      const saved = await res.json();
      setAttendance((prev) => {
        const idx = prev.findIndex((a) => a.childId === childId && a.type === horarioTab);
        if (idx === -1) return [...prev, saved];
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      });
    }
    setSaving(null);
  }

  return (
    <div className="space-y-4">
      {/* Date slider */}
      <div className="flex items-center justify-between rounded-lg border bg-background p-2">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-muted transition-transform active:scale-90"
          aria-label="Domingo anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium">
            {selectedSunday.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
          {dayLabel && <p className="text-[11px] text-muted-foreground">{dayLabel}</p>}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-muted transition-transform active:scale-90"
          aria-label="Próximo domingo"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {!editable && (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          {isFuture
            ? "Não é possível marcar presença para um domingo futuro."
            : "Somente administrador pode editar domingos passados."}
        </div>
      )}

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
            Todas ({totalPresent})
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar criança..."
          className="h-11 pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((child) => {
          const present = isPresent(child.id);
          return (
            <div key={child.id} className="flex items-center gap-2 p-3 border rounded-lg bg-background">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{child.name}</p>
                <p className="text-xs text-muted-foreground truncate">{child.classGroup?.name ?? "Sem turma"}</p>
              </div>
              <button
                disabled={saving === child.id || !editable}
                onClick={() => toggle(child.id, present)}
                className={cn(
                  "h-9 w-9 rounded-full border flex items-center justify-center transition-all active:scale-90 shrink-0",
                  present ? "bg-green-600 border-green-600 text-white" : "border-input",
                  !editable && "opacity-50 cursor-not-allowed"
                )}
              >
                {present && <Check className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {eligibleForTab.length === 0 ? "Nenhuma criança nesse horário." : "Nenhuma criança encontrada."}
        </p>
      )}
    </div>
  );
}
