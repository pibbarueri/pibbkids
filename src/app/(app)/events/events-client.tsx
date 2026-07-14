"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Copy, Trash2 } from "lucide-react";

type ClassGroup = { id: string; name: string };
type EventClass = { classGroupId: string; classGroup: ClassGroup };
type Event = {
  id: string;
  title: string;
  date: string;
  description: string | null;
  classes: EventClass[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function EventsClient({
  initialEvents,
  classes,
  isManager,
}: {
  initialEvents: Event[];
  classes: ClassGroup[];
  isManager: boolean;
}) {
  const [events, setEvents] = useState(() =>
    initialEvents.map((e) => ({ ...e, date: new Date(e.date).toISOString() }))
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", description: "", classGroupIds: [] as string[] });
  const [saving, setSaving] = useState(false);

  function toggleClass(id: string) {
    setForm((f) => ({
      ...f,
      classGroupIds: f.classGroupIds.includes(id)
        ? f.classGroupIds.filter((c) => c !== id)
        : [...f.classGroupIds, id],
    }));
  }

  async function create() {
    setSaving(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const saved = await res.json();
    setEvents((prev) => [...prev, saved].sort((a, b) => a.date.localeCompare(b.date)));
    setSaving(false);
    setOpen(false);
    setForm({ title: "", date: "", description: "", classGroupIds: [] });
  }

  async function remove(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function copyWhatsApp(event: Event) {
    const lines = [
      `📅 *${event.title}*`,
      formatDate(event.date),
      event.classes.length > 0 ? `Turmas: ${event.classes.map((c) => c.classGroup.name).join(", ")}` : "",
      event.description ?? "",
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="space-y-3">
      {isManager && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={buttonVariants({ className: "w-full h-12" })}>
            <Plus className="h-4 w-4 mr-2" /> Novo evento
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Título</p>
                <Input
                  className="h-12"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Data</p>
                <Input
                  type="date"
                  className="h-12"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Descrição</p>
                <Input
                  className="h-12"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Turmas envolvidas</p>
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 p-2">
                    <Checkbox
                      checked={form.classGroupIds.includes(c.id)}
                      onCheckedChange={() => toggleClass(c.id)}
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
              <Button className="w-full h-12" disabled={!form.title || !form.date || saving} onClick={create}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {events.map((e) => (
        <div key={e.id} className="p-4 border rounded-lg bg-background space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{e.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
              {e.classes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {e.classes.map((c) => (
                    <Badge key={c.classGroupId} variant="outline">{c.classGroup.name}</Badge>
                  ))}
                </div>
              )}
              {e.description && <p className="text-xs mt-1">{e.description}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => copyWhatsApp(e)}>
                <Copy className="h-4 w-4" />
              </Button>
              {isManager && (
                <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      {events.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento futuro.</p>
      )}
    </div>
  );
}
