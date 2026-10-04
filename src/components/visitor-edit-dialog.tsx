"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  VisitorForm,
  isVisitorFormValid,
  visitorFormFrom,
  visitorPayload,
  type VisitorFormValue,
} from "@/components/visitor-form";

type EditableVisitor = {
  id: string;
  name: string;
  birthdate: string | null;
  ageMonths: number | null;
  type: "EBD" | "CULTO";
};

/**
 * Edit/remove a visitor check-in. Who may open it (reception on the visitor's own Sunday,
 * leadership any day, never once promoted) is decided by the API's `canEdit`; the routes
 * enforce the same rule again.
 */
export function VisitorEditDialog({
  visitor,
  onClose,
  onChanged,
}: {
  visitor: EditableVisitor | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <Dialog open={!!visitor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {/* Keyed so opening another visitor starts from fresh form state. */}
        {visitor && <EditBody key={visitor.id} visitor={visitor} onClose={onClose} onChanged={onChanged} />}
      </DialogContent>
    </Dialog>
  );
}

function EditBody({
  visitor,
  onClose,
  onChanged,
}: {
  visitor: EditableVisitor;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [form, setForm] = useState<VisitorFormValue>(() => visitorFormFrom(visitor));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "PATCH" | "DELETE") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/visitors/${visitor.id}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "PATCH" ? JSON.stringify(visitorPayload(form, { includeSchedule: true })) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Não foi possível salvar.");
      return;
    }
    onChanged();
    onClose();
  }

  if (confirmingDelete) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Remover visitante?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground wrap-anywhere">
          <span className="font-medium text-foreground">{visitor.name}</span> será removido da lista de
          visitantes desse dia. Essa ação é irreversível.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button variant="destructive" className="w-full h-12" disabled={busy} onClick={() => send("DELETE")}>
          Confirmar
        </Button>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar visitante</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <VisitorForm value={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} withSchedule />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button className="flex-1 h-12" disabled={!isVisitorFormValid(form) || busy} onClick={() => send("PATCH")}>
            Salvar
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0 text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() => setConfirmingDelete(true)}
            aria-label="Remover visitante"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
