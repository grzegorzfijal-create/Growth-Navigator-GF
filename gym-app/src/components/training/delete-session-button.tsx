"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteWorkoutSession } from "@/server/actions/training";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="danger"
      size="sm"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("Usunąć ten trening z historii? Tej operacji nie da się cofnąć.")) return;
        setBusy(true);
        const result = await deleteWorkoutSession(sessionId);
        setBusy(false);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Trening usunięty.");
        router.replace("/historia");
        router.refresh();
      }}
    >
      <Trash2 className="size-4" /> Usuń trening
    </Button>
  );
}
