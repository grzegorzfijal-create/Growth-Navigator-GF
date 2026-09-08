import { CATEGORY_LABELS } from "@/lib/labels";
import { formatNumber } from "@/lib/utils";

/** Ile serii i objętości poszło na każdą partię - widać zaniedbane obszary. */
export function MuscleVolume({ data }: { data: { category: string; sets: number; volume: number }[] }) {
  const max = Math.max(1, ...data.map((row) => row.sets));

  if (data.length === 0) {
    return <p className="text-sm text-muted">Brak danych w tym okresie.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map((row) => (
        <div key={row.category} className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-2 text-sm">
          <span className="truncate text-muted">{CATEGORY_LABELS[row.category] ?? row.category}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(row.sets / max) * 100}%` }} />
          </div>
          <span className="text-right tabular">
            {row.sets} <span className="text-muted">serii</span>
          </span>
        </div>
      ))}
      <p className="text-xs text-muted">
        Łącznie {formatNumber(data.reduce((sum, row) => sum + row.volume, 0))} kg objętości.
      </p>
    </div>
  );
}
