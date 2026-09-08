"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CATEGORY_LABELS } from "@/lib/labels";

export type PickerExercise = {
  id: string;
  name: string;
  category: string;
  primaryMuscle: string;
  description?: string | null;
};

/**
 * Wyszukiwarka ćwiczeń. Szuka po nazwie polskiej i po opisie, w którym siedzi
 * nazwa angielska - "bench" znajduje wyciskanie leżąc.
 */
export function ExercisePickerSheet({
  open,
  onOpenChange,
  exercises,
  onPick,
  title = "Wybierz ćwiczenie",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: PickerExercise[];
  onPick: (exerciseId: string) => void;
  title?: string;
}) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? exercises.filter((exercise) =>
          [exercise.name, exercise.description ?? "", exercise.primaryMuscle]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        )
      : exercises;

    const map = new Map<string, PickerExercise[]>();
    for (const exercise of filtered) {
      const list = map.get(exercise.category) ?? [];
      list.push(exercise);
      map.set(exercise.category, list);
    }
    return [...map.entries()];
  }, [exercises, query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={title} className="sm:max-h-[80vh]">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            autoFocus
            placeholder="Szukaj: przysiad, bench, plecy..."
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pb-2">
          {grouped.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nic nie znaleziono.</p>
          ) : (
            grouped.map(([category, list]) => (
              <div key={category}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  {CATEGORY_LABELS[category] ?? category}
                </p>
                <div className="flex flex-col gap-1">
                  {list.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => {
                        onPick(exercise.id);
                        onOpenChange(false);
                        setQuery("");
                      }}
                      className="rounded-xl border border-border px-3 py-2.5 text-left hover:bg-surface-2"
                    >
                      <p className="font-medium leading-tight">{exercise.name}</p>
                      <p className="text-xs text-muted">
                        {exercise.primaryMuscle}
                        {exercise.description ? ` - ${exercise.description}` : ""}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
