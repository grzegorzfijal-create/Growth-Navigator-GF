import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { WorkoutRunner } from "@/components/training/workout-runner";
import type { RunnerEntry } from "@/components/training/types";
import { toIsoDate } from "@/lib/date";
import { unitLabel } from "@/lib/labels";
import { requireUser } from "@/server/auth";
import { getExercises, getSessionDetail, getSuggestions } from "@/server/queries/training";

export const metadata: Metadata = { title: "Trening" };

export default async function WorkoutSessionPage({ params }: PageProps<"/trening/[sessionId]">) {
  const { sessionId } = await params;
  const user = await requireUser();
  const session = await getSessionDetail(user.id, sessionId);

  if (!session) notFound();
  // Zakończony trening to już historia, nie tryb treningowy.
  if (session.finishedAt) redirect(`/historia/${session.id}`);

  const [suggestions, exercises] = await Promise.all([
    getSuggestions(
      user.id,
      session.entries.map((entry) => ({
        exerciseId: entry.exerciseId,
        repsMin: entry.targetRepsMin,
        repsMax: entry.targetRepsMax,
        targetRpe: entry.targetRpe,
        plateStep: entry.exercise.plateStep ?? user.plateStep,
      })),
      session.id,
    ),
    getExercises(user.id),
  ]);

  const entries: RunnerEntry[] = session.entries.map((entry) => {
    const hint = suggestions[entry.exerciseId];
    return {
      id: entry.id,
      exerciseId: entry.exerciseId,
      exerciseName: entry.exercise.name,
      unit: unitLabel(entry.exercise.unit, user.weightUnit),
      note: entry.note,
      supersetGroup: entry.supersetGroup,
      plateStep: entry.exercise.plateStep ?? user.plateStep,
      target: {
        sets: entry.targetSets,
        repsMin: entry.targetRepsMin,
        repsMax: entry.targetRepsMax,
        rpe: entry.targetRpe,
        restSeconds: entry.restSeconds,
      },
      sets: entry.sets.map((set) => ({
        id: set.id,
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        rpe: set.rpe,
        rir: set.rir,
        isWarmup: set.isWarmup,
        isCompleted: set.isCompleted,
        note: set.note,
      })),
      previous: hint?.previous
        ? {
            date: hint.previous.date,
            sets: hint.previous.sets.map((set) => ({ weight: set.weight, reps: set.reps, rpe: set.rpe })),
          }
        : null,
      suggestion: hint?.suggestion
        ? {
            action: hint.suggestion.action,
            message: hint.suggestion.message,
            weight: hint.suggestion.weight,
            reps: hint.suggestion.reps,
          }
        : null,
    };
  });

  return (
    <WorkoutRunner
      session={{
        id: session.id,
        name: session.name,
        date: toIsoDate(session.date),
        startedAt: session.startedAt.toISOString(),
        effortScale: user.effortScale,
        weightUnit: user.weightUnit === "LB" ? "lb" : "kg",
        note: session.note,
        entries,
      }}
      exercises={exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        primaryMuscle: exercise.primaryMuscle,
        description: exercise.description,
      }))}
    />
  );
}
