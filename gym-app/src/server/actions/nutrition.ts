"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { fromIsoDate } from "@/lib/date";
import { portionMacros } from "@/lib/nutrition";
import {
  entryFromFoodSchema,
  foodSchema,
  mealSchema,
  nutritionEntrySchema,
  nutritionGoalSchema,
} from "@/schemas/nutrition";
import type { ActionState } from "@/server/actions/training";

export async function saveNutritionGoal(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = nutritionGoalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe cele." };

  await prisma.nutritionGoal.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/dieta");
  return { ok: true };
}

export async function createMeal(input: unknown): Promise<ActionState<{ id: string }>> {
  const user = await requireUser();
  const parsed = mealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane posiłku." };

  const count = await prisma.meal.count({ where: { userId: user.id, date: fromIsoDate(parsed.data.date) } });
  const created = await prisma.meal.create({
    data: {
      userId: user.id,
      date: fromIsoDate(parsed.data.date),
      name: parsed.data.name,
      time: parsed.data.time ?? null,
      note: parsed.data.note ?? null,
      order: count,
    },
  });

  revalidatePath("/dieta");
  return { ok: true, data: { id: created.id } };
}

export async function deleteMeal(mealId: string): Promise<ActionState> {
  const user = await requireUser();
  const meal = await prisma.meal.findFirst({ where: { id: mealId, userId: user.id } });
  if (!meal) return { ok: false, error: "Nie znaleziono posiłku." };

  await prisma.meal.delete({ where: { id: mealId } });
  revalidatePath("/dieta");
  return { ok: true };
}

/** Ręczna pozycja: użytkownik podaje makro wprost. */
export async function addNutritionEntry(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = nutritionEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };

  const meal = await prisma.meal.findFirst({ where: { id: parsed.data.mealId, userId: user.id } });
  if (!meal) return { ok: false, error: "Nie znaleziono posiłku." };

  await prisma.nutritionEntry.create({
    data: {
      mealId: meal.id,
      name: parsed.data.name,
      quantity: parsed.data.quantity ?? null,
      unit: parsed.data.unit,
      calories: parsed.data.calories,
      protein: parsed.data.protein,
      carbs: parsed.data.carbs,
      fat: parsed.data.fat,
      foodId: parsed.data.foodId ?? null,
    },
  });

  revalidatePath("/dieta");
  return { ok: true };
}

/** Pozycja z bazy produktów - makro liczy serwer, żeby klient nie mógł go podrobić. */
export async function addEntryFromFood(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = entryFromFoodSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };

  const [meal, food] = await Promise.all([
    prisma.meal.findFirst({ where: { id: parsed.data.mealId, userId: user.id } }),
    prisma.food.findFirst({ where: { id: parsed.data.foodId, OR: [{ userId: null }, { userId: user.id }] } }),
  ]);
  if (!meal || !food) return { ok: false, error: "Nie znaleziono posiłku lub produktu." };

  const macros = portionMacros(food, parsed.data.quantity);
  await prisma.nutritionEntry.create({
    data: {
      mealId: meal.id,
      foodId: food.id,
      name: food.name,
      quantity: parsed.data.quantity,
      unit: food.per === "szt" ? "szt" : "g",
      ...macros,
    },
  });

  revalidatePath("/dieta");
  return { ok: true };
}

export async function deleteNutritionEntry(entryId: string): Promise<ActionState> {
  const user = await requireUser();
  const entry = await prisma.nutritionEntry.findFirst({
    where: { id: entryId, meal: { userId: user.id } },
    select: { id: true },
  });
  if (!entry) return { ok: false, error: "Nie znaleziono pozycji." };

  await prisma.nutritionEntry.delete({ where: { id: entryId } });
  revalidatePath("/dieta");
  return { ok: true };
}

export async function createFood(input: unknown): Promise<ActionState<{ id: string }>> {
  const user = await requireUser();
  const parsed = foodSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowy produkt." };

  const created = await prisma.food.create({ data: { userId: user.id, ...parsed.data } });
  revalidatePath("/dieta");
  return { ok: true, data: { id: created.id } };
}
