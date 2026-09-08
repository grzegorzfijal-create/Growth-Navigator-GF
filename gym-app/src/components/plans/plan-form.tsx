"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { planSchema, type PlanFormValues, type PlanInput } from "@/schemas/training";
import { createPlan, updatePlan } from "@/server/actions/plans";

export function PlanFormSheet({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: { id: string; name: string; description: string | null; isActive: boolean };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<PlanFormValues, unknown, PlanInput>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      id: plan?.id,
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      isActive: plan?.isActive ?? true,
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={plan ? "Edytuj plan" : "Nowy plan"}>
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit(async (values) => {
            setPending(true);
            const result = plan ? await updatePlan(values) : await createPlan(values);
            setPending(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            onOpenChange(false);
            form.reset();
            toast.success(plan ? "Plan zapisany." : "Plan utworzony.");
            router.refresh();
          })}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-name">Nazwa</Label>
            <Input id="plan-name" placeholder="np. Push / Pull / Legs" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-description">Opis</Label>
            <Textarea id="plan-description" {...form.register("description")} />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span className="text-sm font-medium">Ustaw jako aktywny</span>
            <Switch
              checked={form.watch("isActive") ?? false}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
            />
          </label>
          <p className="-mt-2 text-xs text-muted">Aktywny plan podpowiada treningi na dashboardzie i w kalendarzu.</p>

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Zapisywanie..." : "Zapisz plan"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
