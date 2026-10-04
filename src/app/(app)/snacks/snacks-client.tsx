"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Minus, Trash2 } from "lucide-react";
import { NumberStepper } from "@/components/ui/number-stepper";
import {
  DEFAULT_SNACK_MIN_QUANTITY,
  MAX_SNACK_MIN_QUANTITY,
  isLowStock,
  validateMinQuantity,
} from "@/lib/snacks";

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Comida",
  DRINK: "Bebida",
  OTHER: "Outros",
};

type Snack = {
  id: string;
  category: string;
  description: string;
  quantity: number;
  minQuantity: number;
  unit: string;
};

type Form = { category: string; description: string; quantity: string; minQuantity: number; unit: string };

const emptyForm: Form = {
  category: "FOOD",
  description: "",
  quantity: "0",
  minQuantity: DEFAULT_SNACK_MIN_QUANTITY,
  unit: "",
};

function minQuantityError(f: Form) {
  return validateMinQuantity(f.minQuantity);
}

function toPayload(f: Form) {
  return { ...f, quantity: Number(f.quantity) || 0 };
}

// Module scope on purpose: nesting this in SnacksClient would remount the inputs on
// every keystroke and drop focus.
function SnackFields({
  value,
  onChange,
}: {
  value: Form;
  onChange: (patch: Partial<Form>) => void;
}) {
  const error = minQuantityError(value);
  return (
    <>
      <div className="space-y-1">
        <p className="text-sm font-medium">Categoria</p>
        <Select
          value={value.category}
          onValueChange={(v) => onChange({ category: v ?? "FOOD" })}
          items={CATEGORY_LABELS}
        >
          <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([v, label]) => (
              <SelectItem key={v} value={v}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Descrição</p>
        <Input
          className="h-12"
          placeholder="Suco, biscoito..."
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
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
            placeholder="saco, caixa, garrafa..."
            value={value.unit}
            onChange={(e) => onChange({ unit: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Comprar mais quando chegar em</p>
        <NumberStepper
          value={value.minQuantity}
          onChange={(minQuantity) => onChange({ minQuantity })}
          min={0}
          max={MAX_SNACK_MIN_QUANTITY}
          aria-label="Comprar mais quando chegar em"
        />
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">&apos;0&apos; para não informar uma nova compra</p>
        )}
      </div>
    </>
  );
}

export function SnacksClient({
  initialSnacks,
  canDelete,
}: {
  initialSnacks: Snack[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [snacks, setSnacks] = useState(initialSnacks);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Snack | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openEdit(s: Snack) {
    setEditingId(s.id);
    setEditForm({
      category: s.category,
      description: s.description,
      quantity: String(s.quantity),
      minQuantity: s.minQuantity,
      unit: s.unit,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    const res = await fetch(`/api/snacks/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(editForm)),
    });
    const updated = await res.json();
    setSnacks((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)).sort((a, b) => a.description.localeCompare(b.description))
    );
    setSaving(false);
    setEditingId(null);
    router.refresh();
  }

  async function create() {
    setSaving(true);
    const res = await fetch("/api/snacks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(form)),
    });
    const saved = await res.json();
    setSnacks((prev) => [...prev, saved].sort((a, b) => a.description.localeCompare(b.description)));
    setSaving(false);
    setCreateOpen(false);
    setForm(emptyForm);
  }

  async function adjust(s: Snack, delta: number) {
    if (delta < 0 && s.quantity <= 0) return;
    setAdjusting(s.id);
    setSnacks((prev) => prev.map((x) => (x.id === s.id ? { ...x, quantity: x.quantity + delta } : x)));
    await fetch(`/api/snacks/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityDelta: delta }),
    });
    setAdjusting(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/snacks/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) setSnacks((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-3">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger
          className={cn(buttonVariants({ size: "icon" }), "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40")}
          aria-label="Novo item"
        >
          <Plus className="h-6 w-6" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo item de lanche</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <SnackFields value={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
            <Button
              className="w-full h-12"
              disabled={!form.description || !form.unit || !!minQuantityError(form) || saving}
              onClick={create}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {snacks.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-3 p-4 border rounded-lg bg-background">
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openEdit(s)}>
            <p className="font-medium text-sm uppercase">{s.description}</p>
            <p className="text-xs text-muted-foreground">
              {s.quantity} {s.unit}
              {isLowStock(s) && <span className="text-destructive"> · estoque baixo</span>}
            </p>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              disabled={s.quantity <= 0 || adjusting === s.id}
              onClick={() => adjust(s, -1)}
              aria-label="Diminuir"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-medium tabular-nums">{s.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              disabled={adjusting === s.id}
              onClick={() => adjust(s, 1)}
              aria-label="Aumentar"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteTarget(s)}
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {snacks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum item cadastrado.</p>
      )}

      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <SnackFields value={editForm} onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))} />
            <Button
              className="w-full h-12"
              disabled={!editForm.description || !editForm.unit || !!minQuantityError(editForm) || saving}
              onClick={saveEdit}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir item?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground wrap-anywhere">
            {deleteTarget && (
              <>
                <span className="font-medium text-foreground uppercase">{deleteTarget.description}</span>{" "}
                será excluído. Essa ação é irreversível.
              </>
            )}
          </p>
          <Button variant="destructive" className="w-full h-12" disabled={deleting} onClick={confirmDelete}>
            Confirmar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
