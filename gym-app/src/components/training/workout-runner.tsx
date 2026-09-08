"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CloudOff, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ExerciseBlock } from "@/components/training/exercise-block";
import { ExercisePickerSheet, type PickerExercise } from "@/components/training/exercise-picker";
import { RestTimerBar, useRestTimer } from "@/components/training/rest-timer";
import type { RunnerEntry, RunnerSession, RunnerSet } from "@/components/training/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useWorkoutSync } from "@/hooks/use-workout-sync";
import { formatDuration } from "@/lib/date";
import { sessionTotals } from "@/lib/training";
import { cn, formatNumber } from "@/lib/utils";
import {
  addExerciseToSession,
  addSetToExercise,
  deleteSet,
  deleteWorkoutSession,
  finishWorkoutSession,
  removeExerciseFromSession,
  updateExerciseNote,
} from "@/server/actions/training";

export function WorkoutRunner({
  session,
  exercises,
}: {
  session: RunnerSession;
  exercises: PickerExercise[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<RunnerEntry[]>(session.entries);
  const [elapsed, setElapsed] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputs = useRef(new Map<string, HTMLInputElement>());

  const { push, flushNow, status } = useWorkoutSync(session.id);
  const rest = useRestTimer(120);

  // Czas trwania liczymy z godziny startu, więc przetrwa odświeżenie strony.
  useEffect(() => {
    const started = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - started) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session.startedAt]);

  const allSets = useMemo(() => entries.flatMap((entry) => entry.sets), [entries]);
  const totals = useMemo(() => sessionTotals(allSets), [allSets]);
  const completed = allSets.filter((set) => set.isCompleted).length;
  const progress = allSets.length ? (completed / allSets.length) * 100 : 0;

  const patchSet = useCallback(
    (setId: string, patch: Partial<RunnerSet>, options: { sync?: boolean } = { sync: true }) => {
      setEntries((current) =>
        current.map((entry) => ({
          ...entry,
          sets: entry.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
        })),
      );
      if (options.sync !== false) {
        push({
          setId,
          ...(patch.weight !== undefined ? { weight: patch.weight } : {}),
          ...(patch.reps !== undefined ? { reps: patch.reps } : {}),
          ...(patch.rpe !== undefined ? { rpe: patch.rpe } : {}),
          ...(patch.rir !== undefined ? { rir: patch.rir } : {}),
          ...(patch.isWarmup !== undefined ? { isWarmup: patch.isWarmup } : {}),
          ...(patch.isCompleted !== undefined ? { isCompleted: patch.isCompleted } : {}),
          ...(patch.note !== undefined ? { note: patch.note } : {}),
        });
      }
    },
    [push],
  );

  /**
   * Odhaczenie serii: uzupełniamy brakujące wartości podpowiedzią, startujemy
   * przerwę i przechodzimy do kolejnej serii - bez dodatkowych kliknięć.
   */
  const toggleComplete = useCallback(
    (entryId: string, setId: string) => {
      const entry = entries.find((item) => item.id === entryId);
      const set = entry?.sets.find((item) => item.id === setId);
      if (!entry || !set) return;

      if (set.isCompleted) {
        patchSet(setId, { isCompleted: false });
        return;
      }

      const fallbackWeight = entry.suggestion?.weight ?? entry.previous?.sets[0]?.weight ?? 0;
      const fallbackReps = entry.target.repsMin ?? entry.previous?.sets[0]?.reps ?? 8;
      patchSet(setId, {
        isCompleted: true,
        weight: set.weight ?? fallbackWeight,
        reps: set.reps ?? fallbackReps,
      });

      if (!set.isWarmup) {
        rest.start(entry.target.restSeconds ?? 120);
      }

      // Kursor ląduje w kolejnej niezrobionej serii tego ćwiczenia.
      const next = entry.sets.find((item) => !item.isCompleted && item.id !== setId);
      if (next) {
        requestAnimationFrame(() => {
          const element = inputs.current.get(next.id);
          element?.focus();
          element?.select();
        });
      }
    },
    [entries, patchSet, rest],
  );

  const applySuggestion = useCallback(
    (entryId: string) => {
      const entry = entries.find((item) => item.id === entryId);
      const weight = entry?.suggestion?.weight;
      if (!entry || weight == null) return;
      entry.sets
        .filter((set) => !set.isCompleted)
        .forEach((set) => patchSet(set.id, { weight }));
      toast.success(`Wpisano ${weight} ${session.weightUnit} w niezrobione serie.`);
    },
    [entries, patchSet, session.weightUnit],
  );

  const addSet = useCallback(
    (entryId: string) => {
      startTransition(async () => {
        const result = await addSetToExercise(entryId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        const entry = entries.find((item) => item.id === entryId);
        const last = entry?.sets[entry.sets.length - 1];
        setEntries((current) =>
          current.map((item) =>
            item.id === entryId
              ? {
                  ...item,
                  sets: [
                    ...item.sets,
                    {
                      id: result.data!.setId,
                      setNumber: (last?.setNumber ?? 0) + 1,
                      weight: last?.weight ?? null,
                      reps: last?.reps ?? null,
                      rpe: null,
                      rir: null,
                      isWarmup: false,
                      isCompleted: false,
                      note: null,
                    },
                  ],
                }
              : item,
          ),
        );
      });
    },
    [entries],
  );

  const removeSet = useCallback((entryId: string, setId: string) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId ? { ...entry, sets: entry.sets.filter((set) => set.id !== setId) } : entry,
      ),
    );
    startTransition(async () => {
      const result = await deleteSet(setId);
      if (!result.ok) toast.error(result.error);
    });
  }, []);

  const finish = useCallback(
    async (payload: { note?: string; rating?: number; bodyWeight?: number }) => {
      await flushNow();
      const result = await finishWorkoutSession({
        sessionId: session.id,
        note: payload.note || null,
        rating: payload.rating ?? null,
        bodyWeight: payload.bodyWeight ?? null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Trening zapisany.");
      router.replace(`/historia/${session.id}`);
      router.refresh();
    },
    [flushNow, router, session.id],
  );

  return (
    <div className="flex flex-col gap-3">
      <header className="sticky top-14 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:top-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="display truncate text-2xl">{session.name}</h1>
            <p className="text-xs text-muted tabular">
              {formatDuration(elapsed)} - {completed}/{allSets.length} serii - {formatNumber(totals.volume)}{" "}
              {session.weightUnit}
            </p>
          </div>
          <Button size="sm" onClick={() => setFinishOpen(true)}>
            <Check className="size-4" /> Zakończ
          </Button>
        </div>
        <Progress value={progress} className="mt-2" />
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
          {status === "saving" ? (
            <>
              <Loader2 className="size-3 animate-spin" /> zapisywanie...
            </>
          ) : status === "offline" ? (
            <>
              <CloudOff className="size-3 text-warning" /> offline - wyniki czekają w telefonie
            </>
          ) : status === "error" ? (
            <>
              <CloudOff className="size-3 text-danger" /> błąd zapisu, ponawiam
            </>
          ) : (
            <>
              <Check className="size-3 text-success" /> zapisano automatycznie
            </>
          )}
        </div>
      </header>

      {entries.map((entry) => (
        <ExerciseBlock
          key={entry.id}
          entry={entry}
          scale={session.effortScale}
          weightUnit={session.weightUnit}
          registerInput={(setId) => (element) => {
            if (element) inputs.current.set(setId, element);
            else inputs.current.delete(setId);
          }}
          onSetChange={(setId, patch) => patchSet(setId, patch)}
          onToggleComplete={(setId) => toggleComplete(entry.id, setId)}
          onAddSet={() => addSet(entry.id)}
          onDeleteSet={(setId) => removeSet(entry.id, setId)}
          onApplySuggestion={() => applySuggestion(entry.id)}
          onNoteChange={(note) => {
            setEntries((current) =>
              current.map((item) => (item.id === entry.id ? { ...item, note } : item)),
            );
            startTransition(async () => {
              const result = await updateExerciseNote(entry.id, note);
              if (!result.ok) toast.error(result.error);
            });
          }}
          onRemoveExercise={() => {
            setEntries((current) => current.filter((item) => item.id !== entry.id));
            startTransition(async () => {
              const result = await removeExerciseFromSession(entry.id);
              if (!result.ok) toast.error(result.error);
            });
          }}
        />
      ))}

      <Button variant="outline" onClick={() => setPickerOpen(true)} disabled={pending}>
        <Plus className="size-4" /> Dodaj ćwiczenie
      </Button>

      {/* Stoper przerwy trzyma się dołu ekranu, nad nawigacją. */}
      <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-3xl md:bottom-4">
        <RestTimerBar
          remaining={rest.remaining}
          duration={rest.duration}
          running={rest.running}
          justFinished={rest.justFinished}
          onExtend={rest.extend}
          onStop={rest.stop}
          onStart={rest.start}
        />
      </div>

      <ExercisePickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={exercises}
        title="Dodaj ćwiczenie do treningu"
        onPick={(exerciseId) => {
          startTransition(async () => {
            const result = await addExerciseToSession(session.id, exerciseId);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            router.refresh();
          });
        }}
      />

      <FinishSheet
        open={finishOpen}
        onOpenChange={setFinishOpen}
        onFinish={finish}
        onDiscard={async () => {
          const result = await deleteWorkoutSession(session.id);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Trening odrzucony.");
          router.replace("/trening");
          router.refresh();
        }}
        totals={{ volume: totals.volume, sets: completed, elapsed }}
        weightUnit={session.weightUnit}
      />
    </div>
  );
}

function FinishSheet({
  open,
  onOpenChange,
  onFinish,
  onDiscard,
  totals,
  weightUnit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinish: (payload: { note?: string; rating?: number; bodyWeight?: number }) => Promise<void>;
  onDiscard: () => Promise<void>;
  totals: { volume: number; sets: number; elapsed: number };
  weightUnit: string;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [bodyWeight, setBodyWeight] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Zakończyć trening?" description="Niezaznaczone serie nie trafią do historii.">
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="display text-2xl tabular">{formatDuration(totals.elapsed)}</p>
            <p className="text-[11px] uppercase text-muted">czas</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="display text-2xl tabular">{totals.sets}</p>
            <p className="text-[11px] uppercase text-muted">serie</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="display text-2xl tabular">{formatNumber(totals.volume)}</p>
            <p className="text-[11px] uppercase text-muted">{weightUnit} objętości</p>
          </div>
        </div>

        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Jak poszło?</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Ocena ${value}`}
                onClick={() => setRating(value)}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center rounded-xl border",
                  rating != null && value <= rating
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-muted",
                )}
              >
                <Star className={cn("size-5", rating != null && value <= rating && "fill-current")} />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Masa ciała (opcjonalnie)</p>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="np. 82.4"
            value={bodyWeight}
            onChange={(event) => setBodyWeight(event.target.value)}
          />
        </div>

        <Textarea
          className="mb-4"
          placeholder="Notatka do treningu - np. dużo energii, dobry trening"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onFinish({
                note: note.trim() || undefined,
                rating: rating ?? undefined,
                bodyWeight: bodyWeight ? Number(bodyWeight) : undefined,
              });
              setBusy(false);
            }}
          >
            <Check className="size-5" /> Zapisz trening
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm("Usunąć ten trening razem z wpisanymi seriami?")) return;
              setBusy(true);
              await onDiscard();
              setBusy(false);
            }}
          >
            <Trash2 className="size-4" /> Odrzuć trening
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
