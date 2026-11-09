"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VisitorEditDialog } from "@/components/visitor-edit-dialog";
import { VisitorPromoteDialog } from "@/components/visitor-promote-dialog";
import { cn } from "@/lib/utils";

type Child = {
  id: string;
  name: string;
  birthdate: string | null;
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
type Candidate = { id: string; name: string; ageText: string; className: string | null; likely: boolean };

function formatDay(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
}

export function VisitorDetailClient({
  child,
  visits,
  isManager,
  candidates,
}: {
  child: Child;
  visits: Visit[];
  isManager: boolean;
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [promoting, setPromoting] = useState(false);
  const [merging, setMerging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeSaving, setMergeSaving] = useState(false);
  const [editing, setEditing] = useState<Visit | null>(null);

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
          <h1 className="text-xl font-bold wrap-anywhere">{child.name}</h1>
          <p className="text-sm text-muted-foreground">
            {child.ageText} · {child.className ?? "Sem turma"} · {visits.length} visita{visits.length === 1 ? "" : "s"}
            {child.promoted && " · efetivada"}
          </p>
        </div>
        {isManager && !child.promoted && (
          <div className="flex gap-2 shrink-0">
            <Button className="h-10" onClick={() => setPromoting(true)}>
              <UserCheck className="h-4 w-4" />
              Efetivar criança
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setMerging(true)} aria-label="Juntar com outro visitante">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {visits.map((v) => (
          <button
            key={v.id}
            type="button"
            disabled={!v.canEdit}
            onClick={() => setEditing(v)}
            className="p-3 rounded-lg border border-muted-foreground/30 bg-muted-foreground/15 text-left space-y-1.5 transition-transform enabled:active:scale-[0.98] disabled:cursor-default"
          >
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium text-white",
                v.type === "EBD" ? "bg-chart-5" : "bg-primary"
              )}
            >
              {v.type === "CULTO" ? "Culto" : "EBD"}
            </span>
            <p className="text-sm font-semibold">{formatDay(v.day)}</p>
          </button>
        ))}
      </div>

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

      <VisitorEditDialog visitor={editing} onClose={() => setEditing(null)} onChanged={() => router.refresh()} />
    </div>
  );
}
