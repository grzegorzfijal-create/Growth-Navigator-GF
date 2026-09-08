"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { fromIsoDate } from "@/lib/date";
import { bodyWeightSchema, profileSchema } from "@/schemas/profile";
import type { ActionState } from "@/server/actions/training";

export async function updateProfile(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane profilu." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      weightUnit: parsed.data.weightUnit,
      heightUnit: parsed.data.heightUnit,
      effortScale: parsed.data.effortScale,
      sex: parsed.data.sex ?? null,
      birthYear: parsed.data.birthYear ?? null,
      heightCm: parsed.data.heightCm ?? null,
      goal: parsed.data.goal,
      activity: parsed.data.activity,
      plateStep: parsed.data.plateStep,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveBodyWeight(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = bodyWeightSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowa masa ciała." };

  const date = fromIsoDate(parsed.data.date);
  await prisma.bodyWeightEntry.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, weight: parsed.data.weight, note: parsed.data.note ?? null },
    update: { weight: parsed.data.weight, note: parsed.data.note ?? null },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteBodyWeight(entryId: string): Promise<ActionState> {
  const user = await requireUser();
  const entry = await prisma.bodyWeightEntry.findFirst({ where: { id: entryId, userId: user.id } });
  if (!entry) return { ok: false, error: "Nie znaleziono wpisu." };

  await prisma.bodyWeightEntry.delete({ where: { id: entryId } });
  revalidatePath("/ustawienia");
  return { ok: true };
}
