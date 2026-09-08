import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PlanEditor } from "@/components/plans/plan-editor";
import { PlanHeaderActions } from "@/components/plans/plan-header-actions";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/server/auth";
import { getActiveSession, getExercises } from "@/server/queries/training";
import { prisma } from "@/server/db";

export const metadata: Metadata = { title: "Plan" };

export default async function PlanDetailPage({ params }: PageProps<"/plany/[planId]">) {
  const { planId } = await params;
  const user = await requireUser();

  const plan = await prisma.workoutPlan.findFirst({
    where: { id: planId, userId: user.id },
    include: {
      workouts: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: { exercise: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!plan) notFound();

  const [exercises, active] = await Promise.all([getExercises(user.id), getActiveSession(user.id)]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="display truncate text-3xl">{plan.name}</h1>
            {plan.isActive ? <Badge variant="accent">aktywny</Badge> : null}
          </div>
          {plan.description ? <p className="text-sm text-muted">{plan.description}</p> : null}
        </div>
        <PlanHeaderActions
          plan={{ id: plan.id, name: plan.name, description: plan.description, isActive: plan.isActive }}
        />
      </header>

      <PlanEditor
        planId={plan.id}
        hasActiveSession={Boolean(active)}
        exercises={exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          primaryMuscle: exercise.primaryMuscle,
          description: exercise.description,
        }))}
        workouts={plan.workouts.map((workout) => ({
          id: workout.id,
          name: workout.name,
          description: workout.description,
          estimatedMinutes: workout.estimatedMinutes,
          exercises: workout.exercises.map((item) => ({
            id: item.id,
            exerciseId: item.exerciseId,
            exerciseName: item.exercise.name,
            sets: item.sets,
            repsMin: item.repsMin,
            repsMax: item.repsMax,
            targetWeight: item.targetWeight,
            targetRpe: item.targetRpe,
            targetRir: item.targetRir,
            restSeconds: item.restSeconds,
            tempo: item.tempo,
            note: item.note,
            supersetGroup: item.supersetGroup,
          })),
        }))}
      />
    </div>
  );
}
