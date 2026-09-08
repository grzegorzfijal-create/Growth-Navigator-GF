import test from "node:test";
import assert from "node:assert/strict";
import { bmr, tdee, suggestedMacros, caloriesFromMacros, sumMacros, portionMacros } from "../src/lib/nutrition.ts";

const profile = { sex: "MALE" as const, weightKg: 85, heightCm: 182, age: 35 };

test("Mifflin-St Jeor liczy spoczynkowa przemiane materii", () => {
  assert.equal(bmr(profile), 1818);
  assert.equal(bmr({ ...profile, sex: "FEMALE" }), 1652);
  assert.equal(bmr({ ...profile, weightKg: null }), null);
});

test("TDEE mnozy BMR przez wspolczynnik aktywnosci", () => {
  assert.equal(tdee({ ...profile, activity: "MODERATE" }), Math.round(1818 * 1.55));
  assert.equal(tdee({ ...profile, activity: "SEDENTARY" }), Math.round(1818 * 1.2));
});

test("propozycja makro trzyma sie kalorii", () => {
  const macros = suggestedMacros({ ...profile, activity: "MODERATE", goal: "CUT" });
  assert.ok(macros);
  assert.ok(macros.calories < macros.tdee, "na redukcji jest deficyt");
  assert.equal(macros.protein, Math.round(85 * 2.2));
  // suma makro musi sie zgadzac z celem kalorycznym (tolerancja na zaokraglenia)
  const fromMacros = caloriesFromMacros(macros.protein, macros.carbs, macros.fat);
  assert.ok(Math.abs(fromMacros - macros.calories) <= 4, `${fromMacros} vs ${macros.calories}`);
});

test("cel na masie daje nadwyzke", () => {
  const bulk = suggestedMacros({ ...profile, activity: "MODERATE", goal: "BULK" });
  assert.ok(bulk && bulk.calories > bulk.tdee);
});

test("sumowanie posilkow", () => {
  const total = sumMacros([
    { calories: 650, protein: 45, carbs: 70, fat: 20 },
    { calories: 400, protein: 30, carbs: 40, fat: 10 },
  ]);
  assert.deepEqual(total, { calories: 1050, protein: 75, carbs: 110, fat: 30 });
});

test("porcja z bazy produktow przelicza sie na gramy i sztuki", () => {
  const chicken = { calories: 165, protein: 31, carbs: 0, fat: 3.6, per: "100g" };
  assert.deepEqual(portionMacros(chicken, 200), { calories: 330, protein: 62, carbs: 0, fat: 7.2 });
  const egg = { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, per: "szt" };
  assert.deepEqual(portionMacros(egg, 3), { calories: 234, protein: 18.9, carbs: 1.8, fat: 15.9 });
});
