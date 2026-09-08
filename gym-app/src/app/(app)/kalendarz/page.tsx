import type { Metadata } from "next";

import { CalendarView } from "@/components/calendar/calendar-view";
import { requireUser } from "@/server/auth";
import { getActiveSession, getCalendarMonth, getPlans } from "@/server/queries/training";

export const metadata: Metadata = { title: "Kalendarz" };

export default async function CalendarPage({ searchParams }: PageProps<"/kalendarz">) {
  const user = await requireUser();
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.y ?? now.getFullYear());
  const month = Number(params.m ?? now.getMonth());

  const [data, plans, active] = await Promise.all([
    getCalendarMonth(user.id, year, month + 1),
    getPlans(user.id),
    getActiveSession(user.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="display text-3xl">Kalendarz</h1>
        <p className="text-sm text-muted">Co zaplanowane, co zrobione i czego zabrakło.</p>
      </header>

      <CalendarView
        year={year}
        month={month}
        hasActiveSession={Boolean(active)}
        sessions={data.sessions.map((session) => ({
          id: session.id,
          iso: session.iso,
          name: session.name,
          totalVolume: session.totalVolume,
          totalSets: session.totalSets,
          durationMinutes: session.durationMinutes,
          finished: Boolean(session.finishedAt),
        }))}
        scheduled={data.scheduled.map((entry) => ({
          id: entry.id,
          iso: entry.iso,
          status: entry.status,
          workoutId: entry.workoutId,
          workoutName: entry.workout?.name ?? null,
          planName: entry.workout?.plan.name ?? null,
        }))}
        workouts={plans.flatMap((plan) =>
          plan.workouts.map((workout) => ({ id: workout.id, name: workout.name, planName: plan.name })),
        )}
      />
    </div>
  );
}
