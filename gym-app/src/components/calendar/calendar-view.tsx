"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StartWorkoutButton } from "@/components/training/start-workout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatDayMonth, formatMinutes, monthGrid, monthName, todayIso, WEEKDAY_SHORT, weekdayLong } from "@/lib/date";
import { cn, formatVolume } from "@/lib/utils";
import { scheduleWorkout, unscheduleWorkout } from "@/server/actions/training";

export type CalendarSession = {
  id: string;
  iso: string;
  name: string;
  totalVolume: number;
  totalSets: number;
  durationMinutes: number | null;
  finished: boolean;
};

export type CalendarScheduled = {
  id: string;
  iso: string;
  status: string;
  workoutId: string | null;
  workoutName: string | null;
  planName: string | null;
};

export function CalendarView({
  year,
  month,
  sessions,
  scheduled,
  workouts,
  hasActiveSession,
}: {
  year: number;
  month: number;
  sessions: CalendarSession[];
  scheduled: CalendarScheduled[];
  workouts: { id: string; name: string; planName: string }[];
  hasActiveSession: boolean;
}) {
  const router = useRouter();
  const today = todayIso();
  const [selected, setSelected] = useState(
    today.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`) ? today : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
  const [pending, startTransition] = useTransition();
  const [workoutToPlan, setWorkoutToPlan] = useState(workouts[0]?.id ?? "");

  const grid = useMemo(() => monthGrid(year, month, today), [year, month, today]);
  const byDay = useMemo(() => {
    const map = new Map<string, { done: CalendarSession[]; planned: CalendarScheduled[]; rest: boolean }>();
    for (const session of sessions) {
      const day = map.get(session.iso) ?? { done: [], planned: [], rest: false };
      if (session.finished) day.done.push(session);
      map.set(session.iso, day);
    }
    for (const entry of scheduled) {
      const day = map.get(entry.iso) ?? { done: [], planned: [], rest: false };
      if (entry.status === "REST") day.rest = true;
      else if (entry.status === "PLANNED") day.planned.push(entry);
      map.set(entry.iso, day);
    }
    return map;
  }, [sessions, scheduled]);

  const selectedDay = byDay.get(selected) ?? { done: [], planned: [], rest: false };
  const prevMonth = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const nextMonth = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="iconSm" aria-label="Poprzedni miesiąc" asChild>
          <Link href={`/kalendarz?y=${prevMonth.y}&m=${prevMonth.m}`}>
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <h2 className="display text-2xl">
          {monthName(month)} {year}
        </h2>
        <Button variant="ghost" size="iconSm" aria-label="Następny miesiąc" asChild>
          <Link href={`/kalendarz?y=${nextMonth.y}&m=${nextMonth.m}`}>
            <ChevronRight className="size-5" />
          </Link>
        </Button>
      </div>

      <div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAY_SHORT.map((day) => (
            <span key={day} className="text-center text-[11px] uppercase text-muted">
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.flat().map((cell) => {
            const day = byDay.get(cell.date);
            const done = (day?.done.length ?? 0) > 0;
            const planned = (day?.planned.length ?? 0) > 0;
            const rest = day?.rest ?? false;
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => setSelected(cell.date)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-sm transition-colors",
                  cell.inMonth ? "border-transparent bg-surface-2" : "border-transparent bg-transparent text-muted/40",
                  done && "bg-accent/20",
                  planned && !done && "bg-info/15",
                  rest && !done && !planned && "bg-surface",
                  cell.isToday && "border-accent",
                  selected === cell.date && "ring-2 ring-accent",
                )}
              >
                <span className={cn("tabular", done && "font-semibold")}>{cell.day}</span>
                <span className="flex h-1.5 gap-0.5">
                  {done ? <span className="size-1.5 rounded-full bg-accent" /> : null}
                  {planned && !done ? <span className="size-1.5 rounded-full bg-info" /> : null}
                  {rest ? <span className="size-1.5 rounded-full bg-muted" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" /> wykonany
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-info" /> zaplanowany
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted" /> odpoczynek
          </span>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{weekdayLong(selected)}</p>
            <h3 className="display text-2xl">{formatDayMonth(selected, true)}</h3>
          </div>

          {selectedDay.done.map((session) => (
            <Link
              key={session.id}
              href={`/historia/${session.id}`}
              className="rounded-xl border border-border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{session.name}</span>
                <Badge variant="success">Wykonany</Badge>
              </div>
              <p className="mt-1 text-sm text-muted tabular">
                {session.durationMinutes ? `${formatMinutes(session.durationMinutes)} - ` : ""}
                {session.totalSets} serii - {formatVolume(session.totalVolume)}
              </p>
            </Link>
          ))}

          {selectedDay.planned.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{entry.workoutName ?? "Trening"}</p>
                  <p className="text-xs text-muted">{entry.planName}</p>
                </div>
                <Badge variant="info">Zaplanowany</Badge>
              </div>
              <div className="mt-2 flex gap-2">
                {entry.workoutId ? (
                  <StartWorkoutButton
                    workoutId={entry.workoutId}
                    date={selected}
                    size="sm"
                    label="Start"
                    disabled={hasActiveSession}
                  />
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await unscheduleWorkout(entry.id);
                      if (!result.ok) toast.error(result.error);
                      else router.refresh();
                    })
                  }
                >
                  <Trash2 className="size-4" /> Usuń
                </Button>
              </div>
            </div>
          ))}

          {selectedDay.rest ? <Badge variant="outline">Dzień odpoczynku</Badge> : null}

          {selectedDay.done.length === 0 && selectedDay.planned.length === 0 && !selectedDay.rest ? (
            <p className="text-sm text-muted">Brak wpisów na ten dzień.</p>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Zaplanuj</p>
            <div className="flex gap-2">
              <Select value={workoutToPlan} onChange={(event) => setWorkoutToPlan(event.target.value)}>
                {workouts.length === 0 ? <option value="">Brak treningów w planach</option> : null}
                {workouts.map((workout) => (
                  <option key={workout.id} value={workout.id}>
                    {workout.name} ({workout.planName})
                  </option>
                ))}
              </Select>
              <Button
                size="icon"
                aria-label="Dodaj do kalendarza"
                disabled={!workoutToPlan || pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await scheduleWorkout({ date: selected, workoutId: workoutToPlan, status: "PLANNED" });
                    if (!result.ok) toast.error(result.error);
                    else {
                      toast.success("Dodano do kalendarza.");
                      router.refresh();
                    }
                  })
                }
              >
                <CalendarPlus className="size-5" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await scheduleWorkout({ date: selected, status: "REST" });
                  if (!result.ok) toast.error(result.error);
                  else router.refresh();
                })
              }
            >
              Oznacz jako dzień odpoczynku
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
