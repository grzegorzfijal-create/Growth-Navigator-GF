"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/server/actions/auth";
import { loginSchema, type LoginInput } from "@/schemas/auth";

export function LoginForm({ demoEmail, demoPassword }: { demoEmail: string; demoPassword: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setPending(true);
    const result = await loginAction(values);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" inputMode="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-xs text-danger">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Hasło</Label>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        {form.formState.errors.password ? (
          <p className="text-xs text-danger">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Logowanie..." : "Zaloguj się"}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          form.setValue("email", demoEmail);
          form.setValue("password", demoPassword);
          void form.handleSubmit(onSubmit)();
        }}
        disabled={pending}
      >
        Wejdź na konto demo
      </Button>
    </form>
  );
}
