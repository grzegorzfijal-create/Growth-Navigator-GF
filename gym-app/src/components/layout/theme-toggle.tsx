"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Ikonę wybiera CSS na podstawie klasy motywu na <html>, a nie stan komponentu -
 * dzięki temu nie ma migotania ani rozjazdu między serwerem a klientem.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="iconSm"
      aria-label="Przełącz motyw"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden size-4.5 dark:block" />
      <Moon className="size-4.5 dark:hidden" />
    </Button>
  );
}
