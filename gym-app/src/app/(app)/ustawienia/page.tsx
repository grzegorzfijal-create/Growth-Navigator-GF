import type { Metadata } from "next";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BodyWeightSection } from "@/components/settings/body-weight-form";
import { LogoutButton } from "@/components/settings/logout-button";
import { ProfileForm } from "@/components/settings/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toIsoDate } from "@/lib/date";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";

export const metadata: Metadata = { title: "Ustawienia" };

export default async function SettingsPage() {
  const user = await requireUser();
  const entries = await prisma.bodyWeightEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    take: 200,
  });

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
