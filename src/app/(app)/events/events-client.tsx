"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Copy, Trash2, Pencil } from "lucide-react";
import { eventTimeRange, toDateInput, toTimeInput, fromDateTimeInputs } from "@/lib/event-time";

type Volunteer = { id: string; name: string; username: string | null };
type Event = {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  description: string | null;
  volunteers: { userId: string; user: { name: string; username: string | null } }[];
};

const emptyForm = { title: "", date: "", startTime: "", endTime: "", description: "", volunteerIds: [] as string[] };
const VOLUNTEERS_COLLAPSED_LIMIT = 5;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

function volunteerLabel(v: { name: string; username: string | null }) {
  return v.username ?? v.name;
}

export function EventsClient({
  initialEvents,
  volunteers,
  isManager,
}: {
  initialEvents: Event[];
  volunteers: Volunteer[];
  isManager: boolean;
}) {
  const [events, setEvents] = useState(() =>
    initialEvents.map((e) => ({ ...e, date: new Date(e.date).toISOString() }))
  );
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const searchParams = useSearchParams();

  // Deep link support: /events?eventId=<id> opens that event's detail dialog.
  useEffect(() => {
    const eventId = searchParams.get("eventId");
    if (!eventId) return;
    const ev = events.find((e) => e.id === eventId);
    if (ev) openDetail(ev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openDetail(event: Event) {
    setEditingId(event.id);
    setForm({
      title: event.title,
      date: toDateInput(event.date),
      startTime: toTimeInput(event.date),
      endTime: event.endDate ? toTimeInput(event.endDate) : "",
      description: event.description ?? "",
      volunteerIds: event.volunteers.map((v) => v.userId),
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
      volunteerIds: form.volunteerIds,
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

  async function remove(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setOpen(false);
  }

  function copyWhatsApp(event: Event) {
    const lines = [
      `📅 *${event.title}*`,
      `${formatDate(event.date)} · ${eventTimeRange(event.date, event.endDate)}`,
      event.description ?? "",
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n"));
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
          onClick={() => (isManager ? openDetail(e) : undefined)}
          className={cn(
            "w-full text-left p-4 border rounded-lg bg-background space-y-2",
            isManager && "hover:bg-muted/50 transition-colors"
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{e.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(e.date)} · {eventTimeRange(e.date, e.endDate)}</p>
              {e.description && <p className="text-xs mt-1">{e.description}</p>}
              {e.volunteers.length > 0 && (() => {
                const expanded = expandedIds.has(e.id);
                const shown = expanded ? e.volunteers : e.volunteers.slice(0, VOLUNTEERS_COLLAPSED_LIMIT);
                const hidden = e.volunteers.length - shown.length;
                return (
                  <p className="text-xs text-muted-foreground mt-1">
                    {shown.map((v) => volunteerLabel(v.user)).join(", ")}
                    {hidden > 0 && (
                      <span
                        role="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setExpandedIds((prev) => new Set(prev).add(e.id));
                        }}
                        className="ml-1 text-primary underline"
                      >
                        +{hidden} ver mais
                      </span>
                    )}
                    {expanded && e.volunteers.length > VOLUNTEERS_COLLAPSED_LIMIT && (
                      <span
                        role="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setExpandedIds((prev) => {
                            const next = new Set(prev);
                            next.delete(e.id);
                            return next;
                          });
                        }}
                        className="ml-1 text-primary underline"
                      >
                        ver menos
                      </span>
                    )}
                  </p>
                );
              })()}
            </div>
            <div className="flex gap-1 shrink-0">
              <span
                role="button"
                aria-label="Copiar"
                onClick={(ev) => { ev.stopPropagation(); copyWhatsApp(e); }}
                className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
              >
                <Copy className="h-4 w-4" />
              </span>
              {isManager && (
                <span
                  role="button"
                  aria-label="Editar"
                  onClick={(ev) => { ev.stopPropagation(); openDetail(e); }}
                  className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
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
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={!isManager}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Data</p>
              <Input
                type="date"
                className="h-12"
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
                  className="h-12"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  disabled={!isManager}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Fim</p>
                <Input
                  type="time"
                  className="h-12"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  disabled={!isManager}
                />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Descrição</p>
              <Input
                className="h-12"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={!isManager}
              />
            </div>
            {isManager && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Voluntários ({form.volunteerIds.length} selecionados)</p>
                <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                  {volunteers.map((v) => {
                    const checked = form.volunteerIds.includes(v.id);
                    return (
                      <label key={v.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) =>
                            setForm((f) => ({
                              ...f,
                              volunteerIds: next
                                ? [...f.volunteerIds, v.id]
                                : f.volunteerIds.filter((id) => id !== v.id),
                            }))
                          }
                        />
                        {volunteerLabel(v)}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {isManager && (
              <div className="flex gap-2">
                <Button className="flex-1 h-12" disabled={!form.title || !form.date || !form.startTime || saving} onClick={save}>
                  Salvar
                </Button>
                {editingId && (
                  <Button variant="destructive" className="h-12 px-4" onClick={() => remove(editingId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
