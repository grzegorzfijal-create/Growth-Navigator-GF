import type { Metadata } from "next";

import { DietDay } from "@/components/nutrition/diet-day";
import { fromIsoDate, todayIso } from "@/lib/date";
import { suggestedMacros } from "@/lib/nutrition";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";

export const metadata: Metadata = { title: "Dieta" };

export default async function DietPage({ searchParams }: PageProps<"/dieta">) {
  const user = await requireUser();
  const params = await searchParams;
  const date = typeof params.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.d) ? params.d : todayIso();

  const [meals, goal, foods, lastWeight] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: user.id, date: fromIsoDate(date) },
      orderBy: [{ time: "asc" }, { order: "asc" }],
      include: { entries: { orderBy: { id: "asc" } } },
    }),
    prisma.nutritionGoal.findUnique({ where: { userId: user.id } }),
    prisma.food.findMany({ where: { OR: [{ userId: null }, { userId: user.id }] }, orderBy: { name: "asc" } }),
    prisma.bodyWeightEntry.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
  ]);

  const macros = suggestedMacros({
    sex: user.sex,
    weightKg: lastWeight?.weight ?? null,
    heightCm: user.heightCm,
    age: user.birthYear ? new Date().getFullYear() - user.birthYear : null,
    activity: user.activity,
    goal: user.goal,
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="display text-3xl">Dieta</h1>
        <p className="text-sm text-muted">Kalorie i makro na dziś - bez liczenia w głowie.</p>
      </header>

      <DietDay
        date={date}
        meals={meals.map((meal) => ({
          id: meal.id,
          name: meal.name,
          time: meal.time,
          entries: meal.entries.map((entry) => ({
            id: entry.id,
            name: entry.name,
            quantity: entry.quantity,
            unit: entry.unit,
            calories: entry.calories,
            protein: entry.protein,
            carbs: entry.carbs,
            fat: entry.fat,
          })),
        }))}
        foods={foods.map((food) => ({
          id: food.id,
          name: food.name,
          per: food.per,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        }))}
        goal={goal ? { calories: goal.calories, protein: goal.protein, carbs: goal.carbs, fat: goal.fat } : null}
        suggestion={
          macros
            ? {
                calories: macros.calories,
                protein: macros.protein,
                carbs: macros.carbs,
                fat: macros.fat,
                tdee: macros.tdee,
              }
            : null
        }
      />
    </div>
  );
}
