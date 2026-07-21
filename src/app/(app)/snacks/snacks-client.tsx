"use client";

import { useState } from "react";
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

const CATEGORY_LABELS: Record<string, string> = {
  COMIDA: "Comida",
  BEBIDA: "Bebida",
  OUTROS: "Outros",
};

type Snack = {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
};

const emptyForm = { category: "COMIDA", description: "", quantity: "0", unit: "" };

export function SnacksClient({ initialSnacks }: { initialSnacks: Snack[] }) {
  const [snacks, setSnacks] = useState(initialSnacks);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);

  async function create() {
    setSaving(true);
    const res = await fetch("/api/snacks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantity: Number(form.quantity) || 0 }),
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
  }

  async function remove(id: string) {
    await fetch(`/api/snacks/${id}`, { method: "DELETE" });
    setSnacks((prev) => prev.filter((s) => s.id !== id));
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
            <div className="space-y-1">
              <p className="text-sm font-medium">Categoria</p>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v ?? "COMIDA" }))}
                items={CATEGORY_LABELS}
              >
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Descrição</p>
              <Input
                className="h-12"
                placeholder="Suco, biscoito..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Quantidade</p>
                <Input
                  type="number"
                  className="h-12"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Volume</p>
                <Input
                  className="h-12"
                  placeholder="saco, caixa, garrafa..."
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
            </div>
            <Button
              className="w-full h-12"
              disabled={!form.description || !form.unit || saving}
              onClick={create}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {snacks.map((s) => (
        <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg bg-background">
          <div>
            <p className="font-medium text-sm uppercase">{s.description}</p>
            <p className="text-xs text-muted-foreground">
              {s.quantity} {s.unit}
              {s.quantity <= 5 && <span className="text-destructive"> · estoque baixo</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => remove(s.id)}
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      {snacks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum item cadastrado.</p>
      )}
    </div>
  );
}
