"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { eventTimeRange } from "@/lib/event-time";

type EventDetail = {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  description: string | null;
  volunteers: { userId: string; user: { name: string; username: string | null } }[];
};

const COLLAPSED_LIMIT = 5;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

function volunteerLabel(v: { name: string; username: string | null }) {
  return v.username ?? v.name;
}

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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setEvent(data);
        setExpanded(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const shown = event ? (expanded ? event.volunteers : event.volunteers.slice(0, COLLAPSED_LIMIT)) : [];
  const hidden = event ? event.volunteers.length - shown.length : 0;

  return (
    <Dialog open={!!eventId} onOpenChange={onOpenChange}>
      <DialogContent>
        {event && (
          <>
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <Row label="Data" value={formatDate(event.date)} />
              <Row label="Horário" value={eventTimeRange(event.date, event.endDate)} />
              <Row label="Descrição" value={event.description} />
              {event.volunteers.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs">Voluntários</p>
                  <p>
                    {shown.map((v) => volunteerLabel(v.user)).join(", ")}
                    {hidden > 0 && (
                      <span
                        role="button"
                        onClick={() => setExpanded(true)}
                        className="ml-1 text-primary underline"
                      >
                        +{hidden} ver mais
                      </span>
                    )}
                    {expanded && event.volunteers.length > COLLAPSED_LIMIT && (
                      <span
                        role="button"
                        onClick={() => setExpanded(false)}
                        className="ml-1 text-primary underline"
                      >
                        ver menos
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
