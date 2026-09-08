import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-surface px-3 text-base text-foreground",
        "placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-20 w-full rounded-xl border border-border bg-surface px-3 py-2 text-base",
        "placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-accent",
        className,
      )}
      {...props}
    />
  );
}
