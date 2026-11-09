"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Pencil, RefreshCw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  VisitorForm,
  isVisitorFormValid,
  visitorFormFrom,
  visitorPayload,
  type VisitorFormValue,
} from "@/components/visitor-form";
import { VisitorPromoteDialog } from "@/components/visitor-promote-dialog";
import { cn } from "@/lib/utils";

type Child = {
  id: string;
  name: string;
  birthdate: string | null;
  ageMonths: number | null;
  ageText: string;
  classGroupId: string | null;
  className: string | null;
  promoted: boolean;
};
type Visit = {
  id: string;
  name: string;
  birthdate: string | null;
  ageMonths: number | null;
  type: "EBD" | "CULTO";
  day: string;
  canEdit: boolean;
};
type LinkCandidate = { id: string; name: string; className: string | null };
type Candidate = { id: string; name: string; ageText: string; className: string | null; likely: boolean };

function formatDay(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
}

export function VisitorDetailClient({
  child,
  visits,
  isManager,
  candidates,
  linkCandidates,
}: {
  child: Child;
  visits: Visit[];
  isManager: boolean;
  candidates: Candidate[];
  linkCandidates: LinkCandidate[];
}) {
  const router = useRouter();
  const [promoting, setPromoting] = useState(false);
  const [merging, setMerging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeSaving, setMergeSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<VisitorFormValue | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  function openEdit() {
    setForm(visitorFormFrom({ name: child.name, birthdate: child.birthdate, ageMonths: child.ageMonths, type: visits[visits.length - 1].type }));
    setEditing(true);
  }

  async function saveEdit() {
    if (!form || !isVisitorFormValid(form)) return;
    setEditSaving(true);
    const res = await fetch(`/api/visitors/${child.id}/person`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visitorPayload(form, { includeSchedule: false })),
    });
    setEditSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  async function link(childId: string) {
    setLinkSaving(true);
    const res = await fetch(`/api/visitors/${child.id}/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId }),
    });
    setLinkSaving(false);
    if (res.ok) {
      setLinking(false);
      router.refresh();
    }
  }

  async function merge() {
    setMergeSaving(true);
    const res = await fetch("/api/visitors/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: child.id, otherVisitorIds: [...selected] }),
    });
    setMergeSaving(false);
    if (res.ok) {
      setMerging(false);
      setSelected(new Set());
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="text-xl font-bold wrap-anywhere">{child.name}</h1>
            {isManager && !child.promoted && (
              <button
                type="button"
                onClick={openEdit}
                aria-label="Editar visitante"
                className="h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-transform active:scale-90"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {child.ageText} · {child.className ?? "Sem turma"} · {visits.length} visita{visits.length === 1 ? "" : "s"}
            {child.promoted && " · efetivada"}
          </p>
        </div>
        {isManager && !child.promoted && (
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setMerging(true)} aria-label="Juntar com outro visitante">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {visits.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between gap-2 p-3 rounded-lg border border-muted-foreground/30 bg-muted-foreground/15"
          >
            <p className="text-sm font-semibold">{formatDay(v.day)}</p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white",
                v.type === "EBD" ? "bg-chart-5" : "bg-primary"
              )}
            >
              {v.type === "CULTO" ? "Culto" : "EBD"}
            </span>
          </div>
        ))}
      </div>

      {isManager && !child.promoted && (
        <Button className="w-full h-12" onClick={() => setPromoting(true)}>
          <UserCheck className="h-4 w-4" />
          Efetivar criança
        </Button>
      )}
      {isManager && !child.promoted && linkCandidates.length > 0 && (
        <Button variant="outline" className="w-full h-12" onClick={() => setLinking(true)}>
          <Link2 className="h-4 w-4" />
          Já cadastrada? Vincular
        </Button>
      )}

      <Dialog open={linking} onOpenChange={setLinking}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vincular a criança cadastrada</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Crianças cadastradas com nome parecido. Ao vincular, todas as visitas de {child.name} passam a contar como efetivadas.
          </p>
          <div className="space-y-2">
            {linkCandidates.map((c) => (
              <div key={c.id} className="flex items-center gap-2 p-3 border rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium wrap-anywhere">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.className ?? "Sem turma"}</p>
                </div>
                <Button size="sm" disabled={linkSaving} onClick={() => link(c.id)}>
                  Vincular
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {promoting && (
        <VisitorPromoteDialog
          open
          onOpenChange={setPromoting}
          visitor={{ id: child.id, name: child.name, birthdate: child.birthdate, classGroupId: child.classGroupId }}
        />
      )}

      <Dialog open={merging} onOpenChange={setMerging}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Juntar com {child.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Marque os visitantes que são a mesma criança. Todas as visitas passam a ter o nome mais completo.
          </p>
          <div className="space-y-2">
            {candidates.map((c) => (
              <label key={c.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                <Checkbox
                  checked={selected.has(c.id)}
                  onCheckedChange={(checked) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(c.id);
                      else next.delete(c.id);
                      return next;
                    })
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium wrap-anywhere">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.ageText} · {c.className ?? "Sem turma"}
                    {c.likely && " · nome parecido"}
                  </p>
                </div>
              </label>
            ))}
            {candidates.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum outro visitante.</p>}
          </div>
          <Button className="w-full h-12" disabled={selected.size === 0 || mergeSaving} onClick={merge}>
            Juntar {selected.size > 0 && `(${selected.size})`}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar visitante</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Vale para todas as visitas desta criança.</p>
          {form && (
            <div className="space-y-3">
              <VisitorForm value={form} onChange={(patch) => setForm((f) => (f ? { ...f, ...patch } : f))} />
              <Button className="w-full h-12" disabled={!isVisitorFormValid(form) || editSaving} onClick={saveEdit}>
                Salvar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
