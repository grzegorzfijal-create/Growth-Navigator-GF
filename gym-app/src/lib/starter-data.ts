/**
 * Dane startowe: baza ćwiczeń, gotowy plan Push/Pull/Legs, suplementy i produkty.
 * Ćwiczenia mają polskie nazwy z angielskim odpowiednikiem w opisie - wyszukiwarka
 * przeszukuje oba, więc "bench" znajdzie wyciskanie leżąc.
 */

export type StarterExercise = {
  name: string;
  category:
    | "CHEST" | "BACK" | "SHOULDERS" | "BICEPS" | "TRICEPS"
    | "LEGS" | "GLUTES" | "CORE" | "CARDIO" | "FULL_BODY";
  primaryMuscle: string;
  secondaryMuscles: string[];
  type: "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT" | "KETTLEBELL" | "BAND" | "CARDIO" | "OTHER";
  unit: "KG" | "LB" | "BODYWEIGHT" | "TIME" | "DISTANCE";
  plateStep: number;
  description: string;
  instructions?: string;
};

export const SYSTEM_EXERCISES: StarterExercise[] = [
  // klatka
  { name: "Wyciskanie sztangi leżąc", category: "CHEST", primaryMuscle: "Klatka piersiowa", secondaryMuscles: ["Triceps", "Barki"], type: "BARBELL", unit: "KG", plateStep: 2.5, description: "Bench Press", instructions: "Łopatki ściągnięte, sztanga schodzi do dolnej części klatki, stopy stabilnie na podłodze." },
  { name: "Wyciskanie sztangi na skosie", category: "CHEST", primaryMuscle: "Klatka piersiowa (góra)", secondaryMuscles: ["Barki", "Triceps"], type: "BARBELL", unit: "KG", plateStep: 2.5, description: "Incline Bench Press" },
  { name: "Wyciskanie hantli leżąc", category: "CHEST", primaryMuscle: "Klatka piersiowa", secondaryMuscles: ["Triceps", "Barki"], type: "DUMBBELL", unit: "KG", plateStep: 2, description: "Dumbbell Bench Press" },
  { name: "Wyciskanie hantli na skosie", category: "CHEST", primaryMuscle: "Klatka piersiowa (góra)", secondaryMuscles: ["Barki"], type: "DUMBBELL", unit: "KG", plateStep: 2, description: "Incline Dumbbell Press" },
  { name: "Rozpiętki na bramie", category: "CHEST", primaryMuscle: "Klatka piersiowa", secondaryMuscles: [], type: "CABLE", unit: "KG", plateStep: 1.25, description: "Cable Fly" },
  { name: "Pompki na poręczach", category: "CHEST", primaryMuscle: "Klatka piersiowa (dół)", secondaryMuscles: ["Triceps"], type: "BODYWEIGHT", unit: "BODYWEIGHT", plateStep: 2.5, description: "Dips - wpisuj ciężar dodatkowy" },
  // plecy
  { name: "Martwy ciąg", category: "BACK", primaryMuscle: "Prostowniki grzbietu", secondaryMuscles: ["Pośladki", "Dwugłowe uda", "Czworoboczne"], type: "BARBELL", unit: "KG", plateStep: 5, description: "Deadlift", instructions: "Sztanga blisko goleni, plecy neutralne, ruch zaczyna się od nóg." },
  { name: "Martwy ciąg rumuński", category: "BACK", primaryMuscle: "Dwugłowe uda", secondaryMuscles: ["Pośladki", "Prostowniki grzbietu"], type: "BARBELL", unit: "KG", plateStep: 2.5, description: "Romanian Deadlift - RDL" },
  { name: "Wiosłowanie sztangą", category: "BACK", primaryMuscle: "Najszersze grzbietu", secondaryMuscles: ["Biceps", "Tylny akton barku"], type: "BARBELL", unit: "KG", plateStep: 2.5, description: "Barbell Row" },
  { name: "Wiosłowanie hantlem", category: "BACK", primaryMuscle: "Najszersze grzbietu", secondaryMuscles: ["Biceps"], type: "DUMBBELL", unit: "KG", plateStep: 2, description: "One Arm Dumbbell Row" },
  { name: "Podciąganie nachwytem", category: "BACK", primaryMuscle: "Najszersze grzbietu", secondaryMuscles: ["Biceps"], type: "BODYWEIGHT", unit: "BODYWEIGHT", plateStep: 2.5, description: "Pull Up - wpisuj ciężar dodatkowy" },
  { name: "Ściąganie drążka wyciągu górnego", category: "BACK", primaryMuscle: "Najszersze grzbietu", secondaryMuscles: ["Biceps"], type: "CABLE", unit: "KG", plateStep: 2.5, description: "Lat Pulldown" },
  { name: "Wiosłowanie na wyciągu siedząc", category: "BACK", primaryMuscle: "Środkowy grzbiet", secondaryMuscles: ["Biceps"], type: "CABLE", unit: "KG", plateStep: 2.5, description: "Seated Cable Row" },
  { name: "Face pull", category: "BACK", primaryMuscle: "Tylny akton barku", secondaryMuscles: ["Czworoboczne"], type: "CABLE", unit: "KG", plateStep: 1.25, description: "Face Pull" },
  // barki
  { name: "Wyciskanie żołnierskie", category: "SHOULDERS", primaryMuscle: "Barki", secondaryMuscles: ["Triceps"], type: "BARBELL", unit: "KG", plateStep: 2.5, description: "Overhead Press - OHP" },
  { name: "Wyciskanie hantli nad głowę", category: "SHOULDERS", primaryMuscle: "Barki", secondaryMuscles: ["Triceps"], type: "DUMBBELL", unit: "KG", plateStep: 2, description: "Shoulder Press" },
  { name: "Wznosy bokiem", category: "SHOULDERS", primaryMuscle: "Barki (bok)", secondaryMuscles: [], type: "DUMBBELL", unit: "KG", plateStep: 1, description: "Lateral Raise" },
  { name: "Odwrotne rozpiętki", category: "SHOULDERS", primaryMuscle: "Tylny akton barku", secondaryMuscles: [], type: "DUMBBELL", unit: "KG", plateStep: 1, description: "Rear Delt Fly" },
  { name: "Szrugsy", category: "SHOULDERS", primaryMuscle: "Czworoboczne", secondaryMuscles: [], type: "DUMBBELL", unit: "KG", plateStep: 2, description: "Shrugs" },
  // ramiona
  { name: "Uginanie sztangą stojąc", category: "BICEPS", primaryMuscle: "Biceps", secondaryMuscles: ["Przedramiona"], type: "BARBELL", unit: "KG", plateStep: 2.5, description: "Barbell Curl" },
  { name: "Uginanie hantlami", category: "BICEPS", primaryMuscle: "Biceps", secondaryMuscles: [], type: "DUMBBELL", unit: "KG", plateStep: 1, description: "Dumbbell Curl" },
  { name: "Uginanie młotkowe", category: "BICEPS", primaryMuscle: "Ramienno-promieniowy", secondaryMuscles: ["Biceps"], type: "DUMBBELL", unit: "KG", plateStep: 1, description: "Hammer Curl" },
  { name: "Prostowanie ramion na wyciągu", category: "TRICEPS", primaryMuscle: "Triceps", secondaryMuscles: [], type: "CABLE", unit: "KG", plateStep: 1.25, description: "Triceps Pushdown" },
  { name: "Wyciskanie francuskie", category: "TRICEPS", primaryMuscle: "Triceps", secondaryMuscles: [], type: "BARBELL", unit: "KG", plateStep: 2.5, description: "Skullcrusher" },
  { name: "Wyciskanie wąskim chwytem", category: "TRICEPS", primaryMuscle: "Triceps", secondaryMuscles: ["Klatka piersiowa"], type: "BARBELL", unit: "KG", plateStep: 2.5, description: "Close Grip Bench Press" },
  // nogi
  { name: "Przysiad ze sztangą", category: "LEGS", primaryMuscle: "Czworogłowe uda", secondaryMuscles: ["Pośladki", "Prostowniki grzbietu"], type: "BARBELL", unit: "KG", plateStep: 2.5, description: "Back Squat", instructions: "Kolana wychodzą na boki, tułów sztywny, schodzisz co najmniej do równoległości." },
  { name: "Przysiad przedni", category: "LEGS", primaryMuscle: "Czworogłowe uda", secondaryMuscles: ["Core"], type: "BARBELL", unit: "KG", plateStep: 2.5, description: "Front Squat" },
  { name: "Wyciskanie na suwnicy", category: "LEGS", primaryMuscle: "Czworogłowe uda", secondaryMuscles: ["Pośladki"], type: "MACHINE", unit: "KG", plateStep: 5, description: "Leg Press" },
  { name: "Wykroki z hantlami", category: "LEGS", primaryMuscle: "Czworogłowe uda", secondaryMuscles: ["Pośladki"], type: "DUMBBELL", unit: "KG", plateStep: 2, description: "Lunges" },
  { name: "Przysiad bułgarski", category: "LEGS", primaryMuscle: "Czworogłowe uda", secondaryMuscles: ["Pośladki"], type: "DUMBBELL", unit: "KG", plateStep: 2, description: "Bulgarian Split Squat" },
  { name: "Prostowanie nóg", category: "LEGS", primaryMuscle: "Czworogłowe uda", secondaryMuscles: [], type: "MACHINE", unit: "KG", plateStep: 2.5, description: "Leg Extension" },
  { name: "Uginanie nóg leżąc", category: "LEGS", primaryMuscle: "Dwugłowe uda", secondaryMuscles: [], type: "MACHINE", unit: "KG", plateStep: 2.5, description: "Leg Curl" },
  { name: "Wspięcia na palce", category: "LEGS", primaryMuscle: "Łydki", secondaryMuscles: [], type: "MACHINE", unit: "KG", plateStep: 2.5, description: "Calf Raise" },
  { name: "Hip thrust", category: "GLUTES", primaryMuscle: "Pośladki", secondaryMuscles: ["Dwugłowe uda"], type: "BARBELL", unit: "KG", plateStep: 5, description: "Hip Thrust" },
  { name: "Odwodzenie nogi w tył na wyciągu", category: "GLUTES", primaryMuscle: "Pośladki", secondaryMuscles: [], type: "CABLE", unit: "KG", plateStep: 1.25, description: "Cable Kickback" },
  // core i cardio
  { name: "Deska", category: "CORE", primaryMuscle: "Mięśnie głębokie", secondaryMuscles: [], type: "BODYWEIGHT", unit: "TIME", plateStep: 0, description: "Plank - w polu powtórzeń wpisuj sekundy" },
  { name: "Unoszenie nóg w zwisie", category: "CORE", primaryMuscle: "Brzuch", secondaryMuscles: [], type: "BODYWEIGHT", unit: "BODYWEIGHT", plateStep: 2.5, description: "Hanging Leg Raise" },
  { name: "Spięcia brzucha na wyciągu", category: "CORE", primaryMuscle: "Brzuch", secondaryMuscles: [], type: "CABLE", unit: "KG", plateStep: 1.25, description: "Cable Crunch" },
  { name: "Rower stacjonarny", category: "CARDIO", primaryMuscle: "Wydolność", secondaryMuscles: [], type: "CARDIO", unit: "TIME", plateStep: 0, description: "Stationary Bike - w polu powtórzeń wpisuj minuty" },
  { name: "Bieżnia", category: "CARDIO", primaryMuscle: "Wydolność", secondaryMuscles: [], type: "CARDIO", unit: "TIME", plateStep: 0, description: "Treadmill - w polu powtórzeń wpisuj minuty" },
];

export type StarterPlanExercise = {
  exercise: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  targetRpe: number;
  restSeconds: number;
  supersetGroup?: string;
};

export const STARTER_PLAN = {
  name: "Push / Pull / Legs",
  description: "Klasyczny podział na trzy treningi. Przy trzech dniach w tygodniu każdy trening raz, przy sześciu - dwa razy.",
  workouts: [
    {
      name: "Push",
      description: "Klatka, barki, triceps",
      estimatedMinutes: 65,
      exercises: [
        { exercise: "Wyciskanie sztangi leżąc", sets: 4, repsMin: 6, repsMax: 8, targetRpe: 8, restSeconds: 180 },
        { exercise: "Wyciskanie hantli na skosie", sets: 3, repsMin: 8, repsMax: 12, targetRpe: 8, restSeconds: 120 },
        { exercise: "Wyciskanie hantli nad głowę", sets: 3, repsMin: 8, repsMax: 10, targetRpe: 8, restSeconds: 120 },
        { exercise: "Wznosy bokiem", sets: 4, repsMin: 12, repsMax: 15, targetRpe: 9, restSeconds: 60, supersetGroup: "A" },
        { exercise: "Prostowanie ramion na wyciągu", sets: 3, repsMin: 10, repsMax: 15, targetRpe: 9, restSeconds: 60, supersetGroup: "A" },
      ] as StarterPlanExercise[],
    },
    {
      name: "Pull",
      description: "Plecy, tylny akton barku, biceps",
      estimatedMinutes: 70,
      exercises: [
        { exercise: "Martwy ciąg", sets: 3, repsMin: 3, repsMax: 5, targetRpe: 8, restSeconds: 240 },
        { exercise: "Podciąganie nachwytem", sets: 4, repsMin: 6, repsMax: 10, targetRpe: 8, restSeconds: 150 },
        { exercise: "Wiosłowanie sztangą", sets: 3, repsMin: 8, repsMax: 10, targetRpe: 8, restSeconds: 120 },
        { exercise: "Ściąganie drążka wyciągu górnego", sets: 3, repsMin: 10, repsMax: 12, targetRpe: 8, restSeconds: 90 },
        { exercise: "Face pull", sets: 3, repsMin: 12, repsMax: 15, targetRpe: 9, restSeconds: 60, supersetGroup: "A" },
        { exercise: "Uginanie sztangą stojąc", sets: 3, repsMin: 8, repsMax: 12, targetRpe: 9, restSeconds: 60, supersetGroup: "A" },
      ] as StarterPlanExercise[],
    },
    {
      name: "Legs",
      description: "Nogi i pośladki",
      estimatedMinutes: 70,
      exercises: [
        { exercise: "Przysiad ze sztangą", sets: 4, repsMin: 5, repsMax: 8, targetRpe: 8, restSeconds: 180 },
        { exercise: "Martwy ciąg rumuński", sets: 3, repsMin: 8, repsMax: 10, targetRpe: 8, restSeconds: 150 },
        { exercise: "Wyciskanie na suwnicy", sets: 3, repsMin: 10, repsMax: 12, targetRpe: 8, restSeconds: 120 },
        { exercise: "Uginanie nóg leżąc", sets: 3, repsMin: 10, repsMax: 12, targetRpe: 9, restSeconds: 90 },
        { exercise: "Wspięcia na palce", sets: 4, repsMin: 12, repsMax: 15, targetRpe: 9, restSeconds: 60 },
      ] as StarterPlanExercise[],
    },
  ],
};

export const STARTER_SUPPLEMENTS = [
  { name: "Kreatyna monohydrat", dose: 5, unit: "g", timing: ["POST_WORKOUT"], daysOfWeek: [1, 2, 3, 4, 5, 6, 7], note: "Codziennie, również w dni bez treningu. Pora nie ma znaczenia.", isActive: true },
  { name: "Odżywka białkowa", dose: 30, unit: "g", timing: ["POST_WORKOUT"], daysOfWeek: [1, 2, 3, 4, 5, 6, 7], note: "Tylko gdy nie dobijasz białka z jedzenia.", isActive: true },
  { name: "Witamina D3 + K2", dose: 2000, unit: "IU", timing: ["MORNING"], daysOfWeek: [1, 2, 3, 4, 5, 6, 7], note: "Z posiłkiem zawierającym tłuszcz, od września do maja.", isActive: true },
  { name: "Omega-3", dose: 1000, unit: "mg", timing: ["MORNING"], daysOfWeek: [1, 2, 3, 4, 5, 6, 7], note: "EPA + DHA, z posiłkiem.", isActive: true },
  { name: "Magnez", dose: 300, unit: "mg", timing: ["EVENING"], daysOfWeek: [1, 2, 3, 4, 5, 6, 7], note: "Cytrynian, wieczorem.", isActive: true },
  { name: "Kofeina", dose: 200, unit: "mg", timing: ["PRE_WORKOUT"], daysOfWeek: [1, 3, 5], note: "30-45 minut przed treningiem. Nie po 16:00.", isActive: true },
];

export const STARTER_FOODS = [
  { name: "Pierś z kurczaka", per: "100g", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Wołowina mielona 5%", per: "100g", calories: 137, protein: 21, carbs: 0, fat: 5 },
  { name: "Łosoś", per: "100g", calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Tuńczyk w sosie własnym", per: "100g", calories: 116, protein: 26, carbs: 0, fat: 1 },
  { name: "Jajko", per: "szt", calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
  { name: "Twaróg półtłusty", per: "100g", calories: 133, protein: 18, carbs: 3.5, fat: 5 },
  { name: "Skyr naturalny", per: "100g", calories: 63, protein: 11, carbs: 4, fat: 0.2 },
  { name: "Jogurt grecki 2%", per: "100g", calories: 73, protein: 9, carbs: 3.6, fat: 2 },
  { name: "Ryż biały ugotowany", per: "100g", calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: "Kasza gryczana sucha", per: "100g", calories: 336, protein: 13, carbs: 69, fat: 3.4 },
  { name: "Makaron pełnoziarnisty suchy", per: "100g", calories: 348, protein: 13, carbs: 65, fat: 2.5 },
  { name: "Ziemniaki gotowane", per: "100g", calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  { name: "Płatki owsiane", per: "100g", calories: 366, protein: 12, carbs: 62, fat: 7 },
  { name: "Chleb razowy", per: "100g", calories: 250, protein: 8, carbs: 45, fat: 3 },
  { name: "Banan", per: "szt", calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Jabłko", per: "szt", calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: "Brokuł", per: "100g", calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: "Pomidor", per: "100g", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: "Awokado", per: "100g", calories: 160, protein: 2, carbs: 9, fat: 15 },
  { name: "Oliwa z oliwek", per: "100g", calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: "Masło orzechowe 100%", per: "100g", calories: 588, protein: 25, carbs: 20, fat: 50 },
  { name: "Migdały", per: "100g", calories: 579, protein: 21, carbs: 22, fat: 50 },
  { name: "Odżywka białkowa WPC", per: "szt", calories: 120, protein: 24, carbs: 2.5, fat: 1.5 },
  { name: "Ser żółty", per: "100g", calories: 356, protein: 25, carbs: 1.3, fat: 28 },
  { name: "Mleko 2%", per: "100g", calories: 51, protein: 3.3, carbs: 4.8, fat: 2 },
];

export const MEAL_PRESETS = ["Śniadanie", "Drugie śniadanie", "Obiad", "Przekąska", "Okołotreningowo", "Kolacja"];
