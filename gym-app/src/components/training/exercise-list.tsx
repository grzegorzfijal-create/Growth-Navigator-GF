"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";

import { ExerciseFormSheet } from "@/components/training/exercise-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORY_LABELS, TYPE_LABELS } from "@/lib/labels";

export type ExerciseListItem = {
  id: string;
  name: string;
  category: string;
  type: string;
  primaryMuscle: string;
  description: string | null;
  isCustom: boolean;
  lastUsed: string | null;
};

export function ExerciseList({ exercises }: { exercises: ExerciseListItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      const matchesCategory = !category || exercise.category === category;
      const matchesQuery =
        !needle ||
        [exercise.name, exercise.description ?? "", exercise.primaryMuscle].join(" ").toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, exercises, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Szukaj ćwiczenia"
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Button size="icon" aria-label="Dodaj własne ćwiczenie" onClick={() => setFormOpen(true)}>
          <Plus className="size-5" />
        </Button>
      </div>

      <Select value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="">Wszystkie kategorie</option>
        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <p className="text-xs text-muted">{filtered.length} ćwiczeń</p>

      <div className="flex flex-col gap-1.5">
        {filtered.map((exercise) => (
          <Link
            key={exercise.id}
            href={`/cwiczenia/${exercise.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{exercise.name}</p>
                {exercise.isCustom ? <Badge variant="outline">własne</Badge> : null}
              </div>
              <p className="truncate text-xs text-muted">
                {CATEGORY_LABELS[exercise.category]} - {TYPE_LABELS[exercise.type]} - {exercise.primaryMuscle}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted" />
          </Link>
        ))}
      </div>

      <ExerciseFormSheet open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
