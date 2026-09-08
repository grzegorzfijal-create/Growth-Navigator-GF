"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { startWorkoutSession } from "@/server/actions/training";

/**
 * Jedno kliknięcie z dashboardu do pierwszej serii - bez ekranów pośrednich.
 */
export function StartWorkoutButton({
  workoutId,
  label = "Rozpocznij trening",
  date,
  ...props
}: { workoutId?: string; label?: string; date?: string } & ButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      {...props}
      disabled={busy || pending || props.disabled}
      onClick={async () => {
        setBusy(true);
        const result = await startWorkoutSession({ workoutId, date });
        setBusy(false);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        startTransition(() => router.push(`/trening/${result.data!.sessionId}`));
      }}
    >
      <Play className="size-4.5 fill-current" />
      {busy || pending ? "Startuję..." : label}
    </Button>
  );
}
