import Link from "next/link";
import {
  Apple,
  ArrowRight,
  CalendarCheck,
  ChevronRight,
  Flame,
  History,
  Pill,
  Scale,
  Trophy,
} from "lucide-react";

import { ProgressChart } from "@/components/charts/progress-chart";
import { MacroSummary } from "@/components/nutrition/macro-summary";
import { SupplementChecklist } from "@/components/supplements/supplement-checklist";
import { StartWorkoutButton } from "@/components/training/start-workout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { formatDayMonth, formatMinutes, relativeDayLabel, todayIso, weekdayLong } from "@/lib/date";
import { formatNumber, formatVolume } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { getDashboardData } from "@/server/queries/dashboard";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);
  const today = todayIso();
  const planned = data.plannedToday[0] ?? null;
  const doneToday = data.completedToday[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {weekdayLong(today)}, {formatDayMonth(today)}
          </p>
          <h1 className="display text-3xl">Cześć, {user.name ?? "zawodniku"}</h1>
        </div>
        <Badge variant="outline" className="shrink-0">
          <Flame className="size-3.5" />
          {data.stats.streak} tyg. serii
        </Badge>
      </header>

      {/* Sekcja "Dzisiaj" - jedno duże wejście w trening. */}
      <Card className="relative overflow-hidden border-accent/30">
        <div className="livery pointer-events-none absolute inset-y-0 right-0 w-32 opacity-70" />
        <span className="display pointer-events-none absolute -right-2 -top-4 text-8xl text-accent/10">93</span>

        <CardContent className="relative pt-4">
          {data.activeSession ? (
            <div className="flex flex-col gap-3">
              <Badge variant="accent" className="w-fit">Trening w toku</Badge>
              <h2 className="display text-3xl">{data.activeSession.name}</h2>
              <p className="text-sm text-muted">
                Zaczęty {data.activeSession.startedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                {" - "}wróć i dokończ serie.
              </p>
              <Button asChild size="lg" className="w-full">
                <Link href={`/trening/${data.activeSession.id}`}>Wróć do treningu</Link>
              </Button>
            </div>
          ) : doneToday ? (
            <div className="flex flex-col gap-3">
              <Badge variant="success" className="w-fit">
                <CalendarCheck className="size-3.5" /> Zrobione dzisiaj
              </Badge>
              <h2 className="display text-3xl">{doneToday.name}</h2>
              <div className="grid grid-cols-3 gap-2">
                <Stat
                  label="Czas"
                  value={
                    doneToday.finishedAt
                      ? formatMinutes(Math.round((doneToday.finishedAt.getTime() - doneToday.startedAt.getTime()) / 60000))
                      : "-"
                  }
                />
                <Stat label="Serie" value={doneToday.totalSets} />
                <Stat label="Objętość" value={formatVolume(doneToday.totalVolume)} />
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/historia/${doneToday.id}`}>Zobacz trening</Link>
              </Button>
            </div>
          ) : planned?.workout ? (
            <div className="flex flex-col gap-3">
              <Badge variant="accent" className="w-fit">Plan na dziś</Badge>
              <div>
                <h2 className="display text-4xl">{planned.workout.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {planned.workout.plan.name} - {planned.workout.exercises.length} ćwiczeń
                  {planned.workout.estimatedMinutes ? ` - ok. ${planned.workout.estimatedMinutes} min` : ""}
                </p>
              </div>
              <StartWorkoutButton
                workoutId={planned.workout.id}
                size="lg"
                className="w-full text-base"
                label="ROZPOCZNIJ TRENING"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Badge variant="outline" className="w-fit">Dzień bez planu</Badge>
              <h2 className="display text-3xl">Wolne albo trening z marszu</h2>
              <p className="text-sm text-muted">
                Nic nie zaplanowano na dziś. Możesz odpocząć albo wybrać trening ręcznie.
              </p>
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href="/trening">
                  Wybierz trening <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Szybkie statystyki */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="W tym tygodniu" value={data.stats.weekCount} hint="treningi" accent />
        <Stat label="W tym miesiącu" value={data.stats.monthCount} hint="treningi" />
        <Stat label="Objętość tyg." value={formatVolume(data.stats.weekVolume)} hint={`${data.stats.weekSets} serii`} />
        <Stat
          label="Masa ciała"
          value={data.bodyWeight.latest ? `${data.bodyWeight.latest.weight} kg` : "-"}
          hint={
            data.bodyWeight.delta != null
              ? `${data.bodyWeight.delta > 0 ? "+" : ""}${data.bodyWeight.delta} kg / ${data.bodyWeight.spanDays} dni`
              : "brak pomiarów"
          }
        />
      </div>

      {/* Progresja głównego boju */}
      {data.featured && data.featured.progress.length > 1 ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="display text-xl">{data.featured.exercise.name}</CardTitle>
              <p className="text-sm text-muted">Szacowane 1RM w czasie</p>
            </div>
            <Button asChild variant="ghost" size="iconSm">
              <Link href={`/cwiczenia/${data.featured.exercise.id}`} aria-label="Zobacz progresję">
                <ChevronRight className="size-5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ProgressChart
              data={data.featured.progress.map((point) => ({ date: point.date, e1rm: point.estimated1rm ?? 0 }))}
              dataKey="e1rm"
              unit="kg"
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Dieta */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Apple className="size-4.5 text-muted" /> Dziś na talerzu
            </CardTitle>
            <Button asChild variant="ghost" size="iconSm">
              <Link href="/dieta" aria-label="Przejdź do diety">
                <ChevronRight className="size-5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.nutrition.mealCount === 0 ? (
              <EmptyState
                icon={Apple}
                title="Brak posiłków"
                description="Dodaj pierwszy posiłek dnia."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dieta">Dodaj posiłek</Link>
                  </Button>
                }
              />
            ) : (
              <MacroSummary totals={data.nutrition.totals} targets={data.nutrition.targets} />
            )}
          </CardContent>
        </Card>

        {/* Suplementacja */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Pill className="size-4.5 text-muted" /> Suplementy na dziś
            </CardTitle>
            <Button asChild variant="ghost" size="iconSm">
              <Link href="/suplementacja" aria-label="Przejdź do suplementacji">
                <ChevronRight className="size-5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <SupplementChecklist date={data.today} supplements={data.supplements} />
          </CardContent>
        </Card>
      </div>

      {/* Rekordy */}
      {data.records.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4.5 text-muted" /> Ostatnie rekordy
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.records.map((record) => (
              <Link
                key={record.id}
                href={`/cwiczenia/${record.exercise.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{record.exercise.name}</p>
                  <p className="text-xs text-muted">{formatDayMonth(record.achievedAt.toISOString().slice(0, 10), true)}</p>
                </div>
                <span className="shrink-0 text-right">
                  <span className="display block text-xl text-accent">{formatNumber(record.value, 1)} kg</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted">szac. 1RM</span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Ostatnia aktywność */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="size-4.5 text-muted" /> Ostatnia aktywność
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/historia">Cała historia</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data.recent.length === 0 ? (
            <EmptyState icon={Scale} title="Jeszcze pusto" description="Pierwszy trening pojawi się tutaj." />
          ) : (
            data.recent.map((session) => (
              <Link
                key={session.id}
                href={`/historia/${session.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{session.name}</p>
                  <p className="text-xs text-muted">
                    {relativeDayLabel(session.date.toISOString().slice(0, 10), today)} - {session.entries.length} ćwiczeń
                    {" - "}{session.totalSets} serii
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular">{formatVolume(session.totalVolume)}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
