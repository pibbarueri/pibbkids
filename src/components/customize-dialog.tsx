"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DESTINATIONS, MAX_NAV_ITEMS, DASHBOARD_COLUMN_OPTIONS } from "@/lib/navigation";

const ICONS = new Map(DESTINATIONS.map((d) => [d.id, d.icon] as const));

export type CustomizeOption = { id: string; label: string };

export function CustomizeDialog({
  open,
  onOpenChange,
  options,
  initialNavIds,
  initialColumns,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every destination the user's role allows, in canonical display order. */
  options: CustomizeOption[];
  initialNavIds: string[];
  initialColumns: number;
}) {
  const router = useRouter();
  const labels = new Map(options.map((o) => [o.id, o.label]));
  // Order of this array IS the order shown in the bottom nav.
  const [navIds, setNavIds] = useState<string[]>(initialNavIds);
  const [columns, setColumns] = useState(initialColumns);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atLimit = navIds.length >= MAX_NAV_ITEMS;
  // Leftovers keep the canonical order, so removing an item puts it back in place.
  const restIds = options.map((o) => o.id).filter((id) => !navIds.includes(id));

  function add(id: string) {
    setError(null);
    setNavIds((prev) => (prev.length < MAX_NAV_ITEMS ? [...prev, id] : prev));
  }

  function remove(id: string) {
    setError(null);
    setNavIds((prev) => prev.filter((x) => x !== id));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nav_items: navIds,
        dashboard_items: restIds,
        dashboard_columns: columns,
      }),
    });
    if (res.ok) {
      onOpenChange(false);
      router.refresh();
    } else {
      const body = await res.json();
      setError(body.error ?? "Erro ao salvar.");
    }
    setSaving(false);
  }

  function Chip({
    id,
    onClick,
    disabled,
    selected,
  }: {
    id: string;
    onClick?: () => void;
    disabled?: boolean;
    selected?: boolean;
  }) {
    const Icon = ICONS.get(id);
    return (
      <button
        type="button"
        data-chip-id={id}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all",
          selected
            ? "border-primary bg-primary text-primary-foreground active:scale-95"
            : "border-input bg-transparent",
          disabled ? "opacity-40" : "active:scale-95"
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {labels.get(id)}
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">Barra inferior</p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {navIds.length + 1} de {MAX_NAV_ITEMS + 1}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Toque em um item abaixo para adicioná-lo ao fim da barra. Toque em um item da barra
              para removê-lo.
            </p>

            <div className="flex flex-wrap gap-2 rounded-lg border border-dashed bg-muted/30 p-3">
              <span className="flex items-center gap-2 rounded-full border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground opacity-60">
                Início
                <span className="text-xs">fixo</span>
              </span>
              {navIds.map((id) => (
                <Chip key={id} id={id} selected onClick={() => remove(id)} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">Tela inicial</p>
              {atLimit && (
                <span className="shrink-0 text-xs text-muted-foreground">barra cheia</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {restIds.length > 0
                ? "Estes atalhos aparecem na tela inicial."
                : "Nenhum atalho sobrou para a tela inicial."}
            </p>
            {restIds.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-lg border p-3">
                {restIds.map((id) => (
                  <Chip key={id} id={id} disabled={atLimit} onClick={() => add(id)} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">Número de colunas na tela inicial</p>
            <p className="text-xs text-muted-foreground">
              Defina o número máximo de itens a ser exibido lado a lado na tela inicial.
            </p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {DASHBOARD_COLUMN_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={columns === c}
                  onClick={() => setColumns(c)}
                  className={cn(
                    "h-12 rounded-lg border text-sm font-medium transition-all active:scale-95",
                    columns === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-transparent"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full h-12" disabled={saving} onClick={save}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
