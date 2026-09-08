/** Liczenie zapotrzebowania i makroskładników. Czyste funkcje - testowalne bez bazy. */

export type MacroSet = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type BmrInput = {
  sex?: "MALE" | "FEMALE" | null;
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
};

export const ACTIVITY_FACTORS = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  HIGH: 1.725,
  VERY_HIGH: 1.9,
} as const;

export type ActivityKey = keyof typeof ACTIVITY_FACTORS;

export const GOAL_ADJUSTMENT = {
  CUT: -0.18,
  MAINTAIN: 0,
  BULK: 0.12,
} as const;

export type GoalKey = keyof typeof GOAL_ADJUSTMENT;

/** Mifflin-St Jeor - obecnie najczęściej stosowany wzór na spoczynkową przemianę materii. */
export function bmr({ sex, weightKg, heightCm, age }: BmrInput): number | null {
  if (weightKg == null || heightCm == null || age == null) return null;
  if (![weightKg, heightCm, age].every((v) => Number.isFinite(v) && v > 0)) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "FEMALE" ? base - 161 : base + 5);
}

export function tdee(input: BmrInput & { activity?: ActivityKey | null }): number | null {
  const base = bmr(input);
  if (base == null) return null;
  return Math.round(base * ACTIVITY_FACTORS[input.activity ?? "MODERATE"]);
}

/**
 * Propozycja celów. Białko i tłuszcz liczymy od masy ciała (bo to one mają
 * dolne granice), reszta kalorii idzie na węgle.
 */
export function suggestedMacros(
  input: BmrInput & { activity?: ActivityKey | null; goal?: GoalKey | null },
): (MacroSet & { tdee: number; bmr: number }) | null {
  const maintenance = tdee(input);
  const base = bmr(input);
  if (maintenance == null || base == null || input.weightKg == null) return null;
  const goal = input.goal ?? "MAINTAIN";
  const calories = Math.round(maintenance * (1 + GOAL_ADJUSTMENT[goal]));
  const protein = Math.round(input.weightKg * (goal === "CUT" ? 2.2 : 1.9));
  const fat = Math.round(input.weightKg * 0.9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat, tdee: maintenance, bmr: base };
}

export function caloriesFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

export function sumMacros(items: Partial<MacroSet>[]): MacroSet {
  return items.reduce<MacroSet>(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.protein ?? 0),
      carbs: acc.carbs + (item.carbs ?? 0),
      fat: acc.fat + (item.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Przeliczenie wartości z bazy produktów (na 100 g albo na sztukę) na zjedzoną porcję. */
export function portionMacros(
  food: MacroSet & { per?: string | null },
  quantity: number,
): MacroSet {
  const factor = food.per === "szt" ? quantity : quantity / 100;
  const r = (v: number, d = 1) => Math.round(v * factor * 10 ** d) / 10 ** d;
  return {
    calories: Math.round(food.calories * factor),
    protein: r(food.protein),
    carbs: r(food.carbs),
    fat: r(food.fat),
  };
}
