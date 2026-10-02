/**
 * Visual QA — CesWorkspaceSignature (KXD brand signature) at 1440 / 390.
 * Does not deploy. Does not mutate production.
 *
 * Usage: npx tsx scripts/qa-ces-workspace-signature-visual.ts
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { CesWorkspaceSignature } from "../components/ces/executive-performance/CesWorkspaceSignature";

const OUT = path.join(process.cwd(), ".qa-ces-workspace-signature");

function shell(inner: string): string {
  const ces = fs.readFileSync(
    path.join(process.cwd(), "design-system/ces/styles/kxd-ces.css"),
    "utf8",
  );
  const os = fs.readFileSync(
    path.join(process.cwd(), "design-system/os/styles/kxd-os.css"),
    "utf8",
  );
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KXD Workspace Signature QA</title>
  <style>
    ${os}
    ${ces}
    body { margin: 0; background: var(--kxd-os-bg-canvas, #f4f1ea); }
    .qa-frame { min-height: 100dvh; padding: 2rem 1.5rem 3rem; max-width: 48rem; margin: 0 auto; }
    .qa-spacer {
      height: 8rem;
      border: 1px dashed color-mix(in srgb, var(--kxd-os-text-faint) 35%, transparent);
      border-radius: 8px;
      margin-bottom: 0.5rem;
      display: grid;
      place-items: center;
      color: var(--kxd-os-text-faint);
      font: 500 0.75rem/1.3 var(--kxd-os-font-sans);
    }
  </style>
</head>
<body>
  <div class="kxd-ces-app qa-frame">
    <div class="qa-spacer">Client workspace content above</div>
    ${inner}
  </div>
</body>
</html>`;
}

async function main() {
  fs.mkdirSync(path.join(OUT, "screenshots"), { recursive: true });
  const html = shell(renderToStaticMarkup(React.createElement(CesWorkspaceSignature)));
  fs.writeFileSync(path.join(OUT, "signature.html"), html, "utf8");

  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("No address");
  const base = `http://127.0.0.1:${addr.port}`;

  const browser = await chromium.launch({ headless: true });
  const report: Record<string, unknown> = { generatedAt: new Date().toISOString(), pages: [] };

  for (const width of [1440, 390] as const) {
    const page = await browser.newPage({
      viewport: { width, height: width === 1440 ? 900 : 844 },
    });
    await page.goto(`${base}/`, { waitUntil: "networkidle" });

    const checks = await page.evaluate(`(() => {
      const mark = document.querySelector(".kxd-ces-exec__signature-mark");
      const line = document.querySelector(".kxd-ces-exec__signature-line");
      const name = document.querySelector(".kxd-ces-exec__signature-name");
      const quiet = document.querySelector(".kxd-ces-exec__signature-line--quiet");
      const box = mark ? mark.getBoundingClientRect() : null;
      return {
        markTag: mark ? mark.tagName.toLowerCase() : null,
        markWidth: box ? Math.round(box.width) : 0,
        markHeight: box ? Math.round(box.height) : 0,
        lineText: line ? line.textContent.trim() : null,
        nameText: name ? name.textContent.trim() : null,
        hasDesignedBy: Boolean(quiet && /Designed by/i.test(quiet.textContent || "")),
        hasDuplicateManaged: (document.body.innerText.match(/Managed by/gi) || []).length,
        hasBrokenImgIcon: Boolean(document.querySelector("img.kxd-ces-exec__signature-mark")),
      };
    })()`);

    const shot = path.join(OUT, "screenshots", `signature-${width}.png`);
    await page.locator(".kxd-ces-exec__signature").screenshot({ path: shot });
    (report.pages as unknown[]).push({ width, checks, screenshot: shot });
    await page.close();
  }

  await browser.close();
  server.close();
  fs.writeFileSync(path.join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const pages = report.pages as Array<{ checks: { markWidth: number; hasBrokenImgIcon: boolean; hasDesignedBy: boolean } }>;
  for (const p of pages) {
    if (p.checks.hasBrokenImgIcon) throw new Error("Broken img still present");
    if (p.checks.markWidth < 24) throw new Error("Mark too small / missing");
    if (p.checks.hasDesignedBy) throw new Error("Designed by line still present");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
