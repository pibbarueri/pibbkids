"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Check } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Solicitado",
  APROVADO: "Aprovado para compra",
  REJEITADO: "Rejeitado",
  COMPRADO: "Compra realizada",
  EM_ESTOQUE: "Em estoque",
};

// Badge visual per status. APROVADO uses a yellow badge for the requester.
function statusBadgeClass(status: string): string {
  switch (status) {
    case "APROVADO":
      return "bg-yellow-400 text-yellow-950 hover:bg-yellow-400";
    case "REJEITADO":
      return "bg-muted text-muted-foreground hover:bg-muted";
    case "COMPRADO":
      return "bg-blue-500 text-white hover:bg-blue-500";
    case "EM_ESTOQUE":
      return "bg-green-600 text-white hover:bg-green-600";
    default:
      return "bg-secondary text-secondary-foreground hover:bg-secondary";
  }
}

// Ordered breadcrumb steps for the happy path; rejection is handled separately.
const FLOW = ["PENDENTE", "APROVADO", "COMPRADO", "EM_ESTOQUE"];
const FLOW_LABELS: Record<string, string> = {
  PENDENTE: "Solicitado",
  APROVADO: "Aprovado (aguardando compra)",
  COMPRADO: "Compra realizada",
  EM_ESTOQUE: "Em estoque",
};

type PurchaseRequest = {
  id: string;
  requester: { id: string; name: string };
  freeTextItem: string | null;
  quantity: number;
  unit: string | null;
  justification: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `dia ${dd}/${mm} às ${hh}h${min}`;
}

function Breadcrumb({ status }: { status: string }) {
  if (status === "REJEITADO") {
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

export function PurchaseRequestsClient({
  initialRequests,
  isManager,
}: {
  initialRequests: PurchaseRequest[];
  isManager: boolean;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ freeTextItem: "", quantity: "1", unit: "", justification: "" });
  const [saving, setSaving] = useState(false);

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
        freeTextItem: form.freeTextItem,
        quantity: Number(form.quantity) || 1,
        unit: form.unit || null,
        justification: form.justification,
      }),
    });
    const saved = await res.json();
    setRequests((prev) => [saved, ...prev]);
    setSaving(false);
    setOpen(false);
    setForm({ freeTextItem: "", quantity: "1", unit: "", justification: "" });
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

  const valid = form.freeTextItem.trim() && Number(form.quantity) > 0;

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
            <div className="space-y-1">
              <p className="text-sm font-medium">Item</p>
              <Input
                className="h-12"
                value={form.freeTextItem}
                onChange={(e) => setForm((f) => ({ ...f, freeTextItem: e.target.value }))}
                placeholder="Ex: Caneta vermelha Pilot"
              />
            </div>

            <div className="flex gap-3">
              <div className="space-y-1 w-24">
                <p className="text-sm font-medium">Qtde</p>
                <Input
                  type="number"
                  className="h-12"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium">Unidade</p>
                <Input
                  className="h-12"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="cx, rolo, etc"
                />
              </div>
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
            <p className="font-medium text-sm">
              {r.quantity}
              {r.unit ? ` ${r.unit}` : "x"} {r.freeTextItem}
            </p>
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
                <DialogTitle>
                  {selected.quantity}
                  {selected.unit ? ` ${selected.unit}` : "x"} {selected.freeTextItem}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Breadcrumb status={selected.status} />

                {selected.justification && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Justificativa</p>
                    <p className="text-sm">{selected.justification}</p>
                  </div>
                )}

                {selected.status === "REJEITADO" && selected.rejectionReason && (
                  <div>
                    <p className="text-xs font-medium text-destructive">Motivo da rejeição</p>
                    <p className="text-sm">{selected.rejectionReason}</p>
                  </div>
                )}

                {/* Admin actions */}
                {isManager && !rejecting && (
                  <div className="flex flex-col gap-2">
                    {selected.status === "PENDENTE" && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => setStatus(selected.id, "APROVADO")}>
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
                    {selected.status === "APROVADO" && (
                      <Button size="sm" onClick={() => setStatus(selected.id, "COMPRADO")}>
                        Marcar compra realizada
                      </Button>
                    )}
                    {selected.status === "COMPRADO" && (
                      <Button size="sm" onClick={() => setStatus(selected.id, "EM_ESTOQUE")}>
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
                        onClick={() => setStatus(selected.id, "REJEITADO", rejectReason)}
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
