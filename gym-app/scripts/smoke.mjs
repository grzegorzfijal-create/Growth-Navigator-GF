import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "pl-PL" });
const page = await ctx.newPage();
const errors = [];
const failed = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /konto demo/i }).click();
await page.waitForURL(`${BASE}/`, { timeout: 20000 });
await page.waitForLoadState("networkidle");
console.log("URL:", page.url());
console.log("FAILED REQUESTS:", failed.length ? failed : "brak");
console.log("ERRORS:", errors.length ? errors : "brak");
await browser.close();
