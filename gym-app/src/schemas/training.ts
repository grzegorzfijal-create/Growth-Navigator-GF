import { z } from "zod";

/** Wspólne reguły: nie da się zapisać ujemnego ciężaru ani RPE spoza skali. */
const weight = z.coerce.number().min(0, "Ciężar nie może być ujemny").max(1000, "To już rekord świata");
const reps = z.coerce.number().int("Powtórzenia to liczba całkowita").min(0, "Powtórzenia nie mogą być ujemne").max(500);
const rpe = z.coerce.number().min(1, "RPE mieści się w skali 1-10").max(10, "RPE mieści się w skali 1-10");
const rir = z.coerce.number().min(0, "RIR nie może być ujemny").max(10, "RIR powyżej 10 nic już nie mówi");

export const EXERCISE_CATEGORIES = [
  "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS", "LEGS", "GLUTES", "CORE", "CARDIO", "FULL_BODY",
] as const;

export const EXERCISE_TYPES = [
  "BARBELL", "DUMBBELL", "MACHINE", "CABLE", "BODYWEIGHT", "KETTLEBELL", "BAND", "CARDIO", "OTHER",
] as const;

export const EXERCISE_UNITS = ["KG", "LB", "BODYWEIGHT", "TIME", "DISTANCE"] as const;

export const exerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nazwa musi mieć co najmniej 2 znaki").max(80),
  category: z.enum(EXERCISE_CATEGORIES),
  primaryMuscle: z.string().trim().min(2, "Podaj główną partię").max(60),
  secondaryMuscles: z.array(z.string().trim().min(1)).default([]),
  type: z.enum(EXERCISE_TYPES).default("BARBELL"),
  unit: z.enum(EXERCISE_UNITS).default("KG"),
  plateStep: z.coerce.number().min(0).max(50).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  instructions: z.string().trim().max(2000).optional().nullable(),
});

export const planSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nazwa planu musi mieć co najmniej 2 znaki").max(80),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().default(false),
});

export const workoutSchema = z.object({
  id: z.string().optional(),
  planId: z.string(),
  name: z.string().trim().min(1, "Podaj nazwę treningu").max(80),
  description: z.string().trim().max(500).optional().nullable(),
  estimatedMinutes: z.coerce.number().int().min(0).max(600).optional().nullable(),
});

export const workoutExerciseSchema = z.object({
  id: z.string().optional(),
  workoutId: z.string(),
  exerciseId: z.string().min(1, "Wybierz ćwiczenie"),
  sets: z.coerce.number().int().min(1, "Minimum jedna seria").max(20),
  repsMin: z.coerce.number().int().min(1).max(200).optional().nullable(),
  repsMax: z.coerce.number().int().min(1).max(200).optional().nullable(),
  targetWeight: weight.optional().nullable(),
  targetRpe: rpe.optional().nullable(),
  targetRir: rir.optional().nullable(),
  restSeconds: z.coerce.number().int().min(0).max(1800).default(120),
  tempo: z.string().trim().max(20).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  supersetGroup: z.string().trim().max(4).optional().nullable(),
}).refine((v) => !v.repsMin || !v.repsMax || v.repsMax >= v.repsMin, {
  message: "Górna granica zakresu nie może być mniejsza od dolnej",
  path: ["repsMax"],
});

/** Zapis pojedynczej serii w trakcie treningu - serce całej aplikacji. */
export const setUpdateSchema = z.object({
  setId: z.string().min(1),
  weight: weight.nullable().optional(),
  reps: reps.nullable().optional(),
  rpe: rpe.nullable().optional(),
  rir: rir.nullable().optional(),
  isWarmup: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  note: z.string().trim().max(300).nullable().optional(),
});

/** Autosave wysyła paczkę zmienionych serii - jedna runda zamiast dziesięciu. */
export const setBatchSchema = z.object({
  sessionId: z.string().min(1),
  sets: z.array(setUpdateSchema).min(1).max(60),
});

export const startSessionSchema = z.object({
  workoutId: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data w formacie RRRR-MM-DD").optional(),
  name: z.string().trim().max(80).optional(),
});

export const finishSessionSchema = z.object({
  sessionId: z.string().min(1),
  note: z.string().trim().max(1000).optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  bodyWeight: z.coerce.number().min(20).max(400).optional().nullable(),
});

export const scheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workoutId: z.string().optional().nullable(),
  status: z.enum(["PLANNED", "COMPLETED", "SKIPPED", "REST"]).default("PLANNED"),
  note: z.string().trim().max(300).optional().nullable(),
});

export type ExerciseInput = z.infer<typeof exerciseSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type WorkoutInput = z.infer<typeof workoutSchema>;
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>;

/* Formularze widzą wartości "przed" walidacją (pola tekstowe, braki domyślnych),
   serwer dostaje wersję "po" - stąd dwa typy na jeden schemat. */
export type ExerciseFormValues = z.input<typeof exerciseSchema>;
export type PlanFormValues = z.input<typeof planSchema>;
export type WorkoutFormValues = z.input<typeof workoutSchema>;
export type WorkoutExerciseFormValues = z.input<typeof workoutExerciseSchema>;
export type SetUpdateInput = z.infer<typeof setUpdateSchema>;
export type SetBatchInput = z.infer<typeof setBatchSchema>;
