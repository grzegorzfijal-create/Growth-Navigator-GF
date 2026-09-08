"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SetUpdateInput } from "@/schemas/training";
import { saveSets } from "@/server/actions/training";

export type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error";

const storageKey = (sessionId: string) => `gym.pending.${sessionId}`;

/**
 * Autozapis serii. Zmiany trafiają do kolejki, kolejka leci na serwer po
 * krótkiej ciszy (debounce). Kolejka żyje też w localStorage, więc odświeżenie
 * strony albo utrata zasięgu na siłowni nie kasuje wpisanych wyników -
 * wysyłka ponawia się, gdy sieć wróci.
 */
export function useWorkoutSync(sessionId: string) {
  const queue = useRef<Map<string, SetUpdateInput>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef(false);
  const [status, setStatus] = useState<SyncStatus>("idle");
  // Licznik trzymamy w stanie, bo interfejs go pokazuje - odczyt refa w renderze
  // nie odświeżyłby widoku.
  const [pending, setPending] = useState(0);

  const persist = useCallback(() => {
    const entries = [...queue.current.values()];
    setPending(entries.length);
    try {
      if (entries.length === 0) localStorage.removeItem(storageKey(sessionId));
      else localStorage.setItem(storageKey(sessionId), JSON.stringify(entries));
    } catch {
      // Brak localStorage (tryb prywatny) nie może wywalić treningu.
    }
  }, [sessionId]);

  // Kompilator Reacta nie potrafi zachować tej memoizacji (kolejka w ref + async),
  // ale identyczność funkcji jest tu potrzebna: wisi na niej efekt nasłuchujący sieci.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const flush = useCallback(async () => {
    if (flushing.current || queue.current.size === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      return;
    }

    flushing.current = true;
    const batch = [...queue.current.values()];
    setStatus("saving");

    try {
      const result = await saveSets({ sessionId, sets: batch });
      if (result.ok) {
        // Usuwamy tylko to, co poszło - zmiany zrobione w trakcie zapisu zostają.
        for (const item of batch) {
          const current = queue.current.get(item.setId);
          if (current && JSON.stringify(current) === JSON.stringify(item)) queue.current.delete(item.setId);
        }
        persist();
        setStatus(queue.current.size > 0 ? "saving" : "saved");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    } finally {
      flushing.current = false;
      if (queue.current.size > 0) {
        timer.current = setTimeout(() => void flush(), 2500);
      }
    }
  }, [persist, sessionId]);

  const push = useCallback(
    (change: SetUpdateInput) => {
      const previous = queue.current.get(change.setId) ?? { setId: change.setId };
      queue.current.set(change.setId, { ...previous, ...change });
      persist();
      setStatus("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 700);
    },
    [flush, persist],
  );

  // Zaległości z poprzedniej wizyty wysyłamy od razu po wejściu na ekran.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(sessionId));
      if (!stored) return;
      const entries: SetUpdateInput[] = JSON.parse(stored);
      entries.forEach((entry) => queue.current.set(entry.setId, entry));
      if (entries.length > 0) void flush();
    } catch {
      /* uszkodzony wpis ignorujemy */
    }
  }, [flush, sessionId]);

  useEffect(() => {
    const onOnline = () => void flush();
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", () => setStatus("offline"));
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  const flushNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await flush();
  }, [flush]);

  return { push, flushNow, status, pending };
}
