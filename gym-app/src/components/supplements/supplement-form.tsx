"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TIMING_LABELS } from "@/components/supplements/supplement-checklist";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { WEEKDAY_SHORT } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  SUPPLEMENT_TIMINGS,
  supplementSchema,
  type SupplementFormValues,
  type SupplementInput,
} from "@/schemas/profile";
import { saveSupplement } from "@/server/actions/supplements";

export function SupplementFormSheet({
  open,
  onOpenChange,
  supplement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplement?: SupplementInput & { id: string };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<SupplementFormValues, unknown, SupplementInput>({
    resolver: zodResolver(supplementSchema),
    values: {
      id: supplement?.id,
      name: supplement?.name ?? "",
      dose: supplement?.dose ?? undefined,
      unit: supplement?.unit ?? "g",
      timing: supplement?.timing ?? ["MORNING"],
      daysOfWeek: supplement?.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 7],
      note: supplement?.note ?? "",
      isActive: supplement?.isActive ?? true,
    },
  });

  const timing = form.watch("timing") ?? [];
  const days = form.watch("daysOfWeek") ?? [];

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={supplement ? "Edytuj suplement" : "Nowy suplement"}>
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit(async (values) => {
            setPending(true);
            const result = await saveSupplement(values);
            setPending(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            onOpenChange(false);
            toast.success("Zapisano.");
            router.refresh();
          })}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supp-name">Nazwa</Label>
            <Input id="supp-name" placeholder="np. Kreatyna monohydrat" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supp-dose">Dawka</Label>
              <Input id="supp-dose" type="number" step="0.1" min="0" {...form.register("dose")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supp-unit">Jednostka</Label>
              <Input id="supp-unit" placeholder="g / mg / IU / kaps." {...form.register("unit")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Pora przyjmowania</Label>
            <div className="grid grid-cols-2 gap-2">
              {SUPPLEMENT_TIMINGS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => form.setValue("timing", toggle(timing, value), { shouldValidate: true })}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 text-sm font-medium",
                    timing.includes(value) ? "border-accent bg-accent/10 text-accent-strong dark:text-accent" : "border-border text-muted",
                  )}
                >
                  {TIMING_LABELS[value]}
                </button>
              ))}
            </div>
            {form.formState.errors.timing ? (
              <p className="text-xs text-danger">{form.formState.errors.timing.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Dni tygodnia</Label>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_SHORT.map((label, index) => {
                const day = index + 1;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => form.setValue("daysOfWeek", toggle(days, day), { shouldValidate: true })}
                    className={cn(
                      "min-h-11 rounded-xl border text-xs font-semibold uppercase",
                      days.includes(day) ? "border-accent bg-accent/10 text-accent-strong dark:text-accent" : "border-border text-muted",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supp-note">Notatka</Label>
            <Textarea id="supp-note" placeholder="np. z posiłkiem zawierającym tłuszcz" {...form.register("note")} />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span className="text-sm font-medium">Aktywny</span>
            <Switch
              checked={form.watch("isActive") ?? true}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
            />
          </label>

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Zapisywanie..." : "Zapisz suplement"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
