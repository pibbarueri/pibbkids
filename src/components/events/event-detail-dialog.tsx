"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { eventDateTimeLabel } from "@/lib/event-time";

type EventDetail = {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  description: string | null;
  notes: string | null;
};

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value}</p>
    </div>
  );
}

// Read-only event detail, shared by the dashboard (Próxima escala + calendário) and
// the Eventos list — one source of truth so "Ver detalhes" never opens an edit form.
export function EventDetailDialog({
  eventId,
  onOpenChange,
}: {
  eventId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [event, setEvent] = useState<EventDetail | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setEvent(data);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return (
    <Dialog open={!!eventId} onOpenChange={onOpenChange}>
      <DialogContent>
        {event && (
          <>
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <Row label="Data e horário" value={eventDateTimeLabel(event.date, event.endDate)} />
              <Row label="Descrição" value={event.description} />
              <Row label="Informações complementares" value={event.notes} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
