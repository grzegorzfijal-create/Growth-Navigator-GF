/**
 * Warstwa wniosków ("AI Coach" w wersji regułowej).
 *
 * Funkcje są czyste i pracują na już policzonych agregatach, więc:
 * - da się je testować bez bazy,
 * - w przyszłości ten sam wejściowy zestaw danych (CoachInput) można wysłać
 *   do modelu językowego i podmienić generator, nie ruszając reszty aplikacji.
 *
 * Wynik ma kształt rekordu CoachInsight z bazy, więc zapis do historii wniosków
 * to zwykły insert.
 */

export type CoachInsightDraft = {
  kind: "PROGRESS" | "VOLUME_BALANCE" | "CONSISTENCY" | "NUTRITION" | "RECOVERY";
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type CoachInput = {
  /** Progresja wybranych bojów: pierwsze i ostatnie szacowane 1RM w oknie analizy. */
  lifts: {
    exerciseId: string;
    name: string;
    firstE1rm: number | null;
    lastE1rm: number | null;
    firstDate: string;
    lastDate: string;
    avgRpeFirst: number | null;
    avgRpeLast: number | null;
  }[];
  /** Liczba serii na partię: bieżący tydzień kontra średnia z poprzednich tygodni. */
  muscleGroups: { category: string; setsThisWeek: number; avgSetsPrevWeeks: number }[];
  consistency: { last30: number; previous30: number; perWeek: number };
  nutrition: { avgCalories: number | null; avgProtein: number | null; targetCalories: number | null; targetProtein: number | null } | null;
  bodyWeight: { deltaKg: number | null; days: number | null } | null;
  fatigue: { avgRpeThisWeek: number | null; avgRpePrevWeeks: number | null } | null;
};

const pct = (from: number, to: number) => Math.round(((to - from) / from) * 1000) / 10;

/** Największy przyrost siły w oknie analizy - to najczęściej najlepsza wiadomość dnia. */
function progressInsight(input: CoachInput): CoachInsightDraft | null {
  const improved = input.lifts
    .filter((lift) => lift.firstE1rm && lift.lastE1rm && lift.firstE1rm > 0)
    .map((lift) => ({ ...lift, change: pct(lift.firstE1rm!, lift.lastE1rm!) }))
    .sort((a, b) => b.change - a.change);

  const best = improved[0];
  if (!best || best.change < 1) return null;

  const rpeNote =
    best.avgRpeFirst != null && best.avgRpeLast != null && Math.abs(best.avgRpeLast - best.avgRpeFirst) <= 0.5
      ? " przy podobnym odczuwanym wysiłku"
      : "";

  return {
    kind: "PROGRESS",
    title: `${best.name}: +${best.change}%`,
    body: `Szacowane 1RM wzrosło z ${best.firstE1rm} kg do ${best.lastE1rm} kg${rpeNote}. To realny postęp, nie przypadek jednej serii.`,
    data: { exerciseId: best.exerciseId, from: best.firstE1rm, to: best.lastE1rm, change: best.change },
  };
}

/** Partia, która w tym tygodniu wyraźnie odstaje od własnej średniej. */
function volumeBalanceInsight(input: CoachInput): CoachInsightDraft | null {
  const neglected = input.muscleGroups
    .filter((group) => group.avgSetsPrevWeeks >= 4)
    .map((group) => ({ ...group, diff: group.setsThisWeek - group.avgSetsPrevWeeks }))
    .sort((a, b) => a.diff - b.diff)[0];

  if (!neglected || neglected.diff >= -3) return null;

  return {
    kind: "VOLUME_BALANCE",
    title: `Mniej serii na partię: ${neglected.category}`,
    body: `W tym tygodniu ${neglected.setsThisWeek} serii wobec średnio ${Math.round(neglected.avgSetsPrevWeeks)} w poprzednich tygodniach. Jeśli to nie jest celowy deload, warto dorzucić jedno ćwiczenie.`,
    data: { category: neglected.category, setsThisWeek: neglected.setsThisWeek, avg: neglected.avgSetsPrevWeeks },
  };
}

function consistencyInsight(input: CoachInput): CoachInsightDraft | null {
  const { last30, previous30, perWeek } = input.consistency;
  if (last30 === 0) return null;

  if (previous30 > 0 && last30 < previous30 - 2) {
    return {
      kind: "CONSISTENCY",
      title: "Spadła częstotliwość treningów",
      body: `${last30} treningów w ostatnich 30 dniach wobec ${previous30} w poprzednich. Średnio ${perWeek} w tygodniu.`,
      data: { last30, previous30 },
    };
  }

  return {
    kind: "CONSISTENCY",
    title: `${last30} treningów w 30 dni`,
    body: `Średnio ${perWeek} treningu w tygodniu. Regularność jest tym, co najbardziej pcha wyniki w górę.`,
    data: { last30, perWeek },
  };
}

function nutritionInsight(input: CoachInput): CoachInsightDraft | null {
  const nutrition = input.nutrition;
  if (!nutrition?.avgProtein || !nutrition.targetProtein) return null;

  const ratio = nutrition.avgProtein / nutrition.targetProtein;
  if (ratio >= 0.9) return null;

  return {
    kind: "NUTRITION",
    title: "Białko poniżej celu",
    body: `Średnio ${Math.round(nutrition.avgProtein)} g dziennie przy celu ${nutrition.targetProtein} g. Przy budowie siły to najczęstszy hamulec regeneracji.`,
    data: { avgProtein: nutrition.avgProtein, target: nutrition.targetProtein },
  };
}

function fatigueInsight(input: CoachInput): CoachInsightDraft | null {
  const fatigue = input.fatigue;
  if (!fatigue?.avgRpeThisWeek || !fatigue.avgRpePrevWeeks) return null;
  if (fatigue.avgRpeThisWeek - fatigue.avgRpePrevWeeks < 0.7) return null;

  return {
    kind: "RECOVERY",
    title: "Ten sam ciężar wydaje się cięższy",
    body: `Średnie RPE tego tygodnia to ${fatigue.avgRpeThisWeek} wobec ${fatigue.avgRpePrevWeeks} wcześniej. Zwykle znaczy to niedospanie albo za mało jedzenia, rzadziej utratę formy.`,
    data: fatigue,
  };
}

/** Zestaw wniosków posortowany od najbardziej użytecznego. */
export function buildInsights(input: CoachInput): CoachInsightDraft[] {
  return [
    progressInsight(input),
    fatigueInsight(input),
    volumeBalanceInsight(input),
    nutritionInsight(input),
    consistencyInsight(input),
  ].filter((insight): insight is CoachInsightDraft => insight !== null);
}
