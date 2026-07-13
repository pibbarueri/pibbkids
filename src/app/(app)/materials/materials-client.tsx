"use client";

import { useState } from "react";
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
import { Plus, AlertTriangle } from "lucide-react";

type Material = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
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
  const [createForm, setCreateForm] = useState({ name: "", unit: "", minQuantity: "0" });
  const [moveTarget, setMoveTarget] = useState<Material | null>(null);
  const [moveForm, setMoveForm] = useState({ delta: "", reason: "" });
  const [saving, setSaving] = useState(false);

  async function createMaterial() {
    setSaving(true);
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createForm.name,
        unit: createForm.unit,
        minQuantity: Number(createForm.minQuantity) || 0,
      }),
    });
    const saved = await res.json();
    setMaterials((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
    setSaving(false);
    setCreateOpen(false);
    setCreateForm({ name: "", unit: "", minQuantity: "0" });
  }

  async function move() {
    if (!moveTarget) return;
    const delta = Number(moveForm.delta);
    if (!delta) return;
    setSaving(true);
    const res = await fetch(`/api/materials/${moveTarget.id}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta, reason: moveForm.reason }),
    });
    await res.json();
    setMaterials((prev) =>
      prev.map((m) => (m.id === moveTarget.id ? { ...m, quantity: m.quantity + delta } : m))
    );
    setSaving(false);
    setMoveTarget(null);
    setMoveForm({ delta: "", reason: "" });
  }

  return (
    <div className="space-y-3">
      {isManager && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className={buttonVariants({ className: "w-full h-12" })}>
            <Plus className="h-4 w-4 mr-2" /> Novo material
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
                <div className="space-y-1">
                  <p className="text-sm font-medium">Qtd. mínima</p>
                  <Input
                    type="number"
                    className="h-12"
                    value={createForm.minQuantity}
                    onChange={(e) => setCreateForm((f) => ({ ...f, minQuantity: e.target.value }))}
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
        const low = m.quantity < m.minQuantity;
        return (
          <div
            key={m.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-background"
          >
            <div>
              <p className="font-medium text-sm">{m.name}</p>
              <p className="text-xs text-muted-foreground">
                {m.quantity} {m.unit} {m.minQuantity > 0 && `· mínimo ${m.minQuantity}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {low && <AlertTriangle className="h-4 w-4 text-destructive" />}
              {isManager && (
                <Button variant="outline" size="sm" onClick={() => setMoveTarget(m)}>
                  Movimentar
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {materials.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum material cadastrado.</p>
      )}

      <Dialog open={!!moveTarget} onOpenChange={(o) => !o && setMoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moveTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Quantidade (negativo = saída)</p>
              <Input
                type="number"
                className="h-12"
                value={moveForm.delta}
                onChange={(e) => setMoveForm((f) => ({ ...f, delta: e.target.value }))}
                placeholder="Ex: 10 ou -5"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Motivo</p>
              <Input
                className="h-12"
                value={moveForm.reason}
                onChange={(e) => setMoveForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ex: compra, uso em aula..."
              />
            </div>
            <Button
              className="w-full h-12"
              disabled={!moveForm.delta || !moveForm.reason || saving}
              onClick={move}
            >
              Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
