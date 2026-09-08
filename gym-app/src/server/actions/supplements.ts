"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { fromIsoDate } from "@/lib/date";
import { supplementLogSchema, supplementSchema } from "@/schemas/profile";
import type { ActionState } from "@/server/actions/training";

export async function saveSupplement(input: unknown): Promise<ActionState<{ id: string }>> {
  const user = await requireUser();
  const parsed = supplementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane suplementu." };

  const data = {
    name: parsed.data.name,
    dose: parsed.data.dose ?? null,
    unit: parsed.data.unit,
    timing: parsed.data.timing,
    daysOfWeek: parsed.data.daysOfWeek,
    note: parsed.data.note ?? null,
    isActive: parsed.data.isActive,
  };

  if (parsed.data.id) {
    const owned = await prisma.supplement.findFirst({ where: { id: parsed.data.id, userId: user.id } });
    if (!owned) return { ok: false, error: "Nie znaleziono suplementu." };
    await prisma.supplement.update({ where: { id: parsed.data.id }, data });
    revalidatePath("/suplementacja");
    return { ok: true, data: { id: parsed.data.id } };
  }

  const count = await prisma.supplement.count({ where: { userId: user.id } });
  const created = await prisma.supplement.create({ data: { ...data, userId: user.id, order: count } });
  revalidatePath("/suplementacja");
  return { ok: true, data: { id: created.id } };
}

export async function deleteSupplement(supplementId: string): Promise<ActionState> {
  const user = await requireUser();
  const owned = await prisma.supplement.findFirst({ where: { id: supplementId, userId: user.id } });
  if (!owned) return { ok: false, error: "Nie znaleziono suplementu." };

  await prisma.supplement.delete({ where: { id: supplementId } });
  revalidatePath("/suplementacja");
  return { ok: true };
}

/** Odhaczenie suplementu na dany dzień i porę - jedno kliknięcie, bez formularza. */
export async function toggleSupplementLog(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = supplementLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowe dane." };

  const supplement = await prisma.supplement.findFirst({
    where: { id: parsed.data.supplementId, userId: user.id },
    select: { id: true },
  });
  if (!supplement) return { ok: false, error: "Nie znaleziono suplementu." };

  const date = fromIsoDate(parsed.data.date);
  const key = {
    supplementId_date_timing: {
      supplementId: supplement.id,
      date,
      timing: parsed.data.timing,
    },
  };

  if (parsed.data.taken) {
    await prisma.supplementLog.upsert({
      where: key,
      create: { supplementId: supplement.id, userId: user.id, date, timing: parsed.data.timing },
      update: { takenAt: new Date() },
    });
  } else {
    await prisma.supplementLog.deleteMany({
      where: { supplementId: supplement.id, date, timing: parsed.data.timing },
    });
  }

  revalidatePath("/suplementacja");
  return { ok: true };
}
