"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { fromIsoDate, todayIso } from "@/lib/date";
import { estimate1rm, prCandidates, sessionTotals, suggestNextWeight } from "@/lib/training";
import { finishSessionSchema, setBatchSchema, startSessionSchema, scheduleSchema } from "@/schemas/training";
import { getPreviousPerformances } from "@/server/queries/training";

export type ActionState<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/* ------------------------------------------------------- start i koniec treningu */

/**
 * Start treningu z planu. Serie tworzymy od razu w bazie i wypełniamy
 * podpowiedzią ciężaru - użytkownik ma tylko potwierdzić albo poprawić.
 */
export async function startWorkoutSession(input: unknown): Promise<ActionState<{ sessionId: string }>> {
  const user = await requireUser();
  const parsed = startSessionSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false, error: "Nieprawidłowe dane treningu." };

  const existing = await prisma.workoutSession.findFirst({
    where: { userId: user.id, finishedAt: null },
    select: { id: true },
  });
  // Dwa treningi naraz nie mają sensu - wracamy do rozpoczętego.
  if (existing) return { ok: true, data: { sessionId: existing.id } };

  const date = parsed.data.date ?? todayIso();
  const workout = parsed.data.workoutId
    ? await prisma.workout.findFirst({
        where: { id: parsed.data.workoutId, plan: { userId: user.id } },
        include: { exercises: { orderBy: { order: "asc" }, include: { exercise: true } } },
      })
    : null;

  if (parsed.data.workoutId && !workout) return { ok: false, error: "Nie znaleziono treningu w Twoich planach." };

  const previous = workout
    ? await getPreviousPerformances(user.id, workout.exercises.map((e) => e.exerciseId))
    : {};

  const session = await prisma.workoutSession.create({
    data: {
      userId: user.id,
      workoutId: workout?.id ?? null,
      planId: workout?.planId ?? null,
      name: parsed.data.name?.trim() || workout?.name || "Trening własny",
      date: fromIsoDate(date),
      entries: {
        create: (workout?.exercises ?? []).map((item, order) => {
          const history = previous[item.exerciseId];
          const suggestion = suggestNextWeight(
            (history?.sets ?? []).map((s) => ({ ...s, isCompleted: true, isWarmup: false })),
            { repsMin: item.repsMin, repsMax: item.repsMax, targetRpe: item.targetRpe },
            item.exercise.plateStep ?? user.plateStep,
          );
          return {
            exerciseId: item.exerciseId,
            order,
            supersetGroup: item.supersetGroup,
            targetSets: item.sets,
            targetRepsMin: item.repsMin,
            targetRepsMax: item.repsMax,
            targetRpe: item.targetRpe,
            restSeconds: item.restSeconds,
            note: item.note,
            sets: {
              create: Array.from({ length: Math.max(1, item.sets) }, (_, index) => ({
                setNumber: index + 1,
                weight: suggestion.weight ?? item.targetWeight ?? null,
                reps: suggestion.reps ?? item.repsMin ?? null,
              })),
            },
          };
        }),
      },
    },
  });

  revalidatePath("/", "layout");
  return { ok: true, data: { sessionId: session.id } };
}

/**
 * Autosave serii. Klient wysyła paczkę zmian, serwer waliduje, przelicza
 * objętość i szacowane 1RM, a potem odświeża sumy całego treningu.
 */
export async function saveSets(input: unknown): Promise<ActionState<{ totals: ReturnType<typeof sessionTotals> }>> {
  const user = await requireUser();
  const parsed = setBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane serii." };
  }

  const session = await prisma.workoutSession.findFirst({
    where: { id: parsed.data.sessionId, userId: user.id },
    select: { id: true },
  });
  if (!session) return { ok: false, error: "Trening nie należy do Ciebie." };

  // Serie muszą należeć do tej sesji - inaczej cudzy identyfikator mógłby tu wejść.
  const owned = await prisma.workoutSet.findMany({
    where: {
      id: { in: parsed.data.sets.map((s) => s.setId) },
      sessionExercise: { sessionId: session.id },
    },
    select: { id: true, weight: true, reps: true, rpe: true, rir: true, isWarmup: true, isCompleted: true, note: true },
  });
  const ownedById = new Map(owned.map((s) => [s.id, s]));

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  for (const change of parsed.data.sets) {
    const current = ownedById.get(change.setId);
    if (!current) continue;

    const weight = change.weight === undefined ? current.weight : change.weight;
    const reps = change.reps === undefined ? current.reps : change.reps;
    const rpe = change.rpe === undefined ? current.rpe : change.rpe;
    const rir = change.rir === undefined ? current.rir : change.rir;
    const isWarmup = change.isWarmup ?? current.isWarmup;
    const isCompleted = change.isCompleted ?? current.isCompleted;

    updates.push(
      prisma.workoutSet.update({
        where: { id: change.setId },
        data: {
          weight, reps, rpe, rir, isWarmup, isCompleted,
          note: change.note === undefined ? current.note : change.note,
          completedAt: isCompleted ? new Date() : null,
          volume: isCompleted && !isWarmup ? (weight ?? 0) * (reps ?? 0) : 0,
          estimated1rm: estimate1rm(weight, reps, rpe),
        },
      }),
    );
  }

  if (updates.length) await prisma.$transaction(updates);
  const totals = await refreshSessionTotals(session.id);
  return { ok: true, data: { totals } };
}

/** Przeliczenie sum treningu po każdej zmianie - statystyki czytają gotowe wartości. */
async function refreshSessionTotals(sessionId: string) {
  const sets = await prisma.workoutSet.findMany({
    where: { sessionExercise: { sessionId } },
    select: { weight: true, reps: true, rpe: true, isWarmup: true, isCompleted: true },
  });
  const totals = sessionTotals(sets);
  await prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      totalVolume: totals.volume,
      totalSets: totals.sets,
      totalReps: totals.reps,
      avgRpe: totals.avgRpe,
    },
  });
  return totals;
}

export async function addSetToExercise(sessionExerciseId: string): Promise<ActionState<{ setId: string }>> {
  const user = await requireUser();
  const entry = await prisma.sessionExercise.findFirst({
    where: { id: sessionExerciseId, session: { userId: user.id } },
    include: { sets: { orderBy: { setNumber: "desc" }, take: 1 } },
  });
  if (!entry) return { ok: false, error: "Nie znaleziono ćwiczenia w tym treningu." };

  const last = entry.sets[0];
  const created = await prisma.workoutSet.create({
    data: {
      sessionExerciseId,
      setNumber: (last?.setNumber ?? 0) + 1,
      weight: last?.weight ?? null,
      reps: last?.reps ?? null,
    },
  });
  return { ok: true, data: { setId: created.id } };
}

export async function deleteSet(setId: string): Promise<ActionState> {
  const user = await requireUser();
  const set = await prisma.workoutSet.findFirst({
    where: { id: setId, sessionExercise: { session: { userId: user.id } } },
    select: { id: true, sessionExercise: { select: { sessionId: true } } },
  });
  if (!set) return { ok: false, error: "Nie znaleziono serii." };

  await prisma.workoutSet.delete({ where: { id: setId } });
  await refreshSessionTotals(set.sessionExercise.sessionId);
  return { ok: true };
}

export async function addExerciseToSession(sessionId: string, exerciseId: string): Promise<ActionState> {
  const user = await requireUser();
  const [session, exercise] = await Promise.all([
    prisma.workoutSession.findFirst({ where: { id: sessionId, userId: user.id }, include: { entries: true } }),
    prisma.exercise.findFirst({ where: { id: exerciseId, OR: [{ userId: null }, { userId: user.id }] } }),
  ]);
  if (!session || !exercise) return { ok: false, error: "Nie znaleziono treningu lub ćwiczenia." };

  const previous = await getPreviousPerformances(user.id, [exerciseId], sessionId);
  const suggestion = suggestNextWeight(
    (previous[exerciseId]?.sets ?? []).map((s) => ({ ...s, isCompleted: true, isWarmup: false })),
    {},
    exercise.plateStep ?? user.plateStep,
  );

  await prisma.sessionExercise.create({
    data: {
      sessionId,
      exerciseId,
      order: session.entries.length,
      targetSets: 3,
      restSeconds: 120,
      sets: {
        create: Array.from({ length: 3 }, (_, index) => ({
          setNumber: index + 1,
          weight: suggestion.weight,
          reps: suggestion.reps,
        })),
      },
    },
  });

  revalidatePath(`/trening/${sessionId}`);
  return { ok: true };
}

export async function removeExerciseFromSession(sessionExerciseId: string): Promise<ActionState> {
  const user = await requireUser();
  const entry = await prisma.sessionExercise.findFirst({
    where: { id: sessionExerciseId, session: { userId: user.id } },
    select: { id: true, sessionId: true },
  });
  if (!entry) return { ok: false, error: "Nie znaleziono ćwiczenia." };

  await prisma.sessionExercise.delete({ where: { id: sessionExerciseId } });
  await refreshSessionTotals(entry.sessionId);
  revalidatePath(`/trening/${entry.sessionId}`);
  return { ok: true };
}

export async function updateExerciseNote(sessionExerciseId: string, note: string): Promise<ActionState> {
  const user = await requireUser();
  const entry = await prisma.sessionExercise.findFirst({
    where: { id: sessionExerciseId, session: { userId: user.id } },
    select: { id: true },
  });
  if (!entry) return { ok: false, error: "Nie znaleziono ćwiczenia." };

  await prisma.sessionExercise.update({
    where: { id: sessionExerciseId },
    data: { note: note.trim().slice(0, 500) || null },
  });
  return { ok: true };
}

/** Zamknięcie treningu: sprzątamy puste serie, aktualizujemy rekordy i kalendarz. */
export async function finishWorkoutSession(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = finishSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };

  const session = await prisma.workoutSession.findFirst({
    where: { id: parsed.data.sessionId, userId: user.id },
    include: { entries: { include: { sets: true } } },
  });
  if (!session) return { ok: false, error: "Nie znaleziono treningu." };

  // Serie, których nie odhaczyłeś, nie trafiają do historii - inaczej statystyki kłamią.
  const emptySetIds = session.entries.flatMap((entry) => entry.sets.filter((s) => !s.isCompleted).map((s) => s.id));
  const emptyEntryIds = session.entries
    .filter((entry) => entry.sets.every((s) => !s.isCompleted))
    .map((entry) => entry.id);

  await prisma.$transaction([
    prisma.workoutSet.deleteMany({ where: { id: { in: emptySetIds } } }),
    prisma.sessionExercise.deleteMany({ where: { id: { in: emptyEntryIds } } }),
    prisma.workoutSession.update({
      where: { id: session.id },
      data: {
        finishedAt: new Date(),
        note: parsed.data.note ?? session.note,
        rating: parsed.data.rating ?? session.rating,
        bodyWeight: parsed.data.bodyWeight ?? session.bodyWeight,
      },
    }),
  ]);

  await refreshSessionTotals(session.id);
  await updatePersonalRecords(user.id, session.id);

  if (parsed.data.bodyWeight) {
    await prisma.bodyWeightEntry.upsert({
      where: { userId_date: { userId: user.id, date: session.date } },
      create: { userId: user.id, date: session.date, weight: parsed.data.bodyWeight },
      update: { weight: parsed.data.bodyWeight },
    });
  }

  // Kalendarz ma pokazywać, że zaplanowany trening został wykonany.
  await prisma.scheduledWorkout.updateMany({
    where: { userId: user.id, date: session.date, workoutId: session.workoutId ?? undefined },
    data: { status: "COMPLETED", sessionId: session.id },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Rekordy liczymy po zakończeniu treningu - jeden przebieg po ćwiczeniach sesji. */
async function updatePersonalRecords(userId: string, sessionId: string): Promise<void> {
  const entries = await prisma.sessionExercise.findMany({
    where: { sessionId },
    include: { sets: { where: { isCompleted: true, isWarmup: false } }, session: { select: { date: true } } },
  });

  for (const entry of entries) {
    if (entry.sets.length === 0) continue;
    const candidates = prCandidates(entry.sets);
    const best = entry.sets.reduce<{ weight: number | null; reps: number | null } | null>((acc, set) => {
      const est = estimate1rm(set.weight, set.reps, set.rpe);
      const accEst = acc ? estimate1rm(acc.weight, acc.reps, null) : null;
      return est != null && (accEst == null || est > accEst) ? { weight: set.weight, reps: set.reps } : acc;
    }, null);

    const rows: { type: "MAX_WEIGHT" | "MAX_REPS" | "BEST_E1RM" | "MAX_VOLUME"; value: number | null; weight?: number | null; reps?: number | null }[] = [
      { type: "MAX_WEIGHT", value: candidates.maxWeight, weight: candidates.maxWeight, reps: null },
      { type: "MAX_REPS", value: candidates.maxReps, reps: candidates.maxReps },
      { type: "BEST_E1RM", value: candidates.bestE1rm, weight: best?.weight ?? null, reps: best?.reps ?? null },
      { type: "MAX_VOLUME", value: candidates.maxVolume },
    ];

    for (const row of rows) {
      if (row.value == null) continue;
      const existing = await prisma.personalRecord.findUnique({
        where: { userId_exerciseId_type: { userId, exerciseId: entry.exerciseId, type: row.type } },
      });
      if (existing && existing.value >= row.value) continue;

      await prisma.personalRecord.upsert({
        where: { userId_exerciseId_type: { userId, exerciseId: entry.exerciseId, type: row.type } },
        create: {
          userId, exerciseId: entry.exerciseId, type: row.type, value: row.value,
          weight: row.weight ?? null, reps: row.reps ?? null, achievedAt: entry.session.date, sessionId,
        },
        update: {
          value: row.value, weight: row.weight ?? null, reps: row.reps ?? null,
          achievedAt: entry.session.date, sessionId,
        },
      });
    }
  }
}

export async function deleteWorkoutSession(sessionId: string): Promise<ActionState> {
  const user = await requireUser();
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return { ok: false, error: "Nie znaleziono treningu." };

  await prisma.workoutSession.delete({ where: { id: sessionId } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateSessionMeta(
  sessionId: string,
  data: { name?: string; note?: string | null; rating?: number | null },
): Promise<ActionState> {
  const user = await requireUser();
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return { ok: false, error: "Nie znaleziono treningu." };

  await prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      name: data.name?.trim() || session.name,
      note: data.note === undefined ? session.note : data.note?.slice(0, 1000) || null,
      rating: data.rating === undefined ? session.rating : data.rating,
    },
  });
  return { ok: true };
}

/* ---------------------------------------------------------------- kalendarz */

export async function scheduleWorkout(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowe dane wpisu w kalendarzu." };

  if (parsed.data.workoutId) {
    const workout = await prisma.workout.findFirst({
      where: { id: parsed.data.workoutId, plan: { userId: user.id } },
      select: { id: true },
    });
    if (!workout) return { ok: false, error: "Nie znaleziono treningu w Twoich planach." };
  }

  const date = fromIsoDate(parsed.data.date);
  const existing = await prisma.scheduledWorkout.findFirst({
    where: { userId: user.id, date, workoutId: parsed.data.workoutId ?? null },
  });

  if (existing) {
    await prisma.scheduledWorkout.update({
      where: { id: existing.id },
      data: { status: parsed.data.status, note: parsed.data.note ?? null },
    });
  } else {
    await prisma.scheduledWorkout.create({
      data: {
        userId: user.id,
        date,
        workoutId: parsed.data.workoutId ?? null,
        status: parsed.data.status,
        note: parsed.data.note ?? null,
      },
    });
  }

  revalidatePath("/kalendarz");
  return { ok: true };
}

export async function unscheduleWorkout(scheduledId: string): Promise<ActionState> {
  const user = await requireUser();
  const entry = await prisma.scheduledWorkout.findFirst({ where: { id: scheduledId, userId: user.id } });
  if (!entry) return { ok: false, error: "Nie znaleziono wpisu." };

  await prisma.scheduledWorkout.delete({ where: { id: scheduledId } });
  revalidatePath("/kalendarz");
  return { ok: true };
}
