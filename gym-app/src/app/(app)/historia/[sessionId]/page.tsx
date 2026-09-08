import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star } from "lucide-react";

import { DeleteSessionButton } from "@/components/training/delete-session-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { formatDayMonth, formatMinutes, toIsoDate, weekdayLong } from "@/lib/date";
import { unitLabel } from "@/lib/labels";
import { bestSet, sessionTotals } from "@/lib/training";
import { cn, formatNumber, formatVolume } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { getSessionDetail } from "@/server/queries/training";

export const metadata: Metadata = { title: "Trening" };

export default async function SessionDetailPage({ params }: PageProps<"/historia/[sessionId]">) {
  const { sessionId } = await params;
  const user = await requireUser();
  const session = await getSessionDetail(user.id, sessionId);
  if (!session) notFound();

  const iso = toIsoDate(session.date);
  const totals = sessionTotals(session.entries.flatMap((entry) => entry.sets));
  const duration = session.finishedAt
    ? Math.round((session.finishedAt.getTime() - session.startedAt.getTime()) / 60000)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {weekdayLong(iso)}, {formatDayMonth(iso, true)}
          </p>
          <h1 className="display text-3xl">{session.name}</h1>
        </div>
        {session.rating ? (
          <Badge variant="accent" className="shrink-0">
            <Star className="size-3.5 fill-current" /> {session.rating}/5
          </Badge>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Czas" value={duration ? formatMinutes(duration) : "-"} />
        <Stat label="Serie" value={totals.sets} />
        <Stat label="Objętość" value={formatVolume(totals.volume)} accent />
        <Stat label="Śr. RPE" value={totals.avgRpe ?? "-"} />
      </div>

      {session.note ? (
        <Card>
          <CardContent className="pt-4 text-sm">{session.note}</CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {session.entries.map((entry) => {
          const working = entry.sets.filter((set) => set.isCompleted && !set.isWarmup);
          const best = bestSet(working);
          const unit = unitLabel(entry.exercise.unit, user.weightUnit);
          const volume = working.reduce((sum, set) => sum + set.volume, 0);

          return (
            <Card key={entry.id}>
              <CardContent className="pt-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Link href={`/cwiczenia/${entry.exerciseId}`} className="min-w-0">
                    <h2 className="display truncate text-xl">{entry.exercise.name}</h2>
                    <p className="text-xs text-muted">
                      {working.length} serii - {formatNumber(volume)} {unit} objętości
                    </p>
                  </Link>
                  {best ? (
                    <div className="shrink-0 text-right">
                      <p className="display text-lg text-accent">{best.estimated1rm} {unit}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted">szac. 1RM</p>
                    </div>
                  ) : null}
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                      <th className="w-10 pb-1 font-medium">Nr</th>
                      <th className="pb-1 font-medium">{unit}</th>
                      <th className="pb-1 font-medium">Powt.</th>
                      <th className="pb-1 text-right font-medium">RPE / RIR</th>
                    </tr>
                  </thead>
                  <tbody className="tabular">
                    {entry.sets.map((set) => (
                      <tr key={set.id} className={cn("border-t border-border", set.isWarmup && "text-muted")}>
                        <td className="py-1.5">{set.isWarmup ? "R" : set.setNumber}</td>
                        <td className="py-1.5 font-medium">{set.weight ?? "-"}</td>
                        <td className="py-1.5">{set.reps ?? "-"}</td>
                        <td className="py-1.5 text-right text-muted">
                          {set.rpe != null ? `RPE ${set.rpe}` : ""}
                          {set.rpe != null && set.rir != null ? " / " : ""}
                          {set.rir != null ? `RIR ${set.rir}` : ""}
                          {set.rpe == null && set.rir == null ? "-" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {entry.note ? <p className="mt-2 text-sm text-muted">{entry.note}</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DeleteSessionButton sessionId={session.id} />
    </div>
  );
}
