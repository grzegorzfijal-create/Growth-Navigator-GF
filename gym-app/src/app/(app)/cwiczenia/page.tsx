import type { Metadata } from "next";

import { ExerciseList } from "@/components/training/exercise-list";
import { requireUser } from "@/server/auth";
import { getExercises } from "@/server/queries/training";

export const metadata: Metadata = { title: "Ćwiczenia" };

export default async function ExercisesPage() {
  const user = await requireUser();
  const exercises = await getExercises(user.id);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="display text-3xl">Ćwiczenia</h1>
        <p className="text-sm text-muted">Baza ćwiczeń z Twoimi własnymi na czele listy wyszukiwania.</p>
      </header>

      <ExerciseList
        exercises={exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          type: exercise.type,
          primaryMuscle: exercise.primaryMuscle,
          description: exercise.description,
          isCustom: exercise.userId !== null,
          lastUsed: null,
        }))}
      />
    </div>
  );
}
