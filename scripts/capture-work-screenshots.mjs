/**
 * Captures homepage screenshots for KXD Work page project cards.
 * Usage: node scripts/capture-work-screenshots.mjs
 */

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.join(__dirname, "../public/images/work/screenshots");

const SITES = [
  {
    slug: "golden-state-warriors",
    url: "https://www.nba.com/warriors",
    fallback: "https://www.nba.com/team/1610612744/warriors",
  },
  {
    slug: "dialed-in-electric",
    url: "https://dialedinelectric.com",
    fallback: null,
  },
  {
    slug: "sbe-hyde-lounge",
    url: "https://www.sbe.com/nightlife/hyde/lounge-crypto-arena/",
    fallback: "https://www.sbe.com",
  },
  {
    slug: "on-track-performance",
    url: "https://on-track-performance.com",
    fallback: null,
  },
];

async function capture(browser, slug, url) {
  const outDir = path.join(OUT_ROOT, slug);
  const outFile = path.join(outDir, "desktop-home.png");

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Dismiss cookie banners
    for (const sel of [
      "[id*='cookie'] button",
      "[class*='cookie'] button",
      "[aria-label*='Accept']",
      "[aria-label*='accept']",
      "button:has-text('Accept')",
      "button:has-text('Got it')",
      "button:has-text('OK')",
    ]) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 })) {
          await el.click();
          await page.waitForTimeout(500);
        }
      } catch {
        // ignore
      }
    }

    await page.screenshot({ path: outFile, fullPage: false });
    console.log(`✓ ${slug} → ${outFile}`);
    return true;
  } catch (err) {
    console.error(`✗ ${slug} failed: ${err.message}`);
    return false;
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const site of SITES) {
    const ok = await capture(browser, site.slug, site.url);
    if (!ok && site.fallback) {
      console.log(`  ↳ Trying fallback: ${site.fallback}`);
      await capture(browser, site.slug, site.fallback);
    }
  }

  await browser.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
