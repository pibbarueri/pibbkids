"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Minus } from "lucide-react";

type Material = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
};

export function MaterialsClient({
  initialMaterials,
  isManager,
}: {
  initialMaterials: Material[];
  isManager: boolean;
}) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", unit: "" });
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);

  async function createMaterial() {
    setSaving(true);
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createForm.name,
        unit: createForm.unit,
      }),
    });
    const saved = await res.json();
    setMaterials((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
    setSaving(false);
    setCreateOpen(false);
    setCreateForm({ name: "", unit: "" });
  }

  async function adjust(m: Material, delta: number) {
    // Never go below zero.
    if (delta < 0 && m.quantity <= 0) return;
    setAdjusting(m.id);
    setMaterials((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, quantity: x.quantity + delta } : x))
    );
    await fetch(`/api/materials/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityDelta: delta }),
    });
    setAdjusting(null);
  }

  return (
    <div className="space-y-3">
      {isManager && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            className={cn(buttonVariants({ size: "icon" }), "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40")}
            aria-label="Novo material"
          >
            <Plus className="h-6 w-6" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo material</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nome</p>
                <Input
                  className="h-12"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Unidade</p>
                  <Input
                    className="h-12"
                    placeholder="cx, rolo, un..."
                    value={createForm.unit}
                    onChange={(e) => setCreateForm((f) => ({ ...f, unit: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                className="w-full h-12"
                disabled={!createForm.name || !createForm.unit || saving}
                onClick={createMaterial}
              >
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {materials.map((m) => {
        return (
          <div
            key={m.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-background"
          >
            <div>
              <p className="font-medium text-sm">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.unit}</p>
            </div>
            {isManager ? (
              <div className="flex items-center gap-2">
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
        );
      })}

      {materials.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum material cadastrado.</p>
      )}
    </div>
  );
}
