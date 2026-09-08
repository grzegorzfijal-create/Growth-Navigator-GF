import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";

import { prisma } from "@/server/db";

const COOKIE_NAME = "gym_session";
const SESSION_DAYS = 30;

/**
 * Token sesji jest losowy i trzymany w bazie wyłącznie jako hash - wyciek
 * bazy nie daje możliwości zalogowania się na cudze konto.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);

  await prisma.authSession.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, userAgent },
  });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(COOKIE_NAME);
}

/** Zalogowany użytkownik albo null. Nie przekierowuje - do użycia w layoutach. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

/**
 * Brama wszystkich danych: każde zapytanie i każda akcja przechodzi tędy,
 * a dalej filtruje po userId. Bez tego nie ma dostępu do niczego.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
