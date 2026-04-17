"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const progressRootVariants = cva(
  "relative w-full overflow-hidden rounded-full",
  {
    variants: {
      variant: {
        default: "bg-primary/20 h-2",
        // Terminal Learning — GitHub-dark track (THI-95)
        tl: "bg-[#21262d] h-2",
        // Terminal Learning — micro progress bar per module card (THI-95)
        "tl-thin": "bg-black/30 h-1",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-500",
  {
    variants: {
      variant: {
        default: "bg-primary",
        // Terminal Learning — gradient emerald indicator (THI-95)
        tl: "bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full",
        // Terminal Learning — colour injected via --tl-progress-color CSS var (THI-95)
        "tl-thin":
          "rounded-full bg-[var(--tl-progress-color,theme(colors.emerald.500))]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Progress({
  className,
  value,
  variant,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> &
  VariantProps<typeof progressRootVariants>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(progressRootVariants({ variant, className }))}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(progressIndicatorVariants({ variant }))}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress, progressRootVariants };
