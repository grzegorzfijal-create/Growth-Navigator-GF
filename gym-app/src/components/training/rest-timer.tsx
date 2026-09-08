"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/date";

const PRESETS = [60, 90, 120, 180];

/** Krótki sygnał na zakończenie przerwy - generowany, więc nie wymaga pliku audio. */
function beep() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    setTimeout(() => void ctx.close(), 400);
  } catch {
    // Brak zgody na audio nie może przerwać treningu.
  }
}

export function useRestTimer(defaultSeconds = 120) {
  const [duration, setDuration] = useState(defaultSeconds);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [justFinished, setJustFinished] = useState(false);
  const notified = useRef(false);

  const start = useCallback((seconds: number) => {
    setDuration(seconds);
    setEndsAt(Date.now() + seconds * 1000);
    setRemaining(seconds);
    setJustFinished(false);
    notified.current = false;
  }, []);

  const stop = useCallback(() => {
    setEndsAt(null);
    setRemaining(0);
    setJustFinished(false);
  }, []);

  const extend = useCallback((seconds: number) => {
    setEndsAt((current) => (current ? current + seconds * 1000 : Date.now() + seconds * 1000));
    setDuration((current) => current + seconds);
  }, []);

  useEffect(() => {
    if (!endsAt) return;
    // Liczymy z zegara, a nie z tików - przeglądarka usypia karty w tle.
    const tick = () => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !notified.current) {
        notified.current = true;
        setJustFinished(true);
        beep();
        navigator.vibrate?.([120, 60, 120]);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Koniec przerwy", { body: "Kolejna seria czeka.", tag: "rest-timer" });
        }
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return { duration, remaining, running: endsAt !== null && remaining > 0, justFinished, start, stop, extend };
}

/**
 * Pasek przerwy stylizowany na procedurę startową MotoGP: pięć świateł zapala
 * się w miarę odliczania, a po zgaśnięciu (lights out) można wracać na sztangę.
 */
export function RestTimerBar({
  remaining,
  duration,
  running,
  justFinished,
  onExtend,
  onStop,
  onStart,
}: {
  remaining: number;
  duration: number;
  running: boolean;
  justFinished: boolean;
  onExtend: (seconds: number) => void;
  onStop: () => void;
  onStart: (seconds: number) => void;
}) {
  if (!running && !justFinished) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-border bg-surface p-2">
        <span className="pl-1 text-xs font-medium uppercase tracking-wide text-muted">Przerwa</span>
        {PRESETS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => onStart(seconds)}
            className="min-h-9 shrink-0 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-surface-2"
          >
            {seconds >= 60 ? `${seconds / 60} min` : `${seconds} s`}
          </button>
        ))}
      </div>
    );
  }

  const progress = duration > 0 ? 1 - remaining / duration : 1;
  const lightsOn = justFinished ? 0 : Math.min(5, Math.ceil(progress * 5));

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
        justFinished ? "border-success bg-success/15 animate-lights-out" : "border-accent/50 bg-accent/10",
      )}
    >
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            key={index}
            className={cn(
              "size-3 rounded-full border transition-colors",
              index < lightsOn ? "border-accent bg-accent" : "border-border bg-surface-2",
              justFinished && "border-success bg-success",
            )}
          />
        ))}
      </div>

      <span className="display flex-1 text-3xl tabular">
        {justFinished ? "START" : formatDuration(remaining)}
      </span>

      {!justFinished ? (
        <button
          type="button"
          onClick={() => onExtend(30)}
          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-border bg-surface px-3 text-sm font-semibold"
        >
          <Plus className="size-4" /> 30 s
        </button>
      ) : (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
          <Bell className="size-4" /> Koniec przerwy
        </span>
      )}

      <button
        type="button"
        onClick={onStop}
        aria-label="Zamknij stoper"
        className="rounded-xl p-2 text-muted hover:bg-surface-2"
      >
        <X className="size-4.5" />
      </button>
    </div>
  );
}
