"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Number field with -/+ buttons on each side, same round buttons used for quick stock
 * adjusts in Lanches/Materiais. The value can also be typed; it's clamped to [min, max]
 * on every change.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  "aria-label"?: string;
}) {
  function clamp(n: number) {
    if (Number.isNaN(n)) return min;
    const lower = Math.max(min, Math.trunc(n));
    return max === undefined ? lower : Math.min(max, lower);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-12 w-12 shrink-0 rounded-full"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
        aria-label="Diminuir"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        className="h-12 text-center tabular-nums"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        aria-label={ariaLabel}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-12 w-12 shrink-0 rounded-full"
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(clamp(value + 1))}
        aria-label="Aumentar"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
