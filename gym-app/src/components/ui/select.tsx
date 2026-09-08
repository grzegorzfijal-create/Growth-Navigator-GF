"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Natywny <select> zamiast listy Radixa: na telefonie otwiera systemowy picker,
 * który jest szybszy i nie ucieka spod kciuka.
 */
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-border bg-surface px-3 pr-8 text-base text-foreground",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2380878f%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:1rem] bg-[right_0.6rem_center] bg-no-repeat",
        "focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-accent",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
