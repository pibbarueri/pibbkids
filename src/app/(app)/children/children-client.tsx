"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Role, Frequencia } from "@prisma/client";
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
import { AlertCircle, Check, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";

const FREQUENCIA_LABELS: Record<string, string> = {
  EBD: "Escola Dominical (EBD)",
  CULTO: "Culto Infantil",
  AMBOS: "EBD e Culto",
};

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
  role,
}: {
  initialChildren: Child[];
  classes: ClassGroup[];
  isManager: boolean;
  role: Role;
}) {
  const [children, setChildren] = useState(initialChildren);
  const [selected, setSelected] = useState<Child | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyChildForm);
  const [addSaving, setAddSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Child | null>(null);
  const [editForm, setEditForm] = useState(emptyChildForm);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Child | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState(
    isManager && initialChildren.some((c) => c.active && !c.classGroupId) ? "pending" : "approved"
  );

  const filtered = children.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));
  const pending = filtered.filter((c) => c.active && !c.classGroupId);
  const approved = filtered.filter((c) => c.active && !!c.classGroupId);
  const inactive = filtered.filter((c) => !c.active);

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
                <Input type="tel" className="h-12" value={addForm.fatherPhone} onChange={(e) => setAddForm((f) => ({ ...f, fatherPhone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Telefone Mãe</p>
                <Input type="tel" className="h-12" value={addForm.motherPhone} onChange={(e) => setAddForm((f) => ({ ...f, motherPhone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Frequência *</p>
                <Select
                  value={addForm.frequency}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, frequency: (v as Frequencia) ?? "" }))}
                  items={FREQUENCIA_LABELS}
                >
                  <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQUENCIA_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar criança..."
          className="h-11 pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        {isManager && (
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              Pendentes {pending.length > 0 && <Badge className="ml-1">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">
              Aprovadas
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
                onRestore={() => restore(child)}
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
              <Row label="Frequência" value={FREQUENCIA_LABELS[selected.frequency] ?? selected.frequency} />
              <Row label="Pai" value={selected.fatherName} />
              <Row label="Mãe" value={selected.motherName} />
              <Row label="Telefone Pai" value={selected.fatherPhone} />
              <Row label="Telefone Mãe" value={selected.motherPhone} />
              {selected.allergies && (
                <div className="flex gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Alergias</p>
                    <p className="text-yellow-700 dark:text-yellow-300">{selected.allergies}</p>
                  </div>
                </div>
              )}
              {selected.restrictions && (
                <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">Cuidados especiais</p>
                    <p className="text-blue-700 dark:text-blue-300">{selected.restrictions}</p>
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
              <Input type="tel" className="h-12" value={editForm.fatherPhone} onChange={(e) => setEditForm((f) => ({ ...f, fatherPhone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Telefone Mãe</p>
              <Input type="tel" className="h-12" value={editForm.motherPhone} onChange={(e) => setEditForm((f) => ({ ...f, motherPhone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Frequência *</p>
              <Select
                value={editForm.frequency}
                onValueChange={(v) => setEditForm((f) => ({ ...f, frequency: (v as Frequencia) ?? "" }))}
                items={FREQUENCIA_LABELS}
              >
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCIA_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
