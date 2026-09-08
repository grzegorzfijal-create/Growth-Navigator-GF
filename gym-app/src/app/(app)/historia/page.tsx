import Link from "next/link";
import type { Metadata } from "next";
import { History as HistoryIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatMinutes, relativeDayLabel, toIsoDate } from "@/lib/date";
import { formatVolume } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { getExercises, getHistory, getPlans } from "@/server/queries/training";

export const metadata: Metadata = { title: "Historia" };

export default async function HistoryPage({ searchParams }: PageProps<"/historia">) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = {
    from: typeof params.from === "string" ? params.from : undefined,
    to: typeof params.to === "string" ? params.to : undefined,
    workoutId: typeof params.workoutId === "string" && params.workoutId ? params.workoutId : undefined,
    exerciseId: typeof params.exerciseId === "string" && params.exerciseId ? params.exerciseId : undefined,
  };

  const [sessions, plans, exercises] = await Promise.all([
    getHistory(user.id, filters),
    getPlans(user.id),
    getExercises(user.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="display text-3xl">Historia</h1>
        <p className="text-sm text-muted">Każdy trening z liczbami, które da się porównać.</p>
      </header>

      {/* Filtry idą przez GET, więc można je zapisać w zakładkach albo wysłać linkiem. */}
      <Card>
        <CardContent className="pt-4">
          <form className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="from">Od</Label>
              <Input id="from" type="date" name="from" defaultValue={filters.from} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="to">Do</Label>
              <Input id="to" type="date" name="to" defaultValue={filters.to} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workoutId">Trening</Label>
              <Select id="workoutId" name="workoutId" defaultValue={filters.workoutId ?? ""}>
                <option value="">Wszystkie</option>
                {plans.flatMap((plan) =>
                  plan.workouts.map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.name}
                    </option>
                  )),
                )}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exerciseId">Ćwiczenie</Label>
              <Select id="exerciseId" name="exerciseId" defaultValue={filters.exerciseId ?? ""}>
                <option value="">Wszystkie</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" className="col-span-2">
              Filtruj
            </Button>
          </form>
        </CardContent>
      </Card>

      {sessions.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="Brak treningów" description="Zmień filtry albo zrób pierwszy trening." />
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((session) => {
            const duration = session.finishedAt
              ? Math.round((session.finishedAt.getTime() - session.startedAt.getTime()) / 60000)
              : null;
            return (
              <Link
                key={session.id}
                href={`/historia/${session.id}`}
                className="rounded-2xl border border-border bg-surface p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="display text-xl">{session.name}</p>
                    <p className="text-xs text-muted">
                      {relativeDayLabel(toIsoDate(session.date))}
                      {duration ? ` - ${formatMinutes(duration)}` : ""}
                    </p>
                  </div>
                  {session.rating ? <Badge variant="outline">{session.rating}/5</Badge> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted">
                  <span className="rounded-lg bg-surface-2 px-2 py-1">{session.entries.length} ćwiczeń</span>
                  <span className="rounded-lg bg-surface-2 px-2 py-1 tabular">{session.totalSets} serii</span>
                  <span className="rounded-lg bg-surface-2 px-2 py-1 tabular">{formatVolume(session.totalVolume)}</span>
                  {session.avgRpe ? (
                    <span className="rounded-lg bg-surface-2 px-2 py-1 tabular">śr. RPE {session.avgRpe}</span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
