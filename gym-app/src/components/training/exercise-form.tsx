"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CATEGORY_LABELS, TYPE_LABELS, UNIT_LABELS } from "@/lib/labels";
import {
  EXERCISE_CATEGORIES,
  EXERCISE_TYPES,
  EXERCISE_UNITS,
  exerciseSchema,
  type ExerciseFormValues,
  type ExerciseInput,
} from "@/schemas/training";
import { createExercise, updateExercise } from "@/server/actions/plans";

/** Formularz własnego ćwiczenia - walidacja Zod ta sama po obu stronach. */
export function ExerciseFormSheet({
  open,
  onOpenChange,
  exercise,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Partial<ExerciseFormValues> & { id?: string };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<ExerciseFormValues, unknown, ExerciseInput>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      id: exercise?.id,
      name: exercise?.name ?? "",
      category: exercise?.category ?? "CHEST",
      primaryMuscle: exercise?.primaryMuscle ?? "",
      secondaryMuscles: exercise?.secondaryMuscles ?? [],
      type: exercise?.type ?? "BARBELL",
      unit: exercise?.unit ?? "KG",
      plateStep: exercise?.plateStep ?? 2.5,
      description: exercise?.description ?? "",
      instructions: exercise?.instructions ?? "",
    },
  });

  async function onSubmit(values: ExerciseInput) {
    setPending(true);
    const result = exercise?.id ? await updateExercise(values) : await createExercise(values);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(exercise?.id ? "Zapisano zmiany." : "Ćwiczenie dodane.");
    onOpenChange(false);
    form.reset();
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={exercise?.id ? "Edytuj ćwiczenie" : "Nowe ćwiczenie"}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nazwa</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Kategoria</Label>
              <Select id="category" {...form.register("category")}>
                {EXERCISE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Typ</Label>
              <Select id="type" {...form.register("type")}>
                {EXERCISE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="primaryMuscle">Główna partia</Label>
            <Input id="primaryMuscle" placeholder="np. Klatka piersiowa" {...form.register("primaryMuscle")} />
            {form.formState.errors.primaryMuscle ? (
              <p className="text-xs text-danger">{form.formState.errors.primaryMuscle.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit">Jednostka</Label>
              <Select id="unit" {...form.register("unit")}>
                {EXERCISE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {UNIT_LABELS[unit]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plateStep">Skok ciężaru</Label>
              <Input id="plateStep" type="number" step="0.25" min="0" {...form.register("plateStep")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Opis / nazwa angielska</Label>
            <Input id="description" placeholder="np. Bench Press" {...form.register("description")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instructions">Wskazówki techniczne</Label>
            <Textarea id="instructions" {...form.register("instructions")} />
          </div>

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Zapisywanie..." : "Zapisz ćwiczenie"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
