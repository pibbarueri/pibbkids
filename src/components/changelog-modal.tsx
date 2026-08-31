"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ChangelogEntry } from "@/lib/changelog";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

export function ChangelogModal({ entries }: { entries: ChangelogEntry[] }) {
  const [open, setOpen] = useState(entries.length > 0);
  const [saving, setSaving] = useState(false);

  async function dismiss() {
    setSaving(true);
    await fetch("/api/changelog/seen", { method: "POST" });
    setSaving(false);
    setOpen(false);
  }

  if (entries.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novidades</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Essas são as novidades que surgiram desde a última vez que você acessou o app!
          </p>
          {entries.map((entry) => (
            <div key={entry.version} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {entry.version} · {formatDate(entry.date)}
              </p>
              <ul className="space-y-2">
                {entry.items.map((item, i) => (
                  <li key={i} className="text-sm wrap-anywhere">
                    {item.text}
                    {item.description && (
                      <p className="text-xs text-muted-foreground wrap-anywhere">{item.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Button className="w-full h-12" disabled={saving} onClick={dismiss}>
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
