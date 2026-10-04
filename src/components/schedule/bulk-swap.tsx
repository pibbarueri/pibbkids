"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthGrid } from "@/components/ui/month-grid";
import { slotKindKey, slotPlaceLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { fetchCandidates, postSwap, type Candidates, type VolunteerSlot } from "./types";

const firstName = (name: string) => name.split(" ")[0];

function Chip({
  id,
  label,
  selected,
  onTap,
  icon,
}: {
  id: string;
  label: string;
  selected: boolean;
  onTap: () => void;
  icon?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onTap}
      {...listeners}
      {...attributes}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn(
        "flex touch-none items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
        isDragging && "z-50 shadow-lg"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DayCell({
  date,
  dayKey,
  slots,
  servingName,
  pending,
  blocked,
  onTap,
}: {
  date: Date;
  dayKey: string;
  slots: VolunteerSlot[];
  servingName: string | null;
  pending: boolean;
  blocked: boolean;
  onTap: () => void;
}) {
  const active = slots.length > 0;
  const { setNodeRef, isOver } = useDroppable({ id: dayKey, disabled: !active || blocked });
  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={!active}
      onClick={onTap}
      className={cn(
        "flex aspect-square w-full flex-col items-center justify-center rounded-md text-xs leading-tight",
        active ? "bg-muted" : "text-muted-foreground/50",
        pending && "border border-primary bg-primary/15",
        active && blocked && "opacity-40",
        isOver && "ring-2 ring-primary"
      )}
    >
      <span className="font-medium">{date.getUTCDate()}</span>
      {active && servingName && <span className="w-full truncate px-0.5 text-[9px]">{firstName(servingName)}</span>}
    </button>
  );
}

/**
 * Redistribute a volunteer's future slots of one seat (same sala/cargo) among the people who
 * can take it: drag a name onto a day, or tap a name and then the days. Nothing is saved until
 * "Salvar", which sends every change in one request.
 */
export function BulkSwap({
  volunteerId,
  volunteerName,
  futureSlots,
  onDone,
  onCancel,
}: {
  volunteerId: string;
  volunteerName: string;
  futureSlots: VolunteerSlot[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const kinds = useMemo(() => {
    const map = new Map<string, VolunteerSlot>();
    for (const s of futureSlots) if (!map.has(slotKindKey(s))) map.set(slotKindKey(s), s);
    return [...map.entries()];
  }, [futureSlots]);

  const [kind, setKind] = useState(kinds[0]?.[0] ?? "");
  const [offset, setOffset] = useState(0);
  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kindSlots = useMemo(() => futureSlots.filter((s) => slotKindKey(s) === kind), [futureSlots, kind]);

  useEffect(() => {
    fetchCandidates(kindSlots.map((s) => s.id)).then(setCandidates);
  }, [kindSlots]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const names = new Map<string, string>([[volunteerId, volunteerName], ...(candidates?.volunteers ?? []).map((v) => [v.id, v.name] as const)]);
  const slotsByDay = new Map<string, VolunteerSlot[]>();
  for (const s of kindSlots) {
    const key = s.date.slice(0, 10);
    slotsByDay.set(key, [...(slotsByDay.get(key) ?? []), s]);
  }

  // The original volunteer can always take their own slot back.
  const canTake = (userId: string, slot: VolunteerSlot) =>
    userId === volunteerId || (candidates?.availability[slot.id] ?? []).includes(userId);

  function assign(userId: string, slots: VolunteerSlot[]) {
    setError(null);
    setPending((prev) => {
      const next = { ...prev };
      for (const slot of slots) {
        if (!canTake(userId, slot)) continue;
        if (userId === volunteerId) delete next[slot.id];
        else next[slot.id] = userId;
      }
      return next;
    });
  }

  function onDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    if (!e.over) return;
    assign(String(e.active.id), slotsByDay.get(String(e.over.id)) ?? []);
  }

  const focusId = draggingId ?? selectedChip;
  const pendingCount = Object.keys(pending).length;

  async function save() {
    setSaving(true);
    const result = await postSwap({
      mode: "replace",
      assignments: Object.entries(pending).map(([slotId, userId]) => ({ slotId, userId })),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  if (kinds.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{volunteerName} não tem escalas futuras.</p>
        <Button variant="outline" className="w-full h-12" onClick={onCancel}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        {kinds.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {kinds.map(([key, sample]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setKind(key);
                  setPending({});
                  setSelectedChip(null);
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  key === kind ? "border-primary bg-primary text-primary-foreground" : "border-input"
                )}
              >
                {slotPlaceLabel(sample)}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Arraste um nome até o dia, ou toque no nome e depois nos dias.
        </p>

        <MonthGrid
          offset={offset}
          onOffsetChange={setOffset}
          renderDay={(date, key) => {
            const daySlots = slotsByDay.get(key) ?? [];
            const first = daySlots[0];
            const serving = first ? names.get(pending[first.id] ?? volunteerId) ?? null : null;
            const blocked = !!focusId && daySlots.length > 0 && !daySlots.some((s) => canTake(focusId, s));
            return (
              <DayCell
                date={date}
                dayKey={key}
                slots={daySlots}
                servingName={serving}
                pending={daySlots.some((s) => s.id in pending)}
                blocked={blocked}
                onTap={() => selectedChip && assign(selectedChip, daySlots)}
              />
            );
          }}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Quem pode servir</p>
          {candidates === null && <p className="text-sm text-muted-foreground">Carregando…</p>}
          <div className="flex flex-wrap gap-2">
            <Chip
              id={volunteerId}
              label={firstName(volunteerName)}
              icon={<Undo2 className="h-3.5 w-3.5" />}
              selected={selectedChip === volunteerId}
              onTap={() => setSelectedChip((c) => (c === volunteerId ? null : volunteerId))}
            />
            {candidates?.volunteers.map((v) => (
              <Chip
                key={v.id}
                id={v.id}
                label={v.name}
                selected={selectedChip === v.id}
                onTap={() => setSelectedChip((c) => (c === v.id ? null : v.id))}
              />
            ))}
          </div>
          {selectedChip && (
            <Button variant="outline" className="w-full" onClick={() => assign(selectedChip, kindSlots)}>
              Todos os dias → {firstName(names.get(selectedChip) ?? "")}
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive whitespace-pre-line">{error}</p>}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-12"
            onClick={() => (pendingCount > 0 ? setPending({}) : onCancel())}
          >
            {pendingCount > 0 ? "Descartar" : "Voltar"}
          </Button>
          <Button className="flex-1 h-12" disabled={pendingCount === 0 || saving} onClick={save}>
            Salvar{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </Button>
        </div>
      </div>
    </DndContext>
  );
}

