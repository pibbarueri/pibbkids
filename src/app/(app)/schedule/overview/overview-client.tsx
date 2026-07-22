"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

type ClassGroup = { id: string; name: string };
type Slot = {
  date: string;
  classGroupId: string | null;
  horario: string | null;
  role: string | null;
  user: { name: string };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function slotLabel(s: Slot | undefined) {
  if (!s) return "—";
  const cargo = s.role === "AUXILIAR" ? "Aux" : "Prof";
  return `${s.user.name} (${cargo})`;
}

export function OverviewClient({
  slots: rawSlots,
  classes,
  sundays,
}: {
  slots: Slot[];
  classes: ClassGroup[];
  sundays: string[];
}) {
  const slots = rawSlots.map((s) => ({ ...s, date: new Date(s.date).toISOString() }));

  function copyWhatsApp() {
    const lines = ["📅 *Calendário de Escalas*\n"];
    for (const sunday of sundays) {
      const key = sunday.slice(0, 10);
      const daySlots = slots.filter((s) => s.date.startsWith(key));
      if (daySlots.length === 0) continue;
      lines.push(`*${formatDate(sunday)}*`);
      for (const cls of classes) {
        const ebd = daySlots.find((s) => s.classGroupId === cls.id && s.horario === "EBD");
        const culto = daySlots.find((s) => s.classGroupId === cls.id && s.horario === "CULTO");
        if (!ebd && !culto) continue;
        lines.push(`  ${cls.name}: EBD ${slotLabel(ebd)} · Culto ${slotLabel(culto)}`);
      }
      lines.push("");
    }
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="space-y-3">
      <Button variant="outline" className="h-10" onClick={copyWhatsApp}>
        <Copy className="h-4 w-4 mr-2" /> Copiar calendário
      </Button>

      <div className="overflow-x-auto border rounded-lg">
        <table className="text-sm w-max">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 bg-muted/50 p-2 text-left border-r z-10 min-w-[80px]">Domingo</th>
              {classes.map((cls) => (
                <th key={cls.id} className="p-2 text-left border-r min-w-[180px]">{cls.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sundays.map((sunday) => {
              const key = sunday.slice(0, 10);
              const daySlots = slots.filter((s) => s.date.startsWith(key));
              return (
                <tr key={sunday} className="border-t">
                  <td className="sticky left-0 bg-background p-2 border-r font-medium z-10">
                    {formatDate(sunday)}
                  </td>
                  {classes.map((cls) => {
                    const ebd = daySlots.find((s) => s.classGroupId === cls.id && s.horario === "EBD");
                    const culto = daySlots.find((s) => s.classGroupId === cls.id && s.horario === "CULTO");
                    return (
                      <td key={cls.id} className="p-2 border-r align-top">
                        <p className="text-xs">EBD: {slotLabel(ebd)}</p>
                        <p className="text-xs">Culto: {slotLabel(culto)}</p>
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
