"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { PlanFormSheet } from "@/components/plans/plan-form";
import { Button } from "@/components/ui/button";

export function PlanListActions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="icon" aria-label="Nowy plan" onClick={() => setOpen(true)}>
        <Plus className="size-5" />
      </Button>
      <PlanFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
