"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { exerciseSchema, planSchema, workoutExerciseSchema, workoutSchema } from "@/schemas/training";
import type { ActionState } from "@/server/actions/training";

/* ------------------------------------------------------------------ ćwiczenia */

export async function createExercise(input: unknown): Promise<ActionState<{ id: string }>> {
  const user = await requireUser();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane ćwiczenia." };

  const created = await prisma.exercise.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      category: parsed.data.category,
      primaryMuscle: parsed.data.primaryMuscle,
      secondaryMuscles: parsed.data.secondaryMuscles,
      type: parsed.data.type,
      unit: parsed.data.unit,
      plateStep: parsed.data.plateStep ?? null,
      description: parsed.data.description ?? null,
      instructions: parsed.data.instructions ?? null,
    },
  });

  revalidatePath("/cwiczenia");
  return { ok: true, data: { id: created.id } };
}

export async function updateExercise(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return { ok: false, error: "Nieprawidłowe dane ćwiczenia." };

  // Ćwiczeń systemowych (userId = null) nie edytujemy - są wspólne dla wszystkich.
  const owned = await prisma.exercise.findFirst({ where: { id: parsed.data.id, userId: user.id } });
  if (!owned) return { ok: false, error: "Możesz edytować tylko własne ćwiczenia. Skopiuj je i zmień kopię." };

  await prisma.exercise.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      primaryMuscle: parsed.data.primaryMuscle,
      secondaryMuscles: parsed.data.secondaryMuscles,
      type: parsed.data.type,
      unit: parsed.data.unit,
      plateStep: parsed.data.plateStep ?? null,
      description: parsed.data.description ?? null,
      instructions: parsed.data.instructions ?? null,
    },
  });

  revalidatePath("/cwiczenia");
  return { ok: true };
}

export async function archiveExercise(exerciseId: string): Promise<ActionState> {
  const user = await requireUser();
  const owned = await prisma.exercise.findFirst({ where: { id: exerciseId, userId: user.id } });
  if (!owned) return { ok: false, error: "Możesz ukryć tylko własne ćwiczenia." };

  // Archiwizacja zamiast usunięcia - historia treningów musi zostać spójna.
  await prisma.exercise.update({ where: { id: exerciseId }, data: { isArchived: true } });
  revalidatePath("/cwiczenia");
  return { ok: true };
}

/* ---------------------------------------------------------------------- plany */

export async function createPlan(input: unknown): Promise<ActionState<{ id: string }>> {
  const user = await requireUser();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane planu." };

  const created = await prisma.workoutPlan.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      isActive: parsed.data.isActive,
    },
  });

  if (parsed.data.isActive) await deactivateOtherPlans(user.id, created.id);
  revalidatePath("/plany");
  return { ok: true, data: { id: created.id } };
}

export async function updatePlan(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return { ok: false, error: "Nieprawidłowe dane planu." };

  const owned = await prisma.workoutPlan.findFirst({ where: { id: parsed.data.id, userId: user.id } });
  if (!owned) return { ok: false, error: "Nie znaleziono planu." };

  await prisma.workoutPlan.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      isActive: parsed.data.isActive,
    },
  });

  if (parsed.data.isActive) await deactivateOtherPlans(user.id, parsed.data.id);
  revalidatePath("/plany");
  return { ok: true };
}

/** Aktywny plan jest jeden - to on podpowiada, co trenować dzisiaj. */
async function deactivateOtherPlans(userId: string, keepId: string): Promise<void> {
  await prisma.workoutPlan.updateMany({
    where: { userId, id: { not: keepId } },
    data: { isActive: false },
  });
}

export async function setActivePlan(planId: string): Promise<ActionState> {
  const user = await requireUser();
  const owned = await prisma.workoutPlan.findFirst({ where: { id: planId, userId: user.id } });
  if (!owned) return { ok: false, error: "Nie znaleziono planu." };

  await prisma.workoutPlan.update({ where: { id: planId }, data: { isActive: true } });
  await deactivateOtherPlans(user.id, planId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePlan(planId: string): Promise<ActionState> {
  const user = await requireUser();
  const owned = await prisma.workoutPlan.findFirst({ where: { id: planId, userId: user.id } });
  if (!owned) return { ok: false, error: "Nie znaleziono planu." };

  await prisma.workoutPlan.delete({ where: { id: planId } });
  revalidatePath("/plany");
  return { ok: true };
}

/* ------------------------------------------------------------------ treningi */

export async function createWorkout(input: unknown): Promise<ActionState<{ id: string }>> {
  const user = await requireUser();
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane treningu." };

  const plan = await prisma.workoutPlan.findFirst({
    where: { id: parsed.data.planId, userId: user.id },
    include: { workouts: { select: { id: true } } },
  });
  if (!plan) return { ok: false, error: "Nie znaleziono planu." };

  const created = await prisma.workout.create({
    data: {
      planId: plan.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      estimatedMinutes: parsed.data.estimatedMinutes ?? null,
      order: plan.workouts.length,
    },
  });

  revalidatePath(`/plany/${plan.id}`);
  return { ok: true, data: { id: created.id } };
}

export async function updateWorkout(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return { ok: false, error: "Nieprawidłowe dane treningu." };

  const owned = await prisma.workout.findFirst({
    where: { id: parsed.data.id, plan: { userId: user.id } },
    select: { id: true, planId: true },
  });
  if (!owned) return { ok: false, error: "Nie znaleziono treningu." };

  await prisma.workout.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      estimatedMinutes: parsed.data.estimatedMinutes ?? null,
    },
  });

  revalidatePath(`/plany/${owned.planId}`);
  return { ok: true };
}

export async function deleteWorkout(workoutId: string): Promise<ActionState> {
  const user = await requireUser();
  const owned = await prisma.workout.findFirst({
    where: { id: workoutId, plan: { userId: user.id } },
    select: { id: true, planId: true },
  });
  if (!owned) return { ok: false, error: "Nie znaleziono treningu." };

  await prisma.workout.delete({ where: { id: workoutId } });
  revalidatePath(`/plany/${owned.planId}`);
  return { ok: true };
}

/* ------------------------------------------------- ćwiczenia w planie treningu */

export async function addWorkoutExercise(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = workoutExerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };

  const [workout, exercise] = await Promise.all([
    prisma.workout.findFirst({
      where: { id: parsed.data.workoutId, plan: { userId: user.id } },
      include: { exercises: { select: { id: true } } },
    }),
    prisma.exercise.findFirst({
      where: { id: parsed.data.exerciseId, OR: [{ userId: null }, { userId: user.id }] },
      select: { id: true },
    }),
  ]);
  if (!workout || !exercise) return { ok: false, error: "Nie znaleziono treningu lub ćwiczenia." };

  await prisma.workoutExercise.create({
    data: {
      workoutId: workout.id,
      exerciseId: exercise.id,
      order: workout.exercises.length,
      sets: parsed.data.sets,
      repsMin: parsed.data.repsMin ?? null,
      repsMax: parsed.data.repsMax ?? null,
      targetWeight: parsed.data.targetWeight ?? null,
      targetRpe: parsed.data.targetRpe ?? null,
      targetRir: parsed.data.targetRir ?? null,
      restSeconds: parsed.data.restSeconds,
      tempo: parsed.data.tempo ?? null,
      note: parsed.data.note ?? null,
      supersetGroup: parsed.data.supersetGroup ?? null,
    },
  });

  revalidatePath(`/plany/${workout.planId}`);
  return { ok: true };
}

export async function updateWorkoutExercise(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = workoutExerciseSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) {
    return { ok: false, error: parsed.success ? "Brak identyfikatora." : parsed.error.issues[0]?.message ?? "Błąd." };
  }

  const owned = await prisma.workoutExercise.findFirst({
    where: { id: parsed.data.id, workout: { plan: { userId: user.id } } },
    include: { workout: { select: { planId: true } } },
  });
  if (!owned) return { ok: false, error: "Nie znaleziono ćwiczenia w planie." };

  await prisma.workoutExercise.update({
    where: { id: parsed.data.id },
    data: {
      exerciseId: parsed.data.exerciseId,
      sets: parsed.data.sets,
      repsMin: parsed.data.repsMin ?? null,
      repsMax: parsed.data.repsMax ?? null,
      targetWeight: parsed.data.targetWeight ?? null,
      targetRpe: parsed.data.targetRpe ?? null,
      targetRir: parsed.data.targetRir ?? null,
      restSeconds: parsed.data.restSeconds,
      tempo: parsed.data.tempo ?? null,
      note: parsed.data.note ?? null,
      supersetGroup: parsed.data.supersetGroup ?? null,
    },
  });

  revalidatePath(`/plany/${owned.workout.planId}`);
  return { ok: true };
}

export async function deleteWorkoutExercise(id: string): Promise<ActionState> {
  const user = await requireUser();
  const owned = await prisma.workoutExercise.findFirst({
    where: { id, workout: { plan: { userId: user.id } } },
    include: { workout: { select: { planId: true } } },
  });
  if (!owned) return { ok: false, error: "Nie znaleziono ćwiczenia w planie." };

  await prisma.workoutExercise.delete({ where: { id } });
  revalidatePath(`/plany/${owned.workout.planId}`);
  return { ok: true };
}

/** Zmiana kolejności ćwiczeń - przeciąganie w edytorze planu. */
export async function reorderWorkoutExercises(workoutId: string, orderedIds: string[]): Promise<ActionState> {
  const user = await requireUser();
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, plan: { userId: user.id } },
    include: { exercises: { select: { id: true } } },
  });
  if (!workout) return { ok: false, error: "Nie znaleziono treningu." };

  const known = new Set(workout.exercises.map((e) => e.id));
  const updates = orderedIds
    .filter((id) => known.has(id))
    .map((id, order) => prisma.workoutExercise.update({ where: { id }, data: { order } }));

  await prisma.$transaction(updates);
  revalidatePath(`/plany/${workout.planId}`);
  return { ok: true };
}
