/**
 * Batch 3C — Today visual capture (authenticated, localhost QA).
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const BASE_URL = (process.env.QA_BASE_URL?.trim() || "http://localhost:3017").replace(/\/$/, "");
const OUT_ROOT = path.join(process.cwd(), "storage/perf/batch3c-today-visual");

const VIEWPORTS = [
  { label: "desktop-1920", width: 1920, height: 1080 },
  { label: "laptop-1440", width: 1440, height: 900 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "mobile-390", width: 390, height: 844 },
] as const;

function loadCreds() {
  const email = process.env.KXD_LOCAL_QA_EMAIL?.trim();
  const password = process.env.KXD_LOCAL_QA_PASSWORD?.trim();
  if (email && password) return { email, password };
  return { email: "demo-operator@localhost.invalid", password: "LocalReview2026!" };
}

async function login(page: Page, email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  const token = res.headers.get("set-cookie")?.match(/payload-token=([^;]+)/)?.[1];
  if (!token) throw new Error("no payload-token");
  const host = new URL(BASE_URL).hostname;
  await page.context().addCookies([
    {
      name: "payload-token",
      value: token,
      domain: host,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(OUT_ROOT, stamp);
  fs.mkdirSync(outDir, { recursive: true });

  const { email, password } = loadCreds();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await login(page, email, password);

  const report: {
    capturedAt: string;
    baseUrl: string;
    files: string[];
    checks: { name: string; pass: boolean; detail?: string }[];
  } = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    files: [],
    checks: [],
  };

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/admin/operations/today`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.locator(".kxd-founder-today").waitFor({ timeout: 90_000 });

    const file = path.join(outDir, `today__${vp.label}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.files.push(file);

    const primary = await page.locator('[data-today-primary-move="true"]').count();
    const attention = await page.getByRole("heading", { name: "Needs your attention" }).count();
    const execHeaders = await page.locator(".kxd-exec-header").count();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );

    report.checks.push({
      name: `today@${vp.label}`,
      pass:
        primary >= 1 &&
        attention === 1 &&
        execHeaders <= 1 &&
        !overflow,
      detail: `primary=${primary}, attention=${attention}, execHeaders=${execHeaders}, overflow=${overflow}`,
    });
  }

  await browser.close();
  fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(report, null, 2)}\n`);

  const failed = report.checks.filter((c) => !c.pass).length;
  console.log(`Wrote ${outDir}/manifest.json`);
  if (failed > 0) {
    console.error(`Batch 3C Today visual capture FAILED (${failed})`);
    process.exit(1);
  }
  console.log("Batch 3C Today visual capture passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});