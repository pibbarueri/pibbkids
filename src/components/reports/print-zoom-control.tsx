"use client";

import { Slider } from "@/components/ui/slider";

export const DEFAULT_PRINT_ZOOM = 45;

/**
 * `zoom` is a non-standard CSS property but supported in Chrome/Edge/Safari ≥15.4 — the
 * only browsers relevant here. Unlike `transform: scale`, it participates in normal layout
 * flow (no manual width/height compensation) and is honored both on screen and when
 * printing, so the same value the user tunes on screen is what lands in the PDF.
 */
export function PrintZoomControl({
  zoom,
  onChange,
}: {
  zoom: number;
  onChange: (zoom: number) => void;
}) {
  return (
    <div className="no-print fixed bottom-20 left-4 right-24 rounded-lg border bg-background p-3 shadow-lg z-40 flex items-center gap-3">
      <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
      <Slider
        value={[zoom]}
        min={30}
        max={100}
        step={5}
        onValueChange={(v) => onChange(v[0])}
        className="flex-1"
      />
      <span className="text-xs font-medium w-10 text-right shrink-0">{zoom}%</span>
    </div>
  );
}
