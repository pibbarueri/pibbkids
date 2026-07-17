"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

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

  const labels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm",
          className
        )}
      >
        <span className={cn("truncate text-left", labels.length === 0 && "text-muted-foreground")}>
          {labels.length > 0 ? labels.join(", ") : placeholder}
        </span>
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
