"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PlanFormSheet } from "@/components/plans/plan-form";
import { Button } from "@/components/ui/button";
import { deletePlan, setActivePlan } from "@/server/actions/plans";

export function PlanHeaderActions({
  plan,
}: {
  plan: { id: string; name: string; description: string | null; isActive: boolean };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 gap-1">
      {!plan.isActive ? (
        <Button
          variant="ghost"
          size="iconSm"
          aria-label="Ustaw jako aktywny"
          onClick={() =>
            startTransition(async () => {
              const result = await setActivePlan(plan.id);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Plan ustawiony jako aktywny.");
                router.refresh();
              }
            })
          }
        >
          <CheckCircle2 className="size-4.5" />
        </Button>
      ) : null}
      <Button variant="ghost" size="iconSm" aria-label="Edytuj plan" onClick={() => setOpen(true)}>
        <Pencil className="size-4.5" />
      </Button>
      <Button
        variant="ghost"
        size="iconSm"
        aria-label="Usuń plan"
        onClick={() =>
          startTransition(async () => {
            if (!window.confirm(`Usunąć plan ${plan.name}? Historia treningów zostanie zachowana.`)) return;
            const result = await deletePlan(plan.id);
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Plan usunięty.");
              router.replace("/plany");
            }
          })
        }
      >
        <Trash2 className="size-4.5" />
      </Button>
      <PlanFormSheet open={open} onOpenChange={setOpen} plan={plan} />
    </div>
  );
}
