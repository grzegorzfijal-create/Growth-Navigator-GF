"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction } from "@/server/actions/auth";
import { registerSchema, type RegisterInput } from "@/schemas/auth";

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setPending(true);
    const result = await registerAction(values);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Konto gotowe. Plan Push/Pull/Legs czeka w zakładce Trening.");
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Imię</Label>
        <Input id="name" autoComplete="given-name" {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" inputMode="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-xs text-danger">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Hasło</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        <p className="text-xs text-muted">Minimum 8 znaków.</p>
        {form.formState.errors.password ? (
          <p className="text-xs text-danger">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Tworzę konto..." : "Załóż konto"}
      </Button>
    </form>
  );
}
