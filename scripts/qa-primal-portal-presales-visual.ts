/**
 * Primal pre-sales portal visual QA — static render + Playwright screenshots.
 *
 * Does not mutate production. Does not deploy.
 *
 * Usage:
 *   npx tsx scripts/qa-primal-portal-presales-visual.ts
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { CesExecutiveReview } from "../components/ces/executive-review";
import { PRIMAL_EXECUTIVE_REVIEW_PACK } from "../lib/ces/executive-review/packs/primal-motorsports";

const OUT_DIR = path.join(process.cwd(), ".qa-primal-portal-presales");

function shellHtml(inner: string, title: string): string {
  const cesCss = fs.readFileSync(
    path.join(process.cwd(), "design-system/ces/styles/kxd-ces.css"),
    "utf8",
  );
  const osCss = fs.readFileSync(
    path.join(process.cwd(), "design-system/os/styles/kxd-os.css"),
    "utf8",
  );
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>${osCss}\n${cesCss}
    body { margin: 0; background: var(--kxd-os-bg-canvas, #f4f1ea); }
    .qa-frame { min-height: 100dvh; }
    .qa-frame__main { padding: 1.25rem 1.5rem 3rem; max-width: 78rem; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="kxd-ces-app qa-frame">
    <main class="qa-frame__main">${inner}</main>
  </div>
</body>
</html>`;
}

async function main() {
  fs.mkdirSync(path.join(OUT_DIR, "pages"), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, "screenshots"), { recursive: true });

  const reviewMarkup = renderToStaticMarkup(
    React.createElement(CesExecutiveReview, { pack: PRIMAL_EXECUTIVE_REVIEW_PACK }),
  );
  const html = shellHtml(reviewMarkup, "Primal Executive Review QA");
  const servedHtml = html.replaceAll("/migrated-assets/", "/assets/");
  const pagePath = path.join(OUT_DIR, "pages", "executive-review.html");
  fs.writeFileSync(pagePath, servedHtml, "utf8");

  const server = http.createServer((req, res) => {
    const url = req.url?.split("?")[0] || "/";
    if (url === "/" || url === "/executive-review") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(servedHtml);
      return;
    }
    if (url.startsWith("/assets/")) {
      const rel = url.replace("/assets/", "migrated-assets/");
      const file = path.join(process.cwd(), "public", rel);
      if (!fs.existsSync(file)) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const type =
        ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".png"
            ? "image/png"
            : "application/octet-stream";
      res.writeHead(200, { "content-type": type });
      fs.createReadStream(file).pipe(res);
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("No server address");
  const base = `http://127.0.0.1:${addr.port}`;

  const browser = await chromium.launch({ headless: true });
  const report: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    pages: [],
  };

  for (const width of [1440, 390] as const) {
    const page = await browser.newPage({
      viewport: { width, height: width === 1440 ? 900 : 844 },
      userAgent:
        width === 390
          ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    await page.goto(`${base}/executive-review`, { waitUntil: "networkidle" });

    const heroComputed = await page.evaluate(`(() => {
      const brand = document.querySelector(".kxd-ces-review__brand");
      const lead = document.querySelector(".kxd-ces-review__lead");
      const eyebrow = document.querySelector(".kxd-ces-review__eyebrow");
      function read(el) {
        if (!el) return null;
        const s = getComputedStyle(el);
        return { color: s.color, fontSize: s.fontSize, fontWeight: s.fontWeight };
      }
      return {
        brand: read(brand),
        lead: read(lead),
        eyebrow: read(eyebrow),
      };
    })()`);

    const shot = path.join(OUT_DIR, "screenshots", `executive-review-${width}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    const shotFull = path.join(
      OUT_DIR,
      "screenshots",
      `executive-review-${width}-full.png`,
    );
    await page.screenshot({ path: shotFull, fullPage: true });

    (report.pages as unknown[]).push({
      route: "/portal/executive-review",
      width,
      screenshots: [shot, shotFull],
      heroComputed,
    });
    await page.close();
  }

  await browser.close();
  server.close();

  const reportPath = path.join(OUT_DIR, "qa-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, outDir: OUT_DIR, reportPath }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
