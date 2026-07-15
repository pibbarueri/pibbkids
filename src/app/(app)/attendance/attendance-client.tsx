"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
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
  sunday,
}: {
  children: Child[];
  initialAttendance: Attendance[];
  sunday: string;
}) {
  const [attendance, setAttendance] = useState(initialAttendance);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = children.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function statusFor(childId: string, tipo: string) {
    return attendance.find((a) => a.childId === childId && a.tipo === tipo);
  }

  async function toggle(childId: string, tipo: string, current: boolean | undefined) {
    const present = !current;
    const key = `${childId}-${tipo}`;
    setSaving(key);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, date: sunday, tipo, present }),
    });
    const saved = await res.json();
    setAttendance((prev) => {
      const idx = prev.findIndex((a) => a.childId === childId && a.tipo === tipo);
      if (idx === -1) return [...prev, saved];
      const copy = [...prev];
      copy[idx] = saved;
      return copy;
    });
    setSaving(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {new Date(sunday).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })}
      </p>

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
                        disabled={saving === key}
                        onClick={() => toggle(child.id, tipo, status?.present)}
                        className={cn(
                          "h-9 w-9 rounded-full border flex items-center justify-center transition-colors",
                          status?.present ? "bg-green-600 border-green-600 text-white" : "border-input"
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
