"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
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
import { Filter, LayoutGrid, Plus, Trash2 } from "lucide-react";

const SERIES_LABELS: Record<string, string> = {
  CULTO_INFANTIL: "Culto Infantil",
  MATERNAL: "Maternal",
  PLUGUINHO: "Pluguinho",
  JUNIORES: "Juniores",
  DETETIVE: "Detetive",
};

const USAGE_LABELS: Record<string, string> = {
  EBD: "EBD",
  CULTO: "Culto",
  AMBOS: "Ambos",
};

type ClassGroup = { id: string; name: string };
type Journal = {
  id: string;
  title: string;
  series: string;
  edition: number;
  totalWeeks: number | null;
  classGroupId: string;
  classGroup: ClassGroup;
  usage: string;
  teacherCopies: number;
  studentCopies: number;
  hasVisualResources: boolean;
};

const emptyForm = {
  classGroupId: "",
  series: "",
  edition: "",
  title: "",
  totalWeeks: "",
  usage: "",
  teacherCopies: "0",
  studentCopies: "0",
  hasVisualResources: false,
};

export function JournalsClient({
  initialJournals,
  classes,
}: {
  initialJournals: Journal[];
  classes: ClassGroup[];
}) {
  const [journals, setJournals] = useState(initialJournals);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Journal | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterClassIds, setFilterClassIds] = useState<string[]>([]);
  const [filterSeries, setFilterSeries] = useState<string[]>([]);
  const [filterUsage, setFilterUsage] = useState<string[]>([]);
  const filterCount = filterClassIds.length + filterSeries.length + filterUsage.length;

  function toggleFilterClass(id: string) {
    setFilterClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleFilterSeries(s: string) {
    setFilterSeries((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }
  function toggleFilterUsage(u: string) {
    setFilterUsage((prev) => (prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]));
  }

  const filteredJournals = journals
    .filter((j) => filterClassIds.length === 0 || filterClassIds.includes(j.classGroupId))
    .filter((j) => filterSeries.length === 0 || filterSeries.includes(j.series))
    .filter((j) => filterUsage.length === 0 || filterUsage.includes(j.usage));

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(j: Journal) {
    setEditing(j);
    setForm({
      classGroupId: j.classGroupId,
      series: j.series,
      edition: String(j.edition),
      title: j.title,
      totalWeeks: j.totalWeeks === null ? "" : String(j.totalWeeks),
      usage: j.usage,
      teacherCopies: String(j.teacherCopies),
      studentCopies: String(j.studentCopies),
      hasVisualResources: j.hasVisualResources,
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      classGroupId: form.classGroupId,
      series: form.series,
      edition: Number(form.edition),
      title: form.title,
      totalWeeks: form.totalWeeks.trim() ? Number(form.totalWeeks) : null,
      usage: form.usage,
      teacherCopies: Number(form.teacherCopies),
      studentCopies: Number(form.studentCopies),
      hasVisualResources: form.hasVisualResources,
    };

    const res = editing
      ? await fetch(`/api/journals/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/journals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    const saved = await res.json();
    setJournals((prev) =>
      editing ? prev.map((j) => (j.id === saved.id ? saved : j)) : [...prev, saved]
    );
    setSaving(false);
    setOpen(false);
  }

  async function remove(id: string) {
    await fetch(`/api/journals/${id}`, { method: "DELETE" });
    setJournals((prev) => prev.filter((j) => j.id !== id));
  }

  const valid =
    form.classGroupId && form.series && form.edition && form.title && form.usage;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button className="h-11 flex-1" onClick={() => setOverviewOpen(true)}>
          <LayoutGrid className="h-4 w-4 mr-2" /> Visão geral
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 relative shrink-0"
          aria-label="Filtrar"
          onClick={() => setFilterOpen(true)}
        >
          <Filter className="h-4 w-4" />
          {filterCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px]">{filterCount}</Badge>
          )}
        </Button>
      </div>

      <Dialog open={overviewOpen} onOpenChange={setOverviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Visão geral das revistas</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto border rounded-lg max-h-[70vh]">
            <table className="text-sm w-max">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky top-0 bg-muted p-2 text-left border-r min-w-[120px]">Turma</th>
                  <th className="sticky top-0 bg-muted p-2 text-left border-r min-w-[110px]">Série</th>
                  <th className="sticky top-0 bg-muted p-2 text-left border-r min-w-[200px]">Edição - Título</th>
                  <th className="sticky top-0 bg-muted p-2 text-left border-r min-w-[90px]">Semanas</th>
                  <th className="sticky top-0 bg-muted p-2 text-left border-r min-w-[80px]">Uso</th>
                  <th className="sticky top-0 bg-muted p-2 text-left border-r min-w-[110px]">Recursos visuais?</th>
                  <th className="sticky top-0 bg-muted p-2 text-left border-r min-w-[80px]">Estoque aluno</th>
                  <th className="sticky top-0 bg-muted p-2 text-left min-w-[90px]">Estoque prof.</th>
                </tr>
              </thead>
              <tbody>
                {filteredJournals.map((j) => (
                  <tr key={j.id} className="border-t">
                    <td className="p-2 border-r align-top">{j.classGroup.name}</td>
                    <td className="p-2 border-r align-top">{SERIES_LABELS[j.series]}</td>
                    <td className="p-2 border-r align-top">{j.edition} - {j.title}</td>
                    <td className="p-2 border-r align-top">{j.totalWeeks ?? "—"}</td>
                    <td className="p-2 border-r align-top">{USAGE_LABELS[j.usage]}</td>
                    <td className="p-2 border-r align-top">{j.hasVisualResources ? "Sim" : "Não"}</td>
                    <td className="p-2 border-r align-top">{j.studentCopies}</td>
                    <td className="p-2 align-top">{j.teacherCopies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredJournals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma revista encontrada.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtrar revistas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Turma</p>
              <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                    <Checkbox checked={filterClassIds.includes(c.id)} onCheckedChange={() => toggleFilterClass(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Série</p>
              <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                {Object.entries(SERIES_LABELS).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                    <Checkbox checked={filterSeries.includes(value)} onCheckedChange={() => toggleFilterSeries(value)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Uso</p>
              <div className="rounded-md border divide-y">
                {Object.entries(USAGE_LABELS).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                    <Checkbox checked={filterUsage.includes(value)} onCheckedChange={() => toggleFilterUsage(value)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => { setFilterClassIds([]); setFilterSeries([]); setFilterUsage([]); }}
              >
                Limpar
              </Button>
              <Button className="flex-1 h-11" onClick={() => setFilterOpen(false)}>
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          onClick={openCreate}
          className={cn(buttonVariants({ size: "icon" }), "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40")}
          aria-label="Nova revista"
        >
          <Plus className="h-6 w-6" />
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
              <p className="text-sm font-medium">Série</p>
              <Select value={form.series} onValueChange={(v) => setForm((f) => ({ ...f, series: v ?? "" }))} items={SERIES_LABELS}>
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
                <p className="text-sm font-medium">Edição</p>
                <Input
                  type="number"
                  className="h-12"
                  value={form.edition}
                  onChange={(e) => setForm((f) => ({ ...f, edition: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Semanas (opcional)</p>
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
              <Select value={form.usage} onValueChange={(v) => setForm((f) => ({ ...f, usage: v ?? "" }))} items={USAGE_LABELS}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(USAGE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-xs font-medium">Cópias prof.</p>
                <Input
                  type="number"
                  className="h-12"
                  value={form.teacherCopies}
                  onChange={(e) => setForm((f) => ({ ...f, teacherCopies: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium">Cópias aluno</p>
                <Input
                  type="number"
                  className="h-12"
                  value={form.studentCopies}
                  onChange={(e) => setForm((f) => ({ ...f, studentCopies: e.target.value }))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <Checkbox
                checked={form.hasVisualResources}
                onCheckedChange={(v) => setForm((f) => ({ ...f, hasVisualResources: !!v }))}
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
        const clsJournals = filteredJournals.filter((j) => j.classGroupId === cls.id);
        if (clsJournals.length === 0) return null;
        return (
          <div key={cls.id} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{cls.name}</p>
            {clsJournals.map((j) => (
              <button
                key={j.id}
                onClick={() => openEdit(j)}
                className="w-full text-left p-4 border rounded-lg bg-background hover:bg-muted/50 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {SERIES_LABELS[j.series]} nº{j.edition} — {j.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {USAGE_LABELS[j.usage]}
                      {j.totalWeeks !== null ? ` · ${j.totalWeeks} semanas` : " · semanas a definir"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {j.teacherCopies === 0 && <Badge variant="destructive">Sem estoque</Badge>}
                    <Trash2
                      className="h-4 w-4 text-muted-foreground hover:text-destructive transition-transform active:scale-90"
                      onClick={(e) => { e.stopPropagation(); remove(j.id); }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        );
      })}

      {filteredJournals.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {journals.length === 0 ? "Nenhuma revista cadastrada." : "Nenhuma revista encontrada."}
        </p>
      )}
    </div>
  );
}
