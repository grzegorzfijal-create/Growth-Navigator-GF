import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { ExerciseProgress } from "@/components/training/exercise-progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { formatDayMonth } from "@/lib/date";
import { CATEGORY_LABELS, PR_LABELS, TYPE_LABELS, unitLabel } from "@/lib/labels";
import { formatNumber } from "@/lib/utils";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { getExerciseById, getExerciseProgress } from "@/server/queries/training";

export const metadata: Metadata = { title: "Progresja" };

export default async function ExerciseDetailPage({ params }: PageProps<"/cwiczenia/[exerciseId]">) {
  const { exerciseId } = await params;
  const user = await requireUser();
  const exercise = await getExerciseById(user.id, exerciseId);
  if (!exercise) notFound();

  const [progress, records] = await Promise.all([
    getExerciseProgress(user.id, exercise.id),
    prisma.personalRecord.findMany({ where: { userId: user.id, exerciseId: exercise.id } }),
  ]);

  const unit = unitLabel(exercise.unit, user.weightUnit);
  const last = progress[progress.length - 1];
  const first = progress[0];
  const e1rmGain =
    last?.estimated1rm && first?.estimated1rm ? Math.round((last.estimated1rm - first.estimated1rm) * 10) / 10 : null;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{CATEGORY_LABELS[exercise.category]}</Badge>
          <Badge variant="outline">{TYPE_LABELS[exercise.type]}</Badge>
          {exercise.userId ? <Badge variant="accent">własne</Badge> : null}
        </div>
        <h1 className="display mt-1 text-3xl">{exercise.name}</h1>
        <p className="text-sm text-muted">
          {exercise.primaryMuscle}
          {exercise.secondaryMuscles.length ? ` + ${exercise.secondaryMuscles.join(", ")}` : ""}
          {exercise.description ? ` - ${exercise.description}` : ""}
        </p>
      </header>

      {exercise.instructions ? (
        <Card>
          <CardContent className="pt-4 text-sm text-muted">{exercise.instructions}</CardContent>
        </Card>
      ) : null}

      {progress.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Brak historii"
          description="To ćwiczenie nie pojawiło się jeszcze w żadnym zakończonym treningu."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Treningi" value={progress.length} />
            <Stat label="Ostatni ciężar" value={`${formatNumber(last?.topWeight ?? 0, 1)} ${unit}`} />
            <Stat label="Szac. 1RM" value={last?.estimated1rm ? `${last.estimated1rm} ${unit}` : "-"} accent />
            <Stat
              label="Przyrost 1RM"
              value={e1rmGain != null ? `${e1rmGain > 0 ? "+" : ""}${e1rmGain} ${unit}` : "-"}
              hint={first ? `od ${formatDayMonth(first.date)}` : undefined}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Progresja</CardTitle>
            </CardHeader>
            <CardContent>
              <ExerciseProgress
                data={progress.map((row) => ({
                  date: row.date,
                  topWeight: row.topWeight,
                  bestReps: row.bestReps,
                  volume: row.volume,
                  estimated1rm: row.estimated1rm,
                  avgRpe: row.avgRpe,
                }))}
              />
            </CardContent>
          </Card>

          {records.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="size-4.5 text-muted" /> Rekordy
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {records.map((record) => (
                  <div key={record.id} className="rounded-xl border border-border p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted">{PR_LABELS[record.type]}</p>
                    <p className="display text-2xl">
                      {formatNumber(record.value, record.type === "MAX_REPS" ? 0 : 1)}
                      <span className="ml-1 text-base">{record.type === "MAX_REPS" ? "powt." : unit}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {record.weight && record.reps ? `${record.weight} ${unit} x ${record.reps} - ` : ""}
                      {formatDayMonth(record.achievedAt.toISOString().slice(0, 10), true)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Ostatnie wykonania</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[...progress].reverse().slice(0, 10).map((row) => (
                <Link
                  key={row.sessionId}
                  href={`/historia/${row.sessionId}`}
                  className="rounded-xl border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatDayMonth(row.date, true)}</span>
                    <span className="text-sm text-muted tabular">{formatNumber(row.volume)} {unit}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-sm tabular">
                    {row.setDetails.map((set, index) => (
                      <span key={index} className="rounded-lg bg-surface-2 px-2 py-0.5">
                        {set.weight ?? 0} x {set.reps ?? 0}
                        {set.rpe != null ? <span className="text-muted"> @{set.rpe}</span> : null}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
