import { z } from "zod";

export const SUPPLEMENT_TIMINGS = ["MORNING", "PRE_WORKOUT", "POST_WORKOUT", "EVENING"] as const;

export const supplementSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nazwa musi mieć co najmniej 2 znaki").max(60),
  dose: z.coerce.number().min(0, "Dawka nie może być ujemna").max(10000).optional().nullable(),
  unit: z.string().trim().min(1).max(10).default("g"),
  timing: z.array(z.enum(SUPPLEMENT_TIMINGS)).min(1, "Wybierz przynajmniej jedną porę"),
  daysOfWeek: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Wybierz przynajmniej jeden dzień"),
  note: z.string().trim().max(300).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const supplementLogSchema = z.object({
  supplementId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timing: z.string().max(20).default("ANY"),
  taken: z.boolean(),
});

export const bodyWeightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.coerce.number().min(20, "Masa ciała poniżej 20 kg to pomyłka").max(400),
  note: z.string().trim().max(200).optional().nullable(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  weightUnit: z.enum(["KG", "LB"]).default("KG"),
  heightUnit: z.enum(["CM", "FT"]).default("CM"),
  effortScale: z.enum(["RPE", "RIR", "BOTH"]).default("BOTH"),
  sex: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  birthYear: z.coerce.number().int().min(1920).max(new Date().getFullYear()).optional().nullable(),
  heightCm: z.coerce.number().min(100).max(250).optional().nullable(),
  goal: z.enum(["CUT", "MAINTAIN", "BULK"]).default("MAINTAIN"),
  activity: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "HIGH", "VERY_HIGH"]).default("MODERATE"),
  plateStep: z.coerce.number().min(0.5).max(10).default(2.5),
});

export type SupplementInput = z.infer<typeof supplementSchema>;
export type BodyWeightInput = z.infer<typeof bodyWeightSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

export type SupplementFormValues = z.input<typeof supplementSchema>;
export type BodyWeightFormValues = z.input<typeof bodyWeightSchema>;
export type ProfileFormValues = z.input<typeof profileSchema>;
