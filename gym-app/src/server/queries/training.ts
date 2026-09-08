import "server-only";

import { prisma } from "@/server/db";
import { addDays, startOfWeek, todayIso, toIsoDate, fromIsoDate } from "@/lib/date";
import {
  bestSet,
  estimate1rm,
  sessionTotals,
  suggestNextWeight,
  trainingFrequency,
  weeklyStreak,
  type SetLike,
} from "@/lib/training";

/** Sesja z pełną zawartością - tego używa ekran treningu. */
export async function getSessionDetail(userId: string, sessionId: string) {
  return prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      workout: { select: { id: true, name: true, planId: true } },
      entries: {
        orderBy: { order: "asc" },
        include: {
          exercise: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });
}

export type SessionDetail = NonNullable<Awaited<ReturnType<typeof getSessionDetail>>>;

/** Trening w toku - jest tylko jeden, bo nikt nie robi dwóch naraz. */
export async function getActiveSession(userId: string) {
  return prisma.workoutSession.findFirst({
    where: { userId, finishedAt: null },
    orderBy: { startedAt: "desc" },
    include: { entries: { include: { sets: true } } },
  });
}

export type PreviousPerformance = {
  date: string;
  sessionId: string;
  sets: { weight: number | null; reps: number | null; rpe: number | null; rir: number | null }[];
};

/**
 * Ostatnie wykonanie każdego z ćwiczeń - bez tego użytkownik musi pamiętać,
 * co robił poprzednio. Jedno zapytanie na cały trening, nie jedno na ćwiczenie.
 */
export async function getPreviousPerformances(
  userId: string,
  exerciseIds: string[],
  excludeSessionId?: string,
): Promise<Record<string, PreviousPerformance>> {
  if (exerciseIds.length === 0) return {};

  const entries = await prisma.sessionExercise.findMany({
    where: {
      exerciseId: { in: exerciseIds },
      session: {
        userId,
        finishedAt: { not: null },
        ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      },
      sets: { some: { isCompleted: true, isWarmup: false } },
    },
    orderBy: [{ session: { date: "desc" } }, { session: { startedAt: "desc" } }],
    include: {
      session: { select: { id: true, date: true } },
      sets: { where: { isCompleted: true, isWarmup: false }, orderBy: { setNumber: "asc" } },
    },
  });

  const result: Record<string, PreviousPerformance> = {};
  for (const entry of entries) {
    if (result[entry.exerciseId]) continue; // lista jest posortowana malejąco, pierwszy trafiony wygrywa
    result[entry.exerciseId] = {
      date: toIsoDate(entry.session.date),
      sessionId: entry.session.id,
      sets: entry.sets.map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe, rir: s.rir })),
    };
  }
  return result;
}

/** Podpowiedzi ciężaru dla całego treningu naraz. */
export async function getSuggestions(
  userId: string,
  targets: { exerciseId: string; repsMin?: number | null; repsMax?: number | null; targetRpe?: number | null; plateStep?: number | null }[],
  excludeSessionId?: string,
) {
  const previous = await getPreviousPerformances(userId, targets.map((t) => t.exerciseId), excludeSessionId);
  return Object.fromEntries(
    targets.map((target) => {
      const history = previous[target.exerciseId];
      const sets: SetLike[] = (history?.sets ?? []).map((s) => ({ ...s, isCompleted: true, isWarmup: false }));
      return [
        target.exerciseId,
        {
          previous: history ?? null,
          suggestion: suggestNextWeight(sets, target, target.plateStep ?? 2.5),
        },
      ];
    }),
  );
}

/** Historia jednego ćwiczenia - punkty do wykresów progresji. */
export async function getExerciseProgress(userId: string, exerciseId: string) {
  const entries = await prisma.sessionExercise.findMany({
    where: { exerciseId, session: { userId, finishedAt: { not: null } } },
    orderBy: { session: { date: "asc" } },
    include: {
      session: { select: { id: true, date: true, name: true } },
      sets: { where: { isCompleted: true, isWarmup: false }, orderBy: { setNumber: "asc" } },
    },
  });

  return entries
    .filter((entry) => entry.sets.length > 0)
    .map((entry) => {
      const totals = sessionTotals(entry.sets);
      const best = bestSet(entry.sets);
      return {
        sessionId: entry.session.id,
        date: toIsoDate(entry.session.date),
        sessionName: entry.session.name,
        volume: totals.volume,
        sets: totals.sets,
        reps: totals.reps,
        avgRpe: totals.avgRpe,
        topWeight: Math.max(...entry.sets.map((s) => s.weight ?? 0)),
        bestReps: Math.max(...entry.sets.map((s) => s.reps ?? 0)),
        estimated1rm: best?.estimated1rm ?? null,
        setDetails: entry.sets.map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe })),
      };
    });
}

export async function getPersonalRecords(userId: string) {
  return prisma.personalRecord.findMany({
    where: { userId },
    include: { exercise: { select: { id: true, name: true, category: true, unit: true } } },
    orderBy: { achievedAt: "desc" },
  });
}

export async function getRecentSessions(userId: string, take = 10) {
  return prisma.workoutSession.findMany({
    where: { userId, finishedAt: { not: null } },
    orderBy: [{ date: "desc" }, { startedAt: "desc" }],
    take,
    include: { entries: { select: { id: true } } },
  });
}

/** Statystyki na dashboard i ekran statystyk - liczone z pól zdenormalizowanych. */
export async function getTrainingStats(userId: string, today = todayIso()) {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, finishedAt: { not: null } },
    orderBy: { date: "desc" },
    select: {
      id: true, date: true, name: true, totalVolume: true, totalSets: true,
      totalReps: true, avgRpe: true, startedAt: true, finishedAt: true, rating: true,
    },
  });

  const dates = sessions.map((s) => toIsoDate(s.date));
  const weekStart = startOfWeek(today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const inRange = (from: string) => sessions.filter((s) => toIsoDate(s.date) >= from);

  const thisWeek = inRange(weekStart);
  const thisMonth = inRange(monthStart);
  const durations = sessions
    .filter((s) => s.finishedAt)
    .map((s) => (s.finishedAt!.getTime() - s.startedAt.getTime()) / 60000)
    .filter((m) => m > 0 && m < 360);

  const rpes = sessions.map((s) => s.avgRpe).filter((r): r is number => r != null);

  return {
    total: sessions.length,
    weekCount: thisWeek.length,
    weekVolume: Math.round(thisWeek.reduce((sum, s) => sum + s.totalVolume, 0)),
    weekSets: thisWeek.reduce((sum, s) => sum + s.totalSets, 0),
    monthCount: thisMonth.length,
    monthVolume: Math.round(thisMonth.reduce((sum, s) => sum + s.totalVolume, 0)),
    totalVolume: Math.round(sessions.reduce((sum, s) => sum + s.totalVolume, 0)),
    totalSets: sessions.reduce((sum, s) => sum + s.totalSets, 0),
    avgDuration: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    avgRpe: rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null,
    streak: weeklyStreak(dates, today),
    last30: trainingFrequency(dates, 30, today),
    dates,
  };
}

/** Objętość i liczba serii per partia mięśniowa w zadanym oknie czasu. */
export async function getVolumeByMuscle(userId: string, fromIso: string, toIsoDateStr: string) {
  const entries = await prisma.sessionExercise.findMany({
    where: {
      session: { userId, finishedAt: { not: null }, date: { gte: fromIsoDate(fromIso), lte: fromIsoDate(toIsoDateStr) } },
    },
    include: {
      exercise: { select: { category: true } },
      sets: { where: { isCompleted: true, isWarmup: false } },
    },
  });

  const map = new Map<string, { category: string; sets: number; volume: number }>();
  for (const entry of entries) {
    const key = entry.exercise.category;
    const current = map.get(key) ?? { category: key, sets: 0, volume: 0 };
    current.sets += entry.sets.length;
    current.volume += entry.sets.reduce((sum, s) => sum + s.volume, 0);
    map.set(key, current);
  }
  return [...map.values()]
    .map((row) => ({ ...row, volume: Math.round(row.volume) }))
    .sort((a, b) => b.sets - a.sets);
}

/** Tygodniowa objętość - słupki na ekranie statystyk. */
export async function getWeeklyVolume(userId: string, weeks = 8, today = todayIso()) {
  const start = addDays(startOfWeek(today), -7 * (weeks - 1));
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, finishedAt: { not: null }, date: { gte: fromIsoDate(start) } },
    select: { date: true, totalVolume: true, totalSets: true },
  });

  const buckets: { week: string; label: string; volume: number; sets: number; sessions: number }[] = [];
  for (let i = 0; i < weeks; i += 1) {
    const weekStart = addDays(start, i * 7);
    const weekEnd = addDays(weekStart, 6);
    const inWeek = sessions.filter((s) => {
      const iso = toIsoDate(s.date);
      return iso >= weekStart && iso <= weekEnd;
    });
    buckets.push({
      week: weekStart,
      label: `${fromIsoDate(weekStart).getDate()}.${fromIsoDate(weekStart).getMonth() + 1}`,
      volume: Math.round(inWeek.reduce((sum, s) => sum + s.totalVolume, 0)),
      sets: inWeek.reduce((sum, s) => sum + s.totalSets, 0),
      sessions: inWeek.length,
    });
  }
  return buckets;
}

/** Dane kalendarza: co zaplanowane, co wykonane - w jednym miesiącu. */
export async function getCalendarMonth(userId: string, year: number, month: number) {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month + 2, 0); // z zapasem, żeby złapać brzegi siatki
  const [sessions, scheduled] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId, date: { gte: from, lte: to } },
      select: {
        id: true, date: true, name: true, finishedAt: true, startedAt: true,
        totalVolume: true, totalSets: true, rating: true,
      },
      orderBy: { startedAt: "asc" },
    }),
    prisma.scheduledWorkout.findMany({
      where: { userId, date: { gte: from, lte: to } },
      include: { workout: { select: { id: true, name: true, plan: { select: { name: true } } } } },
      orderBy: { date: "asc" },
    }),
  ]);

  return {
    sessions: sessions.map((s) => ({
      ...s,
      iso: toIsoDate(s.date),
      durationMinutes: s.finishedAt ? Math.round((s.finishedAt.getTime() - s.startedAt.getTime()) / 60000) : null,
    })),
    scheduled: scheduled.map((s) => ({ ...s, iso: toIsoDate(s.date) })),
  };
}

/** Historia z filtrami - data od/do, konkretny trening, konkretne ćwiczenie. */
export async function getHistory(
  userId: string,
  filters: { from?: string; to?: string; workoutId?: string; exerciseId?: string } = {},
) {
  return prisma.workoutSession.findMany({
    where: {
      userId,
      finishedAt: { not: null },
      ...(filters.from ? { date: { gte: fromIsoDate(filters.from) } } : {}),
      ...(filters.to ? { date: { lte: fromIsoDate(filters.to) } } : {}),
      ...(filters.workoutId ? { workoutId: filters.workoutId } : {}),
      ...(filters.exerciseId ? { entries: { some: { exerciseId: filters.exerciseId } } } : {}),
    },
    orderBy: [{ date: "desc" }, { startedAt: "desc" }],
    take: 100,
    include: {
      entries: {
        include: {
          exercise: { select: { name: true } },
          sets: { where: { isCompleted: true } },
        },
      },
    },
  });
}

export async function getPlans(userId: string) {
  return prisma.workoutPlan.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    include: {
      workouts: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: { exercise: { select: { id: true, name: true, category: true, unit: true } } },
          },
        },
      },
    },
  });
}

export async function getWorkoutWithExercises(userId: string, workoutId: string) {
  return prisma.workout.findFirst({
    where: { id: workoutId, plan: { userId } },
    include: {
      plan: { select: { id: true, name: true } },
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: true },
      },
    },
  });
}

/** Ćwiczenia systemowe + własne użytkownika. */
export async function getExercises(userId: string) {
  return prisma.exercise.findMany({
    where: { OR: [{ userId: null }, { userId }], isArchived: false },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getExerciseById(userId: string, exerciseId: string) {
  return prisma.exercise.findFirst({
    where: { id: exerciseId, OR: [{ userId: null }, { userId }] },
  });
}

/** Ostatnie szacowane 1RM - używane w kafelku "najlepszy wynik". */
export async function getRecentBestLifts(userId: string, take = 5) {
  const entries = await prisma.sessionExercise.findMany({
    where: { session: { userId, finishedAt: { not: null } }, sets: { some: { isCompleted: true, isWarmup: false } } },
    orderBy: { session: { date: "desc" } },
    take: 30,
    include: {
      exercise: { select: { name: true, id: true } },
      session: { select: { date: true } },
      sets: { where: { isCompleted: true, isWarmup: false } },
    },
  });

  return entries
    .map((entry) => {
      const best = bestSet(entry.sets);
      if (!best) return null;
      return {
        exerciseId: entry.exercise.id,
        exerciseName: entry.exercise.name,
        date: toIsoDate(entry.session.date),
        weight: best.weight ?? 0,
        reps: best.reps ?? 0,
        rpe: best.rpe,
        estimated1rm: best.estimated1rm ?? estimate1rm(best.weight, best.reps, best.rpe),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .slice(0, take);
}
