import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Podaj poprawny adres e-mail"),
  password: z.string().min(1, "Podaj hasło"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Imię musi mieć co najmniej 2 znaki").max(60),
  email: z.email("Podaj poprawny adres e-mail"),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
