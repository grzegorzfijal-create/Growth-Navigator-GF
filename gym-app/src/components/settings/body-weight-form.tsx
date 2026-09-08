"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ProgressChart } from "@/components/charts/progress-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDayMonth, todayIso } from "@/lib/date";
import { deleteBodyWeight, saveBodyWeight } from "@/server/actions/profile";

export function BodyWeightSection({
  entries,
}: {
  entries: { id: string; date: string; weight: number; note: string | null }[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [weight, setWeight] = useState("");
  const [, startTransition] = useTransition();

  const latest = entries[entries.length - 1];

  return (
    <div className="flex flex-col gap-3">
      {latest ? (
        <div>
          <p className="display text-4xl">
            {latest.weight} <span className="text-xl">kg</span>
          </p>
          <p className="text-xs text-muted">ostatni pomiar: {formatDayMonth(latest.date, true)}</p>
        </div>
      ) : null}

      {entries.length > 1 ? (
        <ProgressChart data={entries.map((entry) => ({ date: entry.date, weight: entry.weight }))} dataKey="weight" unit="kg" />
      ) : null}

      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="bw-date">Data</Label>
          <Input id="bw-date" type="date" value={date} max={todayIso()} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="bw-weight">Masa (kg)</Label>
          <Input
            id="bw-weight"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </div>
        <Button
          onClick={() =>
            startTransition(async () => {
              const result = await saveBodyWeight({ date, weight: Number(weight) });
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              setWeight("");
              toast.success("Zapisano pomiar.");
              router.refresh();
            })
          }
          disabled={!weight}
        >
          Zapisz
        </Button>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {[...entries].reverse().slice(0, 8).map((entry) => (
          <li key={entry.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className="text-muted">{formatDayMonth(entry.date, true)}</span>
            <span className="ml-auto font-medium tabular">{entry.weight} kg</span>
            <button
              type="button"
              aria-label="Usuń pomiar"
              className="rounded-lg p-1.5 text-muted hover:bg-surface-2"
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteBodyWeight(entry.id);
                  if (!result.ok) toast.error(result.error);
                  else router.refresh();
                })
              }
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
