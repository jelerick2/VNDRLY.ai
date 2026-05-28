import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://vndrly.ai/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.locator('[data-testid="input-username"]').fill("admin");
await page.locator('[data-testid="input-password"]').fill("admin123");
await page.locator('[data-testid="button-login"]').click();
await page.waitForTimeout(8000);
console.log("URL:", page.url());
const body = await page.locator("body").innerText();
console.log(body.slice(0, 1200));
await browser.close();
