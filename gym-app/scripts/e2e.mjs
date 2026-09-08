/* Scenariusze z wymagań przeklikane w przeglądarce mobilnej (390x844).
   Uruchomienie: npm start w jednym oknie, potem node scripts/e2e.mjs */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const SHOTS = process.env.SHOTS_DIR ?? "/tmp/shots";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "pl-PL" });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);

const errors = [];
const failed = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

let index = 0;
async function step(name, fn) {
  index += 1;
  const started = Date.now();
  try {
    await fn();
    console.log(`OK   ${name} (${Date.now() - started} ms)`);
  } catch (error) {
    console.log(`FAIL ${name}: ${String(error.message).split("\n")[0]}`);
    await page.screenshot({ path: `${SHOTS}/fail-${index}.png` }).catch(() => {});
  }
}

await step("logowanie na konto demo", async () => {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /konto demo/i }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 20000 });
  await page.getByRole("heading", { name: /cześć/i }).waitFor();
});

await step("dashboard pokazuje stan dnia", async () => {
  await page.getByText(/plan na dziś|trening w toku|zrobione dzisiaj|dzień bez planu/i).first().waitFor();
  await page.screenshot({ path: `${SHOTS}/01-dashboard.png`, fullPage: true });
});

await step("start treningu", async () => {
  const start = page.getByRole("button", { name: /rozpocznij trening|wróć do treningu/i });
  if (await start.count()) {
    await start.first().click();
  } else {
    await page.goto(`${BASE}/trening`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^start$/i }).first().click();
  }
  await page.waitForURL(/\/trening\/[a-z0-9]+/i, { timeout: 20000 });
});

await step("ekran treningu: poprzedni wynik i podpowiedź ciężaru", async () => {
  await page.getByText(/poprzednio/i).first().waitFor({ timeout: 10000 });
  await page.getByText(/wpisz .*kg/i).first().waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/02-trening.png`, fullPage: true });
});

await step("seria 1: 80 kg x 10 @ RPE 8", async () => {
  await page.getByLabel("Ciężar w serii 1").first().fill("80");
  await page.getByLabel("Powtórzenia w serii 1").first().fill("10");
  await page.getByLabel("Wysiłek w serii 1").first().click();
  await page.getByRole("button", { name: "8", exact: true }).first().click();
  await page.getByLabel("Zapisz serię").first().click();
  await page.waitForTimeout(1500);
});

await step("stoper przerwy wystartował", async () => {
  await page.getByText(/^\d+:\d\d$/).first().waitFor({ timeout: 5000 });
  await page.screenshot({ path: `${SHOTS}/03-seria-zapisana.png` });
});

await step("autozapis potwierdzony", async () => {
  await page.getByText(/zapisano automatycznie/i).waitFor({ timeout: 10000 });
});

await step("dane przetrwały odświeżenie", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const value = await page.getByLabel("Ciężar w serii 1").first().inputValue();
  if (value !== "80") throw new Error(`po odświeżeniu ciężar = ${value}`);
});

await step("serie 2 i 3", async () => {
  for (const nr of [2, 3]) {
    await page.getByLabel(`Ciężar w serii ${nr}`).first().fill("82.5");
    await page.getByLabel(`Powtórzenia w serii ${nr}`).first().fill("8");
    await page.getByLabel("Zapisz serię").nth(nr - 1).click();
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);
});

await step("zakończenie treningu", async () => {
  await page.getByRole("button", { name: /zakończ/i }).click();
  await page.getByRole("button", { name: /zapisz trening/i }).click();
  await page.waitForURL(/\/historia\/[a-z0-9]+/i, { timeout: 20000 });
  await page.screenshot({ path: `${SHOTS}/04-podsumowanie.png`, fullPage: true });
});

await step("podsumowanie: objętość i szacowane 1RM", async () => {
  await page.getByText(/objętość/i).first().waitFor();
  await page.getByText(/szac\. 1RM/i).first().waitFor();
});

await step("kalendarz zawiera wykonany trening", async () => {
  await page.goto(`${BASE}/kalendarz`, { waitUntil: "domcontentloaded" });
  await page.getByText(/wykonany/i).first().waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/05-kalendarz.png`, fullPage: true });
});

await step("progresja ćwiczenia z wykresem", async () => {
  await page.goto(`${BASE}/cwiczenia`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder(/szukaj ćwiczenia/i).fill("wyciskanie sztangi");
  await page.getByText("Wyciskanie sztangi leżąc").first().click();
  await page.waitForURL(/\/cwiczenia\/[a-z0-9]+/i, { timeout: 10000 });
  await page.locator("svg.recharts-surface").first().waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/06-progresja.png`, fullPage: true });
});

await step("dieta: posiłek + produkt z bazy", async () => {
  await page.goto(`${BASE}/dieta`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^dodaj posiłek$/i }).last().click();
  await page.getByRole("button", { name: /^dodaj posiłek$/i }).last().click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /dodaj produkt/i }).last().click();
  // Szukamy wewnątrz panelu, bo ta sama nazwa produktu bywa już na liście posiłków.
  const sheet = page.getByRole("dialog");
  await sheet.getByPlaceholder(/szukaj produktu/i).fill("kurczak");
  await sheet.getByText(/pierś z kurczaka/i).first().click();
  await sheet.getByRole("button", { name: /dodaj do posiłku/i }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/07-dieta.png`, fullPage: true });
});

await step("suplementacja: odhaczenie dawki", async () => {
  await page.goto(`${BASE}/suplementacja`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /po treningu/i }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/08-suplementy.png`, fullPage: true });
});

await step("statystyki", async () => {
  await page.goto(`${BASE}/statystyki`, { waitUntil: "domcontentloaded" });
  await page.getByText(/regularność/i).first().waitFor();
  await page.screenshot({ path: `${SHOTS}/09-statystyki.png`, fullPage: true });
});

await step("plan treningowy w edytorze", async () => {
  await page.goto(`${BASE}/plany`, { waitUntil: "domcontentloaded" });
  await page.getByText(/push \/ pull \/ legs/i).first().click();
  await page.waitForURL(/\/plany\/[a-z0-9]+/i, { timeout: 10000 });
  await page.getByText(/^push$/i).first().waitFor();
  await page.screenshot({ path: `${SHOTS}/10-plan.png`, fullPage: true });
});

await step("ustawienia w motywie jasnym", async () => {
  await page.goto(`${BASE}/ustawienia`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /przełącz motyw/i }).first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/11-ustawienia-jasny.png`, fullPage: true });
});

console.log("\nFAILED REQUESTS:", failed.length ? failed.slice(0, 10) : "brak");
console.log("CONSOLE ERRORS:", errors.length ? errors.slice(0, 10) : "brak");
await browser.close();
