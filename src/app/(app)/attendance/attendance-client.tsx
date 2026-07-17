"use client";

import { useEffect, useState } from "react";
import { Check, Search, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ClassGroup = { id: string; name: string };
type Child = {
  id: string;
  name: string;
  frequencia: string;
  allergies: string | null;
  restrictions: string | null;
  classGroupId: string | null;
  classGroup: ClassGroup | null;
};
type Attendance = { childId: string; tipo: string; present: boolean };

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

  // Refetch attendance whenever the selected sunday changes (skip initial current sunday).
  useEffect(() => {
    if (weekOffset === 0) {
      setAttendance(initialAttendance);
      return;
    }
    let cancelled = false;
    fetch(`/api/attendance?date=${encodeURIComponent(selectedISO)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAttendance(data);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const filtered = children.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function statusFor(childId: string, tipo: string) {
    return attendance.find((a) => a.childId === childId && a.tipo === tipo);
  }

  async function toggle(childId: string, tipo: string, current: boolean | undefined) {
    if (!editable) return;
    const present = !current;
    const key = `${childId}-${tipo}`;
    setSaving(key);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, date: selectedISO, tipo, present }),
    });
    if (res.ok) {
      const saved = await res.json();
      setAttendance((prev) => {
        const idx = prev.findIndex((a) => a.childId === childId && a.tipo === tipo);
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
          className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-muted"
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
          className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-muted"
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
          const tipos = child.frequencia === "AMBOS" ? ["EBD", "CULTO"] : [child.frequencia];
          return (
            <div key={child.id} className="flex items-center gap-2 p-3 border rounded-lg bg-background">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{child.name}</p>
                <p className="text-xs text-muted-foreground truncate">{child.classGroup?.name ?? "Sem turma"}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {tipos.map((tipo) => {
                  const status = statusFor(child.id, tipo);
                  const key = `${child.id}-${tipo}`;
                  return (
                    <div key={tipo} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">{tipo}</span>
                      <button
                        disabled={saving === key || !editable}
                        onClick={() => toggle(child.id, tipo, status?.present)}
                        className={cn(
                          "h-9 w-9 rounded-full border flex items-center justify-center transition-colors",
                          status?.present ? "bg-green-600 border-green-600 text-white" : "border-input",
                          !editable && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {status?.present && <Check className="h-4 w-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {children.length === 0 ? "Nenhuma criança aprovada." : "Nenhuma criança encontrada."}
        </p>
      )}
    </div>
  );
}
