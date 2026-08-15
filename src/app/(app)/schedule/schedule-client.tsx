"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Sala Plus has no time slot (17h-18h, before EBD/Culto) — always shows in both tabs.
function inTimeSlot(slot: { slotType: string; timeSlot: string | null }, tab: "EBD" | "CULTO") {
  if (slot.slotType === "ROOM_PLUS") return true;
  return slot.timeSlot === tab;
}

const SLOT_LABELS: Record<string, string> = {
  COORDINATOR: "Coordenação",
  ROOM_PLUS: "Sala Plus",
  RECEPTION: "Recepção",
  SNACK: "Lanche",
  INCLUSION: "Inclusão",
};

// Pseudo class options that aren't real ClassGroups — support slots not tied to a class.
const PSEUDO_CLASSES: Record<string, string> = {
  COORDINATOR: "Coordenação",
  ROOM_PLUS: "Sala Plus",
  RECEPTION: "Recepção",
  SNACK: "Lanche",
  INCLUSION: "Inclusão",
};

function slotLabel(slot: Pick<Slot, "slotType" | "role">) {
  if (slot.slotType === "CLASS") return slot.role === "ASSISTANT" ? "Auxiliar" : "Professor";
  return SLOT_LABELS[slot.slotType] ?? slot.slotType;
}

type Slot = {
  id: string;
  date: string;
  slotType: string;
  timeSlot: string | null;
  role: string | null;
  classGroupId: string | null;
  user: { id: string; name: string };
  classGroup: { id: string; name: string } | null;
};

type ClassGroup = { id: string; name: string };
type Volunteer = {
  id: string;
  name: string;
  role: string;
  inclusionEnabled: boolean;
  preferredClasses: { classGroupId: string }[];
  functions: { function: string }[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

const ROLE_SHORT: Record<string, string> = { TEACHER: "prof", ASSISTANT: "aux" };

function formatWhatsApp(sunday: string, slots: Slot[], classes: ClassGroup[]) {
  const date = formatDate(sunday);
  const lines: string[] = [`📅 *Escala PIBB Kids (${date})*`, ""];

  const daySlots = slots.filter((s) => s.date.startsWith(sunday.slice(0, 10)));

  // Coordenação and Sala Plus aren't split by time slot in the summary — Sala Plus has no
  // time slot at all, and coordenação reads clearer as one line even when it covers both.
  const coord = daySlots.find((s) => s.slotType === "COORDINATOR");
  lines.push(`Coordenação: ${coord?.user.name}`);

  const salaPlus = daySlots.filter((s) => s.slotType === "ROOM_PLUS");
  for (const s of salaPlus) {
    lines.push(`Sala Plus: ${s.user.name}`);
  }

  for (const timeSlot of ["EBD", "CULTO"] as const) {
    const bucket = daySlots.filter(
      (s) => s.timeSlot === timeSlot && s.slotType !== "COORDINATOR" && s.slotType !== "ROOM_PLUS"
    );
    if (bucket.length === 0) continue;

    lines.push("", `*${timeSlot === "EBD" ? "EBD" : "Culto"}*`);

    const special = bucket.filter((s) => s.slotType !== "CLASS");
    for (const s of special) {
      lines.push(`${slotLabel(s)}: ${s.user.name}`);
    }

    for (const cls of classes) {
      const classSlots = bucket.filter((s) => s.classGroupId === cls.id);
      if (classSlots.length === 0) continue;
      lines.push(`*${cls.name}*`);
      for (const s of classSlots) {
        const role = ROLE_SHORT[s.role ?? ""] ?? slotLabel(s);
        lines.push(`  ${s.user.name} (${role})`);
      }
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function ScheduleClient({
  initialSlots,
  classes,
  volunteers,
  sundays,
  initialSundayIdx,
  currentUserId,
  canViewAll,
  canEdit,
}: {
  initialSlots: Slot[];
  classes: ClassGroup[];
  volunteers: Volunteer[];
  sundays: string[];
  initialSundayIdx: number;
  currentUserId: string;
  canViewAll: boolean;
  canEdit: boolean;
}) {
  const [slots, setSlots] = useState(() =>
    initialSlots.map((s) => ({ ...s, date: new Date(s.date).toISOString() }))
  );
  const [sundayIdx, setSundayIdx] = useState(initialSundayIdx);
  const [timeSlotTab, setTimeSlotTab] = useState<"EBD" | "CULTO">("EBD");
  const [addOpen, setAddOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Slot | null>(null);
  const emptyForm = { timeSlots: [] as ("EBD" | "CULTO")[], classId: "", userId: "", role: "" as "TEACHER" | "ASSISTANT" | "" };
  const [form, setForm] = useState(emptyForm);
  const [repeatDates, setRepeatDates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedSunday = sundays[sundayIdx];
  const daySlots = slots.filter((s) => s.date.startsWith(selectedSunday.slice(0, 10)));

  // Bulk "repeat on": the 4 sundays after the currently viewed one — the viewed
  // sunday itself is always included separately, so it's excluded here.
  const repeatSundays = useMemo(() => {
    const d = new Date(selectedSunday);
    return Array.from({ length: 4 }, (_, i) => {
      const s = new Date(d);
      s.setUTCDate(d.getUTCDate() + (i + 1) * 7);
      return s.toISOString();
    });
  }, [selectedSunday]);

  const tabSlots = daySlots.filter((s) => inTimeSlot(s, timeSlotTab));

  const isRealClass = !!form.classId && !(form.classId in PSEUDO_CLASSES);

  const eligibleVolunteers = !form.classId
    ? []
    : isRealClass
    ? volunteers.filter((v) => v.preferredClasses.some((c) => c.classGroupId === form.classId))
    : form.classId === "COORDINATOR"
    ? volunteers.filter((v) => v.role === "ADMIN" || v.role === "COORDINATOR")
    : form.classId === "RECEPTION"
    ? volunteers.filter((v) => v.functions.some((f) => f.function === "RECEPTION"))
    : form.classId === "INCLUSION"
    ? volunteers.filter((v) => v.inclusionEnabled)
    : form.classId === "SNACK"
    ? volunteers.filter((v) => v.functions.some((f) => f.function === "SUPPORT"))
    : volunteers;

  function openAdd() {
    setEditingSlot(null);
    setForm(emptyForm);
    setRepeatDates([]);
    setAddOpen(true);
  }

  function openEdit(slot: Slot) {
    setEditingSlot(slot);
    const classId = slot.classGroupId ?? slot.slotType;
    setForm({
      timeSlots: slot.timeSlot ? [slot.timeSlot as "EBD" | "CULTO"] : [],
      classId,
      userId: slot.user.id,
      role: (slot.role as "TEACHER" | "ASSISTANT" | null) ?? "",
    });
    setAddOpen(true);
  }

  function toggleTimeSlot(h: "EBD" | "CULTO") {
    setForm((f) => ({
      ...f,
      timeSlots: editingSlot
        ? [h]
        : f.timeSlots.includes(h)
        ? f.timeSlots.filter((x) => x !== h)
        : [...f.timeSlots, h],
      userId: "",
      role: "",
    }));
  }

  // Default role from the volunteer's own function (Teacher vs Assistant) when picked.
  function roleForVolunteer(userId: string): "TEACHER" | "ASSISTANT" | "" {
    const v = volunteers.find((vol) => vol.id === userId);
    if (!v) return "";
    const hasProfessor = v.functions.some((f) => f.function === "TEACHER");
    const hasAuxiliar = v.functions.some((f) => f.function === "ASSISTANT");
    if (hasProfessor && !hasAuxiliar) return "TEACHER";
    if (hasAuxiliar && !hasProfessor) return "ASSISTANT";
    return "";
  }

  function slotTypeFor(classId: string) {
    if (classId in PSEUDO_CLASSES) return classId;
    return "CLASS"; // real class
  }

  // ROOM_PLUS has no time slot at all; SNACK is always CULTO — both skip the time slot
  // picker. Everything else lets EBD and CULTO both be checked to create 2 slots at once.
  const timeSlotList: (string | null)[] =
    form.classId === "ROOM_PLUS" ? [null] : form.classId === "SNACK" ? ["CULTO"] : form.timeSlots;

  async function saveSlot() {
    setSaving(true);
    const basePayload = {
      slotType: slotTypeFor(form.classId),
      classGroupId: isRealClass ? form.classId : null,
      role: isRealClass ? (form.role || null) : null,
      userId: form.userId,
    };

    if (editingSlot) {
      const res = await fetch(`/api/schedule/${editingSlot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...basePayload, timeSlot: timeSlotList[0] ?? null }),
      });
      const updated = await res.json();
      setSlots((prev) => prev.map((s) => (s.id === editingSlot.id ? updated : s)));
    } else {
      const dates = repeatDates.length > 0 ? repeatDates : [selectedSunday];
      const createdAll: Slot[] = [];
      for (const timeSlot of timeSlotList) {
        const res = await fetch("/api/schedule/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dates, timeSlot, ...basePayload }),
        });
        const created = await res.json();
        createdAll.push(...created);
      }
      setSlots((prev) => [...prev, ...createdAll]);
    }

    setSaving(false);
    setAddOpen(false);
    setEditingSlot(null);
    setForm(emptyForm);
    setRepeatDates([]);
  }

  function toggleRepeatDate(date: string) {
    setRepeatDates((prev) => (prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/schedule/${deleteTarget.id}`, { method: "DELETE" });
    setSlots((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  function copyWhatsApp() {
    const text = formatWhatsApp(selectedSunday, daySlots, classes);
    navigator.clipboard.writeText(text);
  }

  const shownSlots = canViewAll ? tabSlots : tabSlots.filter((s) => s.user.id === currentUserId);
  const coordSlots = tabSlots.filter((s) => s.slotType === "COORDINATOR");
  const salaPlusSlots = tabSlots.filter((s) => s.slotType === "ROOM_PLUS");
  const specialSlots = tabSlots.filter((s) => s.slotType !== "CLASS" && s.slotType !== "COORDINATOR" && s.slotType !== "ROOM_PLUS");
  const classSlots = tabSlots.filter((s) => s.slotType === "CLASS");

  return (
    <div className="space-y-4">
      {/* Sunday picker */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setSundayIdx((i) => Math.max(0, i - 1))} disabled={sundayIdx === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">{new Date(selectedSunday).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "UTC" })}</span>
        <Button variant="outline" size="icon" onClick={() => setSundayIdx((i) => Math.min(sundays.length - 1, i + 1))} disabled={sundayIdx === sundays.length - 1}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {canEdit && (
        <Button
          size="icon"
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
          aria-label="Adicionar slot"
          onClick={openAdd}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* EBD / Culto tabs, with the copy action beside them */}
      <div className="flex items-center gap-2">
        <Tabs value={timeSlotTab} onValueChange={(v) => setTimeSlotTab(v as "EBD" | "CULTO")} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="EBD">EBD</TabsTrigger>
            <TabsTrigger value="CULTO">Culto</TabsTrigger>
          </TabsList>
        </Tabs>
        {canViewAll && (
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={copyWhatsApp}
            aria-label="Copiar escala"
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Slots display */}
      {shownSlots.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {canViewAll ? "Nenhum slot neste horário." : "Você não está na escala deste horário."}
        </p>
      ) : (
        <div className="space-y-4">
          {/* Coordenador do dia — highlighted, always first */}
          {coordSlots.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coordenação</p>
              {coordSlots.map((s) => (
                <SlotRow key={s.id} slot={s} canEdit={canEdit} onEdit={() => openEdit(s)} onDelete={() => setDeleteTarget(s)} highlight />
              ))}
            </div>
          )}

          {/* Special slots */}
          {specialSlots.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Apoio / Geral</p>
              {specialSlots.map((s) => (
                <SlotRow key={s.id} slot={s} canEdit={canEdit} onEdit={() => openEdit(s)} onDelete={() => setDeleteTarget(s)} />
              ))}
            </div>
          )}

          {/* Sala Plus — its own subgroup, like a class */}
          {salaPlusSlots.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sala Plus</p>
              {salaPlusSlots.map((s) => (
                <SlotRow key={s.id} slot={s} canEdit={canEdit} onEdit={() => openEdit(s)} onDelete={() => setDeleteTarget(s)} />
              ))}
            </div>
          )}

          {/* Per-class slots */}
          {classes.map((cls) => {
            const csSlots = classSlots.filter((s) => s.classGroupId === cls.id);
            if (csSlots.length === 0) return null;
            return (
              <div key={cls.id} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{cls.name}</p>
                {csSlots.map((s) => (
                  <SlotRow key={s.id} slot={s} canEdit={canEdit} onEdit={() => openEdit(s)} onDelete={() => setDeleteTarget(s)} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/edit slot dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setEditingSlot(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSlot ? "Editar slot" : "Adicionar à escala"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Turma</p>
              <Select
                value={form.classId}
                onValueChange={(v) => setForm((f) => ({
                  ...f,
                  classId: v ?? "",
                  userId: "",
                  timeSlots: v === "ROOM_PLUS" || v === "SNACK" ? [] : f.timeSlots,
                }))}
                items={{ ...Object.fromEntries(classes.map((c) => [c.id, c.name])), ...PSEUDO_CLASSES }}
              >
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  {Object.entries(PSEUDO_CLASSES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.classId && form.classId !== "ROOM_PLUS" && form.classId !== "SNACK" && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Horário {!editingSlot && "(selecione um ou ambos)"}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={form.timeSlots.includes("EBD") ? "default" : "outline"}
                    className="h-12"
                    onClick={() => toggleTimeSlot("EBD")}
                  >
                    EBD
                  </Button>
                  <Button
                    type="button"
                    variant={form.timeSlots.includes("CULTO") ? "default" : "outline"}
                    className="h-12"
                    onClick={() => toggleTimeSlot("CULTO")}
                  >
                    Culto
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm font-medium">Voluntário</p>
              <Select
                value={form.userId}
                onValueChange={(v) => setForm((f) => ({ ...f, userId: v ?? "", role: v ? roleForVolunteer(v) : "" }))}
                items={Object.fromEntries(eligibleVolunteers.map((v) => [v.id, v.name]))}
                disabled={!form.classId || (form.classId !== "ROOM_PLUS" && form.classId !== "SNACK" && form.timeSlots.length === 0)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={form.classId ? "Selecione..." : "Selecione a classId primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {eligibleVolunteers.length === 0 ? (
                    <p className="p-2 text-sm text-muted-foreground">Nenhum voluntário disponível.</p>
                  ) : (
                    eligibleVolunteers.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>

            {isRealClass && form.userId && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Cargo</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={form.role === "TEACHER" ? "default" : "outline"}
                    className="h-12"
                    onClick={() => setForm((f) => ({ ...f, role: "TEACHER" }))}
                  >
                    Professor
                  </Button>
                  <Button
                    type="button"
                    variant={form.role === "ASSISTANT" ? "default" : "outline"}
                    className="h-12"
                    onClick={() => setForm((f) => ({ ...f, role: "ASSISTANT" }))}
                  >
                    Auxiliar
                  </Button>
                </div>
              </div>
            )}

            {!editingSlot && (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Repetir em <span className="text-muted-foreground font-normal">(opcional — sem seleção, só {formatDate(selectedSunday)})</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {repeatSundays.map((s) => (
                    <label key={s} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm">
                      <Checkbox
                        checked={repeatDates.includes(s)}
                        onCheckedChange={() => toggleRepeatDate(s)}
                      />
                      {new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full h-12"
              disabled={
                !form.classId ||
                !form.userId ||
                (form.classId !== "ROOM_PLUS" && form.classId !== "SNACK" && form.timeSlots.length === 0) ||
                (isRealClass && !form.role) ||
                saving
              }
              onClick={saveSlot}
            >
              Salvar{!editingSlot && repeatDates.length > 1 ? ` (${repeatDates.length} domingos)` : ""}
              {!editingSlot && timeSlotList.length > 1 ? ` × ${timeSlotList.length} horários` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover da escala?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget && `${deleteTarget.user.name} — ${slotLabel(deleteTarget)}`} será removido desta escala.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 h-11" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1 h-11" onClick={confirmDelete}>
              Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SlotRow({
  slot,
  canEdit,
  onEdit,
  onDelete,
  highlight,
}: {
  slot: Slot;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border rounded-lg bg-background",
        highlight && "border-primary bg-primary/5"
      )}
    >
      <div>
        <p className="font-medium text-sm">{slot.user.name}</p>
        <p className="text-xs text-muted-foreground">
          {slotLabel(slot)}
        </p>
      </div>
      {canEdit && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="text-muted-foreground">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
