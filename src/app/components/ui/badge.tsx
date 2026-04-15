import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // Terminal Learning — colored pill variants (THI-85)
        "pill-emerald":
          "rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1.5 px-3 py-1.5",
        "pill-blue":
          "rounded-full border-blue-500/30 bg-blue-500/10 text-blue-400 gap-1.5 px-3 py-1.5",
        "pill-amber":
          "rounded-full border-amber-500/30 bg-amber-500/10 text-amber-400 gap-1.5 px-3 py-1.5",
        "pill-purple":
          "rounded-full border-purple-500/30 bg-purple-500/10 text-purple-400 gap-1.5 px-3 py-1.5",
        "pill-muted":
          "rounded-full border-[#30363d] text-[#8b949e] gap-1.5 px-3 py-1.5 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
