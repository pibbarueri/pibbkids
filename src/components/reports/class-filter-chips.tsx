"use client";

import { cn } from "@/lib/utils";

type ClassGroup = { id: string; name: string };

/**
 * `selected: null` means "all classes" — the default, no-filter state. Extracted from the
 * chip pattern in reports/attendance/attendance-report-client.tsx's day-detail dialog.
 */
export function ClassFilterChips({
  classes,
  selected,
  onChange,
}: {
  classes: ClassGroup[];
  selected: Set<string> | null;
  onChange: (selected: Set<string> | null) => void;
}) {
  function toggle(id: string) {
    if (selected === null) {
      onChange(new Set([id]));
      return;
    }
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next.size === classes.length ? null : next);
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "h-8 rounded-full border px-3 text-xs font-medium transition-all active:scale-95",
          selected === null ? "border-primary bg-primary text-primary-foreground" : "border-input"
        )}
      >
        Todas
      </button>
      {classes.map((cls) => {
        const isSelected = selected === null || selected.has(cls.id);
        return (
          <button
            key={cls.id}
            onClick={() => toggle(cls.id)}
            className={cn(
              "h-8 rounded-full border px-3 text-xs font-medium transition-all active:scale-95",
              isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input"
            )}
          >
            {cls.name}
          </button>
        );
      })}
    </div>
  );
}
