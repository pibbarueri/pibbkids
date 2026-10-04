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
import { Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MonthGrid } from "@/components/ui/month-grid";
import { slotKindKey, slotPlaceLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { fetchCandidates, futureRange, postSwap, type Candidates, type Person, type VolunteerSlot } from "./types";

const firstName = (name: string) => name.split(" ")[0];

function Chip({
  id,
  label,
  selected,
  onTap,
}: {
  id: string;
  label: string;
  selected: boolean;
  onTap: () => void;
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
        "flex max-w-[12rem] touch-none items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
        isDragging && "z-50 shadow-lg"
      )}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

function DayCell({
  date,
  dayKey,
  active,
  own,
  servingNames,
  pending,
  blocked,
  onTap,
}: {
  date: Date;
  dayKey: string;
  active: boolean;
  own: boolean;
  servingNames: string[];
  pending: boolean;
  blocked: boolean;
  onTap: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey, disabled: !active || blocked });
  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={!active}
      onClick={onTap}
      className={cn(
        "flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-md text-xs leading-none",
        !active && "text-muted-foreground/50",
        active && (own ? "bg-orange-100 dark:bg-orange-950" : "bg-muted"),
        pending && "border border-primary bg-primary/15",
        active && blocked && "opacity-40",
        isOver && "ring-2 ring-primary"
      )}
    >
      <span className="font-medium">{date.getUTCDate()}</span>
      {servingNames.slice(0, 2).map((name, i) => (
        <span key={i} className="mt-0.5 w-full truncate px-0.5 text-[8px]">
          {firstName(name)}
        </span>
      ))}
    </button>
  );
}

type SeatSlot = VolunteerSlot & { user: Person };

/**
 * Redistribute one seat (same sala/cargo) over the coming Sundays. The calendar shows every
 * slot of the seat, the volunteer's and everyone else's, so trades are planned with the whole
 * picture. Drag a name onto a day, or tap a name and then the days. Nothing is saved until
 * "Salvar", which sends every change in one request.
 */
export function BulkSwap({
  volunteer,
  futureSlots,
  onDone,
  onCancel,
}: {
  volunteer: Person;
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
  const [seatSlots, setSeatSlots] = useState<SeatSlot[] | null>(null);
  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeTab, setTimeTab] = useState<"EBD" | "CULTO" | null>(null);

  const sample = kinds.find(([k]) => k === kind)?.[1];

  useEffect(() => {
    if (!sample) return;
    let cancelled = false;
    const { from, to } = futureRange();
    const params = new URLSearchParams({
      slotType: sample.slotType,
      classGroupId: sample.classGroupId ?? "",
      role: sample.role ?? "",
      from,
      to,
    });
    fetch(`/api/schedule/seat?${params}`)
      .then((r) => r.json())
      .then(async (slots: SeatSlot[]) => {
        const c = await fetchCandidates(slots.map((s) => s.id));
        if (cancelled) return;
        setSeatSlots(slots);
        setCandidates(c);
      });
    return () => {
      cancelled = true;
    };
  }, [sample]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  // EBD and Culto are separate slots of the same seat: one tab each, so a drop only touches
  // the horário on screen. Sala Plus has no horário and no tabs.
  const allSlots = seatSlots ?? [];
  const timeTabs = (["EBD", "CULTO"] as const).filter((t) => allSlots.some((s) => s.timeSlot === t));
  const activeTab =
    timeTabs.length === 0
      ? null
      : timeTab && timeTabs.includes(timeTab)
        ? timeTab
        : (timeTabs.find((t) => allSlots.some((s) => s.timeSlot === t && s.userId === volunteer.id)) ?? timeTabs[0]);
  const slots = activeTab ? allSlots.filter((s) => s.timeSlot === activeTab) : allSlots;
  const names = new Map<string, string>([
    ...allSlots.map((s) => [s.user.id, s.user.name] as const),
    ...(candidates?.volunteers ?? []).map((v) => [v.id, v.name] as const),
  ]);
  const slotsByDay = new Map<string, SeatSlot[]>();
  for (const s of slots) {
    const key = s.date.slice(0, 10);
    slotsByDay.set(key, [...(slotsByDay.get(key) ?? []), s]);
  }
  const ownSlots = slots.filter((s) => s.userId === volunteer.id);

  // Whoever was scheduled on a slot can always take it back.
  const canTake = (userId: string, slot: SeatSlot) =>
    userId === slot.userId || (candidates?.availability[slot.id] ?? []).includes(userId);

  function assign(userId: string, targets: SeatSlot[]) {
    setError(null);
    setPending((prev) => {
      const next = { ...prev };
      for (const slot of targets) {
        if (!canTake(userId, slot)) continue;
        if (userId === slot.userId) delete next[slot.id];
        else next[slot.id] = userId;
      }
      return next;
    });
  }

  // Tapping a day that already has a change undoes it (back to whoever was scheduled);
  // otherwise it takes the selected name.
  function tapDay(daySlots: SeatSlot[]) {
    if (daySlots.some((slot) => slot.id in pending)) {
      setPending((prev) => {
        const next = { ...prev };
        for (const slot of daySlots) delete next[slot.id];
        return next;
      });
      return;
    }
    if (selectedChip) assign(selectedChip, daySlots);
  }

  function onDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    if (!e.over) return;
    assign(String(e.active.id), slotsByDay.get(String(e.over.id)) ?? []);
  }

  // Seats like Sala Plus accept anyone: show who already serves there, and keep the rest
  // behind search so the list stays usable.
  const regulars = (candidates?.volunteers ?? []).filter((v) => v.regular);
  const others = (candidates?.volunteers ?? []).filter((v) => !v.regular);
  const q = query.trim().toLowerCase();
  const matches = q.length >= 2 ? others.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 8) : [];
  const visibleChips = [...regulars, ...matches, ...others.filter((v) => v.id === selectedChip && !matches.includes(v))];

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
        <p className="text-sm text-muted-foreground">{volunteer.name} não tem escalas futuras.</p>
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
            {kinds.map(([key, s]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setKind(key);
                  setSeatSlots(null);
                  setCandidates(null);
                  setPending({});
                  setSelectedChip(null);
                  setQuery("");
                  setTimeTab(null);
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  key === kind ? "border-primary bg-primary text-primary-foreground" : "border-input"
                )}
              >
                {slotPlaceLabel(s)}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Arraste um nome até o dia, ou toque no nome e depois nos dias. Os dias de{" "}
          {firstName(volunteer.name)} ficam destacados. Toque de novo num dia alterado pra desfazer.
        </p>

        {timeTabs.length > 1 && (
          <Tabs value={activeTab ?? undefined} onValueChange={(v) => setTimeTab(v as "EBD" | "CULTO")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="EBD">EBD</TabsTrigger>
              <TabsTrigger value="CULTO">Culto</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {seatSlots === null ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <MonthGrid
            offset={offset}
            onOffsetChange={setOffset}
            renderDay={(date, key) => {
              const daySlots = slotsByDay.get(key) ?? [];
              const serving = daySlots.map((s) => names.get(pending[s.id] ?? s.userId) ?? "");
              const blocked = !!focusId && daySlots.length > 0 && !daySlots.some((s) => canTake(focusId, s));
              return (
                <DayCell
                  date={date}
                  dayKey={key}
                  active={daySlots.length > 0}
                  own={daySlots.some((s) => s.userId === volunteer.id)}
                  servingNames={serving}
                  pending={daySlots.some((s) => s.id in pending)}
                  blocked={blocked}
                  onTap={() => tapDay(daySlots)}
                />
              );
            }}
          />
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">{regulars.length > 0 ? "Quem já serve aqui" : "Quem pode servir"}</p>
          {others.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                placeholder={regulars.length > 0 ? "Buscar outros voluntários" : "Buscar voluntário"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
            {visibleChips.map((v) => (
              <Chip
                key={v.id}
                id={v.id}
                label={v.name}
                selected={selectedChip === v.id}
                onTap={() => setSelectedChip((c) => (c === v.id ? null : v.id))}
              />
            ))}
          </div>
          {selectedChip && ownSlots.length > 0 && (
            <Button variant="outline" className="w-full" onClick={() => assign(selectedChip, ownSlots)}>
              Todos os dias de {firstName(volunteer.name)} → {firstName(names.get(selectedChip) ?? "")}
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive whitespace-pre-line">{error}</p>}

        <div className="flex gap-2">
          <Button variant="outline" className="h-12" onClick={() => (pendingCount > 0 ? setPending({}) : onCancel())}>
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
