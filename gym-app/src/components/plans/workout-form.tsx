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
import { workoutSchema, type WorkoutFormValues, type WorkoutInput } from "@/schemas/training";
import { createWorkout, updateWorkout } from "@/server/actions/plans";

export function WorkoutFormSheet({
  open,
  onOpenChange,
  planId,
  workout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  workout?: { id: string; name: string; description: string | null; estimatedMinutes: number | null };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<WorkoutFormValues, unknown, WorkoutInput>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      id: workout?.id,
      planId,
      name: workout?.name ?? "",
      description: workout?.description ?? "",
      estimatedMinutes: workout?.estimatedMinutes ?? undefined,
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={workout ? "Edytuj trening" : "Nowy trening w planie"}>
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit(async (values) => {
            setPending(true);
            const result = workout ? await updateWorkout(values) : await createWorkout(values);
            setPending(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            onOpenChange(false);
            form.reset({ planId, name: "", description: "", estimatedMinutes: undefined });
            router.refresh();
          })}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workout-name">Nazwa</Label>
            <Input id="workout-name" placeholder="np. Push, Upper, Nogi A" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workout-description">Opis</Label>
            <Input id="workout-description" placeholder="np. klatka, barki, triceps" {...form.register("description")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workout-minutes">Przewidywany czas (min)</Label>
            <Input id="workout-minutes" type="number" min="0" {...form.register("estimatedMinutes")} />
          </div>

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Zapisywanie..." : "Zapisz trening"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
