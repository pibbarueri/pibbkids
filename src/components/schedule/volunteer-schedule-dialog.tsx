"use client";

import { useEffect, useState } from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MonthGrid, monthRange } from "@/components/ui/month-grid";
import { dayKey } from "@/lib/dates";
import { slotPlaceLabel, timeSlotLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { BulkSwap } from "./bulk-swap";
import { SwapSlotDialog } from "./swap-slot-dialog";
import { futureRange, type Person, type VolunteerSlot } from "./types";

/** Calendar of one volunteer's slots, with single-slot swap and bulk redistribution. */
export function VolunteerScheduleDialog({
  volunteer,
  onClose,
}: {
  volunteer: Person | null;
  onClose: () => void;
}) {
  // Kept out of Body: the calendar closes while the swap dialog is open (only one modal on
  // screen), and reopening it should land on the same month.
  const [swapping, setSwapping] = useState<VolunteerSlot | null>(null);
  const [offset, setOffset] = useState(0);
  const [version, setVersion] = useState(0);

  return (
    <>
      <Dialog open={!!volunteer && !swapping} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          {volunteer && (
            <Body
              key={volunteer.id}
              volunteer={volunteer}
              offset={offset}
              onOffsetChange={setOffset}
              version={version}
              onRefresh={() => setVersion((v) => v + 1)}
              onSwap={setSwapping}
            />
          )}
        </DialogContent>
      </Dialog>
      {volunteer && (
        <SwapSlotDialog
          slot={swapping}
          volunteer={volunteer}
          onClose={() => setSwapping(null)}
          onDone={() => setVersion((v) => v + 1)}
        />
      )}
    </>
  );
}

function Body({
  volunteer,
  offset,
  onOffsetChange,
  version,
  onRefresh,
  onSwap,
}: {
  volunteer: Person;
  offset: number;
  onOffsetChange: (offset: number) => void;
  version: number;
  onRefresh: () => void;
  onSwap: (slot: VolunteerSlot) => void;
}) {
  const [view, setView] = useState<"calendar" | "bulk">("calendar");
  const [slots, setSlots] = useState<VolunteerSlot[]>([]);
  const [futureSlots, setFutureSlots] = useState<VolunteerSlot[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const todayKey = dayKey();

  useEffect(() => {
    const { from, to } = monthRange(offset);
    let cancelled = false;
    fetch(`/api/volunteers/${volunteer.id}/schedule?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data: VolunteerSlot[]) => {
        if (!cancelled) setSlots(data);
      });
    return () => {
      cancelled = true;
    };
  }, [volunteer.id, offset, version]);

  function openBulk() {
    const { from, to } = futureRange();
    fetch(`/api/volunteers/${volunteer.id}/schedule?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data: VolunteerSlot[]) => {
        setFutureSlots(data);
        setView("bulk");
      });
  }

  function refresh() {
    onRefresh();
    setSelectedKey(null);
  }

  const byDay = new Map<string, VolunteerSlot[]>();
  for (const s of slots) {
    const key = s.date.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  const selectedSlots = selectedKey ? byDay.get(selectedKey) ?? [] : [];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="wrap-anywhere">Escalas de {volunteer.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {view === "bulk" && futureSlots ? (
          <BulkSwap
            volunteer={volunteer}
            futureSlots={futureSlots}
            onCancel={() => setView("calendar")}
            onDone={() => {
              setView("calendar");
              refresh();
            }}
          />
        ) : (
          <>
            <Button variant="outline" className="w-full" onClick={openBulk}>
              Trocar escalas futuras
            </Button>

            <MonthGrid
              offset={offset}
              onOffsetChange={(o) => {
                onOffsetChange(o);
                setSelectedKey(null);
              }}
              renderDay={(date, key) => {
                const serves = byDay.has(key);
                return (
                  <button
                    type="button"
                    onClick={() => setSelectedKey(key === selectedKey ? null : key)}
                    className={cn(
                      "relative flex aspect-square w-full items-center justify-center rounded-md text-xs transition-transform active:scale-90",
                      key === todayKey && "border border-primary font-bold",
                      key === selectedKey ? "bg-primary text-primary-foreground" : serves && "bg-muted"
                    )}
                  >
                    {date.getUTCDate()}
                    {serves && (
                      <span
                        className={cn(
                          "absolute bottom-0.5 h-1 w-1 rounded-full",
                          key === selectedKey ? "bg-primary-foreground" : "bg-orange-500"
                        )}
                      />
                    )}
                  </button>
                );
              }}
            />

            {selectedKey && (
              <div className="space-y-1 border-t pt-3">
                {selectedSlots.length === 0 && <p className="text-xs text-muted-foreground">Não serve nesse dia.</p>}
                {selectedSlots.map((s) => {
                  const time = timeSlotLabel(s.timeSlot);
                  const future = s.date.slice(0, 10) >= todayKey;
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2 px-1">
                      <span className="text-sm wrap-anywhere">
                        {slotPlaceLabel(s)}
                        {time && <span className="text-muted-foreground"> · {time}</span>}
                      </span>
                      {future && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => onSwap(s)}
                          aria-label="Trocar escala"
                        >
                          <Repeat className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
