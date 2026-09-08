import "server-only";

import { prisma } from "@/server/db";
import { installStarterData } from "@/server/seed-shared";

/** Nowe konto dostaje plan i suplementy, żeby nie startować z pustego ekranu. */
export async function seedStarterDataForUser(userId: string): Promise<void> {
  await installStarterData(prisma, userId);
}
