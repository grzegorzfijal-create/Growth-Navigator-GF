import Link from "next/link";
import type { Metadata } from "next";
import { Lightbulb, Trophy } from "lucide-react";

import { ProgressChart } from "@/components/charts/progress-chart";
import { VolumeBars } from "@/components/charts/volume-bars";
import { MuscleVolume } from "@/components/stats/muscle-volume";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { addDays, formatDayMonth, formatMinutes, toIsoDate, todayIso } from "@/lib/date";
import { PR_LABELS } from "@/lib/labels";
import { formatNumber, formatVolume } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { getCoachInsights } from "@/server/queries/coach";
import { getPersonalRecords, getTrainingStats, getVolumeByMuscle, getWeeklyVolume } from "@/server/queries/training";

export const metadata: Metadata = { title: "Statystyki" };

export default async function StatsPage() {
  const user = await requireUser();
  const today = todayIso();

  const [stats, weekly, muscles, records, bodyWeights, insights] = await Promise.all([
    getTrainingStats(user.id, today),
    getWeeklyVolume(user.id, 8, today),
    getVolumeByMuscle(user.id, addDays(today, -27), today),
    getPersonalRecords(user.id),
    prisma.bodyWeightEntry.findMany({ where: { userId: user.id }, orderBy: { date: "asc" }, take: 120 }),
    getCoachInsights(user.id, today),
  ]);

  const bestLifts = records.filter((record) => record.type === "BEST_E1RM").slice(0, 8);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="display text-3xl">Statystyki</h1>
        <p className="text-sm text-muted">Liczby, które mówią, czy plan działa.</p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Treningi" value={stats.total} hint="wszystkie" />
        <Stat label="Śr. czas" value={stats.avgDuration ? formatMinutes(stats.avgDuration) : "-"} />
        <Stat label="Serie" value={stats.totalSets} />
        <Stat label="Śr. RPE" value={stats.avgRpe ?? "-"} />
      </div>

      {insights.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-4.5 text-muted" /> Obserwacje
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {insights.map((insight) => (
              <div key={insight.title} className="rounded-xl border border-border p-3">
                <p className="font-semibold">{insight.title}</p>
                <p className="mt-0.5 text-sm text-muted">{insight.body}</p>
              </div>
            ))}
            <p className="text-xs text-muted">
              Wnioski liczone z Twojej historii według stałych reguł. Ten sam zestaw danych trafi kiedyś
              do modelu językowego - miejsce na to jest już przygotowane.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Regularność</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="display text-3xl">
            {stats.last30.count} <span className="text-lg">treningów w ostatnich 30 dniach</span>
          </p>
          <p className="text-sm text-muted">
            Średnio {stats.last30.perWeek} w tygodniu. Aktualna seria: {stats.streak} tygodni z rzędu.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objętość tygodniowa</CardTitle>
        </CardHeader>
        <CardContent>
          <VolumeBars data={weekly} />
          <p className="mt-2 text-xs text-muted">
            Ten tydzień: {formatVolume(stats.weekVolume)} w {stats.weekSets} seriach.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Podział na partie (28 dni)</CardTitle>
        </CardHeader>
        <CardContent>
          <MuscleVolume data={muscles} />
        </CardContent>
      </Card>

      {bodyWeights.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Masa ciała</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressChart
              data={bodyWeights.map((entry) => ({ date: toIsoDate(entry.date), weight: entry.weight }))}
              dataKey="weight"
              unit="kg"
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-4.5 text-muted" /> Rekordy osobiste
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {bestLifts.length === 0 ? (
            <p className="text-sm text-muted">Rekordy pojawią się po pierwszych zakończonych treningach.</p>
          ) : (
            bestLifts.map((record) => (
              <Link
                key={record.id}
                href={`/cwiczenia/${record.exercise.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{record.exercise.name}</p>
                  <p className="text-xs text-muted">
                    {PR_LABELS[record.type]} - {formatDayMonth(toIsoDate(record.achievedAt), true)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="display text-xl text-accent">{formatNumber(record.value, 1)} kg</p>
                  {record.weight && record.reps ? (
                    <p className="text-[11px] text-muted tabular">
                      z {record.weight} kg x {record.reps}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
