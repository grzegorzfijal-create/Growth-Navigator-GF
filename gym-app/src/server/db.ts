import { PrismaClient } from "@prisma/client";

// W dev Next przeładowuje moduły przy każdej zmianie - bez cache w globalThis
// każdy hot reload otwierałby nową pulę połączeń do Postgresa.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
