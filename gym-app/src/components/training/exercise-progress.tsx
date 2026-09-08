"use client";

import { useState } from "react";

import { ProgressChart } from "@/components/charts/progress-chart";
import { cn } from "@/lib/utils";

export type ProgressRow = {
  date: string;
  topWeight: number;
  bestReps: number;
  volume: number;
  estimated1rm: number | null;
  avgRpe: number | null;
};

const METRICS = [
  { key: "topWeight", label: "Ciężar", unit: "kg" },
  { key: "bestReps", label: "Powtórzenia", unit: "" },
  { key: "volume", label: "Objętość", unit: "kg" },
  { key: "estimated1rm", label: "1RM", unit: "kg" },
  { key: "avgRpe", label: "RPE", unit: "" },
] as const;

/** Przełącznik metryk - ta sama historia pokazana z pięciu stron. */
export function ExerciseProgress({ data }: { data: ProgressRow[] }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]>(METRICS[3]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1">
        {METRICS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMetric(item)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              metric.key === item.key ? "bg-surface text-foreground shadow-sm" : "text-muted",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ProgressChart
        data={data.map((row) => ({ date: row.date, value: row[metric.key] ?? 0 }))}
        dataKey="value"
        unit={metric.unit}
        height={220}
      />
    </div>
  );
}
