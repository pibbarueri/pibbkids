"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { eventTimeRange, eventDateShort } from "@/lib/event-time";
import { EventDetailDialog } from "@/components/events/event-detail-dialog";

const SLOT_LABELS: Record<string, string> = {
  COORDENACAO: "Coordenação",
  SALA_PLUS: "Sala Plus",
  RECEPCAO: "Recepção",
  LANCHE: "Lanche",
  INCLUSAO: "Inclusão",
};

const ROLE_LABELS: Record<string, string> = {
  PROFESSOR: "Professor",
  AUXILIAR: "Auxiliar",
};

const HORARIO_LABELS: Record<string, string> = { EBD: "EBD", CULTO: "Culto" };

type Slot = {
  id: string;
  slotType: string;
  horario: string | null;
  role: string | null;
  user: { name: string };
  classGroup: { name: string } | null;
};

type EventItem = { id: string; title: string; date: string; endDate: string | null };

function slotDescription(slot: Slot) {
  if (slot.classGroup) {
    const cargo = slot.role ? ROLE_LABELS[slot.role] : null;
    return cargo ? `${cargo} - ${slot.classGroup.name}` : slot.classGroup.name;
  }
  return SLOT_LABELS[slot.slotType] ?? slot.slotType;
}

export function NextSundaySchedule({ date, slots, events }: { date: string; slots: Slot[]; events: EventItem[] }) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const label = new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });

  // Group by horário (EBD/Culto) instead of turma — Sala Plus has no horário, gets its own bucket.
  const byGroup = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = slot.horario ? HORARIO_LABELS[slot.horario] : SLOT_LABELS[slot.slotType] ?? slot.slotType;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(slot);
  }
  const order = ["EBD", "Culto"];
  const groups = [...byGroup.entries()].sort(
    (a, b) => (order.includes(a[0]) ? order.indexOf(a[0]) : order.length) - (order.includes(b[0]) ? order.indexOf(b[0]) : order.length)
  );

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">Próxima escala: {label}</p>
        <Link href={`/schedule?date=${date}`} aria-label="Ver escala" className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Você não está na escala deste domingo.</p>
      )}
      {groups.map(([group, groupSlots]) => (
        <div key={group} className="text-sm space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{group}</p>
          {groupSlots.map((slot) => (
            <p key={slot.id}>{slotDescription(slot)}</p>
          ))}
        </div>
      ))}
      {events.length > 0 && (
        <>
          <div className="border-t" />
          <div className="text-sm space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Eventos (próximos 30 dias)</p>
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2">
                <p className="truncate">
                  {e.title}{" "}
                  <span className="text-muted-foreground">
                    · {eventDateShort(e.date)} · {eventTimeRange(e.date, e.endDate)}
                  </span>
                </p>
                <button
                  onClick={() => setDetailId(e.id)}
                  className="text-xs text-primary shrink-0"
                >
                  Ver detalhes
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <EventDetailDialog eventId={detailId} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}
