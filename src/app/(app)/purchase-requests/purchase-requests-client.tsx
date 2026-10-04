"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, X } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Solicitado",
  APPROVED: "Aprovado para compra",
  REJECTED: "Rejeitado",
  PURCHASED: "Compra realizada",
  IN_STOCK: "Em estoque",
};

// Badge visual per status. APPROVED uses a yellow badge for the requester.
function statusBadgeClass(status: string): string {
  switch (status) {
    case "APPROVED":
      return "bg-yellow-400 text-yellow-950 hover:bg-yellow-400";
    case "REJECTED":
      return "bg-muted text-muted-foreground hover:bg-muted";
    case "PURCHASED":
      return "bg-blue-500 text-white hover:bg-blue-500";
    case "IN_STOCK":
      return "bg-green-600 text-white hover:bg-green-600";
    default:
      return "bg-secondary text-secondary-foreground hover:bg-secondary";
  }
}

// Ordered breadcrumb steps for the happy path; rejection is handled separately.
const FLOW = ["PENDING", "APPROVED", "PURCHASED", "IN_STOCK"];
const FLOW_LABELS: Record<string, string> = {
  PENDING: "Solicitado",
  APPROVED: "Aprovado (aguardando compra)",
  PURCHASED: "Compra realizada",
  IN_STOCK: "Em estoque",
};

type MaterialOption = { id: string; name: string; unit: string; categoryId: string | null };
type CategoryOption = { id: string; name: string };

type PurchaseRequest = {
  id: string;
  requester: { id: string; name: string };
  material: { id: string; name: string; unit: string; categoryId: string | null } | null;
  category: { id: string; name: string } | null;
  freeTextItem: string | null;
  description: string | null;
  quantity: number;
  unit: string | null;
  justification: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
};

function itemName(r: PurchaseRequest): string {
  return r.material?.name ?? r.freeTextItem ?? "Item";
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `dia ${dd}/${mm} às ${hh}h${min}`;
}

function Breadcrumb({ status }: { status: string }) {
  if (status === "REJECTED") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-foreground">Solicitado</span>
        <span className="text-muted-foreground">›</span>
        <span className="font-medium text-destructive">Rejeitado</span>
      </div>
    );
  }
  const currentIdx = FLOW.indexOf(status);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {FLOW.map((s, i) => {
        const done = i <= currentIdx;
        return (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">›</span>}
            <span
              className={cn(
                "flex items-center gap-1",
                done ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {done && <Check className="h-3 w-3 text-green-600" />}
              {FLOW_LABELS[s]}
            </span>
          </span>
        );
      })}
    </div>
  );
}

const emptyForm = {
  query: "",
  materialId: null as string | null,
  categoryId: "",
  unit: "",
  description: "",
  quantity: "1",
  justification: "",
};

export function PurchaseRequestsClient({
  initialRequests,
  isManager,
  materials,
  categories,
}: {
  initialRequests: PurchaseRequest[];
  isManager: boolean;
  materials: MaterialOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const suggestions =
    !form.materialId && form.query.trim().length >= 2
      ? materials.filter((m) => m.name.toLowerCase().includes(form.query.trim().toLowerCase())).slice(0, 5)
      : [];
  const pickedMaterial = form.materialId ? materials.find((m) => m.id === form.materialId) : null;

  // Details modal
  const [selected, setSelected] = useState<PurchaseRequest | null>(null);
  const [rejecting, setRejecting] = useState(false);

  // The page already marked this visit as "seen" server-side, but that ran in the same
  // request that rendered the (now stale) nav dot — refresh once so the dot reflects it.
  useEffect(() => {
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [rejectReason, setRejectReason] = useState("");

  async function create() {
    setSaving(true);
    const res = await fetch("/api/purchase-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materialId: form.materialId,
        freeTextItem: form.materialId ? null : form.query.trim(),
        categoryId: form.materialId ? null : form.categoryId,
        unit: form.materialId ? null : form.unit || null,
        description: form.description || null,
        quantity: Number(form.quantity) || 1,
        justification: form.justification,
      }),
    });
    const saved = await res.json();
    setRequests((prev) => [saved, ...prev]);
    setSaving(false);
    setOpen(false);
    setForm(emptyForm);
    router.refresh();
  }

  async function setStatus(id: string, status: string, reason?: string) {
    const res = await fetch(`/api/purchase-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason: reason }),
    });
    const updated = await res.json();
    setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setSelected(updated);
    setRejecting(false);
    setRejectReason("");
    router.refresh();
  }

  const valid =
    Number(form.quantity) > 0 &&
    (form.materialId ? true : form.query.trim() && form.categoryId);

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          className={cn(buttonVariants({ size: "icon" }), "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40")}
          aria-label="Nova solicitação"
        >
          <Plus className="h-6 w-6" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1 relative">
              <p className="text-sm font-medium">Item</p>
              {pickedMaterial ? (
                <div className="flex items-center justify-between h-12 px-3 rounded-md border bg-muted/40">
                  <span className="text-sm">
                    {pickedMaterial.name} · {pickedMaterial.unit}
                  </span>
                  <button
                    type="button"
                    aria-label="Trocar item"
                    className="text-muted-foreground"
                    onClick={() => setForm((f) => ({ ...f, materialId: null, query: "" }))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Input
                    className="h-12"
                    value={form.query}
                    onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
                    placeholder="Buscar material existente ou digitar novo"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg divide-y">
                      {suggestions.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => setForm((f) => ({ ...f, materialId: m.id, query: m.name }))}
                        >
                          {m.name} <span className="text-muted-foreground">· {m.unit}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {!pickedMaterial && (
              <div className="flex gap-3">
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium">Categoria *</p>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v ?? "" }))}
                    items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
                  >
                    <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-28">
                  <p className="text-sm font-medium">Unidade</p>
                  <Input
                    className="h-12"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    placeholder="cx, rolo, etc"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1 w-24">
              <p className="text-sm font-medium">Qtde</p>
              <Input
                type="number"
                className="h-12"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Descrição</p>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detalhes opcionais do item"
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

      {requests.map((r) => (
        <button
          key={r.id}
          onClick={() => {
            setSelected(r);
            setRejecting(false);
          }}
          className="w-full text-left p-4 border rounded-lg bg-background flex items-start justify-between gap-2 hover:bg-muted/50 transition-all active:scale-[0.98]"
        >
          <div>
            <p className="font-medium text-sm wrap-anywhere">{itemName(r)}</p>
            <p className="text-xs text-muted-foreground">{r.requester.name}</p>
          </div>
          <Badge className={statusBadgeClass(r.status)}>{STATUS_LABELS[r.status]}</Badge>
        </button>
      ))}

      {requests.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma solicitação.</p>
      )}

      {/* Details modal */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="wrap-anywhere">{itemName(selected)}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Breadcrumb status={selected.status} />

                <div className="space-y-1">
                  {/* Unit is free text, so it stays out of the title and only shows here. */}
                  <p className="text-xs text-muted-foreground wrap-anywhere">
                    Quantidade: {selected.quantity}
                    {selected.unit && ` ${selected.unit}`}
                  </p>
                  {selected.category && (
                    <p className="text-xs text-muted-foreground">Categoria: {selected.category.name}</p>
                  )}
                  {selected.description && <p className="text-sm wrap-anywhere">{selected.description}</p>}
                </div>

                {selected.justification && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Justificativa</p>
                    <p className="text-sm">{selected.justification}</p>
                  </div>
                )}

                {selected.status === "REJECTED" && selected.rejectionReason && (
                  <div>
                    <p className="text-xs font-medium text-destructive">Motivo da rejeição</p>
                    <p className="text-sm">{selected.rejectionReason}</p>
                  </div>
                )}

                {/* Admin actions */}
                {isManager && !rejecting && (
                  <div className="flex flex-col gap-2">
                    {selected.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => setStatus(selected.id, "APPROVED")}>
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => setRejecting(true)}
                        >
                          Rejeitar
                        </Button>
                      </div>
                    )}
                    {selected.status === "APPROVED" && (
                      <Button size="sm" onClick={() => setStatus(selected.id, "PURCHASED")}>
                        Marcar compra realizada
                      </Button>
                    )}
                    {selected.status === "PURCHASED" && (
                      <Button size="sm" onClick={() => setStatus(selected.id, "IN_STOCK")}>
                        Marcar em estoque
                      </Button>
                    )}
                  </div>
                )}

                {/* Reject reason sub-flow */}
                {isManager && rejecting && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Motivo da rejeição</p>
                    <Input
                      className="h-12"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Ex: Fora do orçamento"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="flex-1" onClick={() => setRejecting(false)}>
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        disabled={!rejectReason.trim()}
                        onClick={() => setStatus(selected.id, "REJECTED", rejectReason)}
                      >
                        Confirmar rejeição
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground border-t pt-3">
                  Solicitado por: &apos;{selected.requester.name}&apos;, {formatWhen(selected.createdAt)}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
