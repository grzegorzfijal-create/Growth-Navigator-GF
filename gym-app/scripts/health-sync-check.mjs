/* Sprawdza całą drogę pomiaru z wagi: wygenerowanie tokenu w ustawieniach,
   wysyłkę POST tak, jak zrobi to Skrót z iPhone'a, i to, czy wynik ląduje
   w aplikacji. Uruchomienie: npm start w drugim oknie, potem node scripts/health-sync-check.mjs */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const ENDPOINT = `${BASE}/api/health/weight`;
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

let failures = 0;
function check(name, condition, detail) {
  console.log(`${condition ? "OK  " : "FAIL"} ${name}${condition ? "" : " - " + detail}`);
  if (!condition) failures += 1;
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pl-PL" });
const page = await ctx.newPage();
page.setDefaultTimeout(10000);

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /konto demo/i }).click();
await page.waitForURL(`${BASE}/`);

await page.goto(`${BASE}/ustawienia`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /wygeneruj/i }).click();
const token = (await page.getByRole("dialog").locator("code").first().textContent()).trim();
check("token wygenerowany w ustawieniach", token.startsWith("gym_"), token.slice(0, 12));
await page.getByRole("button", { name: /gotowe/i }).click();

const post = async (body, auth = token) =>
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${auth}` },
    body: JSON.stringify(body),
  });

/* 1. Jeden pomiar - dokładnie to, co wysyła skrót po porannym ważeniu. */
const single = await post({ weight: "86,4", date: `${today}T06:32:00+02:00` });
const singleBody = await single.json();
check("pojedynczy pomiar zapisany", single.status === 200 && singleBody.saved === 1, JSON.stringify(singleBody));
check("odpowiedź niesie zapisaną wartość", singleBody.latest?.weight === 86.4, JSON.stringify(singleBody.latest));

/* 2. Import historii jedną paczką. */
const batch = await post({
  samples: [
    { weight: 85.9, date: daysAgo(3) },
    { weight: 86.1, date: daysAgo(2), bodyFat: 18.2 },
    { weight: 86.2, date: daysAgo(1) },
  ],
});
const batchBody = await batch.json();
check("paczka historii zapisana", batch.status === 200 && batchBody.saved === 3, JSON.stringify(batchBody));

/* 3. Ten sam dzień drugi raz nadpisuje wpis, nie duplikuje. */
const again = await post({ weight: 86.8, date: today });
check("ponowna wysyłka tego samego dnia przechodzi", (await again.json()).saved === 1, "");

/* 4. Funty przeliczone na kilogramy. */
const pounds = await post({ weight: 190, unit: "lb", date: daysAgo(4) });
check("funty przeliczone", (await pounds.json()).latest?.weight === 86.2, "");

/* 5. Bariery: zły token, bezsensowna wartość, data z przyszłości. */
const badToken = await post({ weight: 84 }, "gym_nieprawidlowy_token_123456");
check("zły token odrzucony", badToken.status === 401, String(badToken.status));
const nonsense = await post({ weight: 4 });
check("bezsensowna masa odrzucona", nonsense.status === 400, String(nonsense.status));
const future = await post({ weight: 84, date: "2030-01-01" });
check("data z przyszłości odrzucona", future.status === 400, String(future.status));

/* 6. GET jako test tokenu w skrócie. */
const status = await fetch(ENDPOINT, { headers: { authorization: `Bearer ${token}` } });
const statusBody = await status.json();
check("GET potwierdza token i ostatni wpis", status.status === 200 && statusBody.lastEntry?.weight === 86.8, JSON.stringify(statusBody));

/* 7. Pomiar widać w aplikacji. */
await page.goto(`${BASE}/ustawienia`, { waitUntil: "domcontentloaded" });
const shown = await page.getByText("86.8 kg").first().isVisible().catch(() => false);
check("nowa masa ciała widoczna w ustawieniach", shown, "brak 86.8 kg na ekranie");

/* 8. Unieważniony token przestaje działać. */
// Potwierdzenie musi być obsłużone zanim padnie klikniecie - inaczej Playwright je odrzuca.
page.once("dialog", (dialog) => dialog.accept());
await page.getByRole("button", { name: /unieważnij token/i }).first().click();
await page.waitForTimeout(1500);
const afterRevoke = await post({ weight: 84 });
check("token po unieważnieniu nie działa", afterRevoke.status === 401, String(afterRevoke.status));

await browser.close();
console.log(failures === 0 ? "\nWszystko przeszło." : `\nBŁĘDY: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
