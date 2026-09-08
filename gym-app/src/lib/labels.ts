/** Etykiety enumów w jednym miejscu - baza mówi po angielsku, interfejs po polsku. */

export const CATEGORY_LABELS: Record<string, string> = {
  CHEST: "Klatka",
  BACK: "Plecy",
  SHOULDERS: "Barki",
  BICEPS: "Biceps",
  TRICEPS: "Triceps",
  LEGS: "Nogi",
  GLUTES: "Pośladki",
  CORE: "Brzuch",
  CARDIO: "Cardio",
  FULL_BODY: "Całe ciało",
};

export const TYPE_LABELS: Record<string, string> = {
  BARBELL: "Sztanga",
  DUMBBELL: "Hantle",
  MACHINE: "Maszyna",
  CABLE: "Wyciąg",
  BODYWEIGHT: "Masa ciała",
  KETTLEBELL: "Kettlebell",
  BAND: "Guma",
  CARDIO: "Cardio",
  OTHER: "Inne",
};

export const UNIT_LABELS: Record<string, string> = {
  KG: "kg",
  LB: "lb",
  BODYWEIGHT: "kg (dodatkowy)",
  TIME: "sek.",
  DISTANCE: "m",
};

export const PR_LABELS: Record<string, string> = {
  MAX_WEIGHT: "Największy ciężar",
  MAX_REPS: "Najwięcej powtórzeń",
  BEST_E1RM: "Najlepsze szacowane 1RM",
  MAX_VOLUME: "Największa objętość",
};

export const GOAL_LABELS: Record<string, string> = {
  CUT: "Redukcja",
  MAINTAIN: "Utrzymanie",
  BULK: "Budowa masy",
};

export const ACTIVITY_LABELS: Record<string, string> = {
  SEDENTARY: "Siedzący tryb życia",
  LIGHT: "Lekka aktywność",
  MODERATE: "Umiarkowana aktywność",
  HIGH: "Wysoka aktywność",
  VERY_HIGH: "Bardzo wysoka aktywność",
};

export const SCHEDULE_LABELS: Record<string, string> = {
  PLANNED: "Zaplanowany",
  COMPLETED: "Wykonany",
  SKIPPED: "Pominięty",
  REST: "Dzień odpoczynku",
};

/** Jednostka obciążenia dla ćwiczenia - w cardio i planku liczą się sekundy. */
export function unitLabel(unit: string, weightUnit = "kg"): string {
  if (unit === "TIME") return "sek.";
  if (unit === "DISTANCE") return "m";
  if (unit === "LB") return "lb";
  return weightUnit.toLowerCase();
}
