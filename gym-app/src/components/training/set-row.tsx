"use client";

import { useState } from "react";
import { Check, Flame, Trash2 } from "lucide-react";

import { EffortPicker } from "@/components/training/effort-picker";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { RunnerSet } from "@/components/training/types";

/**
 * Jeden wiersz serii. Duże pola, jeden kciuk, zero zapisywania ręcznego -
 * zmiana wartości od razu leci do kolejki autozapisu.
 */
export function SetRow({
  set,
  scale,
  placeholderWeight,
  placeholderReps,
  registerInput,
  onChange,
  onToggleComplete,
  onDelete,
}: {
  set: RunnerSet;
  scale: "RPE" | "RIR" | "BOTH";
  placeholderWeight: string;
  placeholderReps: string;
  registerInput: (element: HTMLInputElement | null) => void;
  onChange: (patch: Partial<RunnerSet>) => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}) {
  const [effortOpen, setEffortOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const effortLabel = () => {
    if (scale === "RIR") return set.rir != null ? `${set.rir}` : "-";
    if (set.rpe != null) return `${set.rpe}`;
    if (set.rir != null) return `${10 - set.rir}`;
    return "-";
  };

  return (
    <div
      className={cn(
        "grid grid-cols-[2.25rem_1fr_1fr_3.25rem_2.75rem] items-center gap-1.5",
        set.isCompleted && "opacity-95",
      )}
    >
      <button
        type="button"
        onClick={() => setOptionsOpen(true)}
        aria-label={`Opcje serii ${set.setNumber}`}
        className={cn(
          "flex h-12 items-center justify-center rounded-xl border text-sm font-bold tabular",
          set.isWarmup ? "border-info/40 bg-info/10 text-info" : "border-border bg-surface-2 text-muted",
        )}
      >
        {set.isWarmup ? "R" : set.setNumber}
      </button>

      <Input
        ref={registerInput}
        type="number"
        inputMode="decimal"
        step="0.25"
        min="0"
        aria-label={`Ciężar w serii ${set.setNumber}`}
        placeholder={placeholderWeight}
        value={set.weight ?? ""}
        onChange={(event) =>
          onChange({ weight: event.target.value === "" ? null : Number(event.target.value) })
        }
        className={cn(
          "h-12 px-1 text-center text-lg font-semibold tabular",
          set.isCompleted && "border-success/40 bg-success/10",
        )}
      />

      <Input
        type="number"
        inputMode="numeric"
        min="0"
        aria-label={`Powtórzenia w serii ${set.setNumber}`}
        placeholder={placeholderReps}
        value={set.reps ?? ""}
        onChange={(event) => onChange({ reps: event.target.value === "" ? null : Number(event.target.value) })}
        className={cn(
          "h-12 px-1 text-center text-lg font-semibold tabular",
          set.isCompleted && "border-success/40 bg-success/10",
        )}
      />

      <button
        type="button"
        onClick={() => setEffortOpen(true)}
        aria-label={`Wysiłek w serii ${set.setNumber}`}
        className={cn(
          "h-12 rounded-xl border text-base font-semibold tabular",
          set.rpe != null || set.rir != null
            ? "border-accent/50 bg-accent/10 text-accent-strong dark:text-accent"
            : "border-border bg-surface text-muted",
        )}
      >
        {effortLabel()}
      </button>

      <button
        type="button"
        onClick={onToggleComplete}
        aria-label={set.isCompleted ? "Cofnij serię" : "Zapisz serię"}
        aria-pressed={set.isCompleted}
        className={cn(
          "flex h-12 items-center justify-center rounded-xl border transition-colors",
          set.isCompleted
            ? "border-success bg-success text-white"
            : "border-border bg-surface-2 text-muted hover:bg-border",
        )}
      >
        <Check className="size-5" />
      </button>

      <EffortPicker
        open={effortOpen}
        onOpenChange={setEffortOpen}
        scale={scale}
        rpe={set.rpe}
        rir={set.rir}
        onSelect={(value) => onChange(value)}
      />

      <Sheet open={optionsOpen} onOpenChange={setOptionsOpen}>
        <SheetContent title={`Seria ${set.setNumber}`}>
          <div className="flex flex-col gap-4">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Flame className="size-4 text-info" /> Seria rozgrzewkowa
              </span>
              <Switch
                checked={set.isWarmup}
                onCheckedChange={(checked) => onChange({ isWarmup: checked })}
              />
            </label>
            <p className="-mt-2 text-xs text-muted">
              Rozgrzewka nie wlicza się do objętości ani do rekordów.
            </p>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Notatka do serii</span>
              <Textarea
                value={set.note ?? ""}
                placeholder="np. ostatnie powtórzenie na siłę"
                onChange={(event) => onChange({ note: event.target.value })}
              />
            </div>

            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setOptionsOpen(false);
                onDelete();
              }}
            >
              <Trash2 className="size-4" /> Usuń serię
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
