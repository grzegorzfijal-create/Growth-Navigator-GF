"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SupplementChecklist, TIMING_LABELS, type SupplementRow } from "@/components/supplements/supplement-checklist";
import { SupplementFormSheet } from "@/components/supplements/supplement-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WEEKDAY_SHORT, formatDayMonth } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { SupplementInput } from "@/schemas/profile";
import { deleteSupplement } from "@/server/actions/supplements";

export type ManagedSupplement = SupplementInput & { id: string };

export function SupplementManager({
  date,
  today,
  week,
  supplements,
}: {
  date: string;
  today: SupplementRow[];
  week: { date: string; taken: number; planned: number }[];
  supplements: ManagedSupplement[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [edited, setEdited] = useState<ManagedSupplement | undefined>(undefined);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Na dziś</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplementChecklist date={date} supplements={today} />
        </CardContent>
      </Card>

      {/* Ostatnie 7 dni - widać od razu, czy coś regularnie wypada. */}
      <Card>
        <CardHeader>
          <CardTitle>Ostatni tydzień</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const ratio = day.planned ? day.taken / day.planned : 0;
              return (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase text-muted">{formatDayMonth(day.date).split(" ")[0]}</span>
                  <div
                    className={cn(
                      "flex aspect-square w-full items-center justify-center rounded-xl border text-xs font-semibold tabular",
                      ratio === 0 && "border-border bg-surface-2 text-muted",
                      ratio > 0 && ratio < 1 && "border-warning/40 bg-warning/15 text-warning",
                      ratio >= 1 && "border-success/40 bg-success/15 text-success",
                    )}
                  >
                    {day.planned ? `${day.taken}/${day.planned}` : "-"}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="display text-xl">Moje suplementy</h2>
        <Button
          size="sm"
          onClick={() => {
            setEdited(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> Dodaj
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {supplements.map((supplement) => (
          <Card key={supplement.id}>
            <CardContent className="flex items-start gap-3 pt-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{supplement.name}</p>
                  {!supplement.isActive ? <Badge variant="outline">wyłączony</Badge> : null}
                </div>
                <p className="text-xs text-muted">
                  {supplement.dose ? `${supplement.dose} ${supplement.unit} - ` : ""}
                  {supplement.timing.map((value) => TIMING_LABELS[value]).join(", ")}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {supplement.daysOfWeek.length === 7
                    ? "codziennie"
                    : supplement.daysOfWeek.map((day) => WEEKDAY_SHORT[day - 1]).join(", ")}
                </p>
                {supplement.note ? <p className="mt-1 text-xs text-muted">{supplement.note}</p> : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Edytuj"
                  onClick={() => {
                    setEdited(supplement);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Usuń"
                  onClick={() =>
                    startTransition(async () => {
                      if (!window.confirm(`Usunąć ${supplement.name}?`)) return;
                      const result = await deleteSupplement(supplement.id);
                      if (!result.ok) toast.error(result.error);
                      else router.refresh();
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SupplementFormSheet open={formOpen} onOpenChange={setFormOpen} supplement={edited} />
    </div>
  );
}
