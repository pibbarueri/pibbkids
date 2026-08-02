"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Minus, Filter, Search, Trash2 } from "lucide-react";
import { MATERIAL_CATEGORY_LABELS } from "@/lib/materials";

type Material = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  createdBy: { username: string | null } | null;
  updatedBy: { username: string | null } | null;
};

const NO_CATEGORY = "Sem categoria";

// Select needs a non-empty value, so "no category" rides as this sentinel and is
// translated back to null in payloadFrom().
const NONE = "__none__";
const CATEGORY_OPTIONS: Record<string, string> = {
  [NONE]: NO_CATEGORY,
  ...MATERIAL_CATEGORY_LABELS,
};

type Form = {
  name: string;
  description: string;
  category: string;
  quantity: string;
  unit: string;
};

const emptyForm: Form = { name: "", description: "", category: NONE, quantity: "0", unit: "" };

function categoryLabel(category: string | null) {
  if (!category) return NO_CATEGORY;
  return MATERIAL_CATEGORY_LABELS[category as keyof typeof MATERIAL_CATEGORY_LABELS] ?? category;
}

/** "31 de julho às 12h20" */
function formatAuditDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return `${date} às ${time.replace(":", "h")}`;
}

function payloadFrom(f: Form) {
  return {
    name: f.name,
    description: f.description,
    category: f.category === NONE ? null : f.category,
    unit: f.unit,
    quantity: Number(f.quantity) || 0,
  };
}

// Module scope on purpose: nesting this in MaterialsClient would remount the inputs
// on every keystroke and drop focus.
function MaterialFields({
  value,
  onChange,
}: {
  value: Form;
  onChange: (patch: Partial<Form>) => void;
}) {
  return (
    <>
      <div className="space-y-1">
        <p className="text-sm font-medium">Nome</p>
        <Input className="h-12" value={value.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Descrição</p>
        <Textarea
          className="min-h-24"
          placeholder="Detalhes do material..."
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Categoria</p>
        <Select
          value={value.category}
          onValueChange={(v) => onChange({ category: v ?? NONE })}
          items={CATEGORY_OPTIONS}
        >
          <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_OPTIONS).map(([v, label]) => (
              <SelectItem key={v} value={v}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium">Quantidade</p>
          <Input
            type="number"
            className="h-12"
            value={value.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
          />
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium">Volume</p>
          <Input
            className="h-12"
            placeholder="cx, rolo, un..."
            value={value.unit}
            onChange={(e) => onChange({ unit: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}

export function MaterialsClient({
  initialMaterials,
  isManager,
}: {
  initialMaterials: Material[];
  isManager: boolean;
}) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = materials.find((m) => m.id === detailId) ?? null;

  const visible = materials
    .filter((m) => m.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((m) => filterCategories.length === 0 || filterCategories.includes(m.category ?? NONE));

  function toggleFilterCategory(value: string) {
    setFilterCategories((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  }

  async function createMaterial() {
    setSaving(true);
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFrom(form)),
    });
    const saved = await res.json();
    setMaterials((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
    setSaving(false);
    setCreateOpen(false);
    setForm(emptyForm);
  }

  async function removeMaterial() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/materials/${selected.id}`, { method: "DELETE" });
    setMaterials((prev) => prev.filter((m) => m.id !== selected.id));
    setSaving(false);
    setConfirmDelete(false);
    setDetailId(null);
  }

  function openDetail(m: Material) {
    setDetailId(m.id);
    setEditing(false);
    setConfirmDelete(false);
    setEditForm({
      name: m.name,
      description: m.description ?? "",
      category: m.category ?? NONE,
      quantity: String(m.quantity),
      unit: m.unit,
    });
  }

  async function saveEdit() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/materials/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFrom(editForm)),
    });
    const updated = await res.json();
    setMaterials((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m)).sort((a, b) => a.name.localeCompare(b.name))
    );
    setSaving(false);
    setEditing(false);
  }

  async function adjust(m: Material, delta: number) {
    // Never go below zero.
    if (delta < 0 && m.quantity <= 0) return;
    setAdjusting(m.id);
    const res = await fetch(`/api/materials/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityDelta: delta }),
    });
    const updated = await res.json();
    setMaterials((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
    setAdjusting(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            placeholder="Buscar material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-11 relative" onClick={() => setFilterOpen(true)}>
          <Filter className="h-4 w-4" />
          {filterCategories.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {filterCategories.length}
            </span>
          )}
        </Button>
      </div>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtrar</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium">Categoria</p>
            <div className="space-y-2">
              {Object.entries(CATEGORY_OPTIONS).map(([value, label]) => (
                <label key={value} className="flex items-center gap-3 py-1 text-sm">
                  <Checkbox
                    checked={filterCategories.includes(value)}
                    onCheckedChange={() => toggleFilterCategory(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setFilterCategories([])}>
                Limpar
              </Button>
              <Button className="flex-1 h-12" onClick={() => setFilterOpen(false)}>
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isManager && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            className={cn(buttonVariants({ size: "icon" }), "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40")}
            aria-label="Novo material"
          >
            <Plus className="h-6 w-6" />
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo material</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <MaterialFields value={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
              <Button
                className="w-full h-12"
                disabled={!form.name || !form.unit || saving}
                onClick={createMaterial}
              >
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {visible.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between gap-3 p-4 border rounded-lg bg-background"
        >
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openDetail(m)}>
            <p className="font-medium text-sm">{m.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {categoryLabel(m.category)} · {m.unit}
            </p>
          </button>
          {isManager ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                disabled={m.quantity <= 0 || adjusting === m.id}
                onClick={() => adjust(m, -1)}
                aria-label="Diminuir"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center font-medium tabular-nums">{m.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                disabled={adjusting === m.id}
                onClick={() => adjust(m, 1)}
                aria-label="Aumentar"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <span className="text-sm font-medium">{m.quantity}</span>
          )}
        </div>
      ))}

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {search || filterCategories.length > 0
            ? "Nenhum material encontrado."
            : "Nenhum material cadastrado."}
        </p>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar material" : (selected?.name ?? "")}</DialogTitle>
          </DialogHeader>
          {selected && !editing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Categoria</p>
                  <p>{categoryLabel(selected.category)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Quantidade</p>
                  <p>{selected.quantity} {selected.unit}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Descrição</p>
                <p className="whitespace-pre-wrap">{selected.description || "—"}</p>
              </div>
              <div className="border-t pt-3 space-y-1 text-xs text-muted-foreground">
                <p>
                  Criado por: {selected.createdBy?.username ?? "—"}, em {formatAuditDate(selected.createdAt)}
                </p>
                {selected.updatedAt !== selected.createdAt && (
                  <p>
                    Alterado por: {selected.updatedBy?.username ?? "—"}, em {formatAuditDate(selected.updatedAt)}
                  </p>
                )}
              </div>
              {isManager && (
                <div className="flex gap-2">
                  <Button className="flex-1 h-12" onClick={() => setEditing(true)}>
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                    aria-label="Excluir material"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
          {selected && editing && (
            <div className="space-y-3">
              <MaterialFields
                value={editForm}
                onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 h-12"
                  disabled={!editForm.name || !editForm.unit || saving}
                  onClick={saveEdit}
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir material</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              Excluir <span className="font-medium">{selected?.name}</span> permanentemente? As
              solicitações de compra já feitas continuam no histórico, mas deixam de ficar ligadas a
              este material.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-12"
                disabled={saving}
                onClick={removeMaterial}
              >
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
