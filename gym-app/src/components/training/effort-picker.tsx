"use client";

import { useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { rirToRpe, rpeToRir } from "@/lib/training";

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const RIR_VALUES = [0, 1, 2, 3, 4];

/**
 * Wybór wysiłku dużymi przyciskami - RPE, RIR albo oba, zależnie od ustawień.
 * Wpisanie jednej wartości uzupełnia drugą, bo to ta sama skala z dwóch stron.
 */
export function EffortPicker({
  open,
  onOpenChange,
  scale,
  rpe,
  rir,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scale: "RPE" | "RIR" | "BOTH";
  rpe: number | null;
  rir: number | null;
  onSelect: (value: { rpe: number | null; rir: number | null }) => void;
}) {
  const [tab, setTab] = useState<"RPE" | "RIR">(scale === "RIR" ? "RIR" : "RPE");
  const showTabs = scale === "BOTH";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Jak ciężka była ta seria?"
        description={
          tab === "RPE"
            ? "RPE 10 = nie zrobiłbyś ani jednego powtórzenia więcej. RPE 8 = zostały dwa."
            : "RIR = ile powtórzeń zostało w zapasie."
        }
      >
        {showTabs ? (
          <div className="mb-3 flex gap-1 rounded-xl bg-surface-2 p-1">
            {(["RPE", "RIR"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-semibold",
                  tab === value ? "bg-surface text-foreground shadow-sm" : "text-muted",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          {(tab === "RPE" ? RPE_VALUES : RIR_VALUES).map((value) => {
            const selected = tab === "RPE" ? rpe === value : rir === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  onSelect(
                    tab === "RPE"
                      ? { rpe: value, rir: rpeToRir(value) }
                      : { rir: value, rpe: rirToRpe(value) },
                  );
                  onOpenChange(false);
                }}
                className={cn(
                  "display h-16 rounded-2xl border text-2xl transition-colors",
                  selected
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                {value}
                {tab === "RIR" && value === 4 ? "+" : ""}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              onSelect({ rpe: null, rir: null });
              onOpenChange(false);
            }}
          >
            Wyczyść
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
