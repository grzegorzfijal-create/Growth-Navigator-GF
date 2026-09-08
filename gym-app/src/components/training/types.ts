/** Kształt danych ekranu treningu - serwer je składa, klient tylko nimi żyje. */

export type RunnerSet = {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
  note: string | null;
};

export type PreviousSet = { weight: number | null; reps: number | null; rpe: number | null };

export type RunnerEntry = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  unit: string;
  note: string | null;
  supersetGroup: string | null;
  plateStep: number;
  target: {
    sets: number | null;
    repsMin: number | null;
    repsMax: number | null;
    rpe: number | null;
    restSeconds: number | null;
  };
  sets: RunnerSet[];
  previous: { date: string; sets: PreviousSet[] } | null;
  suggestion: { action: string; message: string; weight: number | null; reps: number | null } | null;
};

export type RunnerSession = {
  id: string;
  name: string;
  date: string;
  startedAt: string;
  effortScale: "RPE" | "RIR" | "BOTH";
  weightUnit: string;
  note: string | null;
  entries: RunnerEntry[];
};
