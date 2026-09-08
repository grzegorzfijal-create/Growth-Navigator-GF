/* Sprawdza dwie rzeczy, które decydują o tym, czy aplikacja przetrwa słaby zasięg:
   rejestrację service workera i kolejkę zapisu serii przy braku sieci. */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pl-PL" });
const page = await ctx.newPage();
page.setDefaultTimeout(10000);

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /konto demo/i }).click();
await page.waitForURL(`${BASE}/`);

// 1. Service worker
const swReady = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return "brak API";
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  return registration ? "zarejestrowany" : "brak rejestracji";
});
console.log("service worker:", swReady);

const cached = await page.evaluate(async () => {
  const keys = await caches.keys();
  if (keys.length === 0) return [];
  const cache = await caches.open(keys[0]);
  return (await cache.keys()).map((request) => new URL(request.url).pathname);
});
console.log("w cache:", cached.length ? cached.join(", ") : "pusto");

// 2. Kolejka zapisu bez sieci
const start = page.getByRole("button", { name: /rozpocznij trening|wróć do treningu/i });
if (await start.count()) {
  await start.first().click();
} else {
  await page.goto(`${BASE}/trening`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^start$/i }).first().click();
}
await page.waitForURL(/\/trening\/[a-z0-9]+/i);
const sessionUrl = page.url();

await ctx.setOffline(true);
await page.getByLabel("Ciężar w serii 1").first().fill("123");
await page.getByLabel("Powtórzenia w serii 1").first().fill("7");
await page.getByLabel("Zapisz serię").first().click();
await page.waitForTimeout(2500);

const offlineBanner = await page.getByText(/offline/i).first().textContent().catch(() => null);
console.log("komunikat offline:", offlineBanner?.trim() ?? "brak");

const queued = await page.evaluate(() => {
  const key = Object.keys(localStorage).find((entry) => entry.startsWith("gym.pending."));
  return key ? JSON.parse(localStorage.getItem(key)).length : 0;
});
console.log("zmiany w kolejce offline:", queued);

// 3. Powrót sieci - kolejka ma się opróżnić sama
await ctx.setOffline(false);
await page.waitForTimeout(4000);
const afterOnline = await page.evaluate(() => {
  const key = Object.keys(localStorage).find((entry) => entry.startsWith("gym.pending."));
  return key ? JSON.parse(localStorage.getItem(key)).length : 0;
});
console.log("kolejka po powrocie sieci:", afterOnline);

await page.goto(sessionUrl, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const persisted = await page.getByLabel("Ciężar w serii 1").first().inputValue();
console.log("ciężar zapisany na serwerze:", persisted);

await browser.close();
