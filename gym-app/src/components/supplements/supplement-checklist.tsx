"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { toggleSupplementLog } from "@/server/actions/supplements";

export const TIMING_LABELS: Record<string, string> = {
  MORNING: "Rano",
  PRE_WORKOUT: "Przed treningiem",
  POST_WORKOUT: "Po treningu",
  EVENING: "Wieczorem",
};

export type SupplementRow = {
  id: string;
  name: string;
  dose: number | null;
  unit: string;
  timing: string[];
  note: string | null;
  takenTimings: string[];
};

/**
 * Odhaczanie suplementów: jedno dotknięcie na porę dnia, stan zmienia się
 * natychmiast (optimistic), zapis leci w tle.
 */
export function SupplementChecklist({ supplements, date }: { supplements: SupplementRow[]; date: string }) {
  const [, startTransition] = useTransition();
  const [items, toggleOptimistic] = useOptimistic(
    supplements,
    (state: SupplementRow[], change: { id: string; timing: string; taken: boolean }) =>
      state.map((item) =>
        item.id === change.id
          ? {
              ...item,
              takenTimings: change.taken
                ? [...item.takenTimings, change.timing]
                : item.takenTimings.filter((t) => t !== change.timing),
            }
          : item,
      ),
  );

  if (items.length === 0) {
    return <p className="text-sm text-muted">Na dziś nie masz zaplanowanych suplementów.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((supplement) => (
        <li key={supplement.id} className="rounded-xl border border-border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium leading-tight">{supplement.name}</p>
              <p className="text-xs text-muted">
                {supplement.dose ? `${supplement.dose} ${supplement.unit}` : "dawka wg opakowania"}
                {supplement.note ? ` - ${supplement.note}` : ""}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {supplement.timing.map((timing) => {
              const taken = supplement.takenTimings.includes(timing);
              return (
                <button
                  key={timing}
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      toggleOptimistic({ id: supplement.id, timing, taken: !taken });
                      const result = await toggleSupplementLog({
                        supplementId: supplement.id,
                        date,
                        timing,
                        taken: !taken,
                      });
                      if (!result.ok) toast.error(result.error);
                    });
                  }}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                    taken
                      ? "border-success bg-success/15 text-success"
                      : "border-border text-muted hover:bg-surface-2",
                  )}
                >
                  {taken ? <Check className="size-4" /> : null}
                  {TIMING_LABELS[timing] ?? timing}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}
