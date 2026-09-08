import test from "node:test";
import assert from "node:assert/strict";
import { buildInsights, type CoachInput } from "../src/lib/coach.ts";

const base: CoachInput = {
  lifts: [],
  muscleGroups: [],
  consistency: { last30: 12, previous30: 12, perWeek: 2.8 },
  nutrition: null,
  bodyWeight: null,
  fatigue: null,
};

test("wzrost szacowanego 1RM trafia na pierwsze miejsce", () => {
  const insights = buildInsights({
    ...base,
    lifts: [
      {
        exerciseId: "bench",
        name: "Wyciskanie sztangi leżąc",
        firstE1rm: 100,
        lastE1rm: 110,
        firstDate: "2026-07-14",
        lastDate: "2026-09-08",
        avgRpeFirst: 8,
        avgRpeLast: 8,
      },
    ],
  });
  assert.equal(insights[0].kind, "PROGRESS");
  assert.match(insights[0].title, /\+10%/);
  assert.match(insights[0].body, /podobnym odczuwanym wysiłku/);
});

test("brak realnego przyrostu nie generuje wniosku o progresji", () => {
  const insights = buildInsights({
    ...base,
    lifts: [
      { exerciseId: "x", name: "Przysiad", firstE1rm: 100, lastE1rm: 100.5, firstDate: "a", lastDate: "b", avgRpeFirst: null, avgRpeLast: null },
    ],
  });
  assert.ok(!insights.some((insight) => insight.kind === "PROGRESS"));
});

test("zaniedbana partia jest wychwycona, drobne wahania nie", () => {
  const neglected = buildInsights({
    ...base,
    muscleGroups: [
      { category: "LEGS", setsThisWeek: 2, avgSetsPrevWeeks: 12 },
      { category: "CHEST", setsThisWeek: 10, avgSetsPrevWeeks: 11 },
    ],
  });
  assert.ok(neglected.some((insight) => insight.kind === "VOLUME_BALANCE" && insight.body.includes("2 serii")));

  const balanced = buildInsights({
    ...base,
    muscleGroups: [{ category: "CHEST", setsThisWeek: 10, avgSetsPrevWeeks: 11 }],
  });
  assert.ok(!balanced.some((insight) => insight.kind === "VOLUME_BALANCE"));
});

test("wzrost średniego RPE przy tym samym planie to sygnał regeneracyjny", () => {
  const insights = buildInsights({ ...base, fatigue: { avgRpeThisWeek: 9.2, avgRpePrevWeeks: 8.3 } });
  assert.ok(insights.some((insight) => insight.kind === "RECOVERY"));
});

test("białko poniżej 90% celu daje wniosek żywieniowy", () => {
  const low = buildInsights({
    ...base,
    nutrition: { avgCalories: 2600, avgProtein: 120, targetCalories: 2900, targetProtein: 175 },
  });
  assert.ok(low.some((insight) => insight.kind === "NUTRITION"));

  const ok = buildInsights({
    ...base,
    nutrition: { avgCalories: 2900, avgProtein: 170, targetCalories: 2900, targetProtein: 175 },
  });
  assert.ok(!ok.some((insight) => insight.kind === "NUTRITION"));
});

test("spadek liczby treningów jest zgłaszany", () => {
  const insights = buildInsights({ ...base, consistency: { last30: 6, previous30: 12, perWeek: 1.4 } });
  const consistency = insights.find((insight) => insight.kind === "CONSISTENCY");
  assert.match(consistency!.title, /Spadła/);
});
