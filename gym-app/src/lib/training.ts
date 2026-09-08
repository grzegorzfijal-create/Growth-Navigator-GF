/**
 * Matematyka treningowa. Czyste funkcje, zero zaleznosci od bazy i Reacta -
 * dzieki temu ta sama logika dziala na serwerze, w kliencie i w testach.
 */

export type SetLike = {
  weight?: number | null;
  reps?: number | null;
  rpe?: number | null;
  rir?: number | null;
  isWarmup?: boolean | null;
  isCompleted?: boolean | null;
};

export type RepRange = {
  repsMin?: number | null;
  repsMax?: number | null;
  targetRpe?: number | null;
};

/* --------------------------------------------------------------- pomocnicze */

export function round(value: number, decimals = 0): number {
  const m = 10 ** decimals;
  return Math.round(value * m) / m;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Zaokraglenie do realnego obciazenia - na sztange wchodza talerze parami. */
export function roundToPlate(weight: number, step = 2.5): number {
  if (!Number.isFinite(weight)) return 0;
  if (!step || step <= 0) return round(weight, 1);
  return round(Math.round(weight / step) * step, 2);
}

/* ------------------------------------------------------------------ RPE/RIR */

/**
 * RPE 10 = zero powtorzen w zapasie, RPE 8 = zostaly 2.
 * Poza zakresem 5-10 skala przestaje byc uzyteczna, wiec ja przycinamy.
 */
export function rpeToRir(rpe: number): number {
  return round(clamp(10 - rpe, 0, 5), 1);
}

export function rirToRpe(rir: number): number {
  return round(clamp(10 - rir, 5, 10), 1);
}

/**
 * Tabela RTS: procent ciezaru maksymalnego dla "efektywnych powtorzen",
 * czyli powtorzen wykonanych + powtorzen zostawionych w zapasie (RIR).
 * Indeks 0 to jedno powtorzenie na RPE 10 = 100% maksa.
 */
const RPE_TABLE = [100, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0];

/** Ile procent maksa wazy seria: X powtorzen zakonczonych na danym RPE. */
export function percentOf1rm(reps: number, rpe?: number | null): number | null {
  if (!Number.isFinite(reps) || reps < 1) return null;
  const effective = reps + (rpe != null && Number.isFinite(rpe) ? 10 - clamp(rpe, 4, 10) : 0);
  if (effective <= 1) return 100;
  const index = Math.floor(effective) - 1;
  const frac = effective - Math.floor(effective);
  if (index >= RPE_TABLE.length - 1) {
    // Poza tabela schodzimy liniowo - i tak nikt nie planuje serii po 15 powtorzen na maksa.
    const last = RPE_TABLE[RPE_TABLE.length - 1];
    return round(Math.max(30, last - (effective - RPE_TABLE.length) * 1.3), 1);
  }
  return round(RPE_TABLE[index] + (RPE_TABLE[index + 1] - RPE_TABLE[index]) * frac, 1);
}

/** Klasyczny wzor Epleya - prosty i powszechnie uzywany. */
export function epley1rm(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps < 1) return null;
  return round(weight * (1 + reps / 30), 1);
}

/**
 * Szacowane 1RM. Gdy znamy RPE, liczymy z tabeli (uwzglednia zapas),
 * bez RPE wracamy do Epleya, ktory zaklada serie do upadku.
 */
export function estimate1rm(weight?: number | null, reps?: number | null, rpe?: number | null): number | null {
  if (weight == null || reps == null) return null;
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps < 1) return null;
  if (rpe == null || !Number.isFinite(rpe)) return epley1rm(weight, reps);
  const pct = percentOf1rm(reps, rpe);
  if (!pct) return null;
  return round((weight * 100) / pct, 1);
}

/** Ile kilo wziac, zeby zrobic X powtorzen na zadanym RPE. */
export function weightForReps(oneRm: number, reps: number, rpe = 8, step = 2.5): number | null {
  if (!Number.isFinite(oneRm) || oneRm <= 0) return null;
  const pct = percentOf1rm(reps, rpe);
  if (!pct) return null;
  return roundToPlate((oneRm * pct) / 100, step);
}

/* ---------------------------------------------------------------- objetosc */

export function setVolume(set: SetLike): number {
  if (!set.isCompleted || set.isWarmup) return 0;
  return round((set.weight ?? 0) * (set.reps ?? 0), 1);
}

export function isWorkingSet(set: SetLike): boolean {
  return Boolean(set.isCompleted) && !set.isWarmup;
}

export type SessionTotals = {
  volume: number;
  sets: number;
  reps: number;
  avgRpe: number | null;
};

export function sessionTotals(sets: SetLike[]): SessionTotals {
  const working = sets.filter(isWorkingSet);
  const rpes = working.map((s) => s.rpe).filter((r): r is number => r != null && Number.isFinite(r));
  return {
    volume: round(working.reduce((sum, s) => sum + setVolume(s), 0), 1),
    sets: working.length,
    reps: working.reduce((sum, s) => sum + (s.reps ?? 0), 0),
    avgRpe: rpes.length ? round(rpes.reduce((a, b) => a + b, 0) / rpes.length, 1) : null,
  };
}

/** Najlepsza seria mierzona szacowanym maksem, a nie samym ciezarem. */
export function bestSet<T extends SetLike>(sets: T[]): (T & { estimated1rm: number }) | null {
  let best: (T & { estimated1rm: number }) | null = null;
  for (const set of sets.filter(isWorkingSet)) {
    const est = estimate1rm(set.weight, set.reps, set.rpe);
    if (est != null && (!best || est > best.estimated1rm)) best = { ...set, estimated1rm: est };
  }
  return best;
}

/* --------------------------------------------------------------- progresja */

export type SuggestionAction = "first-time" | "increase" | "hold" | "add-reps" | "deload";

export type WeightSuggestion = {
  action: SuggestionAction;
  weight: number | null;
  reps: number | null;
  message: string;
};

/**
 * Podpowiedz na kolejny trening. Zasada: najpierw domykasz zakres powtorzen,
 * dopiero potem dokladasz ciezar. Podpowiedz jest pomocnicza - nigdy nie
 * podbijamy ciezaru, gdy ostatnie serie szly na RPE 9+.
 */
export function suggestNextWeight(
  previousSets: SetLike[],
  target: RepRange = {},
  step = 2.5,
): WeightSuggestion {
  const working = previousSets.filter(isWorkingSet);
  const repsMin = target.repsMin ?? 8;
  const repsMax = target.repsMax ?? repsMin;
  const targetRpe = target.targetRpe ?? 8;

  if (working.length === 0) {
    return {
      action: "first-time",
      weight: null,
      reps: repsMin,
      message: `Pierwszy raz - dobierz ciezar tak, zeby ${repsMin} powtorzen wyszlo na RPE ${targetRpe}.`,
    };
  }

  const topWeight = Math.max(...working.map((s) => s.weight ?? 0));
  const topSets = working.filter((s) => (s.weight ?? 0) === topWeight);
  const minReps = Math.min(...topSets.map((s) => s.reps ?? 0));
  const rpes = topSets.map((s) => s.rpe).filter((r): r is number => r != null);
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;

  // Zakres domkniety i bylo lekko - czas dolozyc.
  if (minReps >= repsMax && (avgRpe == null || avgRpe <= targetRpe)) {
    const next = roundToPlate(topWeight + step, step);
    return {
      action: "increase",
      weight: next,
      reps: repsMin,
      message: `Ostatnio ${topWeight} kg x ${minReps}${avgRpe != null ? ` @RPE ${round(avgRpe, 1)}` : ""} - sprobuj ${next} kg.`,
    };
  }

  // Bylo bardzo ciezko i zakres nie dowieziony - zejscie o 10%.
  if (avgRpe != null && avgRpe >= 9.5 && minReps < repsMin) {
    const next = roundToPlate(topWeight * 0.9, step);
    return {
      action: "deload",
      weight: next,
      reps: repsMin,
      message: `Ostatnio RPE ${round(avgRpe, 1)} przy ${minReps} powtorzeniach - zejdz na ${next} kg.`,
    };
  }

  // Zakres domkniety, ale ciezko - zostajemy na tym samym ciezarze.
  if (minReps >= repsMax) {
    return {
      action: "hold",
      weight: topWeight,
      reps: repsMax,
      message: `Zostan na ${topWeight} kg - zakres domkniety, ale RPE bylo wysokie.`,
    };
  }

  const nextReps = Math.min(repsMax, minReps + 1);
  return {
    action: "add-reps",
    weight: topWeight,
    reps: nextReps,
    message: `Ten sam ciezar (${topWeight} kg), celuj w ${nextReps} powtorzen.`,
  };
}

/* ----------------------------------------------------------------- rekordy */

export type PrCandidate = {
  maxWeight: number | null;
  maxReps: number | null;
  bestE1rm: number | null;
  maxVolume: number | null;
};

/** Kandydaci na rekordy z jednego wykonania cwiczenia w treningu. */
export function prCandidates(sets: SetLike[]): PrCandidate {
  const working = sets.filter(isWorkingSet);
  if (working.length === 0) return { maxWeight: null, maxReps: null, bestE1rm: null, maxVolume: null };
  const best = bestSet(working);
  return {
    maxWeight: Math.max(...working.map((s) => s.weight ?? 0)) || null,
    maxReps: Math.max(...working.map((s) => s.reps ?? 0)) || null,
    bestE1rm: best?.estimated1rm ?? null,
    maxVolume: round(working.reduce((sum, s) => sum + setVolume(s), 0), 1) || null,
  };
}

/* ---------------------------------------------------------------- statystyki */

/** Nachylenie prostej trendu - dodatnie znaczy, ze idzie w gore. */
export function trendSlope(values: number[]): number | null {
  const points = values.filter((v) => Number.isFinite(v));
  if (points.length < 2) return null;
  const meanX = (points.length - 1) / 2;
  const meanY = points.reduce((a, b) => a + b, 0) / points.length;
  let num = 0;
  let den = 0;
  points.forEach((y, i) => {
    num += (i - meanX) * (y - meanY);
    den += (i - meanX) ** 2;
  });
  return den === 0 ? 0 : round(num / den, 3);
}

/**
 * Seria treningowa liczona w tygodniach z co najmniej jednym treningiem.
 * Dni wolne nie zeruja passy - inaczej kazdy plan 3x w tygodniu mialby serie 1.
 */
export function weeklyStreak(dates: string[], today: string): number {
  if (dates.length === 0) return 0;
  const weeks = new Set(dates.map(isoWeekKey));
  let cursor = new Date(`${today}T00:00:00`);
  let streak = 0;
  // Biezacy tydzien bez treningu nie zeruje passy - tydzien jeszcze trwa.
  if (!weeks.has(isoWeekKey(toIso(cursor)))) cursor = shiftDays(cursor, -7);
  while (weeks.has(isoWeekKey(toIso(cursor)))) {
    streak += 1;
    cursor = shiftDays(cursor, -7);
  }
  return streak;
}

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Klucz tygodnia ISO, np. "2026-W37" - poniedzialek zaczyna tydzien. */
export function isoWeekKey(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const day = (date.getDay() + 6) % 7;
  const thursday = shiftDays(date, 3 - day);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  const week1Monday = shiftDays(firstThursday, -firstDay);
  const week = 1 + Math.round((thursday.getTime() - week1Monday.getTime()) / (7 * 86400000));
  return `${thursday.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Ile treningow w ostatnich N dniach - odpowiada na pytanie "trzymam rytm?". */
export function trainingFrequency(dates: string[], days: number, today: string): { count: number; perWeek: number } {
  const end = new Date(`${today}T00:00:00`);
  const start = shiftDays(end, -(days - 1));
  const startIso = toIso(start);
  const count = dates.filter((d) => d >= startIso && d <= today).length;
  return { count, perWeek: round((count / days) * 7, 1) };
}
