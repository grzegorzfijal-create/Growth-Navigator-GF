"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  workoutExerciseSchema,
  type WorkoutExerciseFormValues,
  type WorkoutExerciseInput,
} from "@/schemas/training";
import { addWorkoutExercise, updateWorkoutExercise } from "@/server/actions/plans";

export type WorkoutExerciseDraft = {
  id?: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
  targetWeight: number | null;
  targetRpe: number | null;
  targetRir: number | null;
  restSeconds: number;
  tempo: string | null;
  note: string | null;
  supersetGroup: string | null;
};

/** Konfiguracja ćwiczenia w planie: serie, zakres powtórzeń, cel RPE, przerwa, tempo. */
export function WorkoutExerciseFormSheet({
  open,
  onOpenChange,
  workoutId,
  draft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  draft: WorkoutExerciseDraft | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<WorkoutExerciseFormValues, unknown, WorkoutExerciseInput>({
    resolver: zodResolver(workoutExerciseSchema),
    values: {
      id: draft?.id,
      workoutId,
      exerciseId: draft?.exerciseId ?? "",
      sets: draft?.sets ?? 3,
      repsMin: draft?.repsMin ?? 8,
      repsMax: draft?.repsMax ?? 12,
      targetWeight: draft?.targetWeight ?? undefined,
      targetRpe: draft?.targetRpe ?? 8,
      targetRir: draft?.targetRir ?? undefined,
      restSeconds: draft?.restSeconds ?? 120,
      tempo: draft?.tempo ?? "",
      note: draft?.note ?? "",
      supersetGroup: draft?.supersetGroup ?? "",
    },
  });

  if (!draft) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={draft.exerciseName} description="Założenia z planu podpowiadają serie w trybie treningu.">
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit(async (values) => {
            setPending(true);
            const payload = {
              ...values,
              tempo: values.tempo || null,
              note: values.note || null,
              supersetGroup: values.supersetGroup || null,
            };
            const result = draft.id ? await updateWorkoutExercise(payload) : await addWorkoutExercise(payload);
            setPending(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            onOpenChange(false);
            router.refresh();
          })}
        >
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sets">Serie</Label>
              <Input id="sets" type="number" min="1" {...form.register("sets")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="repsMin">Powt. od</Label>
              <Input id="repsMin" type="number" min="1" {...form.register("repsMin")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="repsMax">Powt. do</Label>
              <Input id="repsMax" type="number" min="1" {...form.register("repsMax")} />
            </div>
          </div>
          {form.formState.errors.repsMax ? (
            <p className="-mt-2 text-xs text-danger">{form.formState.errors.repsMax.message}</p>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetRpe">Cel RPE</Label>
              <Input id="targetRpe" type="number" step="0.5" min="1" max="10" {...form.register("targetRpe")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetRir">Cel RIR</Label>
              <Input id="targetRir" type="number" step="1" min="0" max="10" {...form.register("targetRir")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetWeight">Ciężar</Label>
              <Input id="targetWeight" type="number" step="0.5" min="0" {...form.register("targetWeight")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="restSeconds">Przerwa (s)</Label>
              <Select id="restSeconds" {...form.register("restSeconds")}>
                {[45, 60, 90, 120, 150, 180, 240, 300].map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {seconds} s
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tempo">Tempo</Label>
              <Input id="tempo" placeholder="3-1-1-0" {...form.register("tempo")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supersetGroup">Superseria</Label>
              <Input id="supersetGroup" placeholder="A" maxLength={2} {...form.register("supersetGroup")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Notatka</Label>
            <Textarea id="note" placeholder="np. ostatnia seria do upadku" {...form.register("note")} />
          </div>

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Zapisywanie..." : "Zapisz ćwiczenie"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
