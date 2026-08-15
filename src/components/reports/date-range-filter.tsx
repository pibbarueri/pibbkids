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
    <div className="no-print space-y-1.5">
      <p className="text-sm font-medium">Período</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground shrink-0">De</span>
        <Input
          type="date"
          value={min ?? ""}
          onChange={(e) => onChange({ min: e.target.value || null, max })}
          className="w-[150px]"
          aria-label="Data mínima"
        />
        <span className="text-xs text-muted-foreground shrink-0">até</span>
        <Input
          type="date"
          value={max ?? ""}
          onChange={(e) => onChange({ min, max: e.target.value || null })}
          className="w-[150px]"
          aria-label="Data máxima"
        />
      </div>
    </div>
  );
}
