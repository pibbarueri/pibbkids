"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { slotKindKey, slotPlaceLabel, timeSlotLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { fetchCandidates, futureRange, postSwap, shortDate, type VolunteerSlot } from "./types";

type Mode = "replace" | "permute";

function slotText(s: VolunteerSlot) {
  const time = timeSlotLabel(s.timeSlot);
  return `${slotPlaceLabel(s)}${time ? ` · ${time}` : ""}`;
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-left text-sm transition-all active:scale-[0.98]",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-input"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Swap one slot. Substituir hands it to someone else; Permutar trades it for one of the other
 * volunteer's future slots in the same seat (same sala/cargo), so both stay eligible.
 */
export function SwapSlotDialog({
  slot,
  volunteerName,
  onClose,
  onDone,
}: {
  slot: VolunteerSlot | null;
  volunteerName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <Dialog open={!!slot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {slot && <Body key={slot.id} slot={slot} volunteerName={volunteerName} onClose={onClose} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  slot,
  volunteerName,
  onClose,
  onDone,
}: {
  slot: VolunteerSlot;
  volunteerName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<Mode>("replace");
  const [people, setPeople] = useState<{ id: string; name: string }[] | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [partnerSlots, setPartnerSlots] = useState<VolunteerSlot[] | null>(null);
  const [partnerSlotId, setPartnerSlotId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidates([slot.id]).then((c) => {
      const free = new Set(c.availability[slot.id] ?? []);
      setPeople(c.volunteers.filter((v) => free.has(v.id)));
    });
  }, [slot.id]);

  function pickPerson(id: string) {
    setPersonId(id);
    setPartnerSlotId(null);
    setPartnerSlots(null);
    if (mode !== "permute") return;
    const { from, to } = futureRange();
    fetch(`/api/volunteers/${id}/schedule?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((slots: VolunteerSlot[]) => setPartnerSlots(slots.filter((s) => slotKindKey(s) === slotKindKey(slot))));
  }

  function switchMode(next: Mode) {
    setMode(next);
    setPersonId(null);
    setPartnerSlots(null);
    setPartnerSlotId(null);
    setError(null);
  }

  const person = people?.find((p) => p.id === personId);
  const ready = mode === "replace" ? !!personId : !!partnerSlotId;

  async function confirm() {
    setBusy(true);
    setError(null);
    const result =
      mode === "replace"
        ? await postSwap({ mode: "replace", assignments: [{ slotId: slot.id, userId: personId }] })
        : await postSwap({ mode: "permute", slotIdA: slot.id, slotIdB: partnerSlotId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
    onClose();
  }

  const partnerSlot = partnerSlots?.find((s) => s.id === partnerSlotId);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Trocar escala</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground wrap-anywhere">
          {volunteerName} · {shortDate(slot.date)} · {slotText(slot)}
        </p>

        <div className="grid grid-cols-2 gap-2">
          {(["replace", "permute"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                "h-10 rounded-lg border text-sm font-medium transition-all active:scale-95",
                mode === m ? "border-primary bg-primary text-primary-foreground" : "border-input"
              )}
            >
              {m === "replace" ? "Substituir" : "Permutar"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{mode === "replace" ? "Quem assume" : "Trocar com"}</p>
          {people === null && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {people?.length === 0 && (
            <p className="text-sm text-muted-foreground">Ninguém disponível pra esse lugar nesse horário.</p>
          )}
          {people?.map((p) => (
            <Choice key={p.id} selected={p.id === personId} onClick={() => pickPerson(p.id)}>
              {p.name}
            </Choice>
          ))}
        </div>

        {mode === "permute" && personId && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Escala de {person?.name} que {volunteerName} assume</p>
            {partnerSlots === null && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {partnerSlots?.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma escala futura nesse mesmo lugar.</p>
            )}
            {partnerSlots?.map((s) => (
              <Choice key={s.id} selected={s.id === partnerSlotId} onClick={() => setPartnerSlotId(s.id)}>
                {shortDate(s.date)} · {slotText(s)}
              </Choice>
            ))}
          </div>
        )}

        {ready && (
          <p className="text-sm rounded-lg bg-muted/50 px-3 py-2 wrap-anywhere">
            {mode === "replace"
              ? `${person?.name} serve em ${shortDate(slot.date)} no lugar de ${volunteerName}.`
              : `${person?.name} serve em ${shortDate(slot.date)} e ${volunteerName} serve em ${partnerSlot && shortDate(partnerSlot.date)}.`}
          </p>
        )}

        {error && <p className="text-sm text-destructive whitespace-pre-line">{error}</p>}
        <Button className="w-full h-12" disabled={!ready || busy} onClick={confirm}>
          Confirmar
        </Button>
      </div>
    </>
  );
}
