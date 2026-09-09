import type { Metadata } from "next";
import { headers } from "next/headers";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HealthSyncSection } from "@/components/settings/health-sync";
import { BodyWeightSection } from "@/components/settings/body-weight-form";
import { LogoutButton } from "@/components/settings/logout-button";
import { ProfileForm } from "@/components/settings/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toIsoDate } from "@/lib/date";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { listApiTokens } from "@/server/tokens";

export const metadata: Metadata = { title: "Ustawienia" };

export default async function SettingsPage() {
  const user = await requireUser();
  // Adres publiczny czytamy z nagłówków - po wdrożeniu skrót dostanie właściwy URL bez zmian w kodzie.
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : "";

  const [entries, tokens] = await Promise.all([
    prisma.bodyWeightEntry.findMany({ where: { userId: user.id }, orderBy: { date: "asc" }, take: 200 }),
    listApiTokens(user.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="display text-3xl">Ustawienia</h1>
        <p className="text-sm text-muted">{user.email}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Masa ciała</CardTitle>
        </CardHeader>
        <CardContent>
          <BodyWeightSection
            entries={entries.map((entry) => ({
              id: entry.id,
              date: toIsoDate(entry.date),
              weight: entry.weight,
              note: entry.note,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Waga i aplikacja Zdrowie</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthSyncSection
            origin={origin}
            tokens={tokens.map((token) => ({
              id: token.id,
              name: token.name,
              preview: token.preview,
              createdAt: token.createdAt.toISOString(),
              lastUsedAt: token.lastUsedAt ? token.lastUsedAt.toISOString() : null,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            profile={{
              name: user.name ?? "",
              weightUnit: user.weightUnit,
              heightUnit: user.heightUnit,
              effortScale: user.effortScale,
              sex: user.sex,
              birthYear: user.birthYear,
              heightCm: user.heightCm,
              goal: user.goal,
              activity: user.activity,
              plateStep: user.plateStep,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wygląd</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted">Motyw jasny i ciemny. Domyślnie ciemny - lepiej działa na siłowni.</p>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Konto</CardTitle>
        </CardHeader>
        <CardContent>
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  );
}
