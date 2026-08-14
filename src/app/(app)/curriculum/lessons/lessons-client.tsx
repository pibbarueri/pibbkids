"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const LESSON_TYPE_LABELS: Record<string, string> = {
  WORKBOOK: "Apostila",
  EXTRA_CLASS: "Aula Extra",
  REVIEW: "Revisão",
  QUIZ_GAME: "Quiz/Gincana",
  NO_CLASS: "Sem aula",
  FREE_TOPIC: "Tema Livre",
};

const TYPE_LABELS: Record<string, string> = { EBD: "EBD", CULTO: "Culto" };

type ClassGroup = { id: string; name: string };
type Journal = { id: string; title: string; series: string; edition: number; classGroupId: string; usage: string };
type Plan = {
  id: string;
  date: string;
  classGroupId: string;
  classGroup: ClassGroup;
  type: string;
  journalId: string | null;
  journal: { id: string; title: string; series: string; edition: number } | null;
  lessonNumber: number | null;
  lessonType: string;
  specialTitle: string | null;
  observations: string | null;
  done: boolean;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function planLabel(p: Plan) {
  if (p.lessonType !== "WORKBOOK") return p.specialTitle || LESSON_TYPE_LABELS[p.lessonType];
  if (p.journal) return `${p.journal.title} — lição ${p.lessonNumber ?? "?"}`;
  return "Sem plano";
}

export function LessonsClient({
  initialPlans,
  classes,
  journals,
  sundays,
  initialSundayIdx,
  isManager,
  myClassIds,
}: {
  initialPlans: Plan[];
  classes: ClassGroup[];
  journals: Journal[];
  sundays: string[];
  initialSundayIdx: number;
  isManager: boolean;
  myClassIds: string[];
}) {
  const [plans, setPlans] = useState(() =>
    initialPlans.map((p) => ({ ...p, date: new Date(p.date).toISOString() }))
  );
  const [sundayIdx, setSundayIdx] = useState(initialSundayIdx);
  const [editing, setEditing] = useState<{ classGroupId: string; className: string; type: string } | null>(null);
  const [form, setForm] = useState({ lessonType: "WORKBOOK", journalId: "", lessonNumber: "", specialTitle: "", observations: "" });
  const [saving, setSaving] = useState(false);

  const selectedSunday = sundays[sundayIdx];
  const dayPlans = plans.filter((p) => p.date.startsWith(selectedSunday.slice(0, 10)));

  const visibleClasses = isManager ? classes : classes.filter((c) => myClassIds.includes(c.id));

  function openEdit(classGroupId: string, className: string, type: string) {
    const existing = dayPlans.find((p) => p.classGroupId === classGroupId && p.type === type);
    setForm({
      lessonType: existing?.lessonType ?? "WORKBOOK",
      journalId: existing?.journalId ?? "",
      lessonNumber: existing?.lessonNumber ? String(existing.lessonNumber) : "",
      specialTitle: existing?.specialTitle ?? "",
      observations: existing?.observations ?? "",
    });
    setEditing({ classGroupId, className, type });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch("/api/sunday-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedSunday,
        classGroupId: editing.classGroupId,
        type: editing.type,
        lessonType: form.lessonType,
        journalId: form.lessonType === "WORKBOOK" ? form.journalId || null : null,
        lessonNumber: form.lessonType === "WORKBOOK" ? Number(form.lessonNumber) || null : null,
        specialTitle: ["EXTRA_CLASS", "REVIEW", "QUIZ_GAME"].includes(form.lessonType) ? form.specialTitle || null : null,
        observations: form.observations || null,
      }),
    });
    const saved = await res.json();
    setPlans((prev) => {
      const idx = prev.findIndex((p) => p.classGroupId === saved.classGroupId && p.type === saved.type && p.date.startsWith(selectedSunday.slice(0, 10)));
      if (idx === -1) return [...prev, saved];
      const copy = [...prev];
      copy[idx] = saved;
      return copy;
    });
    setSaving(false);
    setEditing(null);
  }

  function copyWhatsApp() {
    const lines = [`📖 *Aulas — ${formatDate(selectedSunday)}*\n`];
    for (const cls of visibleClasses) {
      const ebd = dayPlans.find((p) => p.classGroupId === cls.id && p.type === "EBD");
      const culto = dayPlans.find((p) => p.classGroupId === cls.id && p.type === "CULTO");
      if (!ebd && !culto) continue;
      lines.push(`*${cls.name}*`);
      if (ebd) lines.push(`  EBD: ${planLabel(ebd)}`);
      if (culto) lines.push(`  Culto: ${planLabel(culto)}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
  }

  const availableJournals = journals.filter((c) => c.classGroupId === editing?.classGroupId);
  const editingPlan = editing
    ? dayPlans.find((p) => p.classGroupId === editing.classGroupId && p.type === editing.type)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setSundayIdx((i) => Math.max(0, i - 1))} disabled={sundayIdx === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">{new Date(selectedSunday).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "UTC" })}</span>
        <Button variant="outline" size="icon" onClick={() => setSundayIdx((i) => Math.min(sundays.length - 1, i + 1))} disabled={sundayIdx === sundays.length - 1}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isManager && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={copyWhatsApp}
            aria-label="Copiar aulas"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}

      {visibleClasses.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Não há aulas a serem exibidas. Você não está associado a nenhuma turma.
        </p>
      )}

      <div className="space-y-3">
        {visibleClasses.map((cls) => {
          const ebd = dayPlans.find((p) => p.classGroupId === cls.id && p.type === "EBD");
          const culto = dayPlans.find((p) => p.classGroupId === cls.id && p.type === "CULTO");
          return (
            <div key={cls.id} className="border rounded-lg p-3 space-y-2">
              <p className="font-medium text-sm">{cls.name}</p>
              {(["EBD", "CULTO"] as const).map((type) => {
                const plan = type === "EBD" ? ebd : culto;
                return (
                  <div
                    key={type}
                    className={cn("flex items-center justify-between p-2 rounded-md bg-muted/40 cursor-pointer hover:bg-muted")}
                    onClick={() => openEdit(cls.id, cls.name, type)}
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{TYPE_LABELS[type]}</p>
                      <p className="text-sm">{plan ? planLabel(plan) : "Sem plano"}</p>
                      {plan?.observations && (
                        <p className="text-xs text-muted-foreground italic mt-0.5 whitespace-pre-line">{plan.observations}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.className} — {editing && TYPE_LABELS[editing.type]}</DialogTitle>
          </DialogHeader>
          {isManager ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Tipo</p>
                <Select
                  value={form.lessonType}
                  onValueChange={(v) => setForm((f) => ({ ...f, lessonType: v ?? "WORKBOOK" }))}
                  items={LESSON_TYPE_LABELS}
                >
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LESSON_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.lessonType === "WORKBOOK" ? (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Revista</p>
                    <Select
                      value={form.journalId}
                      onValueChange={(v) => setForm((f) => ({ ...f, journalId: v ?? "" }))}
                      items={Object.fromEntries(availableJournals.map((c) => [c.id, `${c.title} (${c.edition})`]))}
                    >
                      <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {availableJournals.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.title} ({c.edition})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Nº da lição</p>
                    <Input
                      type="number"
                      className="h-12"
                      value={form.lessonNumber}
                      onChange={(e) => setForm((f) => ({ ...f, lessonNumber: e.target.value }))}
                    />
                  </div>
                </>
              ) : ["NO_CLASS", "FREE_TOPIC"].includes(form.lessonType) ? null : (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Título</p>
                  <Input
                    className="h-12"
                    value={form.specialTitle}
                    onChange={(e) => setForm((f) => ({ ...f, specialTitle: e.target.value }))}
                    placeholder="Ex: Dia da Bíblia"
                  />
                </div>
              )}

              <div className="space-y-1">
                <p className="text-sm font-medium">Observações</p>
                <Textarea
                  rows={2}
                  value={form.observations}
                  onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                  placeholder="Anotações para esta aula (opcional)"
                />
              </div>

              <Button className="w-full h-12" disabled={saving} onClick={save}>
                Salvar
              </Button>
            </div>
          ) : !editingPlan ? (
            <p className="text-sm text-muted-foreground">Sem plano cadastrado</p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Tipo</p>
                <p className="text-sm">{LESSON_TYPE_LABELS[editingPlan.lessonType]}</p>
              </div>

              {editingPlan.lessonType === "WORKBOOK" ? (
                <div className="flex gap-3">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium">Revista</p>
                    <p className="text-sm">
                      {editingPlan.journal ? `${editingPlan.journal.title} (${editingPlan.journal.edition})` : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Nº da lição</p>
                    <p className="text-sm">{editingPlan.lessonNumber ?? "—"}</p>
                  </div>
                </div>
              ) : !["NO_CLASS", "FREE_TOPIC"].includes(editingPlan.lessonType) ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Título</p>
                  <p className="text-sm">{editingPlan.specialTitle || "—"}</p>
                </div>
              ) : null}

              <div className="space-y-1">
                <p className="text-sm font-medium">Observações</p>
                <p className="text-sm whitespace-pre-line">{editingPlan.observations || "—"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
