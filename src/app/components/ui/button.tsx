import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        // Terminal Learning — GitHub-dark theme variants (THI-85)
        emerald:
          "bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold hover:scale-[1.02] active:scale-[0.98]",
        "ghost-gh":
          "border border-[#30363d] hover:border-emerald-500/40 text-[#8b949e] hover:text-emerald-400 font-medium focus-visible:border-[#30363d] focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0",
        // Terminal Learning — Landing nav + footer variants (THI-92)
        "emerald-nav":
          "bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-medium transition-colors",
        "ghost-gh-neutral":
          "border border-[#30363d] hover:border-[#8b949e]/40 text-[#8b949e] hover:text-[#e6edf3] font-medium",
        "nav-link":
          "text-[#8b949e] hover:text-[#e6edf3] transition-colors focus-visible:border-transparent focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0",
        floating:
          "bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-emerald-400 hover:border-emerald-500/40 transition-colors shadow-lg",
        // Terminal Learning — translucent emerald CTA (LessonPage nav, THI-99)
        "emerald-soft":
          "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors focus-visible:border-emerald-500/20 focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0",
        // Terminal Learning — list row (Dashboard recent lessons, THI-95)
        "tl-ghost":
          "w-full justify-start text-left whitespace-normal text-[#e6edf3] hover:bg-[#21262d] transition-colors focus-visible:ring-inset",
        // Terminal Learning — icon-only ghost action (close X, modal dismiss)
        "tl-icon-ghost":
          "rounded text-[#8b949e] hover:text-[#e6edf3] transition-colors",
        // Terminal Learning — tab segmented control (PWAInstallModal tabs)
        "tl-tab":
          "font-mono transition-colors text-[#8b949e] hover:text-[#e6edf3] rounded-none",
        "tl-tab-active":
          "font-mono transition-colors text-emerald-400 border-b-2 border-emerald-400 -mb-px rounded-none",
        // Terminal Learning — CommandReference filter pill
        "tl-filter-pill":
          "border transition-colors text-[#8b949e] border-[#30363d] hover:border-[#8b949e] hover:text-[#e6edf3]",
        "tl-filter-pill-active":
          "border transition-colors bg-[#e6edf3] text-[#0d1117] border-[#e6edf3] hover:bg-[#e6edf3]",
        // Terminal Learning — Sidebar icon 44px with emerald ring (close, install, NavLink icons)
        "tl-sidebar-icon":
          "text-[#8b949e] hover:text-[#e6edf3] focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0 transition-colors",
        // Terminal Learning — Sidebar module row (w-full, left-align)
        "tl-sidebar-row":
          "w-full justify-start text-left gap-2.5 transition-colors focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0 text-[#c9d1d9] hover:bg-[#161b22]",
        // Terminal Learning — Locked sidebar row (no hover bg, greyed)
        "tl-sidebar-row-locked":
          "w-full justify-start text-left gap-2.5 transition-colors focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0 text-[#8b949e] cursor-not-allowed",
        // Terminal Learning — Sidebar lesson subitem
        "tl-sidebar-lesson":
          "w-full justify-start text-left gap-2 transition-colors focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22] group",
        // Terminal Learning — Env switcher pill base (active state via className override)
        "tl-env-pill":
          "transition-all focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0 font-mono text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22] border border-transparent",
        // Terminal Learning — Menu FAB (mobile nav trigger)
        "tl-menu-fab":
          "bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] focus-visible:ring-emerald-500/60 focus-visible:ring-2 focus-visible:ring-offset-0 transition-colors",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md",
        // Terminal Learning — CTA pill matching legacy px-6 py-2.5 rounded-xl
        "cta-pill": "h-auto rounded-xl px-6 py-2.5 text-sm",
        // Terminal Learning — Landing sizes (THI-92)
        "nav-pill": "h-auto rounded-lg px-3 sm:px-4 py-1.5 text-xs sm:text-sm whitespace-nowrap",
        "cta-hero": "h-auto rounded-xl px-8 py-3.5 text-base",
        "icon-round": "size-auto rounded-full p-3",
        "link-inline": "h-auto p-0",
        "footer-link": "h-auto min-h-11 px-2",
        // Terminal Learning — Dashboard list row (THI-95)
        "tl-list-row": "h-auto min-h-11 px-4 py-3 rounded-none",
        // Terminal Learning — Small icon button (modal close X, p-1)
        "tl-icon-sm": "size-auto p-1",
        // Terminal Learning — CTA pill small (rounded-lg, py-2) — "Fermer" in installed modal
        "cta-pill-sm": "h-auto rounded-lg px-6 py-2 text-sm",
        // Terminal Learning — Install CTA (full-width, rounded-lg, py-2.5)
        "tl-install-cta": "h-auto w-full py-2.5 text-sm rounded-lg gap-2",
        // Terminal Learning — Tab in modal (flex-1, py-2.5, no rounded)
        "tl-tab-size": "h-auto flex-1 py-2.5 text-xs",
        // Terminal Learning — CommandReference filter pill
        "tl-filter-pill-size": "h-auto min-h-11 px-3 py-1.5 text-xs rounded-full",
        // Terminal Learning — 44x44 icon button (sidebar close, install, menu FAB)
        "tl-icon-44": "size-11 rounded-lg",
        // Terminal Learning — 44x44 icon button (rounded-md variant for install button in UserMenu)
        "tl-icon-44-md": "size-11 rounded-md",
        // Terminal Learning — Sidebar module row
        "tl-sidebar-row": "h-auto min-h-11 px-3 py-2 text-sm rounded-lg",
        // Terminal Learning — Sidebar lesson subitem
        "tl-sidebar-lesson": "h-auto min-h-10 px-2 py-1.5 text-xs rounded-md",
        // Terminal Learning — Env switcher pill
        "tl-env-pill": "h-auto flex-1 min-h-9 py-1.5 px-1 text-[10px] gap-1 rounded-md",
        // Terminal Learning — LessonPage inline nav (back, reset, mobile toggle, hint, prev)
        "tl-nav-inline": "h-auto min-h-11 rounded px-2 text-sm font-normal gap-1.5",
        // Terminal Learning — LessonPage hint toggle (xs, tighter gap)
        "tl-nav-inline-xs": "h-auto min-h-11 rounded px-2 text-xs font-normal gap-1",
        // Terminal Learning — LessonPage next/finish CTA (emerald-soft)
        "tl-nav-cta": "h-auto min-h-11 rounded-lg px-3 py-2 text-sm font-normal gap-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
