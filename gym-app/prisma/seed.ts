/**
 * Wypełnia bazę danymi, na których od razu widać, jak aplikacja działa:
 * ćwiczenia systemowe, produkty, konto demo z ośmioma tygodniami historii,
 * masą ciała, posiłkami i suplementacją.
 *
 * Uruchomienie: npm run seed
 */
process.loadEnvFile?.(".env");

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { STARTER_FOODS, SYSTEM_EXERCISES, MEAL_PRESETS } from "../src/lib/starter-data.ts";
import { installStarterData } from "../src/server/seed-shared.ts";
import { estimate1rm, prCandidates, sessionTotals } from "../src/lib/training.ts";
import { addDays, fromIsoDate, startOfWeek, toIsoDate } from "../src/lib/date.ts";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@gym.app";
const DEMO_PASSWORD = "trening123";

/** Deterministyczny generator - seed ma dawać ten sam wynik przy każdym uruchomieniu. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = makeRandom(20260908);

/** Startowe ciężary i tygodniowy przyrost dla historii demo. */
const LIFT_PROFILE: Record<string, { start: number; weeklyStep: number; step: number }> = {
  "Wyciskanie sztangi leżąc": { start: 72.5, weeklyStep: 1.25, step: 2.5 },
  "Wyciskanie hantli na skosie": { start: 24, weeklyStep: 0.5, step: 2 },
  "Wyciskanie hantli nad głowę": { start: 20, weeklyStep: 0.5, step: 2 },
  "Wznosy bokiem": { start: 10, weeklyStep: 0.25, step: 1 },
  "Prostowanie ramion na wyciągu": { start: 25, weeklyStep: 0.6, step: 1.25 },
  "Martwy ciąg": { start: 120, weeklyStep: 2.5, step: 5 },
  "Podciąganie nachwytem": { start: 0, weeklyStep: 1.25, step: 2.5 },
  "Wiosłowanie sztangą": { start: 60, weeklyStep: 1.25, step: 2.5 },
  "Ściąganie drążka wyciągu górnego": { start: 55, weeklyStep: 1.25, step: 2.5 },
  "Face pull": { start: 20, weeklyStep: 0.6, step: 1.25 },
  "Uginanie sztangą stojąc": { start: 30, weeklyStep: 0.6, step: 2.5 },
  "Przysiad ze sztangą": { start: 95, weeklyStep: 2.5, step: 2.5 },
  "Martwy ciąg rumuński": { start: 80, weeklyStep: 1.25, step: 2.5 },
  "Wyciskanie na suwnicy": { start: 150, weeklyStep: 5, step: 5 },
  "Uginanie nóg leżąc": { start: 40, weeklyStep: 1.25, step: 2.5 },
  "Wspięcia na palce": { start: 60, weeklyStep: 2.5, step: 2.5 },
};

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

async function seedSystemExercises(): Promise<void> {
  for (const exercise of SYSTEM_EXERCISES) {
    const existing = await prisma.exercise.findFirst({ where: { name: exercise.name, userId: null } });
    if (existing) {
      await prisma.exercise.update({ where: { id: existing.id }, data: exercise });
    } else {
      await prisma.exercise.create({ data: exercise });
    }
  }
  console.log(`  cwiczenia systemowe: ${SYSTEM_EXERCISES.length}`);
}

async function seedFoods(): Promise<void> {
  for (const food of STARTER_FOODS) {
    const existing = await prisma.food.findFirst({ where: { name: food.name, userId: null } });
    if (!existing) await prisma.food.create({ data: food });
  }
  console.log(`  produkty w bazie: ${STARTER_FOODS.length}`);
}

async function seedDemoUser(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } }); // czysty start przy każdym seedzie

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Grzegorz",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      sex: "MALE",
      birthYear: 1990,
      heightCm: 182,
      goal: "BULK",
      activity: "MODERATE",
      effortScale: "BOTH",
      weightUnit: "KG",
      plateStep: 2.5,
    },
  });

  await installStarterData(prisma, user.id);
  await prisma.nutritionGoal.create({
    data: { userId: user.id, calories: 2900, protein: 175, carbs: 330, fat: 90 },
  });

  const workouts = await prisma.workout.findMany({
    where: { plan: { userId: user.id } },
    orderBy: { order: "asc" },
    include: { exercises: { orderBy: { order: "asc" }, include: { exercise: true } } },
  });

  const today = toIsoDate(new Date());
  const weeks = 8;
  let sessionCount = 0;

  // Osiem tygodni po trzy treningi: poniedziałek Push, środa Pull, piątek Legs.
  // Liczymy od poniedziałku, więc bieżący tydzień też ma już swoje treningi.
  const thisMonday = startOfWeek(today);
  for (let week = weeks; week >= 0; week -= 1) {
    for (const [index, workout] of workouts.entries()) {
      const date = addDays(thisMonday, -(week * 7) + index * 2);
      if (date > today) continue;

      const startedAt = new Date(`${date}T17:30:00`);
      const durationMinutes = 55 + Math.round(random() * 20);
      const progressWeeks = weeks - week;
      if (date === today) continue; // dzisiejszy trening zostaje do zrobienia w aplikacji

      const session = await prisma.workoutSession.create({
        data: {
          userId: user.id,
          workoutId: workout.id,
          planId: workout.planId,
          name: workout.name,
          date: fromIsoDate(date),
          startedAt,
          finishedAt: new Date(startedAt.getTime() + durationMinutes * 60000),
          rating: 3 + Math.round(random()),
          note: random() > 0.7 ? "Dobra energia, technika czysta." : null,
        },
      });

      for (const [order, item] of workout.exercises.entries()) {
        const profile = LIFT_PROFILE[item.exercise.name] ?? { start: 40, weeklyStep: 1, step: 2.5 };
        const baseWeight = roundTo(profile.start + profile.weeklyStep * progressWeeks, profile.step);
        const entry = await prisma.sessionExercise.create({
          data: {
            sessionId: session.id,
            exerciseId: item.exerciseId,
            order,
            supersetGroup: item.supersetGroup,
            targetSets: item.sets,
            targetRepsMin: item.repsMin,
            targetRepsMax: item.repsMax,
            targetRpe: item.targetRpe,
            restSeconds: item.restSeconds,
          },
        });

        for (let setNumber = 1; setNumber <= item.sets; setNumber += 1) {
          // Kolejne serie są cięższe w odczuciu - powtórzenia lekko spadają, RPE rośnie.
          const fatigue = (setNumber - 1) * 0.4;
          const reps = Math.max(
            (item.repsMin ?? 8) - 1,
            Math.round((item.repsMax ?? 10) - fatigue - random()),
          );
          const rpe = Math.min(10, Math.round(((item.targetRpe ?? 8) + fatigue * 0.5) * 2) / 2);
          const weight = baseWeight;
          await prisma.workoutSet.create({
            data: {
              sessionExerciseId: entry.id,
              setNumber,
              weight,
              reps,
              rpe,
              rir: Math.max(0, 10 - rpe),
              isCompleted: true,
              completedAt: new Date(startedAt.getTime() + setNumber * 4 * 60000),
              volume: weight * reps,
              estimated1rm: estimate1rm(weight, reps, rpe),
            },
          });
        }
      }

      const sets = await prisma.workoutSet.findMany({ where: { sessionExercise: { sessionId: session.id } } });
      const totals = sessionTotals(sets);
      await prisma.workoutSession.update({
        where: { id: session.id },
        data: {
          totalVolume: totals.volume,
          totalSets: totals.sets,
          totalReps: totals.reps,
          avgRpe: totals.avgRpe,
        },
      });

      await prisma.scheduledWorkout.create({
        data: {
          userId: user.id,
          workoutId: workout.id,
          sessionId: session.id,
          date: fromIsoDate(date),
          status: "COMPLETED",
        },
      });

      sessionCount += 1;
    }
  }

  await rebuildPersonalRecords(user.id);
  await seedSchedule(user.id, workouts.map((w) => w.id), today);
  await seedBodyWeight(user.id, today);
  await seedNutrition(user.id, today);
  await seedSupplementLogs(user.id, today);

  console.log(`  konto demo: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  historia: ${sessionCount} treningow`);
}

/** Rekordy liczymy raz, na podstawie całej wygenerowanej historii. */
async function rebuildPersonalRecords(userId: string): Promise<void> {
  const entries = await prisma.sessionExercise.findMany({
    where: { session: { userId, finishedAt: { not: null } } },
    include: { sets: { where: { isCompleted: true, isWarmup: false } }, session: { select: { date: true } } },
  });

  const best = new Map<string, { type: "MAX_WEIGHT" | "MAX_REPS" | "BEST_E1RM" | "MAX_VOLUME"; exerciseId: string; value: number; weight: number | null; reps: number | null; achievedAt: Date }>();

  for (const entry of entries) {
    if (entry.sets.length === 0) continue;
    const candidates = prCandidates(entry.sets);
    const rows = [
      { type: "MAX_WEIGHT" as const, value: candidates.maxWeight, weight: candidates.maxWeight, reps: null },
      { type: "MAX_REPS" as const, value: candidates.maxReps, weight: null, reps: candidates.maxReps },
      { type: "BEST_E1RM" as const, value: candidates.bestE1rm, weight: null, reps: null },
      { type: "MAX_VOLUME" as const, value: candidates.maxVolume, weight: null, reps: null },
    ];
    for (const row of rows) {
      if (row.value == null) continue;
      const key = `${entry.exerciseId}:${row.type}`;
      const current = best.get(key);
      if (!current || row.value > current.value) {
        best.set(key, {
          type: row.type,
          exerciseId: entry.exerciseId,
          value: row.value,
          weight: row.weight,
          reps: row.reps,
          achievedAt: entry.session.date,
        });
      }
    }
  }

  await prisma.personalRecord.deleteMany({ where: { userId } });
  for (const record of best.values()) {
    await prisma.personalRecord.create({
      data: {
        userId,
        exerciseId: record.exerciseId,
        type: record.type,
        value: record.value,
        weight: record.weight,
        reps: record.reps,
        achievedAt: record.achievedAt,
      },
    });
  }
}

/** Plan na najbliższe dwa tygodnie - żeby kalendarz i dashboard miały co pokazać. */
async function seedSchedule(userId: string, workoutIds: string[], today: string): Promise<void> {
  const map: Record<number, number> = { 0: 0, 2: 1, 4: 2 }; // pon Push, śr Pull, pt Legs

  for (let day = 0; day < 14; day += 1) {
    const date = addDays(today, day);
    const weekday = (fromIsoDate(date).getDay() + 6) % 7; // 0 = poniedziałek
    const workoutIndex = map[weekday];
    if (workoutIndex === undefined) continue;

    await prisma.scheduledWorkout.upsert({
      where: { userId_date_workoutId: { userId, date: fromIsoDate(date), workoutId: workoutIds[workoutIndex] } },
      create: { userId, date: fromIsoDate(date), workoutId: workoutIds[workoutIndex], status: "PLANNED" },
      update: {},
    });
  }

  // Dzień demo ma zawsze co pokazać - jeśli dziś wypada wolne, dokładamy trening z rotacji.
  const plannedToday = await prisma.scheduledWorkout.count({ where: { userId, date: fromIsoDate(today) } });
  if (plannedToday === 0) {
    const lastSession = await prisma.workoutSession.findFirst({
      where: { userId, finishedAt: { not: null } },
      orderBy: { date: "desc" },
      select: { workoutId: true },
    });
    const lastIndex = workoutIds.findIndex((id) => id === lastSession?.workoutId);
    const nextIndex = (lastIndex + 1) % workoutIds.length;
    await prisma.scheduledWorkout.create({
      data: { userId, date: fromIsoDate(today), workoutId: workoutIds[nextIndex], status: "PLANNED" },
    });
  }
}

async function seedBodyWeight(userId: string, today: string): Promise<void> {
  for (let day = 60; day >= 0; day -= 2) {
    const date = addDays(today, -day);
    // Lekki trend w górę (budowa masy) z naturalnym szumem z dnia na dzień.
    const weight = Math.round((82.5 + (60 - day) * 0.02 + (random() - 0.5) * 0.8) * 10) / 10;
    await prisma.bodyWeightEntry.upsert({
      where: { userId_date: { userId, date: fromIsoDate(date) } },
      create: { userId, date: fromIsoDate(date), weight },
      update: { weight },
    });
  }
}

async function seedNutrition(userId: string, today: string): Promise<void> {
  const foods = await prisma.food.findMany({ where: { userId: null } });
  const pick = (name: string) => foods.find((f) => f.name === name);

  const template = [
    { meal: "Śniadanie", time: "08:30", items: [["Płatki owsiane", 80], ["Jajko", 3], ["Banan", 1]] as [string, number][] },
    { meal: "Obiad", time: "13:30", items: [["Pierś z kurczaka", 200], ["Ryż biały ugotowany", 300], ["Brokuł", 150]] as [string, number][] },
    { meal: "Okołotreningowo", time: "17:00", items: [["Odżywka białkowa WPC", 1], ["Banan", 1]] as [string, number][] },
    { meal: "Kolacja", time: "20:30", items: [["Twaróg półtłusty", 200], ["Chleb razowy", 80], ["Awokado", 60]] as [string, number][] },
  ];

  for (let day = 6; day >= 0; day -= 1) {
    const date = addDays(today, -day);
    for (const [order, entry] of template.entries()) {
      // Ostatni dzień zostawiamy niepełny - realny dzień w trakcie.
      if (day === 0 && order > 2) continue;
      const meal = await prisma.meal.create({
        data: { userId, date: fromIsoDate(date), name: entry.meal, time: entry.time, order },
      });
      for (const [foodName, quantity] of entry.items) {
        const food = pick(foodName);
        if (!food) continue;
        const factor = food.per === "szt" ? quantity : quantity / 100;
        await prisma.nutritionEntry.create({
          data: {
            mealId: meal.id,
            foodId: food.id,
            name: food.name,
            quantity,
            unit: food.per === "szt" ? "szt" : "g",
            calories: Math.round(food.calories * factor),
            protein: Math.round(food.protein * factor * 10) / 10,
            carbs: Math.round(food.carbs * factor * 10) / 10,
            fat: Math.round(food.fat * factor * 10) / 10,
          },
        });
      }
    }
  }
  console.log(`  posilki: 7 dni (${MEAL_PRESETS.length} presetow nazw)`);
}

async function seedSupplementLogs(userId: string, today: string): Promise<void> {
  const supplements = await prisma.supplement.findMany({ where: { userId } });
  for (let day = 13; day >= 0; day -= 1) {
    const date = addDays(today, -day);
    const weekday = ((fromIsoDate(date).getDay() + 6) % 7) + 1;
    for (const supplement of supplements) {
      if (!supplement.daysOfWeek.includes(weekday)) continue;
      // Dzisiejszy dzień zostawiamy do odhaczenia w aplikacji.
      if (day === 0) continue;
      if (random() > 0.85) continue; // realne życie - czasem się zapomina
      for (const timing of supplement.timing) {
        await prisma.supplementLog.upsert({
          where: { supplementId_date_timing: { supplementId: supplement.id, date: fromIsoDate(date), timing } },
          create: { supplementId: supplement.id, userId, date: fromIsoDate(date), timing },
          update: {},
        });
      }
    }
  }
}

async function main(): Promise<void> {
  console.log("Seed bazy treningowej...");
  await seedSystemExercises();
  await seedFoods();
  await seedDemoUser();
  console.log("Gotowe.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
