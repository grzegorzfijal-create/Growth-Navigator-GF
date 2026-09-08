"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { WorkoutExerciseFormSheet, type WorkoutExerciseDraft } from "@/components/plans/workout-exercise-form";
import { WorkoutFormSheet } from "@/components/plans/workout-form";
import { ExercisePickerSheet, type PickerExercise } from "@/components/training/exercise-picker";
import { StartWorkoutButton } from "@/components/training/start-workout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteWorkout, deleteWorkoutExercise, reorderWorkoutExercises } from "@/server/actions/plans";

export type EditorExercise = WorkoutExerciseDraft & { id: string };
export type EditorWorkout = {
  id: string;
  name: string;
  description: string | null;
  estimatedMinutes: number | null;
  exercises: EditorExercise[];
};

function summary(item: EditorExercise): string {
  const reps =
    item.repsMin && item.repsMax && item.repsMin !== item.repsMax
      ? `${item.repsMin}-${item.repsMax}`
      : item.repsMin ?? item.repsMax ?? "";
  const parts = [`${item.sets} x ${reps}`.trim()];
  if (item.targetRpe) parts.push(`RPE ${item.targetRpe}`);
  if (item.targetRir != null) parts.push(`RIR ${item.targetRir}`);
  if (item.targetWeight) parts.push(`${item.targetWeight} kg`);
  parts.push(`przerwa ${item.restSeconds} s`);
  if (item.tempo) parts.push(`tempo ${item.tempo}`);
  return parts.join("  -  ");
}

export function PlanEditor({
  planId,
  workouts,
  exercises,
  hasActiveSession,
}: {
  planId: string;
  workouts: EditorWorkout[];
  exercises: PickerExercise[];
  hasActiveSession: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [workoutFormOpen, setWorkoutFormOpen] = useState(false);
  const [editedWorkout, setEditedWorkout] = useState<EditorWorkout | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [configFor, setConfigFor] = useState<{ workoutId: string; draft: WorkoutExerciseDraft } | null>(null);

  const move = (workout: EditorWorkout, index: number, direction: -1 | 1) => {
    const next = [...workout.exercises];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    startTransition(async () => {
      const result = await reorderWorkoutExercises(workout.id, next.map((item) => item.id));
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {workouts.map((workout) => (
        <Card key={workout.id}>
          <CardContent className="flex flex-col gap-3 pt-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="display text-2xl">{workout.name}</h2>
                <p className="text-sm text-muted">
                  {workout.description ?? `${workout.exercises.length} ćwiczeń`}
                  {workout.estimatedMinutes ? ` - ok. ${workout.estimatedMinutes} min` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Edytuj trening"
                  onClick={() => {
                    setEditedWorkout(workout);
                    setWorkoutFormOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Usuń trening"
                  onClick={() =>
                    startTransition(async () => {
                      if (!window.confirm(`Usunąć trening ${workout.name} z planu?`)) return;
                      const result = await deleteWorkout(workout.id);
                      if (!result.ok) toast.error(result.error);
                      else router.refresh();
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            <ul className="flex flex-col gap-1.5">
              {workout.exercises.map((item, index) => (
                <li key={item.id} className="flex items-center gap-2 rounded-xl border border-border p-2.5">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label="W górę"
                      className="text-muted disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => move(workout, index, -1)}
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="W dół"
                      className="text-muted disabled:opacity-30"
                      disabled={index === workout.exercises.length - 1}
                      onClick={() => move(workout, index, 1)}
                    >
                      <ArrowDown className="size-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setConfigFor({ workoutId: workout.id, draft: item })}
                  >
                    <div className="flex items-center gap-2">
                      {item.supersetGroup ? <Badge variant="accent">{item.supersetGroup}</Badge> : null}
                      <p className="truncate font-medium">{item.exerciseName}</p>
                    </div>
                    <p className="truncate text-xs text-muted tabular">{summary(item)}</p>
                  </button>

                  <Button
                    variant="ghost"
                    size="iconSm"
                    aria-label="Ustawienia ćwiczenia"
                    onClick={() => setConfigFor({ workoutId: workout.id, draft: item })}
                  >
                    <Settings2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    aria-label="Usuń ćwiczenie"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteWorkoutExercise(item.id);
                        if (!result.ok) toast.error(result.error);
                        else router.refresh();
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setPickerFor(workout.id)}>
                <Plus className="size-4" /> Ćwiczenie
              </Button>
              <StartWorkoutButton
                workoutId={workout.id}
                size="sm"
                label="Trenuj teraz"
                className="flex-1"
                disabled={hasActiveSession}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={() => {
          setEditedWorkout(null);
          setWorkoutFormOpen(true);
        }}
      >
        <Plus className="size-4" /> Dodaj trening do planu
      </Button>

      <WorkoutFormSheet
        open={workoutFormOpen}
        onOpenChange={setWorkoutFormOpen}
        planId={planId}
        workout={editedWorkout ?? undefined}
      />

      <ExercisePickerSheet
        open={pickerFor !== null}
        onOpenChange={(open) => setPickerFor(open ? pickerFor : null)}
        exercises={exercises}
        onPick={(exerciseId) => {
          const exercise = exercises.find((item) => item.id === exerciseId);
          if (!pickerFor || !exercise) return;
          setConfigFor({
            workoutId: pickerFor,
            draft: {
              exerciseId,
              exerciseName: exercise.name,
              sets: 3,
              repsMin: 8,
              repsMax: 12,
              targetWeight: null,
              targetRpe: 8,
              targetRir: null,
              restSeconds: 120,
              tempo: null,
              note: null,
              supersetGroup: null,
            },
          });
          setPickerFor(null);
        }}
      />

      <WorkoutExerciseFormSheet
        open={configFor !== null}
        onOpenChange={(open) => !open && setConfigFor(null)}
        workoutId={configFor?.workoutId ?? ""}
        draft={configFor?.draft ?? null}
      />
    </div>
  );
}
