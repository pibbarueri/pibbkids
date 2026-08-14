"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type Option = { value: string; label: string };

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione...",
  className,
}: {
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  }

  // Driven by `options` order, not `selected`, so the chips keep a stable order no matter
  // what sequence the user ticked them in.
  const selectedOptions = options.filter((o) => selected.includes(o.value));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex min-h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm",
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-1 min-w-0 text-left">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((o) => (
              <Badge variant="secondary" key={o.value}>
                {o.label}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-64 overflow-y-auto w-[var(--anchor-width)] min-w-56">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            closeOnClick={false}
            onClick={(e) => {
              e.preventDefault();
              toggle(o.value);
            }}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
