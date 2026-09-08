"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { prisma } from "@/server/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/server/auth";
import { loginSchema, registerSchema } from "@/schemas/auth";
import { seedStarterDataForUser } from "@/server/seed-user";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sprawdź dane logowania." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // Ten sam komunikat dla złego e-maila i złego hasła - nie podpowiadamy, które konta istnieją.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: "Nieprawidłowy e-mail lub hasło." };
  }

  const agent = (await headers()).get("user-agent") ?? undefined;
  await createSession(user.id, agent);
  return { ok: true };
}

export async function registerAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "Konto z tym adresem już istnieje." };

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  // Nowe konto dostaje własny plan i suplementy, żeby nie startować z pustki.
  await seedStarterDataForUser(user.id);

  const agent = (await headers()).get("user-agent") ?? undefined;
  await createSession(user.id, agent);
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
