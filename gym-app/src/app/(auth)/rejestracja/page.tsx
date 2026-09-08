import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Rejestracja" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <Card>
      <CardContent className="pt-4">
        <RegisterForm />
        <p className="mt-5 text-center text-sm text-muted">
          Masz już konto?{" "}
          <Link href="/login" className="font-semibold text-accent-strong dark:text-accent">
            Zaloguj się
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
