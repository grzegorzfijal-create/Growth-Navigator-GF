import { cn, formatNumber } from "@/lib/utils";
import type { MacroSet } from "@/lib/nutrition";

type Targets = { calories: number; protein: number; carbs: number; fat: number } | null;

/** Pasek makro: ile zjedzone z ile zaplanowane. Przekroczenie widać kolorem. */
function MacroBar({
  label,
  value,
  target,
  unit,
  tone,
}: {
  label: string;
  value: number;
  target?: number | null;
  unit: string;
  tone: string;
}) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const over = target ? value > target * 1.05 : false;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular font-medium">
          {formatNumber(Math.round(value))}
          {target ? <span className="text-muted"> / {formatNumber(target)}</span> : null} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", over ? "bg-danger" : tone)}
          style={{ width: `${target ? pct : 0}%` }}
        />
      </div>
    </div>
  );
}

export function MacroSummary({ totals, targets }: { totals: MacroSet; targets: Targets }) {
  const remaining = targets ? Math.max(0, targets.calories - totals.calories) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="display text-4xl tabular">{formatNumber(Math.round(totals.calories))}</p>
          <p className="text-xs uppercase tracking-wide text-muted">
            {targets ? `z ${formatNumber(targets.calories)} kcal` : "kcal dzisiaj"}
          </p>
        </div>
        {remaining !== null ? (
          <p className="text-right text-sm text-muted">
            zostało
            <span className="ml-1 font-semibold text-foreground tabular">{formatNumber(remaining)} kcal</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5">
        <MacroBar label="Białko" value={totals.protein} target={targets?.protein} unit="g" tone="bg-accent" />
        <MacroBar label="Węglowodany" value={totals.carbs} target={targets?.carbs} unit="g" tone="bg-info" />
        <MacroBar label="Tłuszcze" value={totals.fat} target={targets?.fat} unit="g" tone="bg-warning" />
      </div>
    </div>
  );
}
