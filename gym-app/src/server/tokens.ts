import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { User } from "@prisma/client";

import { prisma } from "@/server/db";
import { tokenPreview } from "@/lib/health-sync";

/** Token trzymamy w bazie wyłącznie jako hash - wyciek bazy nie daje dostępu do konta. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createApiToken(userId: string, name: string): Promise<{ token: string; id: string }> {
  // Prefiks ułatwia rozpoznanie tokenu, gdy wypadnie z kontekstu (np. w logu skrótu).
  const token = "gym_" + randomBytes(24).toString("base64url");
  const record = await prisma.apiToken.create({
    data: {
      userId,
      name: name.trim().slice(0, 60) || "iPhone",
      tokenHash: hashToken(token),
      preview: tokenPreview(token),
    },
  });
  return { token, id: record.id };
}

export async function revokeApiToken(userId: string, tokenId: string): Promise<boolean> {
  const result = await prisma.apiToken.updateMany({
    where: { id: tokenId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}

export async function listApiTokens(userId: string) {
  return prisma.apiToken.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, preview: true, createdAt: true, lastUsedAt: true },
  });
}

/**
 * Rozpoznaje właściciela tokenu z nagłówka Authorization. Porównanie idzie po
 * indeksowanym hashu, a dodatkowy timingSafeEqual chroni przed odgadywaniem
 * tokenu po czasie odpowiedzi.
 */
export async function userFromAuthHeader(header: string | null): Promise<User | null> {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = (match ? match[1] : header).trim();
  if (token.length < 20 || token.length > 200) return null;

  const hash = hashToken(token);
  const record = await prisma.apiToken.findUnique({ where: { tokenHash: hash }, include: { user: true } });
  if (!record || record.revokedAt) return null;

  const expected = Buffer.from(record.tokenHash, "utf8");
  const actual = Buffer.from(hash, "utf8");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  await prisma.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  return record.user;
}
