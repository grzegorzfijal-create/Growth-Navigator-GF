import "server-only";

import { prisma } from "@/server/db";
import { fromIsoDate, isoWeekday, todayIso } from "@/lib/date";
import { sumMacros, suggestedMacros } from "@/lib/nutrition";
import { trendSlope } from "@/lib/training";
import type { User } from "@prisma/client";

import { getExerciseProgress, getRecentSessions, getTrainingStats } from "./training";

/** Wszystko, co widać na pierwszym ekranie - jedno miejsce, jedno przejście po bazie. */
export async function getDashboardData(user: User, today = todayIso()) {
  const date = fromIsoDate(today);

  const [scheduled, sessionsToday, stats, recent, bodyWeights, meals, goal, supplements, supplementLogs, records] =
    await Promise.all([
      prisma.scheduledWorkout.findMany({
        where: { userId: user.id, date },
        include: {
          workout: {
            include: { exercises: { select: { id: true } }, plan: { select: { name: true } } },
          },
        },
      }),
      prisma.workoutSession.findMany({
        where: { userId: user.id, date },
        orderBy: { startedAt: "desc" },
        include: { entries: { select: { id: true } } },
      }),
      getTrainingStats(user.id, today),
      getRecentSessions(user.id, 5),
      prisma.bodyWeightEntry.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
        take: 30,
      }),
      prisma.meal.findMany({
        where: { userId: user.id, date },
        include: { entries: true },
        orderBy: { order: "asc" },
      }),
      prisma.nutritionGoal.findUnique({ where: { userId: user.id } }),
      prisma.supplement.findMany({ where: { userId: user.id, isActive: true }, orderBy: { order: "asc" } }),
      prisma.supplementLog.findMany({ where: { userId: user.id, date } }),
      prisma.personalRecord.findMany({
        where: { userId: user.id, type: "BEST_E1RM" },
        orderBy: { achievedAt: "desc" },
        take: 3,
        include: { exercise: { select: { id: true, name: true } } },
      }),
    ]);

  const activeSession = sessionsToday.find((s) => !s.finishedAt) ?? null;
  const completedToday = sessionsToday.filter((s) => s.finishedAt);
  const plannedToday = scheduled.filter((s) => s.status === "PLANNED" && s.workout);

  const nutritionToday = sumMacros(meals.flatMap((meal) => meal.entries));
  const targets = goal ?? suggestedMacros({
    sex: user.sex,
    weightKg: bodyWeights[0]?.weight ?? null,
    heightCm: user.heightCm,
    age: user.birthYear ? new Date().getFullYear() - user.birthYear : null,
    activity: user.activity,
    goal: user.goal,
  });

  const weekday = isoWeekday(today);
  const supplementsToday = supplements
    .filter((supplement) => supplement.daysOfWeek.includes(weekday))
    .map((supplement) => ({
      ...supplement,
      takenTimings: supplementLogs.filter((log) => log.supplementId === supplement.id).map((log) => log.timing),
    }));

  // Wykres na dashboardzie pokazuje ćwiczenie, które trenujesz najczęściej.
  const topExercise = await prisma.sessionExercise.groupBy({
    by: ["exerciseId"],
    where: { session: { userId: user.id, finishedAt: { not: null } } },
    _count: { exerciseId: true },
    orderBy: { _count: { exerciseId: "desc" } },
    take: 1,
  });

  const featuredExerciseId = topExercise[0]?.exerciseId ?? null;
  const [featuredExercise, featuredProgress] = featuredExerciseId
    ? await Promise.all([
        prisma.exercise.findUnique({ where: { id: featuredExerciseId }, select: { id: true, name: true } }),
        getExerciseProgress(user.id, featuredExerciseId),
      ])
    : [null, []];

  const weights = [...bodyWeights].reverse().map((entry) => entry.weight);
  // Zmiana masy ciała mówi więcej niż nachylenie regresji - pokazujemy różnicę od najstarszego pomiaru w oknie.
  const weightDelta =
    bodyWeights.length > 1 ? Math.round((bodyWeights[0].weight - bodyWeights[bodyWeights.length - 1].weight) * 10) / 10 : null;
  const weightSpanDays = bodyWeights.length > 1
    ? Math.round((bodyWeights[0].date.getTime() - bodyWeights[bodyWeights.length - 1].date.getTime()) / 86400000)
    : null;

  return {
    today,
    activeSession,
    completedToday,
    plannedToday,
    stats,
    recent,
    bodyWeight: {
      latest: bodyWeights[0] ?? null,
      trend: trendSlope(weights),
      delta: weightDelta,
      spanDays: weightSpanDays,
      series: [...bodyWeights].reverse().map((entry) => ({
        date: entry.date.toISOString().slice(0, 10),
        weight: entry.weight,
      })),
    },
    nutrition: { totals: nutritionToday, targets, mealCount: meals.length },
    supplements: supplementsToday,
    records,
    featured: featuredExercise ? { exercise: featuredExercise, progress: featuredProgress } : null,
  };
}
