import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

// Free-text fields get a default cap so a stray paste can't blow out a column or a layout.
// `url` and `email` are deliberately exempt: real values routinely run past 70 (a Drive
// folder URL is ~84 chars), and silently truncating one yields a broken link rather than a
// tidy input. Fields that want a tighter limit pass `maxLength` explicitly.
const CAPPED_TYPES = ["text", "tel", "password", "search"]
const DEFAULT_MAX_LENGTH = 70

function Input({ className, type, maxLength, ...props }: React.ComponentProps<"input">) {
  const isCapped = type === undefined || CAPPED_TYPES.includes(type)
  return (
    <InputPrimitive
      type={type}
      maxLength={maxLength ?? (isCapped ? DEFAULT_MAX_LENGTH : undefined)}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
