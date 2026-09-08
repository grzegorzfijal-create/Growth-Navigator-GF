/** Praca na datach w formacie "YYYY-MM-DD" - bez stref czasowych i bez niespodzianek. */

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Poniedziałek jako pierwszy dzień tygodnia - tak liczy się mikrocykl treningowy. */
export function startOfWeek(iso: string): string {
  const date = fromIsoDate(iso);
  const offset = (date.getDay() + 6) % 7;
  return addDays(iso, -offset);
}

export function startOfMonth(iso: string): string {
  const date = fromIsoDate(iso);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((fromIsoDate(to).getTime() - fromIsoDate(from).getTime()) / 86400000);
}

export type CalendarCell = { date: string; day: number; inMonth: boolean; isToday: boolean };

/** Siatka miesiąca: pełne tygodnie od poniedziałku, gotowa do wyrenderowania. */
export function monthGrid(year: number, month: number, today = todayIso()): CalendarCell[][] {
  const first = toIsoDate(new Date(year, month, 1));
  let cursor = startOfWeek(first);
  const weeks: CalendarCell[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const week: CalendarCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const date = fromIsoDate(cursor);
      week.push({ date: cursor, day: date.getDate(), inMonth: date.getMonth() === month, isToday: cursor === today });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
    if (fromIsoDate(cursor).getMonth() !== month && w >= 3) break;
  }
  return weeks;
}

const MONTHS = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];
const MONTHS_GENITIVE = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];
export const WEEKDAY_SHORT = ["pon", "wt", "śr", "czw", "pt", "sob", "ndz"];
export const WEEKDAY_LONG = [
  "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela",
];

export function monthName(month: number): string {
  return MONTHS[month] ?? "";
}

/** "12 września" albo "12 września 2025", gdy rok inny niż bieżący. */
export function formatDayMonth(iso: string, withYear = false): string {
  const date = fromIsoDate(iso);
  const base = `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
  return withYear ? `${base} ${date.getFullYear()}` : base;
}

export function weekdayLong(iso: string): string {
  return WEEKDAY_LONG[(fromIsoDate(iso).getDay() + 6) % 7];
}

/** Dzień tygodnia w konwencji 1 = poniedziałek (tak trzymamy dni suplementacji). */
export function isoWeekday(iso: string): number {
  return ((fromIsoDate(iso).getDay() + 6) % 7) + 1;
}

export function relativeDayLabel(iso: string, today = todayIso()): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Dzisiaj";
  if (diff === -1) return "Wczoraj";
  if (diff === 1) return "Jutro";
  return formatDayMonth(iso, fromIsoDate(iso).getFullYear() !== fromIsoDate(today).getFullYear());
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function formatMinutes(minutes: number): string {
  // Trening krótszy niż minuta to zwykle świeżo rozpoczęta sesja, nie "0 min".
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
