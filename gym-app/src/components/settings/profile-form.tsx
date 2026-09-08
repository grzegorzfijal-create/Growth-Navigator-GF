"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ACTIVITY_LABELS, GOAL_LABELS } from "@/lib/labels";
import { profileSchema, type ProfileFormValues, type ProfileInput } from "@/schemas/profile";
import { updateProfile } from "@/server/actions/profile";

export function ProfileForm({ profile }: { profile: ProfileInput }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<ProfileFormValues, unknown, ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={form.handleSubmit(async (values) => {
        setPending(true);
        const result = await updateProfile(values);
        setPending(false);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Profil zapisany.");
        router.refresh();
      })}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Imię</Label>
        <Input id="name" {...form.register("name")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sex">Płeć</Label>
          <Select id="sex" {...form.register("sex")}>
            <option value="">Nie podaję</option>
            <option value="MALE">Mężczyzna</option>
            <option value="FEMALE">Kobieta</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="birthYear">Rok urodzenia</Label>
          <Input id="birthYear" type="number" min="1920" {...form.register("birthYear")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="heightCm">Wzrost (cm)</Label>
          <Input id="heightCm" type="number" min="100" max="250" {...form.register("heightCm")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="plateStep">Skok ciężaru (kg)</Label>
          <Input id="plateStep" type="number" step="0.25" min="0.5" {...form.register("plateStep")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goal">Cel</Label>
        <Select id="goal" {...form.register("goal")}>
          {Object.entries(GOAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="activity">Aktywność poza treningiem</Label>
        <Select id="activity" {...form.register("activity")}>
          {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="weightUnit">Jednostka ciężaru</Label>
          <Select id="weightUnit" {...form.register("weightUnit")}>
            <option value="KG">kilogramy</option>
            <option value="LB">funty</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="heightUnit">Jednostka wzrostu</Label>
          <Select id="heightUnit" {...form.register("heightUnit")}>
            <option value="CM">centymetry</option>
            <option value="FT">stopy</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="effortScale">Skala wysiłku</Label>
        <Select id="effortScale" {...form.register("effortScale")}>
          <option value="RPE">RPE</option>
          <option value="RIR">RIR</option>
          <option value="BOTH">RPE i RIR</option>
        </Select>
        <p className="text-xs text-muted">
          Decyduje, co widzisz przy serii. RPE 8 to RIR 2 - aplikacja przelicza jedno na drugie.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Zapisywanie..." : "Zapisz profil"}
      </Button>
    </form>
  );
}
