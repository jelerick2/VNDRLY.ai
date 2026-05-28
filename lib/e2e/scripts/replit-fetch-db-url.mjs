#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../../../.local/replit-automation");
mkdirSync(OUT, { recursive: true });

const EMAIL = process.env.REPLIT_EMAIL || "v@vndrly.ai";
const PASSWORD = process.env.REPLIT_PASSWORD || "Bingos1029!";

async function snap(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  writeFileSync(path.join(OUT, `${name}.html`), await page.content());
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const result = { urls: [], notes: [], error: null };

  try {
    await page.goto("https://replit.com/login", { waitUntil: "domcontentloaded", timeout: 60000 });
    await snap(page, "01-login");
    result.notes.push(`Title: ${await page.title()}`);
  } catch (e) {
    result.error = String(e);
  } finally {
    writeFileSync(path.join(OUT, "result.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    await browser.close();
  }
}

main();
