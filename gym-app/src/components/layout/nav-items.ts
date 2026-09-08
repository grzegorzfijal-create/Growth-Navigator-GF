import {
  Apple,
  BarChart3,
  CalendarDays,
  Dumbbell,
  History,
  LayoutDashboard,
  ListChecks,
  Pill,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Pięć pozycji na dole ekranu - tyle mieści się bez ściskania w telefonie. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Dziś", icon: LayoutDashboard },
  { href: "/trening", label: "Trening", icon: Dumbbell },
  { href: "/kalendarz", label: "Kalendarz", icon: CalendarDays },
  { href: "/dieta", label: "Dieta", icon: Apple },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/cwiczenia", label: "Ćwiczenia", icon: ListChecks },
  { href: "/plany", label: "Plany", icon: Dumbbell },
  { href: "/suplementacja", label: "Suplementacja", icon: Pill },
  { href: "/statystyki", label: "Statystyki", icon: BarChart3 },
  { href: "/historia", label: "Historia", icon: History },
  { href: "/ustawienia", label: "Ustawienia", icon: Settings },
];

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];
