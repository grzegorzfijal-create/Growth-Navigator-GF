import type { PrismaClient } from "@prisma/client";

import { STARTER_PLAN, STARTER_SUPPLEMENTS } from "../lib/starter-data.ts";

/**
 * Zestaw startowy dla nowego konta: gotowy plan Push/Pull/Legs i suplementy.
 * Prisma wchodzi parametrem, dzięki czemu tego samego kodu używa aplikacja
 * (przy rejestracji) i skrypt seedujący bazę.
 */
export async function installStarterData(prisma: PrismaClient, userId: string): Promise<{ planId: string }> {
  const exercises = await prisma.exercise.findMany({ where: { userId: null }, select: { id: true, name: true } });
  const byName = new Map(exercises.map((e) => [e.name, e.id]));

  const plan = await prisma.workoutPlan.create({
    data: { userId, name: STARTER_PLAN.name, description: STARTER_PLAN.description, isActive: true },
  });

  for (const [index, workout] of STARTER_PLAN.workouts.entries()) {
    const created = await prisma.workout.create({
      data: {
        planId: plan.id,
        name: workout.name,
        description: workout.description,
        order: index,
        estimatedMinutes: workout.estimatedMinutes,
      },
    });

    const rows = workout.exercises
      .map((item, order) => {
        const exerciseId = byName.get(item.exercise);
        if (!exerciseId) return null;
        return {
          workoutId: created.id,
          exerciseId,
          order,
          sets: item.sets,
          repsMin: item.repsMin,
          repsMax: item.repsMax,
          targetRpe: item.targetRpe,
          restSeconds: item.restSeconds,
          supersetGroup: item.supersetGroup ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length) await prisma.workoutExercise.createMany({ data: rows });
  }

  const existingSupplements = await prisma.supplement.count({ where: { userId } });
  if (existingSupplements === 0) {
    await prisma.supplement.createMany({
      data: STARTER_SUPPLEMENTS.map((supplement, order) => ({ ...supplement, userId, order })),
    });
  }

  return { planId: plan.id };
}
