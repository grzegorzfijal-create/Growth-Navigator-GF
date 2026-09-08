"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatNumber } from "@/lib/utils";

export function VolumeBars({
  data,
  height = 190,
}: {
  data: { label: string; volume: number; sets: number; sessions: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 1000)}t` : String(value))}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--foreground)",
              fontSize: 13,
            }}
            formatter={(value) => [`${formatNumber(Number(value))} kg`, "Objętość"]}
          />
          <Bar dataKey="volume" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
