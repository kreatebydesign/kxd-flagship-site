/**
 * Visual QA — October SEO touchpoints (local dev server required).
 * Run: npx tsx scripts/qa-october-seo-visual.ts
 * Env: QA_BASE_URL (default http://127.0.0.1:3000)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.env.QA_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const outDir = resolve(import.meta.dirname, "../.qa-october-seo-visual/screenshots");
mkdirSync(outDir, { recursive: true });

const routes = [
  { id: "home", path: "/" },
  { id: "spur-restaurant", path: "/work/spur-restaurant" },
  { id: "luxury-website", path: "/services/luxury-website-experiences" },
  { id: "investment", path: "/investment" },
];

const widths = [
  { label: "1440", width: 1440, height: 900 },
  { label: "768", width: 768, height: 1024 },
  { label: "390", width: 390, height: 844 },
];

async function main() {
  const browser = await chromium.launch();
  const report: Array<{ id: string; path: string; width: string; ok: boolean }> =
    [];

  for (const route of routes) {
    for (const vp of widths) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      });
      const url = `${baseUrl}${route.path}`;
      try {
        const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
        if (!res?.ok()) throw new Error(`HTTP ${res?.status()}`);
        await page.waitForTimeout(400);
        const file = resolve(outDir, `${route.id}-${vp.label}.png`);
        await page.screenshot({ path: file, fullPage: true });
        report.push({ id: route.id, path: route.path, width: vp.label, ok: true });
      } catch (e) {
        report.push({
          id: route.id,
          path: route.path,
          width: vp.label,
          ok: false,
        });
        console.error(`Failed ${url} @ ${vp.label}:`, e);
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();

  writeFileSync(
    resolve(import.meta.dirname, "../.qa-october-seo-visual/qa-report.json"),
    JSON.stringify({ baseUrl, routes, report, at: new Date().toISOString() }, null, 2),
  );

  const failed = report.filter((r) => !r.ok).length;
  if (failed > 0) process.exit(1);
  console.log(`Captured ${report.length} screenshots under .qa-october-seo-visual/`);
}

main();
