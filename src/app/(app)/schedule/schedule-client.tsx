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

// Sala Plus has no horário (17h-18h, before EBD/Culto) — always shows in both tabs.
function inHorario(slot: { slotType: string; horario: string | null }, tab: "EBD" | "CULTO") {
  if (slot.slotType === "SALA_PLUS") return true;
  return slot.horario === tab;
}

const SLOT_LABELS: Record<string, string> = {
  COORDENACAO: "Coordenação",
  SALA_PLUS: "Sala Plus",
  RECEPCAO: "Recepção",
  LANCHE: "Lanche",
};

// Pseudo "turma" options that aren't real ClassGroups — support slots not tied to a class.
const PSEUDO_TURMAS: Record<string, string> = {
  COORDENACAO: "Coordenação",
  SALA_PLUS: "Sala Plus",
  RECEPCAO: "Recepção",
  LANCHE: "Lanche",
};

function slotLabel(slot: Pick<Slot, "slotType" | "role">) {
  if (slot.slotType === "TURMA") return slot.role === "AUXILIAR" ? "Auxiliar" : "Professor";
  return SLOT_LABELS[slot.slotType] ?? slot.slotType;
}

type Slot = {
  id: string;
  date: string;
  slotType: string;
  horario: string | null;
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

function formatWhatsApp(sundays: string[], slots: Slot[], classes: ClassGroup[]) {
  const lines: string[] = ["📅 *Escala PIBB Kids*\n"];
  for (const sunday of sundays) {
    const date = formatDate(sunday);
    const daySlots = slots.filter((s) => s.date.startsWith(sunday.slice(0, 10)));
    if (daySlots.length === 0) continue;
    lines.push(`*${date}*`);

    const special = daySlots.filter((s) => s.slotType !== "TURMA");
    for (const s of special) {
      lines.push(`  ${slotLabel(s)}: ${s.user.name}`);
    }

    for (const cls of classes) {
      const classSlots = daySlots.filter((s) => s.classGroupId === cls.id);
      if (classSlots.length === 0) continue;
      lines.push(`  *${cls.name}*`);
      for (const s of classSlots) {
        lines.push(`    ${slotLabel(s)} (${s.horario}): ${s.user.name}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function ScheduleClient({
  initialSlots,
  classes,
  volunteers,
  sundays,
  currentUserId,
  canViewAll,
  canEdit,
}: {
  initialSlots: Slot[];
  classes: ClassGroup[];
  volunteers: Volunteer[];
  sundays: string[];
  currentUserId: string;
  canViewAll: boolean;
  canEdit: boolean;
}) {
  const [slots, setSlots] = useState(() =>
    initialSlots.map((s) => ({ ...s, date: new Date(s.date).toISOString() }))
  );
  const [sundayIdx, setSundayIdx] = useState(0);
  const [horarioTab, setHorarioTab] = useState<"EBD" | "CULTO">("EBD");
  const [addOpen, setAddOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Slot | null>(null);
  const emptyForm = { horario: "" as "EBD" | "CULTO" | "", turma: "", userId: "", cargo: "" as "PROFESSOR" | "AUXILIAR" | "" };
  const [form, setForm] = useState(emptyForm);
  const [repeatDates, setRepeatDates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedSunday = sundays[sundayIdx];
  const daySlots = slots.filter((s) => s.date.startsWith(selectedSunday.slice(0, 10)));

  // Bulk "Repetir em": always the next 4 sundays starting from the upcoming one.
  const repeatSundays = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); // nearest upcoming sunday (today if sunday)
    return Array.from({ length: 4 }, (_, i) => {
      const s = new Date(d);
      s.setDate(d.getDate() + i * 7);
      return s.toISOString();
    });
  }, []);

  const tabSlots = daySlots.filter((s) => inHorario(s, horarioTab));

  const isRealClass = !!form.turma && !(form.turma in PSEUDO_TURMAS);

  const eligibleVolunteers = !form.turma
    ? []
    : isRealClass
    ? volunteers.filter((v) => v.preferredClasses.some((c) => c.classGroupId === form.turma))
    : form.turma === "COORDENACAO"
    ? volunteers.filter((v) => v.role === "ADMIN" || v.role === "COORDINATOR")
    : form.turma === "RECEPCAO"
    ? volunteers.filter((v) => v.functions.some((f) => f.function === "RECEPCAO"))
    : ["SALA_PLUS", "LANCHE"].includes(form.turma)
    ? volunteers.filter((v) => v.functions.some((f) => f.function === "APOIO_GERAL"))
    : volunteers;

  function openAdd() {
    setEditingSlot(null);
    setForm(emptyForm);
    setRepeatDates([repeatSundays[0]]);
    setAddOpen(true);
  }

  function openEdit(slot: Slot) {
    setEditingSlot(slot);
    const turma = slot.classGroupId ?? slot.slotType;
    setForm({
      horario: (slot.horario as "EBD" | "CULTO" | null) ?? "",
      turma,
      userId: slot.user.id,
      cargo: (slot.role as "PROFESSOR" | "AUXILIAR" | null) ?? "",
    });
    setAddOpen(true);
  }

  // Default cargo from the volunteer's own function (Professor vs Auxiliar) when picked.
  function cargoForVolunteer(userId: string): "PROFESSOR" | "AUXILIAR" | "" {
    const v = volunteers.find((vol) => vol.id === userId);
    if (!v) return "";
    const hasProfessor = v.functions.some((f) => f.function === "PROFESSOR");
    const hasAuxiliar = v.functions.some((f) => f.function === "AUXILIAR");
    if (hasProfessor && !hasAuxiliar) return "PROFESSOR";
    if (hasAuxiliar && !hasProfessor) return "AUXILIAR";
    return "";
  }

  function slotTypeFor(turma: string) {
    if (turma in PSEUDO_TURMAS) return turma;
    return "TURMA"; // real class
  }

  async function saveSlot() {
    setSaving(true);
    const payload = {
      slotType: slotTypeFor(form.turma),
      horario: form.turma === "SALA_PLUS" ? null : form.horario,
      classGroupId: isRealClass ? form.turma : null,
      role: isRealClass ? (form.cargo || null) : null,
      userId: form.userId,
    };

    if (editingSlot) {
      const res = await fetch(`/api/schedule/${editingSlot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setSlots((prev) => prev.map((s) => (s.id === editingSlot.id ? updated : s)));
    } else if (repeatDates.length > 1) {
      const res = await fetch("/api/schedule/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: repeatDates, ...payload }),
      });
      const created = await res.json();
      setSlots((prev) => [...prev, ...created]);
    } else {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: repeatDates[0] ?? selectedSunday, ...payload }),
      });
      const slot = await res.json();
      setSlots((prev) => [...prev, slot]);
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
    const text = formatWhatsApp(sundays, slots, classes);
    navigator.clipboard.writeText(text);
  }

  const shownSlots = canViewAll ? tabSlots : tabSlots.filter((s) => s.user.id === currentUserId);
  const coordSlots = tabSlots.filter((s) => s.slotType === "COORDENACAO");
  const salaPlusSlots = tabSlots.filter((s) => s.slotType === "SALA_PLUS");
  const specialSlots = tabSlots.filter((s) => s.slotType !== "TURMA" && s.slotType !== "COORDENACAO" && s.slotType !== "SALA_PLUS");
  const classSlots = tabSlots.filter((s) => s.slotType === "TURMA");

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

      {/* Actions */}
      {canViewAll && (
        <Button variant="outline" className="w-full h-10" onClick={copyWhatsApp}>
          <Copy className="h-4 w-4 mr-2" /> Copiar escala
        </Button>
      )}
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

      {/* EBD / Culto tabs */}
      <Tabs value={horarioTab} onValueChange={(v) => setHorarioTab(v as "EBD" | "CULTO")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="EBD">EBD</TabsTrigger>
          <TabsTrigger value="CULTO">Culto</TabsTrigger>
        </TabsList>
      </Tabs>

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
                value={form.turma}
                onValueChange={(v) => setForm((f) => ({
                  ...f,
                  turma: v ?? "",
                  userId: "",
                  horario: v === "SALA_PLUS" ? "" : v === "LANCHE" ? "CULTO" : f.horario,
                }))}
                items={{ ...Object.fromEntries(classes.map((c) => [c.id, c.name])), ...PSEUDO_TURMAS }}
              >
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  {Object.entries(PSEUDO_TURMAS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.turma && form.turma !== "SALA_PLUS" && form.turma !== "LANCHE" && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Horário</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={form.horario === "EBD" ? "default" : "outline"}
                    className="h-12"
                    onClick={() => setForm((f) => ({ ...f, horario: "EBD", userId: "", cargo: "" }))}
                  >
                    EBD
                  </Button>
                  <Button
                    type="button"
                    variant={form.horario === "CULTO" ? "default" : "outline"}
                    className="h-12"
                    onClick={() => setForm((f) => ({ ...f, horario: "CULTO", userId: "", cargo: "" }))}
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
                onValueChange={(v) => setForm((f) => ({ ...f, userId: v ?? "", cargo: v ? cargoForVolunteer(v) : "" }))}
                items={Object.fromEntries(eligibleVolunteers.map((v) => [v.id, v.name]))}
                disabled={!form.turma || (form.turma !== "SALA_PLUS" && form.turma !== "LANCHE" && !form.horario)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={form.turma ? "Selecione..." : "Selecione a turma primeiro"} />
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
                    variant={form.cargo === "PROFESSOR" ? "default" : "outline"}
                    className="h-12"
                    onClick={() => setForm((f) => ({ ...f, cargo: "PROFESSOR" }))}
                  >
                    Professor
                  </Button>
                  <Button
                    type="button"
                    variant={form.cargo === "AUXILIAR" ? "default" : "outline"}
                    className="h-12"
                    onClick={() => setForm((f) => ({ ...f, cargo: "AUXILIAR" }))}
                  >
                    Auxiliar
                  </Button>
                </div>
              </div>
            )}

            {!editingSlot && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Repetir em</p>
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
                !form.turma ||
                !form.userId ||
                (form.turma !== "SALA_PLUS" && form.turma !== "LANCHE" && !form.horario) ||
                (isRealClass && !form.cargo) ||
                (!editingSlot && repeatDates.length === 0) ||
                saving
              }
              onClick={saveSlot}
            >
              Salvar{!editingSlot && repeatDates.length > 1 ? ` (${repeatDates.length} domingos)` : ""}
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
