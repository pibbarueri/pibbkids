"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Frequencia } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Check, Filter, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { formatPhone, phoneDigits } from "@/lib/phone";
import { ageLabel } from "@/lib/age";

const FREQUENCIA_LABELS: Record<string, string> = {
  EBD: "Escola Dominical (EBD)",
  CULTO: "Culto Infantil",
  AMBOS: "EBD e Culto",
};

const FREQ_OPTIONS: { value: Frequencia; label: string }[] = [
  { value: "EBD", label: "EBD" },
  { value: "CULTO", label: "Culto" },
  { value: "AMBOS", label: "Ambos" },
];

function FrequencyRadio({ value, onChange }: { value: string; onChange: (v: Frequencia) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup">
      {FREQ_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-12 rounded-lg border text-sm font-medium transition-colors",
            value === o.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-transparent"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const emptyChildForm = {
  name: "",
  birthdate: "",
  fatherName: "",
  motherName: "",
  fatherPhone: "",
  motherPhone: "",
  frequency: "" as Frequencia | "",
  allergies: "",
  restrictions: "",
  classGroupId: "",
};

type ClassGroup = { id: string; name: string };
type Child = {
  id: string;
  name: string;
  birthdate: string | Date;
  frequency: string;
  fatherName: string | null;
  motherName: string | null;
  fatherPhone: string | null;
  motherPhone: string | null;
  allergies: string | null;
  restrictions: string | null;
  classGroup: { name: string } | null;
  classGroupId: string | null;
  active: boolean;
};

export function ChildrenClient({
  initialChildren,
  classes,
  isManager,
}: {
  initialChildren: Child[];
  classes: ClassGroup[];
  isManager: boolean;
}) {
  const [children, setChildren] = useState(initialChildren);
  const [selected, setSelected] = useState<Child | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyChildForm);
  const [addSaving, setAddSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterClassIds, setFilterClassIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "age">("name");
  const [editing, setEditing] = useState<Child | null>(null);
  const [editForm, setEditForm] = useState(emptyChildForm);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Child | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Child | null>(null);
  const [tab, setTab] = useState(
    isManager && initialChildren.some((c) => c.active && !c.classGroupId) ? "pending" : "approved"
  );

  const filtered = children
    .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((c) => filterClassIds.length === 0 || (c.classGroupId && filterClassIds.includes(c.classGroupId)))
    .sort((a, b) =>
      sortBy === "name"
        ? a.name.localeCompare(b.name)
        : new Date(a.birthdate).getTime() - new Date(b.birthdate).getTime()
    );
  const pending = filtered.filter((c) => c.active && !c.classGroupId);
  const approved = filtered.filter((c) => c.active && !!c.classGroupId);
  const inactive = filtered.filter((c) => !c.active);
  const filterCount = filterClassIds.length + (sortBy !== "name" ? 1 : 0);

  function toggleFilterClass(id: string) {
    setFilterClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const addValid = addForm.name && addForm.birthdate && addForm.frequency && addForm.classGroupId;

  async function createChild() {
    if (!addValid) return;
    setAddSaving(true);
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      const created = await res.json();
      setChildren((prev) => [...prev, created]);
      setAddOpen(false);
      setAddForm(emptyChildForm);
    }
    setAddSaving(false);
  }

  function openEdit(child: Child) {
    setEditForm({
      name: child.name,
      birthdate: new Date(child.birthdate).toISOString().slice(0, 10),
      fatherName: child.fatherName ?? "",
      motherName: child.motherName ?? "",
      fatherPhone: child.fatherPhone ?? "",
      motherPhone: child.motherPhone ?? "",
      frequency: child.frequency as Frequencia,
      allergies: child.allergies ?? "",
      restrictions: child.restrictions ?? "",
      classGroupId: child.classGroupId ?? "",
    });
    setEditing(child);
  }

  const editValid = editForm.name && editForm.birthdate && editForm.frequency;

  async function saveEdit() {
    if (!editing || !editValid) return;
    setEditSaving(true);
    const res = await fetch(`/api/children/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const updated = await res.json();
    setChildren((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
    setEditSaving(false);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/children/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      // Soft delete: mark inactive so it moves to the Inativos tab.
      setChildren((prev) => prev.map((c) => (c.id === deleteTarget.id ? { ...c, active: false } : c)));
      setEditing(null);
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  async function restore(child: Child) {
    const res = await fetch(`/api/children/${child.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...updated, active: true } : c)));
    }
  }

  return (
    <>
      {isManager && (
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddForm(emptyChildForm); }}>
          <DialogTrigger
            className={cn(buttonVariants({ size: "icon" }), "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40")}
            aria-label="Nova criança"
          >
            <Plus className="h-6 w-6" />
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova criança</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nome *</p>
                <Input className="h-12" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Data de nascimento *</p>
                <Input type="date" className="h-12" value={addForm.birthdate} onChange={(e) => setAddForm((f) => ({ ...f, birthdate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Nome do pai</p>
                <Input className="h-12" value={addForm.fatherName} onChange={(e) => setAddForm((f) => ({ ...f, fatherName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Nome da mãe</p>
                <Input className="h-12" value={addForm.motherName} onChange={(e) => setAddForm((f) => ({ ...f, motherName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Telefone Pai</p>
                <Input type="tel" inputMode="numeric" className="h-12" value={formatPhone(addForm.fatherPhone)} onChange={(e) => setAddForm((f) => ({ ...f, fatherPhone: phoneDigits(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Telefone Mãe</p>
                <Input type="tel" inputMode="numeric" className="h-12" value={formatPhone(addForm.motherPhone)} onChange={(e) => setAddForm((f) => ({ ...f, motherPhone: phoneDigits(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Frequência *</p>
                <FrequencyRadio value={addForm.frequency} onChange={(v) => setAddForm((f) => ({ ...f, frequency: v }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Turma *</p>
                <Select
                  value={addForm.classGroupId}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, classGroupId: v ?? "" }))}
                  items={Object.fromEntries(classes.map((c) => [c.id, c.name]))}
                >
                  <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Alergias</p>
                <Textarea rows={2} value={addForm.allergies} onChange={(e) => setAddForm((f) => ({ ...f, allergies: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Cuidados especiais / restrições</p>
                <Textarea rows={2} value={addForm.restrictions} onChange={(e) => setAddForm((f) => ({ ...f, restrictions: e.target.value }))} />
              </div>
              <Button className="w-full h-12" disabled={!addValid || addSaving} onClick={createChild}>
                Cadastrar criança
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar criança..."
            className="h-11 pl-9"
          />
        </div>
        <Button variant="outline" className="h-11 relative" onClick={() => setFilterOpen(true)}>
          <Filter className="h-4 w-4" />
          {filterCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px]">{filterCount}</Badge>
          )}
        </Button>
      </div>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtrar crianças</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Turma</p>
              <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                    <Checkbox checked={filterClassIds.includes(c.id)} onCheckedChange={() => toggleFilterClass(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Ordenar por</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSortBy("name")}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium transition-colors",
                    sortBy === "name" ? "border-primary bg-primary text-primary-foreground" : "border-input bg-transparent"
                  )}
                >
                  Nome (A-Z)
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("age")}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium transition-colors",
                    sortBy === "age" ? "border-primary bg-primary text-primary-foreground" : "border-input bg-transparent"
                  )}
                >
                  Idade
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => { setFilterClassIds([]); setSortBy("name"); }}
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        {isManager && (
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              Pendentes {pending.length > 0 && <Badge className="ml-1">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">
              Frequentes
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex-1">
              Inativos
            </TabsTrigger>
          </TabsList>
        )}

        {isManager && (
          <TabsContent value="pending" className="space-y-2 mt-3">
            {pending.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {search ? "Nenhuma criança encontrada." : "Nenhum cadastro pendente."}
              </p>
            )}
            {pending.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onSelect={() => setSelected(child)}
                onEdit={() => openEdit(child)}
                canEdit={isManager}
                onApprove={() => openEdit(child)}
                onReject={() => setDeleteTarget(child)}
              />
            ))}
          </TabsContent>
        )}

        <TabsContent value="approved" className="space-y-2 mt-3">
          {approved.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "Nenhuma criança encontrada." : "Nenhuma criança cadastrada."}
            </p>
          )}
          {approved.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              onSelect={() => setSelected(child)}
              onEdit={() => openEdit(child)}
              canEdit={isManager}
            />
          ))}
        </TabsContent>

        {isManager && (
          <TabsContent value="inactive" className="space-y-2 mt-3">
            {inactive.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {search ? "Nenhuma criança encontrada." : "Nenhuma criança inativa."}
              </p>
            )}
            {inactive.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onSelect={() => setSelected(child)}
                onEdit={() => openEdit(child)}
                canEdit={false}
                onRestore={() => setRestoreTarget(child)}
              />
            ))}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Row label="Turma" value={selected.classGroup?.name ?? "Sem turma"} />
              <Row label="Data de nascimento" value={new Date(selected.birthdate).toLocaleDateString("pt-BR", { timeZone: "UTC" })} />
              <Row label="Idade" value={ageLabel(new Date(selected.birthdate))} />
              <Row label="Frequência" value={FREQUENCIA_LABELS[selected.frequency] ?? selected.frequency} />
              <Row label="Pai" value={selected.fatherName} />
              <Row label="Mãe" value={selected.motherName} />
              <Row label="Telefone Pai" value={formatPhone(selected.fatherPhone ?? "")} />
              <Row label="Telefone Mãe" value={formatPhone(selected.motherPhone ?? "")} />
              {selected.allergies && (
                <div className="flex gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Alergias</p>
                    <p className="text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">{selected.allergies}</p>
                  </div>
                </div>
              )}
              {selected.restrictions && (
                <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">Cuidados especiais</p>
                    <p className="text-blue-700 dark:text-blue-300 whitespace-pre-wrap">{selected.restrictions}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar criança</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Nome *</p>
              <Input className="h-12" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Data de nascimento *</p>
              <Input type="date" className="h-12" value={editForm.birthdate} onChange={(e) => setEditForm((f) => ({ ...f, birthdate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Nome do pai</p>
              <Input className="h-12" value={editForm.fatherName} onChange={(e) => setEditForm((f) => ({ ...f, fatherName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Nome da mãe</p>
              <Input className="h-12" value={editForm.motherName} onChange={(e) => setEditForm((f) => ({ ...f, motherName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Telefone Pai</p>
              <Input type="tel" inputMode="numeric" className="h-12" value={formatPhone(editForm.fatherPhone)} onChange={(e) => setEditForm((f) => ({ ...f, fatherPhone: phoneDigits(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Telefone Mãe</p>
              <Input type="tel" inputMode="numeric" className="h-12" value={formatPhone(editForm.motherPhone)} onChange={(e) => setEditForm((f) => ({ ...f, motherPhone: phoneDigits(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Frequência *</p>
              <FrequencyRadio value={editForm.frequency} onChange={(v) => setEditForm((f) => ({ ...f, frequency: v }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Turma</p>
              <Select
                value={editForm.classGroupId}
                onValueChange={(v) => setEditForm((f) => ({ ...f, classGroupId: v ?? "" }))}
                items={Object.fromEntries(classes.map((c) => [c.id, c.name]))}
              >
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Alergias</p>
              <Textarea rows={2} value={editForm.allergies} onChange={(e) => setEditForm((f) => ({ ...f, allergies: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Cuidados especiais / restrições</p>
              <Textarea rows={2} value={editForm.restrictions} onChange={(e) => setEditForm((f) => ({ ...f, restrictions: e.target.value }))} />
            </div>
            <Button className="w-full h-12" disabled={!editValid || editSaving} onClick={saveEdit}>
              {!editing?.classGroupId && editForm.classGroupId ? "Salvar e aprovar" : "Salvar alterações"}
            </Button>
            {isManager && editing && (
              <Button
                variant="ghost"
                className="w-full h-12 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(editing)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Remover
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover criança</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remover <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
            Ela irá para a aba Inativos e pode ser restaurada depois.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1 h-12" disabled={deleting} onClick={confirmDelete}>
              Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar criança</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Restaurar <span className="font-medium text-foreground">{restoreTarget?.name}</span>?
            Ela voltará para a lista de ativos.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setRestoreTarget(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 h-12"
              onClick={async () => {
                if (restoreTarget) await restore(restoreTarget);
                setRestoreTarget(null);
              }}
            >
              Restaurar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChildCard({
  child,
  onSelect,
  onEdit,
  canEdit,
  onApprove,
  onReject,
  onRestore,
}: {
  child: Child;
  onSelect: () => void;
  onEdit: () => void;
  canEdit: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRestore?: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{child.name}</p>
          <p className="text-xs text-muted-foreground">
            {child.classGroup?.name ?? "Sem turma"} · {child.frequency}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {child.allergies && <AlertCircle className="h-4 w-4 text-yellow-500" />}
          {child.restrictions && <AlertCircle className="h-4 w-4 text-blue-500" />}
          {onApprove && (
            <span
              role="button"
              aria-label="Aprovar"
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white"
            >
              <Check className="h-4 w-4" />
            </span>
          )}
          {onReject && (
            <span
              role="button"
              aria-label="Rejeitar"
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-white"
            >
              <X className="h-4 w-4" />
            </span>
          )}
          {onRestore && (
            <span
              role="button"
              aria-label="Restaurar"
              onClick={(e) => { e.stopPropagation(); onRestore(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full border"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
          {canEdit && (
            <span
              role="button"
              aria-label="Editar"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 -m-1"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value}</p>
    </div>
  );
}
