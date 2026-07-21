"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Copy, Trash2 } from "lucide-react";

type Event = {
  id: string;
  title: string;
  date: string;
  description: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
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
  const [form, setForm] = useState({ title: "", date: "", description: "" });
  const [saving, setSaving] = useState(false);

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
    setForm({ title: "", date: "", description: "" });
  }

  async function remove(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function copyWhatsApp(event: Event) {
    const lines = [
      `📅 *${event.title}*`,
      formatDate(event.date),
      event.description ?? "",
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="space-y-3">
      {isManager && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            className={cn(buttonVariants({ size: "icon" }), "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40")}
            aria-label="Novo evento"
          >
            <Plus className="h-6 w-6" />
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
    </div>
  );
}
