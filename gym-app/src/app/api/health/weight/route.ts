import { NextResponse } from "next/server";

import { fromIsoDate, todayIso } from "@/lib/date";
import { normalizeHealthPayload } from "@/lib/health-sync";
import { prisma } from "@/server/db";
import { userFromAuthHeader } from "@/server/tokens";

// Prisma i węzłowa kryptografia wymagają runtime'u Node, nie Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wejście dla pomiarów masy ciała z zewnątrz.
 *
 *   POST /api/health/weight
 *   Authorization: Bearer <osobisty token z ustawień>
 *   { "weight": 84.2 }                                  jeden pomiar, dzisiejsza data
 *   { "weight": "185", "unit": "lb", "date": "2026-09-08" }
 *   { "samples": [ { "weight": 83.4, "date": "..." }, ... ] }   import historii
 *
 * Ten sam dzień można wysłać wielokrotnie - wpis jest nadpisywany, nie duplikowany.
 */
export async function POST(request: Request) {
  const user = await userFromAuthHeader(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nieprawidłowy token." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Treść żądania nie jest poprawnym JSON-em." }, { status: 400 });
  }

  const parsed = normalizeHealthPayload(body, todayIso());
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.samples.map((sample) =>
      prisma.bodyWeightEntry.upsert({
        where: { userId_date: { userId: user.id, date: fromIsoDate(sample.date) } },
        create: {
          userId: user.id,
          date: fromIsoDate(sample.date),
          weight: sample.weight,
          bodyFat: sample.bodyFat ?? null,
          source: "HEALTH",
        },
        update: {
          weight: sample.weight,
          ...(sample.bodyFat !== undefined ? { bodyFat: sample.bodyFat } : {}),
          source: "HEALTH",
        },
      }),
    ),
  );

  const latest = parsed.samples[parsed.samples.length - 1];
  return NextResponse.json({
    ok: true,
    saved: parsed.samples.length,
    latest: { date: latest.date, weight: latest.weight },
    message: `Zapisano ${latest.weight} kg (${latest.date}).`,
  });
}

/** Skrót na iPhonie potrafi najpierw sprawdzić, czy token działa. */
export async function GET(request: Request) {
  const user = await userFromAuthHeader(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "Nieprawidłowy token." }, { status: 401 });
  }
  const last = await prisma.bodyWeightEntry.findFirst({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { date: true, weight: true, source: true },
  });
  return NextResponse.json({
    ok: true,
    user: user.name ?? user.email,
    lastEntry: last ? { date: last.date.toISOString().slice(0, 10), weight: last.weight, source: last.source } : null,
  });
}
