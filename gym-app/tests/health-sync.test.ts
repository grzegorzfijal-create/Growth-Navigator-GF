import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDate, normalizeHealthPayload, tokenPreview } from "../src/lib/health-sync.ts";

const TODAY = "2026-09-09";

test("pojedynczy pomiar z liczbą i z tekstem", () => {
  const fromNumber = normalizeHealthPayload({ weight: 84.2 }, TODAY);
  assert.ok(fromNumber.ok);
  assert.deepEqual(fromNumber.samples, [{ date: TODAY, weight: 84.2 }]);

  // Skróty wysyłają wartości jako tekst, czasem z przecinkiem dziesiętnym
  const fromText = normalizeHealthPayload({ weight: "84,2", date: "2026-09-08" }, TODAY);
  assert.ok(fromText.ok);
  assert.deepEqual(fromText.samples, [{ date: "2026-09-08", weight: 84.2 }]);
});

test("funty przeliczane na kilogramy", () => {
  const result = normalizeHealthPayload({ weight: 185, unit: "lb" }, TODAY);
  assert.ok(result.ok);
  assert.equal(result.samples[0].weight, 83.9); // 185 lb = 83.91 kg
});

test("data z pomiaru nie ucieka przez strefę czasową", () => {
  // Poranny pomiar w Polsce to wciąż ten sam dzień, nie poprzedni w UTC
  assert.equal(normalizeDate("2026-09-09T06:30:00+02:00", TODAY), "2026-09-09");
  assert.equal(normalizeDate("2026-09-09T23:45:00+02:00", TODAY), "2026-09-09");
  assert.equal(normalizeDate("09/09/2026, 06:30", TODAY), "2026-09-09");
  assert.equal(normalizeDate("9/8/2026", TODAY), "2026-09-08");
  assert.equal(normalizeDate(undefined, TODAY), TODAY);
  assert.equal(normalizeDate("coś dziwnego", TODAY), TODAY);
});

test("paczka historii z aplikacji Zdrowie", () => {
  const result = normalizeHealthPayload({
    unit: "kg",
    samples: [
      { weight: "83.1", date: "2026-09-07T07:00:00+02:00" },
      { weight: "83.4", date: "2026-09-08T07:10:00+02:00", bodyFat: "18.4" },
      { weight: "83.6", date: "2026-09-09T07:05:00+02:00" },
    ],
  }, TODAY);
  assert.ok(result.ok);
  assert.equal(result.samples.length, 3);
  assert.deepEqual(result.samples[0], { date: "2026-09-07", weight: 83.1 });
  assert.equal(result.samples[1].bodyFat, 18.4);
});

test("dwa pomiary tego samego dnia - liczy się ostatni", () => {
  const result = normalizeHealthPayload([
    { weight: 84.0, date: "2026-09-09T06:00:00+02:00" },
    { weight: 84.6, date: "2026-09-09T21:00:00+02:00" },
  ], TODAY);
  assert.ok(result.ok);
  assert.equal(result.samples.length, 1);
  assert.equal(result.samples[0].weight, 84.6);
});

test("bezsensowne wartości są odrzucane z czytelnym powodem", () => {
  const tooLight = normalizeHealthPayload({ weight: 4 }, TODAY);
  assert.ok(!tooLight.ok);
  assert.match(tooLight.error, /pomyłk/i);

  const future = normalizeHealthPayload({ weight: 84, date: "2026-09-10" }, TODAY);
  assert.ok(!future.ok);
  assert.match(future.error, /przyszłości/i);

  const notNumber = normalizeHealthPayload({ weight: "brak" }, TODAY);
  assert.ok(!notNumber.ok);

  const empty = normalizeHealthPayload({}, TODAY);
  assert.ok(!empty.ok);

  const fatOutOfRange = normalizeHealthPayload({ weight: 84, bodyFat: 95 }, TODAY);
  assert.ok(!fatOutOfRange.ok);
});

test("podgląd tokenu pokazuje tylko końcówkę", () => {
  assert.equal(tokenPreview("abcdef1234567890"), "567890");
});
