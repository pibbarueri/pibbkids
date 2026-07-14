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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
  COMPRADO: "Comprado",
};

const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  PENDENTE: "secondary",
  APROVADO: "default",
  REJEITADO: "destructive",
  COMPRADO: "outline",
};

type Material = { id: string; name: string; unit: string };
type PurchaseRequest = {
  id: string;
  requester: { id: string; name: string };
  material: Material | null;
  freeTextItem: string | null;
  quantity: number;
  justification: string | null;
  status: string;
  createdAt: string;
};

export function PurchaseRequestsClient({
  initialRequests,
  materials,
  isManager,
  canRequest,
}: {
  initialRequests: PurchaseRequest[];
  materials: Material[];
  isManager: boolean;
  canRequest: boolean;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ materialId: "", freeTextItem: "", quantity: "1", justification: "" });
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    const res = await fetch("/api/purchase-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materialId: form.materialId || null,
        freeTextItem: form.materialId ? null : form.freeTextItem,
        quantity: Number(form.quantity) || 1,
        justification: form.justification,
      }),
    });
    const saved = await res.json();
    setRequests((prev) => [saved, ...prev]);
    setSaving(false);
    setOpen(false);
    setForm({ materialId: "", freeTextItem: "", quantity: "1", justification: "" });
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/purchase-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }

  const valid = (form.materialId || form.freeTextItem) && Number(form.quantity) > 0;

  return (
    <div className="space-y-3">
      {canRequest && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={buttonVariants({ className: "w-full h-12" })}>
            <Plus className="h-4 w-4 mr-2" /> Nova solicitação
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova solicitação</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Material do estoque</p>
                <Select
                  value={form.materialId}
                  onValueChange={(v) => setForm((f) => ({ ...f, materialId: v ?? "" }))}
                  items={Object.fromEntries(materials.map((m) => [m.id, m.name]))}
                >
                  <SelectTrigger className="h-12"><SelectValue placeholder="Ou digite abaixo..." /></SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {!form.materialId && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Item (texto livre)</p>
                  <Input
                    className="h-12"
                    value={form.freeTextItem}
                    onChange={(e) => setForm((f) => ({ ...f, freeTextItem: e.target.value }))}
                    placeholder="Ex: Caneta vermelha Pilot"
                  />
                </div>
              )}

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
                <p className="text-sm font-medium">Justificativa</p>
                <Input
                  className="h-12"
                  value={form.justification}
                  onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
                />
              </div>

              <Button className="w-full h-12" disabled={!valid || saving} onClick={create}>
                Enviar solicitação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {requests.map((r) => (
        <div key={r.id} className="p-4 border rounded-lg bg-background space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">
                {r.quantity}x {r.material?.name ?? r.freeTextItem}
              </p>
              <p className="text-xs text-muted-foreground">{r.requester.name}</p>
              {r.justification && <p className="text-xs text-muted-foreground mt-1">{r.justification}</p>}
            </div>
            <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABELS[r.status]}</Badge>
          </div>

          {isManager && r.status === "PENDENTE" && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => setStatus(r.id, "APROVADO")}>
                Aprovar
              </Button>
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => setStatus(r.id, "REJEITADO")}>
                Rejeitar
              </Button>
            </div>
          )}
          {isManager && r.status === "APROVADO" && (
            <Button size="sm" className="w-full" onClick={() => setStatus(r.id, "COMPRADO")}>
              Marcar como comprado
            </Button>
          )}
        </div>
      ))}

      {requests.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma solicitação.</p>
      )}
    </div>
  );
}
