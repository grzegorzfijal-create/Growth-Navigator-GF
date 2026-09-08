import { z } from "zod";

const macro = z.coerce.number().min(0, "Wartość nie może być ujemna").max(2000);
const kcal = z.coerce.number().min(0, "Kalorie nie mogą być ujemne").max(20000);

export const nutritionGoalSchema = z.object({
  calories: z.coerce.number().int().min(0).max(20000),
  protein: z.coerce.number().int().min(0).max(1000),
  carbs: z.coerce.number().int().min(0).max(2000),
  fat: z.coerce.number().int().min(0).max(1000),
});

export const mealSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(1, "Podaj nazwę posiłku").max(60),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Godzina w formacie GG:MM").optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
});

export const nutritionEntrySchema = z.object({
  id: z.string().optional(),
  mealId: z.string().min(1),
  name: z.string().trim().min(1, "Podaj nazwę").max(80),
  quantity: z.coerce.number().min(0).max(10000).optional().nullable(),
  unit: z.string().trim().max(10).default("g"),
  calories: kcal,
  protein: macro,
  carbs: macro,
  fat: macro,
  foodId: z.string().optional().nullable(),
});

/** Dodanie pozycji z bazy produktów - makro liczy serwer, klient podaje gramaturę. */
export const entryFromFoodSchema = z.object({
  mealId: z.string().min(1),
  foodId: z.string().min(1),
  quantity: z.coerce.number().min(0.1, "Podaj ilość").max(10000),
});

export const foodSchema = z.object({
  name: z.string().trim().min(2).max(80),
  brand: z.string().trim().max(60).optional().nullable(),
  per: z.enum(["100g", "szt"]).default("100g"),
  calories: kcal,
  protein: macro,
  carbs: macro,
  fat: macro,
});

export type NutritionGoalInput = z.infer<typeof nutritionGoalSchema>;
export type MealInput = z.infer<typeof mealSchema>;
export type NutritionEntryInput = z.infer<typeof nutritionEntrySchema>;

export type NutritionGoalFormValues = z.input<typeof nutritionGoalSchema>;
export type MealFormValues = z.input<typeof mealSchema>;
export type NutritionEntryFormValues = z.input<typeof nutritionEntrySchema>;
export type FoodFormValues = z.input<typeof foodSchema>;
