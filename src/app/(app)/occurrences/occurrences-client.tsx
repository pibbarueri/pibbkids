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
import { Plus, Trash2 } from "lucide-react";

const CONTEXT_LABELS: Record<string, string> = {
  EBD: "EBD",
  CULTO: "Culto",
  OUTRO: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  UNDER_REVIEW: "Em análise",
  RESOLVED: "Resolvido",
};

function statusBadgeClass(status: string): string {
  return status === "RESOLVED"
    ? "bg-green-600 text-white hover:bg-green-600"
    : "bg-primary text-primary-foreground hover:bg-primary";
}

type Occurrence = {
  id: string;
  occurredAt: string;
  context: string;
  details: string;
  status: string;
  createdAt: string;
  reporter: { name: string; username: string | null };
  resolvedBy: { name: string; username: string | null } | null;
  resolvedAt: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} às ${hh}:${min}`;
}

function ContextRadio({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup">
      {(["EBD", "CULTO", "OUTRO"] as const).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          onClick={() => onChange(c)}
          className={cn(
            "h-12 rounded-lg border text-sm font-medium transition-all active:scale-95",
            value === c ? "border-primary bg-primary text-primary-foreground" : "border-input bg-transparent"
          )}
        >
          {CONTEXT_LABELS[c]}
        </button>
      ))}
    </div>
  );
}

const emptyForm = { occurredAt: "", context: "EBD", details: "" };

export function OccurrencesClient({
  initialOccurrences,
  isManager,
}: {
  initialOccurrences: Occurrence[];
  isManager: boolean;
}) {
  const router = useRouter();
  const [occurrences, setOccurrences] = useState(initialOccurrences);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<Occurrence | null>(null);
  const [resolving, setResolving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Occurrence | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // The page already marked this visit as "seen" server-side, but that ran in the same
  // request that rendered the (now stale) nav dot — refresh once so the dot reflects it.
  useEffect(() => {
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valid = form.occurredAt && form.context && form.details.trim();

  async function create() {
    if (!valid) return;
    setSaving(true);
    const res = await fetch("/api/occurrences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json();
      setOccurrences((prev) => [created, ...prev]);
      setOpen(false);
      setForm(emptyForm);
      router.refresh();
    }
    setSaving(false);
  }

  async function setStatus(id: string, status: string) {
    setResolving(true);
    const res = await fetch(`/api/occurrences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOccurrences((prev) => prev.map((o) => (o.id === id ? updated : o)));
      setSelected(updated);
      router.refresh();
    }
    setResolving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteConfirmText.trim().toLowerCase() !== "confirmar exclusão") return;
    setDeleteSaving(true);
    setDeleteError(null);
    const res = await fetch(`/api/occurrences/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setOccurrences((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setSelected(null);
      setDeleteTarget(null);
      setDeleteConfirmText("");
    } else {
      const body = await res.json();
      setDeleteError(body.error ?? "Erro ao excluir.");
    }
    setDeleteSaving(false);
  }

  return (
    <div className="space-y-3">
      {!isManager ? (
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(emptyForm); }}>
        <DialogTrigger
          className={cn(buttonVariants({ size: "icon" }), "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40")}
          aria-label="Nova ocorrência"
        >
          <Plus className="h-6 w-6" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova ocorrência</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Data da ocorrência *</p>
              <Input
                type="date"
                className="h-12"
                value={form.occurredAt}
                onChange={(e) => setForm((f) => ({ ...f, occurredAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Momento *</p>
              <ContextRadio value={form.context} onChange={(v) => setForm((f) => ({ ...f, context: v }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Detalhes *</p>
              <Textarea
                rows={4}
                value={form.details}
                onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                placeholder="Descreva o que aconteceu..."
              />
            </div>
            <Button className="w-full h-12" disabled={!valid || saving} onClick={create}>
              Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      ) : null}

      {occurrences.map((o) => (
        <button
          key={o.id}
          onClick={() => setSelected(o)}
          className="w-full text-left p-4 border rounded-lg bg-background hover:bg-muted/50 transition-all active:scale-[0.98]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">
                {formatDate(o.occurredAt)} · {CONTEXT_LABELS[o.context]}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{o.details}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={statusBadgeClass(o.status)}>{STATUS_LABELS[o.status]}</Badge>
              {isManager && (
                <span
                  role="button"
                  aria-label="Excluir"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(o); setDeleteConfirmText(""); setDeleteError(null); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90 border"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </span>
              )}
            </div>
          </div>
        </button>
      ))}

      {occurrences.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ocorrência reportada.</p>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {formatDate(selected.occurredAt)} · {CONTEXT_LABELS[selected.context]}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Reportado em</p>
                  <p>{formatWhen(selected.createdAt)}, por {selected.reporter.username ?? selected.reporter.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge className={cn("mt-0.5", statusBadgeClass(selected.status))}>{STATUS_LABELS[selected.status]}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Data da ocorrência</p>
                  <p>{formatDate(selected.occurredAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Momento</p>
                  <p>{CONTEXT_LABELS[selected.context]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Detalhes</p>
                  <p className="whitespace-pre-wrap break-words">{selected.details}</p>
                </div>
                {selected.status === "RESOLVED" && selected.resolvedBy && selected.resolvedAt && (
                  <div>
                    <p className="text-muted-foreground text-xs">Resolvido por</p>
                    <p>{selected.resolvedBy.username ?? selected.resolvedBy.name}, {formatWhen(selected.resolvedAt)}</p>
                  </div>
                )}

                {isManager && (
                  <div className="flex gap-2 border-t pt-3">
                    <Button variant="outline" className="flex-1 h-12" onClick={() => setSelected(null)}>
                      Fechar
                    </Button>
                    {selected.status === "RESOLVED" ? (
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        disabled={resolving}
                        onClick={() => setStatus(selected.id, "UNDER_REVIEW")}
                      >
                        Reabrir
                      </Button>
                    ) : (
                      <Button className="flex-1 h-12" disabled={resolving} onClick={() => setStatus(selected.id, "RESOLVED")}>
                        Resolvido ✓
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteConfirmText(""); setDeleteError(null); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir ocorrência permanentemente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Excluir essa ocorrência permanentemente?
            Essa ação é <span className="font-medium text-foreground">irreversível</span>.
          </p>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Digite <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">confirmar exclusão</code> para prosseguir
            </p>
            <Input
              className="h-12"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="confirmar exclusão"
            />
          </div>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-12"
              disabled={deleteConfirmText.trim().toLowerCase() !== "confirmar exclusão" || deleteSaving}
              onClick={confirmDelete}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
