"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Plus, Copy, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { eventTimeRange, toDateInput, toTimeInput, fromDateTimeInputs } from "@/lib/event-time";
import { EventDetailDialog } from "@/components/events/event-detail-dialog";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  description: string | null;
  notes: string | null;
};

const emptyForm = { title: "", date: "", startTime: "", endTime: "", description: "", notes: "" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export function EventsClient({
  initialEvents,
  isManager,
}: {
  initialEvents: Event[];
  isManager: boolean;
}) {
  const [events, setEvents] = useState(() =>
    initialEvents.map((e) => ({ ...e, date: new Date(e.date).toISOString() }))
  );
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manualDetailId, setManualDetailId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Deep link support: /events?eventId=<id> opens that event's read-only detail dialog.
  const detailId = manualDetailId ?? searchParams.get("eventId");
  function closeDetail() {
    setManualDetailId(null);
    if (searchParams.get("eventId")) router.replace("/events");
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(event: Event) {
    setEditingId(event.id);
    setForm({
      title: event.title,
      date: toDateInput(event.date),
      startTime: toTimeInput(event.date),
      endTime: event.endDate ? toTimeInput(event.endDate) : "",
      description: event.description ?? "",
      notes: event.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      title: form.title,
      date: fromDateTimeInputs(form.date, form.startTime),
      endDate: form.endTime ? fromDateTimeInputs(form.date, form.endTime) : null,
      description: form.description,
      notes: form.notes,
    };
    if (editingId) {
      const res = await fetch(`/api/events/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === editingId ? updated : e)).sort((a, b) => a.date.localeCompare(b.date)));
    } else {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await res.json();
      setEvents((prev) => [...prev, saved].sort((a, b) => a.date.localeCompare(b.date)));
    }
    setSaving(false);
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function askDelete(id: string) {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    setOpen(false);
    setEditingId(null);
    setDeleteTarget(event);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/events/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  }

  async function copyWhatsApp(event: Event) {
    const lines = [
      `📅 *${event.title}*`,
      `${formatDate(event.date)} · ${eventTimeRange(event.date, event.endDate)}`,
      event.description ?? "",
    ].filter(Boolean);
    const ok = await copyText(lines.join("\n"));
    if (ok) {
      setJustCopiedId(event.id);
      setTimeout(() => setJustCopiedId(null), 1500);
      toast.success("Evento copiado");
    } else {
      toast.error("Não foi possível copiar. Tente selecionar e copiar manualmente.");
    }
  }

  return (
    <div className="space-y-3">
      {isManager && (
        <Button
          size="icon"
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
          aria-label="Novo evento"
          onClick={openCreate}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {events.map((e) => (
        <button
          key={e.id}
          onClick={() => setManualDetailId(e.id)}
          className="w-full text-left p-4 border rounded-lg bg-background space-y-2 hover:bg-muted/50 transition-all active:scale-[0.98]"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{e.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(e.date)} · {eventTimeRange(e.date, e.endDate)}</p>
              {e.description && <p className="text-xs mt-1">{e.description}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <span
                role="button"
                aria-label="Copiar"
                onClick={(ev) => { ev.stopPropagation(); copyWhatsApp(e); }}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-transform active:scale-90",
                  justCopiedId === e.id && "text-green-600"
                )}
              >
                {justCopiedId === e.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </span>
              {isManager && (
                <span
                  role="button"
                  aria-label="Editar"
                  onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                  className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-transform active:scale-90 text-muted-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </button>
      ))}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditingId(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar evento" : "Novo evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Título</p>
              <Input
                className="h-12"
                maxLength={50}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={!isManager}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Data</p>
              <Input
                type="date"
                className="h-12 text-center"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                disabled={!isManager}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Início</p>
                <Input
                  type="time"
                  className="h-12 text-center"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  disabled={!isManager}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Fim</p>
                <Input
                  type="time"
                  className="h-12 text-center"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  disabled={!isManager}
                />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Descrição</p>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={!isManager}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Informações complementares</p>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                disabled={!isManager}
              />
            </div>
            {isManager && (
              <div className="flex gap-2">
                <Button className="flex-1 h-12" disabled={!form.title || !form.date || !form.startTime || saving} onClick={save}>
                  Salvar
                </Button>
                {editingId && (
                  <Button variant="destructive" className="h-12 px-4" onClick={() => askDelete(editingId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir evento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground wrap-anywhere">
            {deleteTarget && (
              <>
                <span className="font-medium text-foreground">{deleteTarget.title}</span> será excluído. Essa ação
                é irreversível.
              </>
            )}
          </p>
          <Button variant="destructive" className="w-full h-12" disabled={deleting} onClick={confirmDelete}>
            Confirmar
          </Button>
        </DialogContent>
      </Dialog>
      <EventDetailDialog eventId={detailId} onOpenChange={(o) => !o && closeDetail()} />
    </div>
  );
}
