"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const SERIES_LABELS: Record<string, string> = {
  CULTO_INFANTIL: "Culto Infantil",
  MATERNAL: "Maternal",
  PLUGUINHO: "Pluguinho",
  JUNIORES: "Juniores",
  DETETIVE: "Detetive",
};

const USO_LABELS: Record<string, string> = {
  EBD: "EBD",
  CULTO: "Culto",
  AMBOS: "Ambos",
};

type ClassGroup = { id: string; name: string };
type Curriculum = {
  id: string;
  classGroupId: string;
  classGroup: ClassGroup;
  semester: number;
  year: number;
  seriesType: string;
  seriesNumber: number;
  title: string;
  totalWeeks: number;
  uso: string;
  copiasProfessor: number;
  copiasAluno: number;
  comprarProfessor: number;
  recursosVisuais: boolean;
};

const emptyForm = {
  classGroupId: "",
  semester: "1",
  seriesType: "",
  seriesNumber: "",
  title: "",
  totalWeeks: "",
  uso: "",
  copiasProfessor: "0",
  copiasAluno: "0",
  comprarProfessor: "0",
  recursosVisuais: false,
};

export function CurriculumClient({
  initialCurricula,
  classes,
  year,
}: {
  initialCurricula: Curriculum[];
  classes: ClassGroup[];
  year: number;
}) {
  const [curricula, setCurricula] = useState(initialCurricula);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Curriculum | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Curriculum) {
    setEditing(c);
    setForm({
      classGroupId: c.classGroupId,
      semester: String(c.semester),
      seriesType: c.seriesType,
      seriesNumber: String(c.seriesNumber),
      title: c.title,
      totalWeeks: String(c.totalWeeks),
      uso: c.uso,
      copiasProfessor: String(c.copiasProfessor),
      copiasAluno: String(c.copiasAluno),
      comprarProfessor: String(c.comprarProfessor),
      recursosVisuais: c.recursosVisuais,
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      classGroupId: form.classGroupId,
      semester: Number(form.semester),
      year,
      seriesType: form.seriesType,
      seriesNumber: Number(form.seriesNumber),
      title: form.title,
      totalWeeks: Number(form.totalWeeks),
      uso: form.uso,
      copiasProfessor: Number(form.copiasProfessor),
      copiasAluno: Number(form.copiasAluno),
      comprarProfessor: Number(form.comprarProfessor),
      recursosVisuais: form.recursosVisuais,
    };

    const res = editing
      ? await fetch(`/api/curriculum/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/curriculum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    const saved = await res.json();
    setCurricula((prev) =>
      editing ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]
    );
    setSaving(false);
    setOpen(false);
  }

  async function remove(id: string) {
    await fetch(`/api/curriculum/${id}`, { method: "DELETE" });
    setCurricula((prev) => prev.filter((c) => c.id !== id));
  }

  const valid =
    form.classGroupId && form.seriesType && form.seriesNumber && form.title && form.totalWeeks && form.uso;

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          onClick={openCreate}
          className={buttonVariants({ className: "w-full h-12" })}
        >
          <Plus className="h-4 w-4 mr-2" /> Nova revista
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar revista" : "Nova revista"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Turma</p>
              <Select
                value={form.classGroupId}
                onValueChange={(v) => setForm((f) => ({ ...f, classGroupId: v ?? "" }))}
                items={Object.fromEntries(classes.map((c) => [c.id, c.name]))}
              >
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Semestre</p>
              <Select
                value={form.semester}
                onValueChange={(v) => setForm((f) => ({ ...f, semester: v ?? "1" }))}
                items={{ "1": "1º semestre", "2": "2º semestre" }}
              >
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1º semestre</SelectItem>
                  <SelectItem value="2">2º semestre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Série</p>
              <Select value={form.seriesType} onValueChange={(v) => setForm((f) => ({ ...f, seriesType: v ?? "" }))} items={SERIES_LABELS}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SERIES_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nº na série</p>
                <Input
                  type="number"
                  className="h-12"
                  value={form.seriesNumber}
                  onChange={(e) => setForm((f) => ({ ...f, seriesNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Semanas</p>
                <Input
                  type="number"
                  className="h-12"
                  value={form.totalWeeks}
                  onChange={(e) => setForm((f) => ({ ...f, totalWeeks: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Título</p>
              <Input
                className="h-12"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Uso</p>
              <Select value={form.uso} onValueChange={(v) => setForm((f) => ({ ...f, uso: v ?? "" }))} items={USO_LABELS}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(USO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <p className="text-xs font-medium">Cópias prof.</p>
                <Input
                  type="number"
                  className="h-12"
                  value={form.copiasProfessor}
                  onChange={(e) => setForm((f) => ({ ...f, copiasProfessor: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">Cópias aluno</p>
                <Input
                  type="number"
                  className="h-12"
                  value={form.copiasAluno}
                  onChange={(e) => setForm((f) => ({ ...f, copiasAluno: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">A comprar</p>
                <Input
                  type="number"
                  className="h-12"
                  value={form.comprarProfessor}
                  onChange={(e) => setForm((f) => ({ ...f, comprarProfessor: e.target.value }))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <Checkbox
                checked={form.recursosVisuais}
                onCheckedChange={(v) => setForm((f) => ({ ...f, recursosVisuais: !!v }))}
              />
              <span className="text-sm">Tem recursos visuais</span>
            </label>

            <Button className="w-full h-12" disabled={!valid || saving} onClick={save}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {classes.map((cls) => {
        const clsCurricula = curricula.filter((c) => c.classGroupId === cls.id);
        if (clsCurricula.length === 0) return null;
        return (
          <div key={cls.id} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{cls.name}</p>
            {clsCurricula.map((c) => (
              <button
                key={c.id}
                onClick={() => openEdit(c)}
                className="w-full text-left p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {SERIES_LABELS[c.seriesType]} nº{c.seriesNumber} — {c.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.semester}º sem. · {USO_LABELS[c.uso]} · {c.totalWeeks} semanas
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.copiasProfessor === 0 && <Badge variant="destructive">Sem estoque</Badge>}
                    <Trash2
                      className="h-4 w-4 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        );
      })}

      {curricula.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma revista cadastrada para {year}.
        </p>
      )}
    </div>
  );
}
