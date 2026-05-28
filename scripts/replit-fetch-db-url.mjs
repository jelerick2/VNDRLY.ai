#!/usr/bin/env node
/**
 * Attempts Replit login and prints non-Supabase DATABASE URLs from Secrets/Shell.
 * Run locally: node scripts/replit-fetch-db-url.mjs
 */
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../.local/replit-automation");
mkdirSync(OUT, { recursive: true });

const EMAIL = process.env.REPLIT_EMAIL || "v@vndrly.ai";
const PASSWORD = process.env.REPLIT_PASSWORD || "Bingos1029!";

async function snap(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  writeFileSync(path.join(OUT, `${name}.html`), await page.content());
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    channel: process.env.PW_CHANNEL || undefined,
  });
  const page = await browser.newPage();
  const result = { urls: [], notes: [], error: null };

  try {
    await page.goto("https://replit.com/login", { waitUntil: "domcontentloaded", timeout: 60000 });
    await snap(page, "01-login");

    // Email/password flow
    const emailInput = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first();
    if (await emailInput.count()) {
      await emailInput.fill(EMAIL);
      const passInput = page.locator('input[type="password"]').first();
      if (await passInput.count()) {
        await passInput.fill(PASSWORD);
        await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
        await page.waitForTimeout(5000);
        await snap(page, "02-after-login");
      }
    }

    const url = page.url();
    result.notes.push(`After login URL: ${url}`);

    // Search for VNDRLY repl
    await page.goto("https://replit.com/~", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await snap(page, "03-home");

    const replLink = page.locator('a:has-text("VNDRLY"), a:has-text("vndrly"), a[href*="VNDRLY"], a[href*="vndrly"]').first();
    if (await replLink.count()) {
      await replLink.click();
      await page.waitForTimeout(5000);
      await snap(page, "04-repl");
      result.notes.push(`Repl URL: ${page.url()}`);
    }

    // Try Secrets page
    for (const secretsPath of ["/replEnvironment", "?tab=secrets", "#secrets"]) {
      try {
        await page.goto(`${page.url().split("?")[0]}${secretsPath}`, { timeout: 15000 });
        await page.waitForTimeout(2000);
      } catch {
        /* ignore */
      }
    }
    await snap(page, "05-secrets");

    const body = await page.textContent("body");
    const matches = body?.match(/postgresql:\/\/[^\s"'<>]+/g) || [];
    for (const m of matches) {
      if (!m.includes("supabase.co")) result.urls.push(m);
    }

    // Try Database tool
    const dbBtn = page.locator('button:has-text("Database"), a:has-text("Database"), [aria-label*="Database"]').first();
    if (await dbBtn.count()) {
      await dbBtn.click();
      await page.waitForTimeout(3000);
      await snap(page, "06-database");
      const dbBody = await page.textContent("body");
      const dbMatches = dbBody?.match(/postgresql:\/\/[^\s"'<>]+/g) || [];
      for (const m of dbMatches) {
        if (!m.includes("supabase.co")) result.urls.push(m);
      }
    }
  } catch (e) {
    result.error = String(e);
  } finally {
    writeFileSync(path.join(OUT, "result.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    await browser.close();
  }
}

main();
