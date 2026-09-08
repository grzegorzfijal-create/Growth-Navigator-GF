import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 8420 -> "8 420" - w liczbach na siłowni chodzi o czytelność, nie o precyzję. */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatWeight(value: number | null | undefined, unit = "kg"): string {
  if (value == null) return "-";
  const decimals = Number.isInteger(value) ? 0 : 1;
  return `${formatNumber(value, decimals)} ${unit}`;
}

export function formatVolume(value: number, unit = "kg"): string {
  if (value >= 10000) return `${formatNumber(value / 1000, 1)} t`;
  return `${formatNumber(Math.round(value))} ${unit}`;
}
