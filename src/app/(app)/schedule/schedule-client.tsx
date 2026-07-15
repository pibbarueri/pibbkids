"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2 } from "lucide-react";

const SLOT_LABELS: Record<string, string> = {
  SALA_PLUS: "Sala Plus",
  APOIO_EBD: "Apoio EBD",
  APOIO_CULTO: "Apoio Culto",
  LANCHE: "Lanche",
  EBD: "EBD",
  CULTO: "Culto",
};

const ROLE_LABELS: Record<string, string> = {
  PROFESSOR: "Professor",
  AUXILIAR: "Auxiliar",
};

type Slot = {
  id: string;
  date: string;
  slotType: string;
  role: string;
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

    const special = daySlots.filter((s) => ["SALA_PLUS", "APOIO_EBD", "APOIO_CULTO", "LANCHE"].includes(s.slotType));
    for (const s of special) {
      lines.push(`  ${SLOT_LABELS[s.slotType]}: ${s.user.name}`);
    }

    for (const cls of classes) {
      const classSlots = daySlots.filter((s) => s.classGroupId === cls.id);
      if (classSlots.length === 0) continue;
      lines.push(`  *${cls.name}*`);
      for (const s of classSlots) {
        lines.push(`    ${SLOT_LABELS[s.slotType]} ${ROLE_LABELS[s.role]}: ${s.user.name}`);
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
  const [addOpen, setAddOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Slot | null>(null);
  const emptyForm = { horario: "" as "EBD" | "CULTO" | "", classGroupId: "", role: "PROFESSOR", userId: "" };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const selectedSunday = sundays[sundayIdx];
  const daySlots = slots.filter((s) => s.date.startsWith(selectedSunday.slice(0, 10)));

  const mySlots = canViewAll ? daySlots : daySlots.filter((s) => s.user.id === currentUserId);

  const eligibleVolunteers = form.classGroupId
    ? volunteers.filter((v) => v.preferredClasses.some((c) => c.classGroupId === form.classGroupId))
    : [];

  function openAdd() {
    setEditingSlot(null);
    setForm(emptyForm);
    setAddOpen(true);
  }

  function openEdit(slot: Slot) {
    setEditingSlot(slot);
    setForm({
      horario: slot.slotType === "CULTO" ? "CULTO" : "EBD",
      classGroupId: slot.classGroupId ?? "",
      role: slot.role,
      userId: slot.user.id,
    });
    setAddOpen(true);
  }

  async function saveSlot() {
    setSaving(true);
    const payload = {
      slotType: form.horario,
      classGroupId: form.classGroupId,
      role: form.role,
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
    } else {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedSunday, ...payload }),
      });
      const slot = await res.json();
      setSlots((prev) => [...prev, slot]);
    }

    setSaving(false);
    setAddOpen(false);
    setEditingSlot(null);
    setForm(emptyForm);
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

  const specialTypes = ["SALA_PLUS", "APOIO_EBD", "APOIO_CULTO", "LANCHE"];
  const specialSlots = daySlots.filter((s) => specialTypes.includes(s.slotType));
  const classSlots = daySlots.filter((s) => !specialTypes.includes(s.slotType));

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

      {/* Slots display */}
      {(canViewAll ? daySlots : mySlots).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {canViewAll ? "Nenhum slot neste domingo." : "Você não está na escala deste domingo."}
        </p>
      ) : (
        <div className="space-y-4">
          {/* Special slots */}
          {specialSlots.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Apoio / Geral</p>
              {specialSlots.map((s) => (
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSlot ? "Editar slot" : "Adicionar à escala"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Horário</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={form.horario === "EBD" ? "default" : "outline"}
                  className="h-12"
                  onClick={() => setForm((f) => ({ ...f, horario: "EBD", classGroupId: "", userId: "" }))}
                >
                  EBD
                </Button>
                <Button
                  type="button"
                  variant={form.horario === "CULTO" ? "default" : "outline"}
                  className="h-12"
                  onClick={() => setForm((f) => ({ ...f, horario: "CULTO", classGroupId: "", userId: "" }))}
                >
                  Culto
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Turma</p>
              <Select
                value={form.classGroupId}
                onValueChange={(v) => setForm((f) => ({ ...f, classGroupId: v ?? "", userId: "" }))}
                items={Object.fromEntries(classes.map((c) => [c.id, c.name]))}
                disabled={!form.horario}
              >
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Papel</p>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v ?? "PROFESSOR" }))} items={ROLE_LABELS}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFESSOR">Professor</SelectItem>
                  <SelectItem value="AUXILIAR">Auxiliar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Voluntário</p>
              <Select
                value={form.userId}
                onValueChange={(v) => setForm((f) => ({ ...f, userId: v ?? "" }))}
                items={Object.fromEntries(eligibleVolunteers.map((v) => [v.id, v.name]))}
                disabled={!form.classGroupId}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={form.classGroupId ? "Selecione..." : "Selecione a turma primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {eligibleVolunteers.length === 0 ? (
                    <p className="p-2 text-sm text-muted-foreground">Nenhum voluntário disponível para essa turma.</p>
                  ) : (
                    eligibleVolunteers.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full h-12"
              disabled={!form.horario || !form.classGroupId || !form.userId || saving}
              onClick={saveSlot}
            >
              Salvar
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
            {deleteTarget && `${deleteTarget.user.name} — ${SLOT_LABELS[deleteTarget.slotType]}`} será removido desta escala.
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
}: {
  slot: Slot;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
      <div>
        <p className="font-medium text-sm">{slot.user.name}</p>
        <p className="text-xs text-muted-foreground">
          {SLOT_LABELS[slot.slotType]} · {ROLE_LABELS[slot.role]}
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
