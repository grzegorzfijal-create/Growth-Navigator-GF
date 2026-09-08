import test from "node:test";
import assert from "node:assert/strict";
import {
  percentOf1rm,
  epley1rm,
  estimate1rm,
  weightForReps,
  rpeToRir,
  rirToRpe,
  roundToPlate,
  sessionTotals,
  bestSet,
  suggestNextWeight,
  prCandidates,
  trendSlope,
  weeklyStreak,
  isoWeekKey,
  trainingFrequency,
} from "../src/lib/training.ts";

const set = (weight: number, reps: number, rpe?: number, extra: Record<string, unknown> = {}) => ({
  weight,
  reps,
  rpe: rpe ?? null,
  isCompleted: true,
  isWarmup: false,
  ...extra,
});

test("RPE i RIR sa dwiema stronami tej samej skali", () => {
  assert.equal(rpeToRir(8), 2);
  assert.equal(rpeToRir(10), 0);
  assert.equal(rirToRpe(3), 7);
  assert.equal(rirToRpe(0), 10);
  // RIR powyzej 5 nie niesie juz informacji treningowej
  assert.equal(rpeToRir(3), 5);
});

test("tabela RPE zgadza sie ze znanymi wartosciami", () => {
  assert.equal(percentOf1rm(1, 10), 100);
  assert.equal(percentOf1rm(1, 9), 95.5); // 1 powt. @9 = 2 powt. @10
  assert.equal(percentOf1rm(5, 8), 81.1);
  assert.equal(percentOf1rm(8, 7.5), 72.3);
  assert.equal(percentOf1rm(0, 10), null);
});

test("Epley liczy 1RM po staremu", () => {
  assert.equal(epley1rm(100, 10), 133.3);
  assert.equal(epley1rm(100, 1), 103.3);
  assert.equal(epley1rm(0, 5), null);
});

test("estimate1rm uwzglednia zapas z RPE, a bez RPE wraca do Epleya", () => {
  // 100 kg x 5 @8 to 81.1% maksa
  assert.equal(estimate1rm(100, 5, 8), 123.3);
  // ta sama seria zrobiona do upadku znaczy duzo mniej
  assert.equal(estimate1rm(100, 5, 10), 115.9);
  assert.equal(estimate1rm(100, 5, null), epley1rm(100, 5));
  assert.equal(estimate1rm(null, 5, 8), null);
});

test("weightForReps proponuje realne obciazenie", () => {
  // 8 powtorzen na RPE 8 to 73.9% z maksa
  assert.equal(weightForReps(150, 8, 8, 2.5), 110);
  assert.equal(roundToPlate(101.2, 2.5), 100);
  assert.equal(roundToPlate(101.9, 2.5), 102.5);
  assert.equal(roundToPlate(23.3, 1), 23);
});

test("objetosc liczy tylko serie robocze i zaznaczone jako wykonane", () => {
  const totals = sessionTotals([
    set(80, 10, 8),
    set(82.5, 8, 9),
    set(60, 10, 6, { isWarmup: true }),
    set(80, 10, 8, { isCompleted: false }),
  ]);
  assert.equal(totals.volume, 800 + 660);
  assert.equal(totals.sets, 2);
  assert.equal(totals.reps, 18);
  assert.equal(totals.avgRpe, 8.5);
});

test("najlepsza seria to najwyzsze szacowane 1RM, nie najwiekszy ciezar", () => {
  const best = bestSet([set(100, 3, 10), set(90, 8, 8)]);
  // 90x8@8 (73.9%) daje 121.8 kg, 100x3@10 (92.2%) tylko 108.5
  assert.equal(best?.weight, 90);
  assert.equal(best?.estimated1rm, 121.8);
});

test("progresja: domkniety zakres na niskim RPE podbija ciezar", () => {
  const s = suggestNextWeight([set(80, 10, 7), set(80, 10, 7)], { repsMin: 8, repsMax: 10, targetRpe: 8 }, 2.5);
  assert.equal(s.action, "increase");
  assert.equal(s.weight, 82.5);
  assert.equal(s.reps, 8);
});

test("progresja: ciezko przy domknietym zakresie = zostajemy na ciezarze", () => {
  const s = suggestNextWeight([set(80, 10, 9.5), set(80, 10, 10)], { repsMin: 8, repsMax: 10, targetRpe: 8 });
  assert.equal(s.action, "hold");
  assert.equal(s.weight, 80);
});

test("progresja: niedowieziony zakres na maksymalnym wysilku = deload", () => {
  const s = suggestNextWeight([set(100, 5, 10), set(100, 4, 10)], { repsMin: 8, repsMax: 10, targetRpe: 8 });
  assert.equal(s.action, "deload");
  assert.equal(s.weight, 90);
});

test("progresja: w srodku zakresu dokladamy powtorzenie, nie kilogramy", () => {
  const s = suggestNextWeight([set(80, 8, 8)], { repsMin: 8, repsMax: 10, targetRpe: 8 });
  assert.equal(s.action, "add-reps");
  assert.equal(s.weight, 80);
  assert.equal(s.reps, 9);
});

test("progresja: brak historii nie wymysla ciezaru", () => {
  const s = suggestNextWeight([], { repsMin: 8, repsMax: 10 });
  assert.equal(s.action, "first-time");
  assert.equal(s.weight, null);
});

test("kandydaci na rekordy", () => {
  const pr = prCandidates([set(100, 5, 8), set(105, 3, 9), set(60, 12, 6, { isWarmup: true })]);
  assert.equal(pr.maxWeight, 105);
  assert.equal(pr.maxReps, 5);
  assert.equal(pr.maxVolume, 500 + 315);
  assert.equal(pr.bestE1rm, estimate1rm(100, 5, 8));
});

test("trend rosnacy ma dodatnie nachylenie", () => {
  assert.ok((trendSlope([100, 102, 104, 107]) ?? 0) > 0);
  assert.ok((trendSlope([107, 104, 100]) ?? 0) < 0);
  assert.equal(trendSlope([100]), null);
});

test("tygodnie ISO i seria treningowa", () => {
  assert.equal(isoWeekKey("2026-09-08"), "2026-W37");
  // trening w tym i dwoch poprzednich tygodniach = seria 3
  assert.equal(weeklyStreak(["2026-09-07", "2026-09-02", "2026-08-25"], "2026-09-08"), 3);
  // przerwa dluzsza niz tydzien konczy serie
  assert.equal(weeklyStreak(["2026-08-10"], "2026-09-08"), 0);
  assert.equal(weeklyStreak([], "2026-09-08"), 0);
});

test("czestotliwosc treningow w oknie 30 dni", () => {
  const dates = ["2026-09-07", "2026-09-05", "2026-09-02", "2026-07-01"];
  const freq = trainingFrequency(dates, 30, "2026-09-08");
  assert.equal(freq.count, 3);
  assert.equal(freq.perWeek, 0.7);
});
