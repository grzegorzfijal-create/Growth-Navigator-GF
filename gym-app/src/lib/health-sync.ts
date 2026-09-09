/**
 * Przyjmowanie pomiarów z zewnątrz - z aplikacji Zdrowie na iPhonie (Skróty),
 * z wagi elektronicznej albo z dowolnego skryptu, który potrafi wysłać POST.
 *
 * Skróty wysyłają liczby jako tekst, daty w kilku formatach, a czasem paczkę
 * historii naraz - dlatego wejście jest celowo tolerancyjne, a wyjście jednoznaczne.
 * Funkcje są czyste, więc reguły da się przetestować bez sieci i bazy.
 */

import { z } from "zod";

const LB_TO_KG = 0.45359237;

/** Jeden pomiar po normalizacji: data lokalna użytkownika i kilogramy. */
export type HealthSample = {
  date: string; // YYYY-MM-DD
  weight: number; // kg
  bodyFat?: number; // procent
};

const numberish = z.union([z.number(), z.string()]).transform((value, ctx) => {
  // Skróty potrafią wysłać "84,2" - przecinek dziesiętny nie może wywalić importu.
  const parsed = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    ctx.addIssue({ code: "custom", message: "Wartość nie jest liczbą" });
    return z.NEVER;
  }
  return parsed;
});

const sampleSchema = z.object({
  weight: numberish,
  date: z.string().optional(),
  bodyFat: numberish.optional(),
  unit: z.enum(["kg", "lb"]).optional(),
});

const payloadSchema = z.union([
  sampleSchema,
  z.array(sampleSchema).min(1).max(400),
  z.object({
    unit: z.enum(["kg", "lb"]).optional(),
    samples: z.array(sampleSchema).min(1).max(400),
  }),
]);

/**
 * Data z pomiaru. Bierzemy pierwsze dziesięć znaków, a nie obiekt Date - napis
 * "2026-09-09T06:30:00+02:00" niesie już lokalną datę użytkownika i przeliczanie
 * przez UTC potrafiłoby cofnąć poranny pomiar o jeden dzień.
 */
export function normalizeDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // Format amerykański z aplikacji Zdrowie: 09/09/2026 albo 9/9/2026, 14:30
  const slashes = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashes) {
    return `${slashes[3]}-${slashes[1].padStart(2, "0")}-${slashes[2].padStart(2, "0")}`;
  }
  return fallback;
}

export type NormalizeResult =
  | { ok: true; samples: HealthSample[] }
  | { ok: false; error: string };

/** Zamienia dowolny akceptowany kształt wejścia na listę pomiarów w kilogramach. */
export function normalizeHealthPayload(input: unknown, today: string): NormalizeResult {
  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane pomiaru" };
  }

  const data = parsed.data;
  const rawSamples = Array.isArray(data) ? data : "samples" in data ? data.samples : [data];
  const defaultUnit = !Array.isArray(data) && "unit" in data ? data.unit : undefined;

  const byDate = new Map<string, HealthSample>();
  for (const raw of rawSamples) {
    const unit = raw.unit ?? defaultUnit ?? "kg";
    const weight = Math.round((unit === "lb" ? raw.weight * LB_TO_KG : raw.weight) * 10) / 10;
    if (weight < 20 || weight > 400) {
      return { ok: false, error: `Masa ciała ${weight} kg wygląda na pomyłkę (przyjmujemy 20-400 kg)` };
    }
    if (raw.bodyFat !== undefined && (raw.bodyFat < 1 || raw.bodyFat > 70)) {
      return { ok: false, error: "Procent tkanki tłuszczowej poza zakresem 1-70" };
    }

    const date = normalizeDate(raw.date, today);
    if (date > today) {
      return { ok: false, error: `Pomiar z przyszłości (${date}) - sprawdź strefę czasową w skrócie` };
    }
    // Kilka pomiarów tego samego dnia: liczy się ostatni z paczki.
    byDate.set(date, {
      date,
      weight,
      ...(raw.bodyFat !== undefined ? { bodyFat: Math.round(raw.bodyFat * 10) / 10 } : {}),
    });
  }

  const samples = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  return { ok: true, samples };
}

/** Ostatnie znaki tokenu - tyle wystarczy, żeby rozpoznać go na liście. */
export function tokenPreview(token: string): string {
  return token.slice(-6);
}
