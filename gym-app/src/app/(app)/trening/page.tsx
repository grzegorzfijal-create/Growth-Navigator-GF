import Link from "next/link";
import type { Metadata } from "next";
import { Dumbbell, Timer } from "lucide-react";

import { StartWorkoutButton } from "@/components/training/start-workout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth";
import { getActiveSession, getPlans } from "@/server/queries/training";

export const metadata: Metadata = { title: "Trening" };

export default async function TrainingPage() {
  const user = await requireUser();
  const [plans, active] = await Promise.all([getPlans(user.id), getActiveSession(user.id)]);
  const activePlan = plans.find((plan) => plan.isActive) ?? plans[0] ?? null;
  const otherPlans = plans.filter((plan) => plan.id !== activePlan?.id);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="display text-3xl">Trening</h1>
        <p className="text-sm text-muted">Wybierz dzień z planu i wejdź prosto w pierwszą serię.</p>
      </header>

      {active ? (
        <Card className="border-accent/40">
          <CardContent className="flex items-center justify-between gap-3 pt-4">
            <div>
              <Badge variant="accent" className="mb-1">
                <Timer className="size-3.5" /> W toku
              </Badge>
              <p className="display text-2xl">{active.name}</p>
            </div>
            <Button asChild>
              <Link href={`/trening/${active.id}`}>Wróć</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {activePlan ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="display text-xl">{activePlan.name}</h2>
            <Badge variant="accent">Aktywny plan</Badge>
          </div>

          {activePlan.workouts.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="Plan bez treningów"
              description="Dodaj pierwszy dzień treningowy do tego planu."
              action={
                <Button asChild size="sm">
                  <Link href={`/plany/${activePlan.id}`}>Edytuj plan</Link>
                </Button>
              }
            />
          ) : (
            activePlan.workouts.map((workout) => (
              <Card key={workout.id}>
                <CardContent className="flex flex-col gap-3 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="display text-2xl">{workout.name}</h3>
                      <p className="text-sm text-muted">
                        {workout.exercises.length} ćwiczeń
                        {workout.estimatedMinutes ? ` - ok. ${workout.estimatedMinutes} min` : ""}
                      </p>
                    </div>
                    <StartWorkoutButton workoutId={workout.id} label="Start" disabled={Boolean(active)} />
                  </div>

                  <ul className="flex flex-wrap gap-1.5">
                    {workout.exercises.map((item) => (
                      <li key={item.id} className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-muted">
                        {item.exercise.name}
                        <span className="ml-1 tabular">
                          {item.sets}x{item.repsMin ?? ""}
                          {item.repsMax && item.repsMax !== item.repsMin ? `-${item.repsMax}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      ) : (
        <EmptyState
          icon={Dumbbell}
          title="Nie masz jeszcze planu"
          description="Zacznij od gotowego Push/Pull/Legs albo zbuduj własny."
          action={
            <Button asChild size="sm">
              <Link href="/plany">Przejdź do planów</Link>
            </Button>
          }
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Trening bez planu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted">
            Zaczynasz pustą sesję i dorzucasz ćwiczenia w trakcie - przydaje się, gdy siłownia jest zajęta.
          </p>
          <StartWorkoutButton variant="outline" label="Zacznij pusty trening" disabled={Boolean(active)} />
        </CardContent>
      </Card>

      {otherPlans.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Pozostałe plany</h2>
          {otherPlans.map((plan) => (
            <Link
              key={plan.id}
              href={`/plany/${plan.id}`}
              className="flex items-center justify-between rounded-xl border border-border px-3 py-3"
            >
              <span className="font-medium">{plan.name}</span>
              <span className="text-sm text-muted">{plan.workouts.length} treningów</span>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
