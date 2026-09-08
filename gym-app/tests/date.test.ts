import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  daysBetween,
  formatDayMonth,
  formatDuration,
  formatMinutes,
  isoWeekday,
  monthGrid,
  relativeDayLabel,
  startOfWeek,
} from "../src/lib/date.ts";

test("tydzien zaczyna sie w poniedzialek", () => {
  assert.equal(startOfWeek("2026-09-08"), "2026-09-07"); // wtorek -> poniedzialek
  assert.equal(startOfWeek("2026-09-13"), "2026-09-07"); // niedziela -> ten sam poniedzialek
  assert.equal(isoWeekday("2026-09-07"), 1);
  assert.equal(isoWeekday("2026-09-13"), 7);
});

test("arytmetyka dni przechodzi przez granice miesiaca", () => {
  assert.equal(addDays("2026-08-31", 1), "2026-09-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(daysBetween("2026-09-01", "2026-09-08"), 7);
});

test("siatka miesiaca to pelne tygodnie", () => {
  const grid = monthGrid(2026, 8, "2026-09-08"); // wrzesien 2026
  assert.equal(grid[0].length, 7);
  assert.equal(grid[0][0].date, "2026-08-31"); // poniedzialek przed 1 wrzesnia
  const flat = grid.flat();
  assert.equal(flat.filter((c) => c.inMonth).length, 30);
  assert.equal(flat.filter((c) => c.isToday).length, 1);
});

test("etykiety dat po polsku", () => {
  assert.equal(formatDayMonth("2026-09-12"), "12 września");
  assert.equal(relativeDayLabel("2026-09-08", "2026-09-08"), "Dzisiaj");
  assert.equal(relativeDayLabel("2026-09-07", "2026-09-08"), "Wczoraj");
  assert.equal(relativeDayLabel("2026-09-01", "2026-09-08"), "1 września");
});

test("czas treningu i stopera", () => {
  assert.equal(formatMinutes(0), "<1 min");
  assert.equal(formatMinutes(62), "1 h 2 min");
  assert.equal(formatDuration(102), "1:42");
  assert.equal(formatDuration(59), "0:59");
  assert.equal(formatDuration(3720), "1h 02m");
});

test("polska odmiana liczebników", async () => {
  const { plural } = await import("../src/lib/utils.ts");
  const forms: [string, string, string] = ["zmiana", "zmiany", "zmian"];
  assert.equal(plural(1, forms), "zmiana");
  assert.equal(plural(3, forms), "zmiany");
  assert.equal(plural(5, forms), "zmian");
  assert.equal(plural(12, forms), "zmian");
  assert.equal(plural(22, forms), "zmiany");
});
