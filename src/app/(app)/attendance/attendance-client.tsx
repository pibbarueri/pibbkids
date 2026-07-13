"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, X } from "lucide-react";
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
  classes,
  initialAttendance,
  sunday,
}: {
  children: Child[];
  classes: ClassGroup[];
  initialAttendance: Attendance[];
  sunday: string;
}) {
  const [attendance, setAttendance] = useState(initialAttendance);
  const [saving, setSaving] = useState<string | null>(null);

  function statusFor(childId: string, tipo: string) {
    return attendance.find((a) => a.childId === childId && a.tipo === tipo);
  }

  async function mark(childId: string, tipo: string, present: boolean) {
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

  const withoutClass = children.filter((c) => !c.classGroupId);
  const groups = [...classes.map((c) => ({ id: c.id, name: c.name, children: children.filter((ch) => ch.classGroupId === c.id) }))];
  if (withoutClass.length > 0) groups.push({ id: "none", name: "Sem turma", children: withoutClass });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {new Date(sunday).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
      </p>

      {groups.map((group) => {
        if (group.children.length === 0) return null;
        return (
          <div key={group.id} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{group.name}</p>
            {group.children.map((child) => {
              const tipos = child.frequencia === "AMBOS" ? ["EBD", "CULTO"] : [child.frequencia];
              const hasAlert = !!(child.allergies || child.restrictions);
              return (
                <div key={child.id} className="p-3 border rounded-lg bg-background space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{child.name}</p>
                    {hasAlert && <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />}
                  </div>

                  {hasAlert && (
                    <div className="text-xs bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-2 text-yellow-800 dark:text-yellow-200">
                      {child.allergies && <p>Alergia: {child.allergies}</p>}
                      {child.restrictions && <p>Cuidados: {child.restrictions}</p>}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {tipos.map((tipo) => {
                      const status = statusFor(child.id, tipo);
                      const key = `${child.id}-${tipo}`;
                      return (
                        <div key={tipo} className="flex items-center gap-1 flex-1">
                          <span className="text-xs text-muted-foreground w-12">{tipo}</span>
                          <button
                            disabled={saving === key}
                            onClick={() => mark(child.id, tipo, true)}
                            className={cn(
                              "flex-1 h-9 rounded-md border flex items-center justify-center gap-1 text-xs font-medium transition-colors",
                              status?.present === true
                                ? "bg-green-600 text-white border-green-600"
                                : "border-input hover:bg-muted"
                            )}
                          >
                            <Check className="h-3.5 w-3.5" /> Presente
                          </button>
                          <button
                            disabled={saving === key}
                            onClick={() => mark(child.id, tipo, false)}
                            className={cn(
                              "flex-1 h-9 rounded-md border flex items-center justify-center gap-1 text-xs font-medium transition-colors",
                              status?.present === false
                                ? "bg-destructive text-white border-destructive"
                                : "border-input hover:bg-muted"
                            )}
                          >
                            <X className="h-3.5 w-3.5" /> Ausente
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {children.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma criança aprovada.</p>
      )}
    </div>
  );
}
