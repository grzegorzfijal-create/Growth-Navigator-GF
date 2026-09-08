import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Logowanie" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <Card>
      <CardContent className="pt-4">
        <LoginForm demoEmail="demo@gym.app" demoPassword="trening123" />
        <p className="mt-5 text-center text-sm text-muted">
          Nie masz konta?{" "}
          <Link href="/rejestracja" className="font-semibold text-accent-strong dark:text-accent">
            Załóż je
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
