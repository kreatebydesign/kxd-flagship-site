/**
 * B1 + Staff guided work — authenticated Preview screenshots.
 *
 *   VERCEL_DEPLOYMENT_ID=dpl_… npm run verify:b1-staff-release-playwright-qa
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import {
  extractPayloadTokenCookie,
  resolveVercelProtectionBypass,
  vercelDeploymentCurl,
} from "./lib/vercel-deployment-curl.ts";

const CREDENTIALS_PATH =
  process.env.KXD_QA_CREDENTIALS_PATH?.trim() ||
  process.env.KXD_PREVIEW_QA_CREDENTIALS_PATH?.trim() ||
  "/tmp/kxd-preview-qa-credentials.json";

const DEPLOYMENT = process.env.VERCEL_DEPLOYMENT_ID?.trim() || "";

const BASE_URL = process.env.QA_BASE_URL?.trim() || process.env.PREVIEW_BASE_URL?.trim() || "";

const OUT_DIR = path.resolve(
  process.env.KXD_B1_QA_SCREENSHOT_DIR?.trim() ||
    path.join(process.cwd(), "storage/qa-screenshots/b1-staff-release"),
);

const WORK_GUIDED_SAMPLES = [
  { id: 46, slug: "work-46-guided" },
  { id: 47, slug: "work-47-acceptance" },
] as const;

type Creds = {
  users: {
    bds: { email: string; password: string };
  };
};

function loadCreds(): Creds {
  const raw = fs.readFileSync(CREDENTIALS_PATH, "utf8");
  return JSON.parse(raw) as Creds;
}

function hostFromBaseUrl(): string {
  return new URL(BASE_URL).hostname;
}

async function seedSessionCookies(
  context: BrowserContext,
  bypass: string,
  email: string,
  password: string,
): Promise<void> {
  const login = await vercelDeploymentCurl(DEPLOYMENT, "/api/users/login", {
    method: "POST",
    includeHeaders: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200, "Preview QA login should succeed");
  const token = extractPayloadTokenCookie(login.headers["set-cookie"]);
  assert.ok(token, "payload-token cookie expected after login");
  const hostname = hostFromBaseUrl();
  await context.addCookies([
    {
      name: "payload-token",
      value: token,
      domain: hostname,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await context.setExtraHTTPHeaders({
    "x-vercel-protection-bypass": bypass,
  });
}

async function screenshot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`[KXD B1 QA] screenshot: ${file}`);
}

async function ensureNoActiveShift(page: Page): Promise<void> {
  const res = await page.evaluate(async () => {
    const r = await fetch("/api/admin/staff/time/shift/current", { credentials: "include" });
    const json = (await r.json()) as { shift?: unknown };
    if (json.shift) {
      await fetch("/api/admin/staff/time/shift/end", {
        method: "POST",
        credentials: "include",
        headers: { "Idempotency-Key": `qa-end-${Date.now()}` },
      });
    }
    return Boolean(json.shift);
  });
  if (res) await page.waitForTimeout(1500);
}

async function captureTimeClock(page: Page, viewport: "desktop" | "mobile"): Promise<void> {
  const size =
    viewport === "mobile" ? { width: 390, height: 844 } : { width: 1280, height: 900 };
  await page.setViewportSize(size);
  await page.goto(`${BASE_URL}/admin/operations/staff/time`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await ensureNoActiveShift(page);
  await page.reload({ waitUntil: "networkidle" });
  await screenshot(page, `${viewport}-time-clock-form`);

  const intentSelect = page.locator(".kxd-os-staff-time__form select").first();
  const value = await intentSelect.inputValue();
  if (value !== "assigned_kxd_work") {
    await intentSelect.selectOption("assigned_kxd_work");
  }
  await screenshot(page, `${viewport}-time-clock-assigned-work`);

  const startBtn = page.getByRole("button", { name: /^start shift$/i });
  const disabled = await startBtn.isDisabled();
  if (!disabled) {
    await startBtn.click();
    await page.getByText(/on the clock/i).first().waitFor({ state: "visible", timeout: 45_000 });
    await screenshot(page, `${viewport}-time-clock-active`);
    await page.getByRole("button", { name: /^end shift$/i }).click();
    await page.getByRole("button", { name: /^start shift$/i }).waitFor({ state: "visible" });
  }
}

async function captureGuidedWork(page: Page, workId: number, slug: string): Promise<void> {
  await page.goto(`${BASE_URL}/admin/operations/staff/work/${workId}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await screenshot(page, `desktop-${slug}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot(page, `mobile-${slug}`);
  await page.setViewportSize({ width: 1280, height: 900 });
}

async function main(): Promise<void> {
  assert.ok(BASE_URL, "Set QA_BASE_URL or PREVIEW_BASE_URL");
  assert.ok(DEPLOYMENT, "Set VERCEL_DEPLOYMENT_ID for protection bypass");

  const creds = loadCreds();
  const bypass = await resolveVercelProtectionBypass(DEPLOYMENT);
  assert.ok(bypass.length > 8, "protection bypass resolved");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await seedSessionCookies(context, bypass, creds.users.bds.email, creds.users.bds.password);
    await captureTimeClock(page, "desktop");
    await captureTimeClock(page, "mobile");
    for (const sample of WORK_GUIDED_SAMPLES) {
      await captureGuidedWork(page, sample.id, sample.slug);
    }
    console.log("verify-b1-staff-release-playwright-qa: OK");
    console.log(`[KXD B1 QA] screenshots: ${OUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
