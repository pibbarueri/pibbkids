"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Filter state lives in the parent (same tree as the table), so it updates the report live
 * whether this sheet is open or closed — the sheet is just where the controls are hidden
 * until asked for.
 */
export function ReportFilterSheet({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Sheet>
      <div className="no-print flex justify-end">
        <SheetTrigger
          render={
            <Button variant="outline" size="icon" className={cn("shrink-0", className)} aria-label="Filtros">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          }
        />
      </div>
      <SheetContent side="bottom" className="no-print max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="p-4 pt-0 space-y-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
