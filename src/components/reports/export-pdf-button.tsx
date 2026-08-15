"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Triggers the browser's print dialog rather than generating a PDF client-side — landscape
 * is forced via the `report-landscape` named @page in globals.css, applied to whatever
 * ancestor carries `.print-landscape`. "Save as PDF" in that dialog is the actual export;
 * this button just opens it. `.no-print` hides the button itself from the printout.
 */
export function ExportPdfButton({ className }: { className?: string }) {
  return (
    <Button
      size="icon"
      onClick={() => window.print()}
      aria-label="Exportar relatório"
      className={cn(
        "no-print fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 bg-orange-500 text-white hover:bg-orange-600",
        className
      )}
    >
      <Share2 className="h-6 w-6" />
    </Button>
  );
}
