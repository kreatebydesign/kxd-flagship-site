/**
 * Export Letter PDF + desktop/mobile screenshots from the REAL
 * PrimalLeadershipProgressReport print route (not the abbreviated fixture).
 *
 * Prerequisites: production build (`npm run build`) and a running server
 * (`npm run start`) OR pass --base=http://localhost:3000
 *
 * Run:
 *   npx tsx scripts/export-primal-leadership-progress-pdf.ts
 *   npx tsx scripts/export-primal-leadership-progress-pdf.ts --base=http://127.0.0.1:3000
 */

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(
  "/Users/kxd/Desktop/!WORKSPACE/📂 Clients/Primal Motorsports/04-Website/New-Build/primal-motorsports-rebuild/package.json",
);
// Playwright is provided by the Primal workspace install for local QA only.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require("playwright") as {
  chromium: {
    launch: () => Promise<{
      newPage: (opts?: { viewport?: { width: number; height: number } }) => Promise<{
        goto: (url: string, opts?: { waitUntil?: string; timeout?: number }) => Promise<unknown>;
        waitForSelector: (sel: string) => Promise<unknown>;
        addStyleTag: (opts: { content: string }) => Promise<unknown>;
        screenshot: (opts: { path: string; fullPage?: boolean }) => Promise<unknown>;
        locator: (sel: string) => { innerText: () => Promise<string>; count: () => Promise<number> };
        emulateMedia: (opts: { media: string }) => Promise<unknown>;
        pdf: (opts: Record<string, unknown>) => Promise<unknown>;
        evaluate: (fn: () => number) => Promise<number>;
        close: () => Promise<unknown>;
      }>;
      close: () => Promise<unknown>;
    }>;
  };
};

const OUT = path.resolve(".qa-leadership-sept-update");
const PRINT_PATH = "/primal-leadership-progress-print";

function argValue(flag: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
}

async function main() {
  const base = argValue("--base", "http://127.0.0.1:3000").replace(/\/$/, "");
  const url = `${base}${PRINT_PATH}`;
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const results: Record<string, unknown> = { url, out: OUT };

  for (const [name, width, height] of [
    ["390", 390, 844],
    ["1440", 1440, 900],
  ] as const) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForSelector(".kxd-lead-report__hero-callout-move");
    // Hide on-screen toolbar for screen QA of the document plane
    await page.addStyleTag({
      content: `
        .kxd-lead-report__toolbar { display: none !important; }
      `,
    });
    await page.screenshot({
      path: path.join(OUT, `${name}-top.png`),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(OUT, `${name}-full.png`),
      fullPage: true,
    });
    const hero = (await page.locator(".kxd-lead-report__hero-callout-move").innerText())
      .replace(/\s+/g, " ")
      .trim();
    const dataThrough = await page.locator(".kxd-lead-report__data-through").innerText();
    const workCount = await page.locator(".kxd-lead-report__work-highlight").count();
    results[name] = { hero, dataThrough, workCount };
    await page.close();
  }

  const printPage = await browser.newPage({
    viewport: { width: 1200, height: 1600 },
  });
  await printPage.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await printPage.waitForSelector(".kxd-lead-report");
  await printPage.emulateMedia({ media: "print" });
  const pdfPath = path.join(OUT, "leadership-update.pdf");
  await printPage.pdf({
    path: pdfPath,
    format: "Letter",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });

  // Per-page visual inspection via PDF.js in Chromium is unreliable;
  // re-open HTML in print media and capture tall slices after layout.
  const pageCountHint = await printPage.evaluate(() => {
    const el = document.querySelector(".kxd-lead-report");
    if (!el) return 0;
    const height = (el as HTMLElement).scrollHeight;
    // Letter content height approx 10in at 96dpi minus margins ≈ 900px usable
    return Math.max(1, Math.round(height / 980));
  });
  results.pdf = { path: pdfPath, approxPageHint: pageCountHint };

  await printPage.close();
  await browser.close();

  // Exact page count via pypdf if available
  try {
    const { execFileSync } = await import("node:child_process");
    const out = execFileSync(
      "/tmp/pdfvenv/bin/python",
      [
        "-c",
        "from pypdf import PdfReader; r=PdfReader('.qa-leadership-sept-update/leadership-update.pdf'); print(len(r.pages));\n" +
          "import sys\n" +
          "for i,p in enumerate(r.pages):\n" +
          " t=(p.extract_text() or '').strip().splitlines();\n" +
          " lines=[x.strip() for x in t if x.strip()];\n" +
          " print(f'PAGE {i+1}|' + (lines[0] if lines else '(empty)') + '|' + str(len(lines)))\n",
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    results.pdfPages = out.trim();
    console.log(out);
  } catch {
    results.pdfPages = "unavailable";
  }

  fs.writeFileSync(
    path.join(OUT, "qa-report.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
