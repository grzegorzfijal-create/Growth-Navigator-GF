"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatDayMonth } from "@/lib/date";

export type ProgressPoint = { date: string } & Record<string, number | string | null>;

/**
 * Wykres progresji - jedna seria danych, minimum ozdobników.
 * Kolory bierze z tokenów motywu, więc działa w obu trybach bez przełączania.
 */
export function ProgressChart({
  data,
  dataKey,
  unit = "",
  height = 200,
}: {
  data: ProgressPoint[];
  dataKey: string;
  unit?: string;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border px-6 text-center text-sm text-muted">
        Potrzebne są co najmniej dwa treningi, żeby narysować trend.
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="accentFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDayMonth(value).slice(0, 6)}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={38}
            domain={["dataMin - 5", "dataMax + 5"]}
            tickFormatter={(value: number) => String(Math.round(value))}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--foreground)",
              fontSize: 13,
            }}
            labelFormatter={(value) => formatDayMonth(String(value), true)}
            formatter={(value) => [`${value} ${unit}`.trim(), ""]}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#accentFade)"
            dot={{ r: 2.5, fill: "var(--accent)", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            // Bez animacji rysowania - wykres ma być od razu gotowy do odczytu.
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
