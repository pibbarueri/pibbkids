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
import { ChevronLeft, ChevronRight, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const LESSON_TYPE_LABELS: Record<string, string> = {
  APOSTILA: "Apostila",
  AULA_EXTRA: "Aula Extra",
  REVIEW: "Revisão",
  QUIZ_GINCANA: "Quiz/Gincana",
  SEM_AULA: "Sem aula",
  TEMA_LIVRE: "Tema Livre",
};

const TIPO_LABELS: Record<string, string> = { EBD: "EBD", CULTO: "Culto" };

type ClassGroup = { id: string; name: string };
type Journal = { id: string; title: string; series: string; edition: number; classGroupId: string; usage: string };
type Plan = {
  id: string;
  date: string;
  classGroupId: string;
  classGroup: ClassGroup;
  tipo: string;
  journalId: string | null;
  journal: { id: string; title: string; series: string; edition: number } | null;
  licaoNumber: number | null;
  lessonType: string;
  specialTitle: string | null;
  observations: string | null;
  done: boolean;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function planLabel(p: Plan) {
  if (p.lessonType !== "APOSTILA") return p.specialTitle || LESSON_TYPE_LABELS[p.lessonType];
  if (p.journal) return `${p.journal.title} — lição ${p.licaoNumber ?? "?"}`;
  return "Sem plano";
}

export function LessonsClient({
  initialPlans,
  classes,
  journals,
  sundays,
  initialSundayIdx,
  isManager,
  canMark,
  myClassIds,
}: {
  initialPlans: Plan[];
  classes: ClassGroup[];
  journals: Journal[];
  sundays: string[];
  initialSundayIdx: number;
  isManager: boolean;
  canMark: boolean;
  myClassIds: string[];
}) {
  const [plans, setPlans] = useState(() =>
    initialPlans.map((p) => ({ ...p, date: new Date(p.date).toISOString() }))
  );
  const [sundayIdx, setSundayIdx] = useState(initialSundayIdx);
  const [editing, setEditing] = useState<{ classGroupId: string; className: string; tipo: string } | null>(null);
  const [form, setForm] = useState({ lessonType: "APOSTILA", journalId: "", licaoNumber: "", specialTitle: "", observations: "" });
  const [saving, setSaving] = useState(false);

  const selectedSunday = sundays[sundayIdx];
  const dayPlans = plans.filter((p) => p.date.startsWith(selectedSunday.slice(0, 10)));

  // "Marcar dada" only for the current week's sunday.
  const currentSundayKey = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();
  const canToggleDone = canMark && selectedSunday.slice(0, 10) === currentSundayKey;

  const visibleClasses = isManager ? classes : classes.filter((c) => myClassIds.includes(c.id));

  function openEdit(classGroupId: string, className: string, tipo: string) {
    const existing = dayPlans.find((p) => p.classGroupId === classGroupId && p.tipo === tipo);
    setForm({
      lessonType: existing?.lessonType ?? "APOSTILA",
      journalId: existing?.journalId ?? "",
      licaoNumber: existing?.licaoNumber ? String(existing.licaoNumber) : "",
      specialTitle: existing?.specialTitle ?? "",
      observations: existing?.observations ?? "",
    });
    setEditing({ classGroupId, className, tipo });
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
        tipo: editing.tipo,
        lessonType: form.lessonType,
        journalId: form.lessonType === "APOSTILA" ? form.journalId || null : null,
        licaoNumber: form.lessonType === "APOSTILA" ? Number(form.licaoNumber) || null : null,
        specialTitle: ["AULA_EXTRA", "REVIEW", "QUIZ_GINCANA"].includes(form.lessonType) ? form.specialTitle || null : null,
        observations: form.observations || null,
      }),
    });
    const saved = await res.json();
    setPlans((prev) => {
      const idx = prev.findIndex((p) => p.classGroupId === saved.classGroupId && p.tipo === saved.tipo && p.date.startsWith(selectedSunday.slice(0, 10)));
      if (idx === -1) return [...prev, saved];
      const copy = [...prev];
      copy[idx] = saved;
      return copy;
    });
    setSaving(false);
    setEditing(null);
  }

  async function toggleDone(plan: Plan) {
    const res = await fetch(`/api/sunday-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !plan.done }),
    });
    const updated = await res.json();
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
  }

  function copyWhatsApp() {
    const lines = [`📖 *Aulas — ${formatDate(selectedSunday)}*\n`];
    for (const cls of visibleClasses) {
      const ebd = dayPlans.find((p) => p.classGroupId === cls.id && p.tipo === "EBD");
      const culto = dayPlans.find((p) => p.classGroupId === cls.id && p.tipo === "CULTO");
      if (!ebd && !culto) continue;
      lines.push(`*${cls.name}*`);
      if (ebd) lines.push(`  EBD: ${planLabel(ebd)}`);
      if (culto) lines.push(`  Culto: ${planLabel(culto)}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
  }

  const availableJournals = journals.filter((c) => c.classGroupId === editing?.classGroupId);

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
        <Button variant="outline" className="w-full h-10" onClick={copyWhatsApp}>
          <Copy className="h-4 w-4 mr-2" /> Copiar aulas
        </Button>
      )}

      <div className="space-y-3">
        {visibleClasses.map((cls) => {
          const ebd = dayPlans.find((p) => p.classGroupId === cls.id && p.tipo === "EBD");
          const culto = dayPlans.find((p) => p.classGroupId === cls.id && p.tipo === "CULTO");
          return (
            <div key={cls.id} className="border rounded-lg p-3 space-y-2">
              <p className="font-medium text-sm">{cls.name}</p>
              {(["EBD", "CULTO"] as const).map((tipo) => {
                const plan = tipo === "EBD" ? ebd : culto;
                return (
                  <div
                    key={tipo}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md bg-muted/40 cursor-pointer",
                      isManager && "hover:bg-muted"
                    )}
                    onClick={() => isManager && openEdit(cls.id, cls.name, tipo)}
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{TIPO_LABELS[tipo]}</p>
                      <p className="text-sm">{plan ? planLabel(plan) : "Sem plano"}</p>
                      {plan?.observations && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">{plan.observations}</p>
                      )}
                    </div>
                    {plan && (canToggleDone || plan.done) && (
                      <Button
                        variant={plan.done ? "default" : "outline"}
                        size="icon"
                        disabled={!canToggleDone}
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); toggleDone(plan); }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
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
            <DialogTitle>{editing?.className} — {editing && TIPO_LABELS[editing.tipo]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Tipo</p>
              <Select
                value={form.lessonType}
                onValueChange={(v) => setForm((f) => ({ ...f, lessonType: v ?? "APOSTILA" }))}
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

            {form.lessonType === "APOSTILA" ? (
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
                    value={form.licaoNumber}
                    onChange={(e) => setForm((f) => ({ ...f, licaoNumber: e.target.value }))}
                  />
                </div>
              </>
            ) : ["SEM_AULA", "TEMA_LIVRE"].includes(form.lessonType) ? null : (
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
