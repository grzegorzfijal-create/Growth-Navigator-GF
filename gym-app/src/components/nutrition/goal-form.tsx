"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { caloriesFromMacros } from "@/lib/nutrition";
import { nutritionGoalSchema, type NutritionGoalFormValues, type NutritionGoalInput } from "@/schemas/nutrition";
import { saveNutritionGoal } from "@/server/actions/nutrition";

export function GoalFormSheet({
  open,
  onOpenChange,
  goal,
  suggestion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: NutritionGoalInput | null;
  suggestion: (NutritionGoalInput & { tdee: number }) | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<NutritionGoalFormValues, unknown, NutritionGoalInput>({
    resolver: zodResolver(nutritionGoalSchema),
    defaultValues: goal ?? suggestion ?? { calories: 2500, protein: 160, carbs: 280, fat: 80 },
  });

  const values = form.watch();
  const fromMacros = caloriesFromMacros(Number(values.protein) || 0, Number(values.carbs) || 0, Number(values.fat) || 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Cele dzienne" description="Możesz je nadpisać w każdej chwili.">
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit(async (input) => {
            setPending(true);
            const result = await saveNutritionGoal(input);
            setPending(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            onOpenChange(false);
            toast.success("Cele zapisane.");
            router.refresh();
          })}
        >
          {suggestion ? (
            <button
              type="button"
              onClick={() => form.reset(suggestion)}
              className="rounded-xl border border-border bg-surface-2 p-3 text-left text-sm"
            >
              <span className="font-medium">Propozycja z profilu:</span>{" "}
              {suggestion.calories} kcal - B {suggestion.protein} g - W {suggestion.carbs} g - T {suggestion.fat} g
              <span className="block text-xs text-muted">
                Zapotrzebowanie ok. {suggestion.tdee} kcal. Dotknij, żeby wstawić.
              </span>
            </button>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calories">Kalorie</Label>
              <Input id="calories" type="number" min="0" {...form.register("calories")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="protein">Białko (g)</Label>
              <Input id="protein" type="number" min="0" {...form.register("protein")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="carbs">Węglowodany (g)</Label>
              <Input id="carbs" type="number" min="0" {...form.register("carbs")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fat">Tłuszcze (g)</Label>
              <Input id="fat" type="number" min="0" {...form.register("fat")} />
            </div>
          </div>

          <p className="text-xs text-muted">
            Z makroskładników wychodzi {fromMacros} kcal.
            {Math.abs(fromMacros - (Number(values.calories) || 0)) > 60
              ? " Różnica względem celu kalorycznego jest spora - sprawdź, czy to celowe."
              : ""}
          </p>

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Zapisywanie..." : "Zapisz cele"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
