"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

type ClassGroup = { id: string; name: string };
type Slot = {
  date: string;
  slotType: string;
  classGroupId: string | null;
  timeSlot: string | null;
  role: string | null;
  user: { name: string; username: string | null };
};

// Non-class slot types, in display order — coordenação first.
const SPECIAL_COLUMNS: { slotType: string; label: string }[] = [
  { slotType: "COORDINATOR", label: "Coordenação" },
  { slotType: "RECEPTION", label: "Recepção" },
  { slotType: "SNACK", label: "Lanche" },
  { slotType: "ROOM_PLUS", label: "Sala Plus" },
  { slotType: "INCLUSION", label: "Inclusão" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function volunteerLabel(u: { name: string; username: string | null }) {
  return u.username ?? u.name;
}

function slotLabel(s: Slot) {
  const role = s.role === "ASSISTANT" ? "Aux" : s.role === "TEACHER" ? "Prof" : null;
  return role ? `${volunteerLabel(s.user)} (${role})` : volunteerLabel(s.user);
}

function groupLabel(slots: Slot[]) {
  return slots.length > 0 ? slots.map(slotLabel).join(", ") : "—";
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
      for (const col of SPECIAL_COLUMNS) {
        const colSlots = daySlots.filter((s) => s.slotType === col.slotType);
        if (colSlots.length === 0) continue;
        const ebd = colSlots.filter((s) => s.timeSlot === "EBD");
        const culto = colSlots.filter((s) => s.timeSlot === "CULTO");
        const none = colSlots.filter((s) => !s.timeSlot);
        if (none.length > 0) lines.push(`  ${col.label}: ${groupLabel(none)}`);
        if (ebd.length > 0 || culto.length > 0) {
          lines.push(`  ${col.label}: EBD ${groupLabel(ebd)} · Culto ${groupLabel(culto)}`);
        }
      }
      for (const cls of classes) {
        const ebd = daySlots.filter((s) => s.slotType === "CLASS" && s.classGroupId === cls.id && s.timeSlot === "EBD");
        const culto = daySlots.filter((s) => s.slotType === "CLASS" && s.classGroupId === cls.id && s.timeSlot === "CULTO");
        if (ebd.length === 0 && culto.length === 0) continue;
        lines.push(`  ${cls.name}: EBD ${groupLabel(ebd)} · Culto ${groupLabel(culto)}`);
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

      <div className="overflow-auto border rounded-lg max-h-[70vh]">
        <table className="text-sm w-max">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky top-0 left-0 bg-muted p-2 text-left border-r z-20 min-w-[80px]">Domingo</th>
              {SPECIAL_COLUMNS.map((col) => (
                <th key={col.slotType} className="sticky top-0 bg-muted p-2 text-left border-r z-10 min-w-[160px]">{col.label}</th>
              ))}
              {classes.map((cls) => (
                <th key={cls.id} className="sticky top-0 bg-muted p-2 text-left border-r z-10 min-w-[180px]">{cls.name}</th>
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
                  {SPECIAL_COLUMNS.map((col) => {
                    const colSlots = daySlots.filter((s) => s.slotType === col.slotType);
                    const ebd = colSlots.filter((s) => s.timeSlot === "EBD");
                    const culto = colSlots.filter((s) => s.timeSlot === "CULTO");
                    const none = colSlots.filter((s) => !s.timeSlot);
                    return (
                      <td key={col.slotType} className="p-2 border-r align-top">
                        {none.length > 0 ? (
                          <p className="text-xs">{groupLabel(none)}</p>
                        ) : (
                          <>
                            <p className="text-xs">EBD: {groupLabel(ebd)}</p>
                            <p className="text-xs">Culto: {groupLabel(culto)}</p>
                          </>
                        )}
                      </td>
                    );
                  })}
                  {classes.map((cls) => {
                    const ebd = daySlots.filter((s) => s.slotType === "CLASS" && s.classGroupId === cls.id && s.timeSlot === "EBD");
                    const culto = daySlots.filter((s) => s.slotType === "CLASS" && s.classGroupId === cls.id && s.timeSlot === "CULTO");
                    return (
                      <td key={cls.id} className="p-2 border-r align-top">
                        <p className="text-xs">EBD: {groupLabel(ebd)}</p>
                        <p className="text-xs">Culto: {groupLabel(culto)}</p>
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
