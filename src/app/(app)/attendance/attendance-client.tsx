"use client";

import { useEffect, useState } from "react";
import { Check, Search, ChevronLeft, ChevronRight, Lock, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { sortClasses } from "@/lib/classes";
import { dayKey } from "@/lib/dates";
import { visitorAgeYears } from "@/lib/age";
import {
  VisitorForm,
  emptyVisitorForm,
  isVisitorFormValid,
  visitorPayload,
  type VisitorFormValue,
} from "@/components/visitor-form";
import { VisitorEditDialog } from "@/components/visitor-edit-dialog";

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
type Visitor = {
  id: string;
  name: string;
  birthdate: string | null;
  age: number | null;
  type: "EBD" | "CULTO";
  classGroup: ClassGroup | null;
  childId: string | null;
  canEdit: boolean;
};
function VisitorFab({
  canLogVisitor,
  date,
  type,
  onCreated,
}: {
  canLogVisitor: boolean;
  date: string;
  type: "EBD" | "CULTO";
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<VisitorFormValue>(emptyVisitorForm(type));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ name: string; age: number; className: string } | null>(null);

  function reset() {
    setForm(emptyVisitorForm(type));
    setResult(null);
  }

  async function save() {
    if (!isVisitorFormValid(form)) return;
    setSaving(true);
    const res = await fetch("/api/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...visitorPayload(form, { includeSchedule: false }), date, type }),
    });
    if (res.ok) {
      const created = await res.json();
      setResult({
        name: created.name,
        age: created.age,
        className: created.classGroup?.name ?? "Sem turma definida",
      });
    }
    setSaving(false);
  }

  if (!canLogVisitor) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        className={cn(buttonVariants({ size: "icon" }), "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40")}
        aria-label="Incluir visitante"
      >
        <UserPlus className="h-6 w-6" />
      </DialogTrigger>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>{result.name}</DialogTitle>
            </DialogHeader>
            <p className="text-sm">
              Tem <span className="font-bold">{result.age} anos</span> e vai pra sala{" "}
              <span className="font-bold">{result.className}</span>.
            </p>
            <Button
              className="w-full h-12"
              onClick={() => {
                setOpen(false);
                reset();
                onCreated();
              }}
            >
              Ok
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Incluir visitante</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <VisitorForm value={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} withAutocomplete />
              <Button className="w-full h-12" disabled={!isVisitorFormValid(form) || saving} onClick={save}>
                Salvar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AttendanceClient({
  children,
  initialAttendance,
  currentSunday,
  isAdmin,
  canLogVisitor,
}: {
  children: Child[];
  initialAttendance: Attendance[];
  currentSunday: string;
  isAdmin: boolean;
  canLogVisitor: boolean;
}) {
  // weekOffset: 0 = current sunday, -1 = last sunday, +1 = next sunday, ...
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [timeSlotTab, setTimeSlotTab] = useState<"EBD" | "CULTO">("EBD");
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [visitorsVersion, setVisitorsVersion] = useState(0);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);

  // Distinct classes present among the children, in canonical order.
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

  const selectedDayKey = dayKey(selectedSunday);

  useEffect(() => {
    if (!canLogVisitor) return;
    let cancelled = false;
    fetch(`/api/visitors?date=${selectedDayKey}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setVisitors(data);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDayKey, canLogVisitor, visitorsVersion]);

  // Visitors are logged for a specific horário (EBD/Culto) — only show/count them under
  // the matching tab.
  const visitorsForTab = visitors.filter((v) => v.type === timeSlotTab);

  // A child efetivada from a visitor logged on this same day already shows up as that
  // visitor card — skip the regular roster card too, or she'd appear twice.
  const effectivatedTodayIds = new Set(visitorsForTab.filter((v) => v.childId).map((v) => v.childId));
  const classesWithVisitors = new Set(visitorsForTab.filter((v) => v.classGroup).map((v) => v.classGroup!.id));

  // Only children whose frequency includes the active tab's tipo show up at all.
  const eligibleForTab = children.filter(
    (c) => (c.frequency === "AMBOS" || c.frequency === timeSlotTab) && !effectivatedTodayIds.has(c.id)
  );

  function isPresent(childId: string) {
    return attendance.some((a) => a.childId === childId && a.type === timeSlotTab && a.present);
  }

  // Count of present children per class, for the active tab — shown next to each filter chip.
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
      body: JSON.stringify({ childId, date: selectedISO, type: timeSlotTab, present }),
    });
    if (res.ok) {
      const saved = await res.json();
      setAttendance((prev) => {
        const idx = prev.findIndex((a) => a.childId === childId && a.type === timeSlotTab);
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
            : "Somente liderança pode editar domingos passados."}
        </div>
      )}

      <Tabs value={timeSlotTab} onValueChange={(v) => setTimeSlotTab(v as "EBD" | "CULTO")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="EBD">EBD</TabsTrigger>
          <TabsTrigger value="CULTO">Culto</TabsTrigger>
        </TabsList>
      </Tabs>

      {canLogVisitor && visitorsForTab.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {totalPresent} crianças presentes + {visitorsForTab.length} visitante{visitorsForTab.length === 1 ? "" : "s"} = {totalPresent + visitorsForTab.length} no total
        </p>
      )}

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
              {c.name}{classesWithVisitors.has(c.id) && "*"} ({presentCountByClass.get(c.id) ?? 0})
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

      {canLogVisitor && visitorsForTab.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground">Visitantes ({visitorsForTab.length})</p>
          {visitorsForTab.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={!v.canEdit}
              onClick={() => setEditingVisitor(v)}
              className="flex w-full items-center gap-2 p-3 border rounded-lg bg-muted/40 text-left transition-transform enabled:active:scale-[0.98] disabled:cursor-default"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{v.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {v.classGroup?.name ?? "Sem turma"} · {visitorAgeYears(v)} anos
                  {v.childId && " · efetivado"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <VisitorEditDialog
        visitor={editingVisitor}
        onClose={() => setEditingVisitor(null)}
        onChanged={() => setVisitorsVersion((n) => n + 1)}
      />

      <VisitorFab canLogVisitor={canLogVisitor} date={selectedDayKey} type={timeSlotTab} onCreated={() => setVisitorsVersion((v) => v + 1)} />
    </div>
  );
}
