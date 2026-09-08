import type { Metadata } from "next";

import { SupplementManager } from "@/components/supplements/supplement-manager";
import { addDays, fromIsoDate, isoWeekday, toIsoDate, todayIso } from "@/lib/date";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";

export const metadata: Metadata = { title: "Suplementacja" };

export default async function SupplementsPage() {
  const user = await requireUser();
  const today = todayIso();
  const weekStart = addDays(today, -6);

  const [supplements, logs] = await Promise.all([
    prisma.supplement.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } }),
    prisma.supplementLog.findMany({
      where: { userId: user.id, date: { gte: fromIsoDate(weekStart), lte: fromIsoDate(today) } },
    }),
  ]);

  const todayLogs = logs.filter((log) => toIsoDate(log.date) === today);
  const weekday = isoWeekday(today);

  // Ile dawek zaplanowanych i ile odhaczonych w każdym z ostatnich siedmiu dni.
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const day = isoWeekday(date);
    const planned = supplements
      .filter((supplement) => supplement.isActive && supplement.daysOfWeek.includes(day))
      .reduce((sum, supplement) => sum + supplement.timing.length, 0);
    const taken = logs.filter((log) => toIsoDate(log.date) === date).length;
    return { date, planned, taken };
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="display text-3xl">Suplementacja</h1>
        <p className="text-sm text-muted">Co brać, kiedy brać i czy faktycznie wzięte.</p>
      </header>

      <SupplementManager
        date={today}
        week={week}
        today={supplements
          .filter((supplement) => supplement.isActive && supplement.daysOfWeek.includes(weekday))
          .map((supplement) => ({
            id: supplement.id,
            name: supplement.name,
            dose: supplement.dose,
            unit: supplement.unit,
            timing: supplement.timing,
            note: supplement.note,
            takenTimings: todayLogs.filter((log) => log.supplementId === supplement.id).map((log) => log.timing),
          }))}
        supplements={supplements.map((supplement) => ({
          id: supplement.id,
          name: supplement.name,
          dose: supplement.dose,
          unit: supplement.unit,
          timing: supplement.timing as ("MORNING" | "PRE_WORKOUT" | "POST_WORKOUT" | "EVENING")[],
          daysOfWeek: supplement.daysOfWeek,
          note: supplement.note,
          isActive: supplement.isActive,
        }))}
      />
    </div>
  );
}
