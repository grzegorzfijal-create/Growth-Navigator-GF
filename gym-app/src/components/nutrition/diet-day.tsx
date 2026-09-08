"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Plus, Target, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { AddEntrySheet, type FoodItem } from "@/components/nutrition/add-entry-sheet";
import { GoalFormSheet } from "@/components/nutrition/goal-form";
import { MacroSummary } from "@/components/nutrition/macro-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { addDays, formatDayMonth, relativeDayLabel, todayIso } from "@/lib/date";
import { MEAL_PRESETS } from "@/lib/starter-data";
import { sumMacros } from "@/lib/nutrition";
import type { NutritionGoalInput } from "@/schemas/nutrition";
import { createMeal, deleteMeal, deleteNutritionEntry } from "@/server/actions/nutrition";

export type DietEntry = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DietMeal = {
  id: string;
  name: string;
  time: string | null;
  entries: DietEntry[];
};

export function DietDay({
  date,
  meals,
  foods,
  goal,
  suggestion,
}: {
  date: string;
  meals: DietMeal[];
  foods: FoodItem[];
  goal: NutritionGoalInput | null;
  suggestion: (NutritionGoalInput & { tdee: number }) | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [goalOpen, setGoalOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);
  const [entryFor, setEntryFor] = useState<string | null>(null);
  const [newMeal, setNewMeal] = useState({ name: MEAL_PRESETS[0], time: "" });

  const totals = sumMacros(meals.flatMap((meal) => meal.entries));
  const targets = goal ?? suggestion;

  const go = (offset: number) => router.push(`/dieta?d=${addDays(date, offset)}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="iconSm" aria-label="Poprzedni dzień" onClick={() => go(-1)}>
          <ChevronLeft className="size-5" />
        </Button>
        <div className="text-center">
          <p className="display text-2xl">{relativeDayLabel(date)}</p>
          <p className="text-xs text-muted">{formatDayMonth(date, true)}</p>
        </div>
        <Button
          variant="ghost"
          size="iconSm"
          aria-label="Następny dzień"
          onClick={() => go(1)}
          disabled={date >= todayIso()}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Dzisiaj</p>
            <Button variant="ghost" size="sm" onClick={() => setGoalOpen(true)}>
              <Target className="size-4" /> Cele
            </Button>
          </div>
          <MacroSummary totals={totals} targets={targets} />
        </CardContent>
      </Card>

      {meals.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Brak posiłków"
          description="Dodaj pierwszy posiłek tego dnia."
          action={
            <Button size="sm" onClick={() => setMealOpen(true)}>
              <Plus className="size-4" /> Dodaj posiłek
            </Button>
          }
        />
      ) : (
        meals.map((meal) => {
          const mealTotals = sumMacros(meal.entries);
          return (
            <Card key={meal.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="display text-xl">{meal.name}</h3>
                    <p className="text-xs text-muted tabular">
                      {meal.time ? `${meal.time} - ` : ""}
                      {Math.round(mealTotals.calories)} kcal - B {mealTotals.protein} - W {mealTotals.carbs} - T{" "}
                      {mealTotals.fat}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    aria-label="Usuń posiłek"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteMeal(meal.id);
                        if (!result.ok) toast.error(result.error);
                        else router.refresh();
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <ul className="mt-2 flex flex-col divide-y divide-border">
                  {meal.entries.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{entry.name}</p>
                        <p className="text-xs text-muted tabular">
                          {entry.quantity ? `${entry.quantity} ${entry.unit ?? "g"} - ` : ""}
                          {Math.round(entry.calories)} kcal - B {entry.protein} - W {entry.carbs} - T {entry.fat}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Usuń pozycję"
                        className="rounded-lg p-2 text-muted hover:bg-surface-2"
                        onClick={() =>
                          startTransition(async () => {
                            const result = await deleteNutritionEntry(entry.id);
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

                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setEntryFor(meal.id)}>
                  <Plus className="size-4" /> Dodaj produkt
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}

      <Button variant="outline" onClick={() => setMealOpen(true)}>
        <Plus className="size-4" /> Dodaj posiłek
      </Button>

      <GoalFormSheet open={goalOpen} onOpenChange={setGoalOpen} goal={goal} suggestion={suggestion} />

      <AddEntrySheet
        open={entryFor !== null}
        onOpenChange={(open) => !open && setEntryFor(null)}
        mealId={entryFor ?? ""}
        foods={foods}
      />

      <Sheet open={mealOpen} onOpenChange={setMealOpen}>
        <SheetContent title="Nowy posiłek">
          <div className="flex flex-col gap-3">
            <Select value={newMeal.name} onChange={(event) => setNewMeal({ ...newMeal, name: event.target.value })}>
              {MEAL_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Własna nazwa"
              value={newMeal.name}
              onChange={(event) => setNewMeal({ ...newMeal, name: event.target.value })}
            />
            <Input
              type="time"
              value={newMeal.time}
              onChange={(event) => setNewMeal({ ...newMeal, time: event.target.value })}
            />
            <Button
              size="lg"
              onClick={() =>
                startTransition(async () => {
                  const result = await createMeal({
                    date,
                    name: newMeal.name,
                    time: newMeal.time || null,
                  });
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  setMealOpen(false);
                  router.refresh();
                })
              }
            >
              Dodaj posiłek
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
