/**
 * Export Letter PDF + per-page PNG QA from the dedicated
 * PrimalLeadershipProgressReport print route.
 *
 * Prerequisites: production build (`npm run build`) and a running server
 * (`npm run start`) OR pass --base=http://localhost:3000
 *
 * Run:
 *   npx tsx scripts/export-primal-leadership-progress-pdf.ts
 *   npx tsx scripts/export-primal-leadership-progress-pdf.ts --base=http://127.0.0.1:3000
 */

import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function resolvePlaywright(): {
  chromium: {
    launch: (opts?: { headless?: boolean }) => Promise<{
      newPage: (opts?: { viewport?: { width: number; height: number } }) => Promise<{
        goto: (url: string, opts?: { waitUntil?: string; timeout?: number }) => Promise<unknown>;
        waitForSelector: (sel: string, opts?: { timeout?: number }) => Promise<unknown>;
        addStyleTag: (opts: { content: string }) => Promise<unknown>;
        screenshot: (opts: {
          path: string;
          fullPage?: boolean;
          type?: string;
        }) => Promise<unknown>;
        emulateMedia: (opts: { media: string }) => Promise<unknown>;
        pdf: (opts: Record<string, unknown>) => Promise<Buffer>;
        evaluate: <T>(fn: () => T) => Promise<T>;
        close: () => Promise<unknown>;
      }>;
      close: () => Promise<unknown>;
    }>;
  };
} {
  const candidates = [
    path.resolve(process.cwd(), "node_modules/playwright"),
    "/Users/kxd/Desktop/!WORKSPACE/📂 Clients/Primal Motorsports/04-Website/New-Build/primal-motorsports-rebuild/node_modules/playwright",
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(path.join(candidate, "package.json"))) continue;
    const require = createRequire(pathToFileURL(path.join(candidate, "package.json")).href);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(candidate) as ReturnType<typeof resolvePlaywright>;
  }
  throw new Error(
    "Playwright not found. Install in this repo or keep the Primal local QA install available.",
  );
}

const { chromium } = resolvePlaywright();

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

  const browser = await chromium.launch({ headless: true });
  const results: Record<string, unknown> = { url, out: OUT };

  const printPage = await browser.newPage({
    viewport: { width: 1200, height: 1600 },
  });
  await printPage.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await printPage.waitForSelector(".kxd-lead-report--progress", { timeout: 60_000 });
  await printPage.emulateMedia({ media: "print" });

  const pdfPath = path.join(OUT, "leadership-update.pdf");
  await printPage.pdf({
    path: pdfPath,
    format: "Letter",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });

  const contextCopy = await printPage.evaluate(() => {
    const root = document.querySelector(".kxd-lead-report--progress");
    const text = (root?.textContent ?? "").replace(/\s+/g, " ");
    return {
      hasCurrent5:
        text.includes("Current verified Search window") &&
        text.includes("Verified Search conversions") &&
        text.includes("Latest verified Search reporting window"),
      hasPrior6:
        text.includes("Prior verified period") &&
        text.includes("Primary conversions") &&
        text.includes("Aug 12 – Sep 10, 2026") &&
        text.includes("5 website leads · 1 direct call"),
      hasHistorical29:
        text.includes("Historical Ads context") &&
        text.includes("Google Ads conversions recorded") &&
        text.includes("Mar 31 – Jul 20, 2026") &&
        text.includes("16 Search · 13 Demand Gen"),
      hasDisclosure:
        text.includes("must not be added together") &&
        text.includes(
          "should not be interpreted as 29 independently verified customer leads",
        ),
      hasSpend: text.includes("$2,401.20"),
      hasCpa: text.includes("approximately $480"),
      hasBudget: text.includes("$90/day"),
      title: document.title,
      includesFive: /\b5\b/.test(text),
      includesSix: /\b6\b/.test(text),
      includesTwentyNine: /\b29\b/.test(text),
    };
  });
  results.contextCopy = contextCopy;

  await printPage.close();
  await browser.close();

  // Exact page count + text sample via pypdf
  let pageCount = 0;
  try {
    const py =
      fs.existsSync("/tmp/pdfvenv/bin/python") ? "/tmp/pdfvenv/bin/python" : "python3";
    const out = execFileSync(
      py,
      [
        "-c",
        `
from pypdf import PdfReader
r = PdfReader(${JSON.stringify(pdfPath)})
print(len(r.pages))
for i, p in enumerate(r.pages):
    t = (p.extract_text() or "").strip().splitlines()
    lines = [x.strip() for x in t if x.strip()]
    head = lines[0] if lines else "(empty)"
    print(f"PAGE {i+1}|{head}|{len(lines)}")
`,
      ],
      { encoding: "utf8" },
    );
    results.pdfPages = out.trim();
    pageCount = Number(out.trim().split("\n")[0] || 0);
    console.log(out);
  } catch (error) {
    results.pdfPages = `unavailable: ${String(error)}`;
  }

  // Render each PDF page to PNG via PyMuPDF when available
  try {
    const py =
      fs.existsSync("/tmp/pdfvenv/bin/python") ? "/tmp/pdfvenv/bin/python" : "python3";
    execFileSync(
      py,
      [
        "-c",
        `
import fitz
doc = fitz.open(${JSON.stringify(pdfPath)})
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
    pix.save(${JSON.stringify(path.join(OUT, "pdf-page-"))} + f"{i+1:02d}.png")
print(len(doc))
`,
      ],
      { encoding: "utf8" },
    );
    results.pageRenders = Array.from({ length: pageCount }, (_, i) =>
      path.join(OUT, `pdf-page-${String(i + 1).padStart(2, "0")}.png`),
    );
  } catch (error) {
    results.pageRenders = `unavailable: ${String(error)}`;
  }

  results.pdf = { path: pdfPath, pageCount };
  fs.writeFileSync(path.join(OUT, "qa-report.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  if (!contextCopy.hasCurrent5 || !contextCopy.hasPrior6 || !contextCopy.hasHistorical29) {
    throw new Error("Conversion-context copy missing from print route render");
  }
  if (!contextCopy.hasDisclosure) {
    throw new Error("Conversion-context disclosure missing from print route render");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
