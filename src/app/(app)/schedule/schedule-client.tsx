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
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";

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
type Volunteer = { id: string; name: string; role: string };

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
  isManager,
}: {
  initialSlots: Slot[];
  classes: ClassGroup[];
  volunteers: Volunteer[];
  sundays: string[];
  currentUserId: string;
  isManager: boolean;
}) {
  const [slots, setSlots] = useState(() =>
    initialSlots.map((s) => ({ ...s, date: new Date(s.date).toISOString() }))
  );
  const [sundayIdx, setSundayIdx] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ slotType: "", classGroupId: "", role: "PROFESSOR", userId: "" });
  const [saving, setSaving] = useState(false);

  const selectedSunday = sundays[sundayIdx];
  const daySlots = slots.filter((s) => s.date.startsWith(selectedSunday.slice(0, 10)));

  const mySlots = isManager ? daySlots : daySlots.filter((s) => s.user.id === currentUserId);

  const needsClass = form.slotType === "EBD" || form.slotType === "CULTO";

  async function addSlot() {
    setSaving(true);
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedSunday,
        slotType: form.slotType,
        classGroupId: needsClass ? form.classGroupId : null,
        role: form.role,
        userId: form.userId,
      }),
    });
    const slot = await res.json();
    setSlots((prev) => [...prev, slot]);
    setSaving(false);
    setAddOpen(false);
    setForm({ slotType: "", classGroupId: "", role: "PROFESSOR", userId: "" });
  }

  async function removeSlot(id: string) {
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    setSlots((prev) => prev.filter((s) => s.id !== id));
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
      {isManager && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-10" onClick={copyWhatsApp}>
            <Copy className="h-4 w-4 mr-2" /> Copiar escala
          </Button>
          <Button className="h-10" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      )}

      {/* Slots display */}
      {(isManager ? daySlots : mySlots).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {isManager ? "Nenhum slot neste domingo." : "Você não está na escala deste domingo."}
        </p>
      ) : (
        <div className="space-y-4">
          {/* Special slots */}
          {specialSlots.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Apoio / Geral</p>
              {specialSlots.map((s) => (
                <SlotRow key={s.id} slot={s} isManager={isManager} onDelete={() => removeSlot(s.id)} />
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
                  <SlotRow key={s.id} slot={s} isManager={isManager} onDelete={() => removeSlot(s.id)} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Add slot dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar à escala</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Tipo de slot</p>
              <Select value={form.slotType} onValueChange={(v) => setForm((f) => ({ ...f, slotType: v ?? "" }))}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SLOT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsClass && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Turma</p>
                <Select value={form.classGroupId} onValueChange={(v) => setForm((f) => ({ ...f, classGroupId: v ?? "" }))}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm font-medium">Papel</p>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v ?? "PROFESSOR" }))}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFESSOR">Professor</SelectItem>
                  <SelectItem value="AUXILIAR">Auxiliar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Voluntário</p>
              <Select value={form.userId} onValueChange={(v) => setForm((f) => ({ ...f, userId: v ?? "" }))}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {volunteers.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full h-12"
              disabled={!form.slotType || !form.userId || (needsClass && !form.classGroupId) || saving}
              onClick={addSlot}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SlotRow({ slot, isManager, onDelete }: { slot: Slot; isManager: boolean; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
      <div>
        <p className="font-medium text-sm">{slot.user.name}</p>
        <p className="text-xs text-muted-foreground">
          {SLOT_LABELS[slot.slotType]} · {ROLE_LABELS[slot.role]}
        </p>
      </div>
      {isManager && (
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
