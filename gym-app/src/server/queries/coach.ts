import "server-only";

import { buildInsights, type CoachInput, type CoachInsightDraft } from "@/lib/coach";
import { CATEGORY_LABELS } from "@/lib/labels";
import { addDays, fromIsoDate, startOfWeek, toIsoDate, todayIso } from "@/lib/date";
import { prisma } from "@/server/db";

/**
 * Zbiera dane wejściowe dla warstwy wniosków. To jest miejsce, w które w przyszłości
 * wpina się model językowy: CoachInput jest już gotowym, zwięzłym opisem sytuacji
 * zawodnika, a generator (buildInsights) można podmienić bez zmian w UI.
 */
export async function getCoachInsights(userId: string, today = todayIso()): Promise<CoachInsightDraft[]> {
  const windowStart = addDays(today, -56);
  const weekStart = startOfWeek(today);

  const [entries, sessions, meals, goal, bodyWeights] = await Promise.all([
    prisma.sessionExercise.findMany({
      where: {
        session: { userId, finishedAt: { not: null }, date: { gte: fromIsoDate(windowStart) } },
      },
      include: {
        exercise: { select: { id: true, name: true, category: true } },
        session: { select: { date: true } },
        sets: { where: { isCompleted: true, isWarmup: false } },
      },
      orderBy: { session: { date: "asc" } },
    }),
    prisma.workoutSession.findMany({
      where: { userId, finishedAt: { not: null }, date: { gte: fromIsoDate(addDays(today, -60)) } },
      select: { date: true, avgRpe: true },
    }),
    prisma.meal.findMany({
      where: { userId, date: { gte: fromIsoDate(addDays(today, -7)) } },
      include: { entries: true },
    }),
    prisma.nutritionGoal.findUnique({ where: { userId } }),
    prisma.bodyWeightEntry.findMany({
      where: { userId, date: { gte: fromIsoDate(addDays(today, -30)) } },
      orderBy: { date: "asc" },
    }),
  ]);

  // Progresja: pierwszy i ostatni wynik każdego ćwiczenia w oknie analizy.
  const byExercise = new Map<string, { name: string; points: { date: string; e1rm: number | null; rpe: number | null }[] }>();
  for (const entry of entries) {
    if (entry.sets.length === 0) continue;
    const best = entry.sets.reduce<number | null>(
      (max, set) => (set.estimated1rm != null && (max == null || set.estimated1rm > max) ? set.estimated1rm : max),
      null,
    );
    const rpes = entry.sets.map((set) => set.rpe).filter((rpe): rpe is number => rpe != null);
    const bucket = byExercise.get(entry.exercise.id) ?? { name: entry.exercise.name, points: [] };
    bucket.points.push({
      date: toIsoDate(entry.session.date),
      e1rm: best,
      rpe: rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null,
    });
    byExercise.set(entry.exercise.id, bucket);
  }

  const lifts: CoachInput["lifts"] = [...byExercise.entries()]
    .filter(([, value]) => value.points.length >= 3)
    .map(([exerciseId, value]) => {
      const first = value.points[0];
      const last = value.points[value.points.length - 1];
      return {
        exerciseId,
        name: value.name,
        firstE1rm: first.e1rm,
        lastE1rm: last.e1rm,
        firstDate: first.date,
        lastDate: last.date,
        avgRpeFirst: first.rpe,
        avgRpeLast: last.rpe,
      };
    });

  // Objętość per partia: bieżący tydzień kontra średnia z wcześniejszych tygodni okna.
  const groupStats = new Map<string, { thisWeek: number; before: number; weeks: Set<string> }>();
  for (const entry of entries) {
    const iso = toIsoDate(entry.session.date);
    const key = entry.exercise.category;
    const bucket = groupStats.get(key) ?? { thisWeek: 0, before: 0, weeks: new Set<string>() };
    if (iso >= weekStart) bucket.thisWeek += entry.sets.length;
    else {
      bucket.before += entry.sets.length;
      bucket.weeks.add(startOfWeek(iso));
    }
    groupStats.set(key, bucket);
  }

  // Wnioski czyta człowiek, więc partia idzie po polsku, nie jako enum z bazy.
  const muscleGroups: CoachInput["muscleGroups"] = [...groupStats.entries()].map(([category, value]) => ({
    category: CATEGORY_LABELS[category] ?? category,
    setsThisWeek: value.thisWeek,
    avgSetsPrevWeeks: value.weeks.size ? value.before / value.weeks.size : 0,
  }));

  const dates = sessions.map((session) => toIsoDate(session.date));
  const last30 = dates.filter((date) => date >= addDays(today, -29)).length;
  const previous30 = dates.filter((date) => date < addDays(today, -29) && date >= addDays(today, -59)).length;

  const rpeThisWeek = sessions
    .filter((session) => toIsoDate(session.date) >= weekStart)
    .map((session) => session.avgRpe)
    .filter((rpe): rpe is number => rpe != null);
  const rpeBefore = sessions
    .filter((session) => toIsoDate(session.date) < weekStart)
    .map((session) => session.avgRpe)
    .filter((rpe): rpe is number => rpe != null);
  const mean = (values: number[]) =>
    values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;

  const days = new Set(meals.map((meal) => toIsoDate(meal.date))).size || 1;
  const nutritionTotals = meals.flatMap((meal) => meal.entries).reduce(
    (acc, entry) => ({ calories: acc.calories + entry.calories, protein: acc.protein + entry.protein }),
    { calories: 0, protein: 0 },
  );

  const input: CoachInput = {
    lifts,
    muscleGroups,
    consistency: { last30, previous30, perWeek: Math.round((last30 / 30) * 7 * 10) / 10 },
    nutrition: meals.length
      ? {
          avgCalories: nutritionTotals.calories / days,
          avgProtein: nutritionTotals.protein / days,
          targetCalories: goal?.calories ?? null,
          targetProtein: goal?.protein ?? null,
        }
      : null,
    bodyWeight:
      bodyWeights.length > 1
        ? {
            deltaKg: Math.round((bodyWeights[bodyWeights.length - 1].weight - bodyWeights[0].weight) * 10) / 10,
            days: 30,
          }
        : null,
    fatigue: { avgRpeThisWeek: mean(rpeThisWeek), avgRpePrevWeeks: mean(rpeBefore) },
  };

  return buildInsights(input);
}
