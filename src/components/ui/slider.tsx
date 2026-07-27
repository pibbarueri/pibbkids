"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  value,
  ...props
}: SliderPrimitive.Root.Props<readonly number[]>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={value}
      thumbAlignment="edge"
      thumbCollisionBehavior="none"
      className={cn("relative flex w-full touch-none items-center py-2 select-none", className)}
      {...props}
    >
      <SliderPrimitive.Control className="flex w-full items-center py-1">
        <SliderPrimitive.Track
          className="relative h-1.5 w-full grow rounded-full bg-muted-foreground/30"
          onPointerDown={(e) => {
            if (!(e.target as HTMLElement).closest('[data-slot="slider-thumb"]')) {
              e.preventDefault()
            }
          }}
        >
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
          {(value ?? []).map((_, i) => (
            <SliderPrimitive.Thumb
              key={i}
              index={i}
              data-slot="slider-thumb"
              className="block size-4 rounded-full border-2 border-primary bg-background shadow-sm outline-none transition-transform active:scale-110 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
