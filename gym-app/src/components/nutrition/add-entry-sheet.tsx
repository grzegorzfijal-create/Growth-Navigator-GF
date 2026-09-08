"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { portionMacros } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import { addEntryFromFood, addNutritionEntry } from "@/server/actions/nutrition";

export type FoodItem = {
  id: string;
  name: string;
  per: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/**
 * Dodawanie pozycji: albo z bazy produktów (wtedy makro liczy serwer),
 * albo ręcznie, gdy produktu nie ma. Baza jest zalążkiem - da się ją rozbudować
 * bez zmian w tym ekranie.
 */
export function AddEntrySheet({
  open,
  onOpenChange,
  mealId,
  foods,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealId: string;
  foods: FoodItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"baza" | "reczne">("baza");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [manual, setManual] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? foods.filter((food) => food.name.toLowerCase().includes(needle)) : foods.slice(0, 20);
  }, [foods, query]);

  const preview = selected ? portionMacros(selected, Number(quantity) || 0) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Dodaj produkt">
        <div className="mb-3 flex gap-1 rounded-xl bg-surface-2 p-1">
          {(["baza", "reczne"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-semibold",
                tab === value ? "bg-surface text-foreground shadow-sm" : "text-muted",
              )}
            >
              {value === "baza" ? "Z bazy" : "Wpisz ręcznie"}
            </button>
          ))}
        </div>

        {tab === "baza" ? (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-9"
                placeholder="Szukaj produktu"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {filtered.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => {
                    setSelected(food);
                    setQuantity(food.per === "szt" ? "1" : "100");
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left",
                    selected?.id === food.id ? "border-accent bg-accent/10" : "border-border",
                  )}
                >
                  <p className="font-medium leading-tight">{food.name}</p>
                  <p className="text-xs text-muted tabular">
                    {food.calories} kcal / {food.per === "szt" ? "szt." : "100 g"} - B {food.protein} - W {food.carbs} - T{" "}
                    {food.fat}
                  </p>
                </button>
              ))}
            </div>

            {selected ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="quantity">{selected.per === "szt" ? "Ilość (szt.)" : "Ilość (g)"}</Label>
                  <Input
                    id="quantity"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </div>
                {preview ? (
                  <p className="text-sm text-muted tabular">
                    {preview.calories} kcal - B {preview.protein} g - W {preview.carbs} g - T {preview.fat} g
                  </p>
                ) : null}
                <Button
                  size="lg"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await addEntryFromFood({
                        mealId,
                        foodId: selected.id,
                        quantity: Number(quantity),
                      });
                      if (!result.ok) {
                        toast.error(result.error);
                        return;
                      }
                      onOpenChange(false);
                      setSelected(null);
                      router.refresh();
                    })
                  }
                >
                  Dodaj do posiłku
                </Button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-name">Nazwa</Label>
              <Input
                id="manual-name"
                value={manual.name}
                onChange={(event) => setManual({ ...manual, name: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["calories", "Kalorie"],
                  ["protein", "Białko (g)"],
                  ["carbs", "Węglowodany (g)"],
                  ["fat", "Tłuszcze (g)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <Label htmlFor={`manual-${key}`}>{label}</Label>
                  <Input
                    id={`manual-${key}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={manual[key]}
                    onChange={(event) => setManual({ ...manual, [key]: event.target.value })}
                  />
                </div>
              ))}
            </div>
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await addNutritionEntry({
                    mealId,
                    name: manual.name,
                    unit: "g",
                    calories: Number(manual.calories) || 0,
                    protein: Number(manual.protein) || 0,
                    carbs: Number(manual.carbs) || 0,
                    fat: Number(manual.fat) || 0,
                  });
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  onOpenChange(false);
                  setManual({ name: "", calories: "", protein: "", carbs: "", fat: "" });
                  router.refresh();
                })
              }
            >
              Dodaj do posiłku
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
