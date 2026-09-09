"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth";
import { createApiToken, revokeApiToken } from "@/server/tokens";
import type { ActionState } from "@/server/actions/training";

export async function createHealthToken(name: string): Promise<ActionState<{ token: string }>> {
  const user = await requireUser();
  const { token } = await createApiToken(user.id, name);
  revalidatePath("/ustawienia");
  // Token wraca tylko teraz - w bazie zostaje wyłącznie jego hash.
  return { ok: true, data: { token } };
}

export async function revokeHealthToken(tokenId: string): Promise<ActionState> {
  const user = await requireUser();
  const revoked = await revokeApiToken(user.id, tokenId);
  if (!revoked) return { ok: false, error: "Nie znaleziono tokenu." };
  revalidatePath("/ustawienia");
  return { ok: true };
}
