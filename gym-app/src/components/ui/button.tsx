"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* Wysokość 44 px to minimum, w które trafia kciuk bez patrzenia. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:bg-accent-strong",
        secondary: "bg-surface-2 text-foreground hover:bg-border",
        outline: "border border-border bg-transparent hover:bg-surface-2",
        ghost: "hover:bg-surface-2",
        danger: "border border-danger/40 text-danger hover:bg-danger/10",
        success: "bg-success text-white hover:opacity-90",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-sm",
        lg: "h-14 px-6 text-base",
        icon: "h-11 w-11",
        iconSm: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
