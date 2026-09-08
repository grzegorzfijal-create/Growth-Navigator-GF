import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Dumbbell } from "lucide-react";

import { PlanListActions } from "@/components/plans/plan-list-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth";
import { getPlans } from "@/server/queries/training";

export const metadata: Metadata = { title: "Plany" };

export default async function PlansPage() {
  const user = await requireUser();
  const plans = await getPlans(user.id);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="display text-3xl">Plany</h1>
          <p className="text-sm text-muted">Plan mówi, co masz zrobić. Historia mówi, co zrobiłeś.</p>
        </div>
        <PlanListActions />
      </header>

      {plans.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Brak planów"
          description="Dodaj pierwszy plan i rozpisz w nim treningi."
        />
      ) : (
        plans.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="pt-4">
              <Link href={`/plany/${plan.id}`} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="display truncate text-2xl">{plan.name}</h2>
                    {plan.isActive ? <Badge variant="accent">aktywny</Badge> : null}
                  </div>
                  {plan.description ? <p className="mt-0.5 text-sm text-muted">{plan.description}</p> : null}
                </div>
                <ChevronRight className="mt-1 size-5 shrink-0 text-muted" />
              </Link>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {plan.workouts.map((workout) => (
                  <li key={workout.id} className="rounded-lg bg-surface-2 px-2 py-1 text-xs">
                    {workout.name}
                    <span className="ml-1 text-muted tabular">{workout.exercises.length}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
