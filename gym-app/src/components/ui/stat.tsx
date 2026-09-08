import { cn } from "@/lib/utils";

/** Kafelek liczby: duża wartość, mały podpis - czytelne rzutem oka. */
export function Stat({
  label,
  value,
  hint,
  className,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-3", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold leading-none tabular", accent && "text-accent-strong dark:text-accent")}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
