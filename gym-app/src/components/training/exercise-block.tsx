"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb, MessageSquare, Plus, Trash2 } from "lucide-react";

import { SetRow } from "@/components/training/set-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDayMonth } from "@/lib/date";
import type { RunnerEntry, RunnerSet } from "@/components/training/types";

function targetLine(entry: RunnerEntry): string {
  const parts: string[] = [];
  if (entry.target.sets) {
    const reps =
      entry.target.repsMin && entry.target.repsMax && entry.target.repsMin !== entry.target.repsMax
        ? `${entry.target.repsMin}-${entry.target.repsMax}`
        : entry.target.repsMin ?? entry.target.repsMax ?? "";
    parts.push(`${entry.target.sets} x ${reps}`.trim());
  }
  if (entry.target.rpe) parts.push(`RPE ${entry.target.rpe}`);
  if (entry.target.restSeconds) parts.push(`przerwa ${entry.target.restSeconds} s`);
  return parts.join("  -  ");
}

export function ExerciseBlock({
  entry,
  scale,
  weightUnit,
  registerInput,
  onSetChange,
  onToggleComplete,
  onAddSet,
  onDeleteSet,
  onNoteChange,
  onRemoveExercise,
  onApplySuggestion,
}: {
  entry: RunnerEntry;
  scale: "RPE" | "RIR" | "BOTH";
  weightUnit: string;
  registerInput: (setId: string) => (element: HTMLInputElement | null) => void;
  onSetChange: (setId: string, patch: Partial<RunnerSet>) => void;
  onToggleComplete: (setId: string) => void;
  onAddSet: () => void;
  onDeleteSet: (setId: string) => void;
  onNoteChange: (note: string) => void;
  onRemoveExercise: () => void;
  onApplySuggestion: () => void;
}) {
  const [noteOpen, setNoteOpen] = useState(Boolean(entry.note));
  const [previousOpen, setPreviousOpen] = useState(true);

  const done = entry.sets.filter((set) => set.isCompleted).length;
  const suggestionWeight = entry.suggestion?.weight ?? null;

  return (
    <section className="rounded-2xl border border-border bg-surface">
      <header className="flex items-start justify-between gap-2 border-b border-border p-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {entry.supersetGroup ? (
              <Badge variant="accent" className="shrink-0">
                Superseria {entry.supersetGroup}
              </Badge>
            ) : null}
            <h3 className="display truncate text-xl">{entry.exerciseName}</h3>
          </div>
          <p className="mt-0.5 text-xs text-muted">{targetLine(entry) || "Bez założeń - notujesz, co zrobisz"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="tabular text-sm text-muted">
            {done}/{entry.sets.length}
          </span>
          <Button variant="ghost" size="iconSm" aria-label="Usuń ćwiczenie z treningu" onClick={onRemoveExercise}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* Poprzedni wynik - żeby nie trzeba było pamiętać, co było ostatnio. */}
      {entry.previous ? (
        <div className="border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setPreviousOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted"
          >
            <span>Poprzednio - {formatDayMonth(entry.previous.date)}</span>
            <ChevronDown className={cn("size-4 transition-transform", previousOpen && "rotate-180")} />
          </button>
          {previousOpen ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {entry.previous.sets.map((set, index) => (
                <span key={index} className="rounded-lg bg-surface-2 px-2 py-1 text-sm tabular">
                  {set.weight ?? 0} {weightUnit} x {set.reps ?? 0}
                  {set.rpe != null ? <span className="text-muted"> @{set.rpe}</span> : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Podpowiedź ciężaru - pomocnicza, nigdy nie wpisuje się sama. */}
      {entry.suggestion && suggestionWeight ? (
        <button
          type="button"
          onClick={onApplySuggestion}
          className="flex w-full items-start gap-2 border-b border-border bg-accent/5 px-3 py-2 text-left"
        >
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" />
          <span className="text-xs text-muted">
            {entry.suggestion.message}{" "}
            <span className="font-semibold text-accent-strong dark:text-accent">Wpisz {suggestionWeight} {weightUnit}</span>
          </span>
        </button>
      ) : null}

      <div className="flex flex-col gap-1.5 p-3">
        <div className="grid grid-cols-[2.25rem_1fr_1fr_3.25rem_2.75rem] gap-1.5 pb-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted">
          <span>Seria</span>
          <span>{weightUnit}</span>
          <span>Powt.</span>
          <span>{scale === "RIR" ? "RIR" : "RPE"}</span>
          <span />
        </div>

        {entry.sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            scale={scale}
            placeholderWeight={String(entry.suggestion?.weight ?? entry.previous?.sets[0]?.weight ?? 0)}
            placeholderReps={String(entry.target.repsMin ?? entry.previous?.sets[0]?.reps ?? 8)}
            registerInput={registerInput(set.id)}
            onChange={(patch) => onSetChange(set.id, patch)}
            onToggleComplete={() => onToggleComplete(set.id)}
            onDelete={() => onDeleteSet(set.id)}
          />
        ))}

        <div className="mt-1 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onAddSet}>
            <Plus className="size-4" /> Seria
          </Button>
          <Button
            variant={noteOpen ? "secondary" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setNoteOpen((open) => !open)}
          >
            <MessageSquare className="size-4" /> Notatka
          </Button>
        </div>

        {noteOpen ? (
          <Textarea
            className="mt-1"
            placeholder="np. dobra technika, ostatnie powtórzenie ciężkie"
            defaultValue={entry.note ?? ""}
            onBlur={(event) => onNoteChange(event.target.value)}
          />
        ) : null}
      </div>
    </section>
  );
}
