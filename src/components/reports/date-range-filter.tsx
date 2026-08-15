"use client";

import { Input } from "@/components/ui/input";

export function DateRangeFilter({
  min,
  max,
  onChange,
}: {
  min: string | null;
  max: string | null;
  onChange: (range: { min: string | null; max: string | null }) => void;
}) {
  return (
    <div className="no-print flex items-center gap-2">
      <Input
        type="date"
        value={min ?? ""}
        onChange={(e) => onChange({ min: e.target.value || null, max })}
        className="w-auto"
        aria-label="Data mínima"
      />
      <span className="text-xs text-muted-foreground shrink-0">até</span>
      <Input
        type="date"
        value={max ?? ""}
        onChange={(e) => onChange({ min, max: e.target.value || null })}
        className="w-auto"
        aria-label="Data máxima"
      />
    </div>
  );
}
