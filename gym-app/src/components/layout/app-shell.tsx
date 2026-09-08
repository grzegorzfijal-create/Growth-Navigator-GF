"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal, Timer } from "lucide-react";

import { PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/nav-items";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

export type ActiveSessionInfo = { id: string; name: string } | null;

export function AppShell({
  children,
  userName,
  activeSession,
}: {
  children: React.ReactNode;
  userName: string;
  activeSession: ActiveSessionInfo;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const inWorkout = pathname.startsWith("/trening/");

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Desktop: boczne menu. Mobile: nawigacja siedzi na dole ekranu. */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="display grid size-9 place-items-center rounded-lg bg-accent text-base text-accent-foreground">93</span>
          <span className="display text-xl">Trening</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href) ? "bg-accent/15 text-accent-strong dark:text-accent" : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <item.icon className="size-4.5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          <span className="truncate px-2 text-sm text-muted">{userName}</span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:hidden">
          <span className="display grid size-8 place-items-center rounded-md bg-accent text-sm text-accent-foreground">93</span>
          <span className="display text-lg">Trening</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        <main className={cn("flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10", inWorkout && "pb-40")}>
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
      </div>

      {/* Pasek trwającego treningu - wraca do serii z dowolnego ekranu. */}
      {activeSession && !inWorkout ? (
        <Link
          href={`/trening/${activeSession.id}`}
          className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-accent-foreground shadow-lg md:inset-x-auto md:right-6 md:bottom-6 md:w-80"
        >
          <Timer className="size-5" />
          <span className="flex-1 text-sm font-semibold">Trening w toku: {activeSession.name}</span>
          <span className="text-sm font-bold">Wróć</span>
        </Link>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {PRIMARY_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              isActive(item.href) ? "text-accent-strong dark:text-accent" : "text-muted",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted">
            <MoreHorizontal className="size-5" />
            Więcej
          </SheetTrigger>
          <SheetContent title="Więcej">
            <div className="grid grid-cols-2 gap-2">
              {SECONDARY_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm font-medium"
                >
                  <item.icon className="size-4.5 text-muted" />
                  {item.label}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
