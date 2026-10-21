/**
 * Browser QA for Staff Time on Vercel Preview (PR #90+).
 * Uses local credentials file from seed-preview-staff-time-qa (never log passwords).
 *
 *   PREVIEW_BASE_URL=https://kxd-flagship-site-git-... npx tsx scripts/verify-preview-staff-time-playwright-qa.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const CREDENTIALS_PATH =
  process.env.KXD_QA_CREDENTIALS_PATH?.trim() ||
  process.env.KXD_PREVIEW_QA_CREDENTIALS_PATH?.trim() ||
  "/tmp/kxd-preview-qa-credentials.json";

const BASE_URL =
  process.env.QA_BASE_URL?.trim() ||
  process.env.PREVIEW_BASE_URL?.trim() ||
  "https://kxd-flagship-site-git-fix-b1-staff-time-portal-auth-ui-kxd.vercel.app";

const VERCEL_BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() || "";

const OUT_DIR = path.resolve(
  process.env.KXD_PREVIEW_QA_SCREENSHOT_DIR?.trim() ||
    path.join(process.cwd(), "storage/qa-screenshots/pr90-staff-time"),
);

type Creds = {
  users: {
    bds: { email: string; password: string };
    operator: { email: string; password: string };
  };
};

function loadCreds(): Creds {
  const raw = fs.readFileSync(CREDENTIALS_PATH, "utf8");
  return JSON.parse(raw) as Creds;
}

function extraHeaders(): Record<string, string> {
  return VERCEL_BYPASS
    ? { "x-vercel-protection-bypass": VERCEL_BYPASS }
    : {};
}

async function adminLogin(page: Page, email: string, password: string): Promise<void> {
  const loginRes = await page.request.post(`${BASE_URL}/api/users/login`, {
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders(),
    },
    data: { email, password },
  });
  if (!loginRes.ok()) {
    const body = await loginRes.text();
    throw new Error(
      `API login failed (${loginRes.status()}). Vercel Deployment Protection may block automation — set VERCEL_AUTOMATION_BYPASS_SECRET or run with QA_BASE_URL=http://localhost:3000. ${body.slice(0, 200)}`,
    );
  }
  const jarCookies = await page.request.storageState();
  await page.context().addCookies(
    jarCookies.cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite as "Lax" | "None" | "Strict",
    })),
  );
  await page.goto(`${BASE_URL}/admin/operations/staff/time`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(2000);
}

async function screenshot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`[KXD QA] screenshot: ${file}`);
}

async function apiJson(
  page: Page,
  method: string,
  apiPath: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  return await page.evaluate(
    async ({ method, apiPath, body }) => {
      const res = await fetch(apiPath, {
        method,
        credentials: "include",
        headers: body
          ? { "Content-Type": "application/json", "Idempotency-Key": `qa-${Date.now()}` }
          : { "Idempotency-Key": `qa-${Date.now()}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { status: res.status, json };
    },
    { method, apiPath, body },
  );
}

async function runBdsFlow(page: Page, creds: Creds, viewportLabel: string): Promise<void> {
  await page.setViewportSize(
    viewportLabel === "mobile" ? { width: 390, height: 844 } : { width: 1280, height: 800 },
  );
  await adminLogin(page, creds.users.bds.email, creds.users.bds.password);
  await screenshot(page, `${viewportLabel}-time-clock-initial`);

  const startBtn = page.getByRole("button", { name: /^start shift$/i });
  await startBtn.click();
  await page.waitForTimeout(1500);
  const errorAlert = page.getByRole("alert");
  if (await errorAlert.isVisible().catch(() => false)) {
    const text = await errorAlert.innerText();
    throw new Error(`Start shift failed on UI: ${text}`);
  }
  await expectVisible(page, page.getByText(/on the clock/i));
  await screenshot(page, `${viewportLabel}-time-clock-active`);

  await page.reload({ waitUntil: "networkidle" });
  await expectVisible(page, page.getByText(/on the clock/i));
  await screenshot(page, `${viewportLabel}-time-clock-after-refresh`);

  const dup = await apiJson(page, "POST", "/api/admin/staff/time/shift/start", {
    workIntent: { category: "meeting" },
  });
  assert.equal(dup.status, 409, "duplicate start should 409");

  const endBtn = page.getByRole("button", { name: /^end shift$/i });
  await endBtn.click();
  await page.waitForTimeout(1500);
  await expectVisible(page, page.getByRole("button", { name: /^start shift$/i }));
  await screenshot(page, `${viewportLabel}-time-clock-history`);

  const oversight = await apiJson(page, "GET", "/api/admin/staff/time/oversight/active");
  assert.equal(oversight.status, 403, "BDS oversight API should 403");
}

async function expectVisible(page: Page, locator: ReturnType<Page["getByText"]>): Promise<void> {
  await locator.first().waitFor({ state: "visible", timeout: 30_000 });
}

async function runOperatorSmoke(page: Page, creds: Creds): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 800 });
  await adminLogin(page, creds.users.operator.email, creds.users.operator.password);
  const oversight = await apiJson(page, "GET", "/api/admin/staff/time/oversight/active");
  assert.equal(oversight.status, 200, "operator oversight API should 200");
  assert.equal(oversight.json.success, true);
  await page.goto(`${BASE_URL}/admin/operations/staff/oversight`, { waitUntil: "networkidle" });
  await screenshot(page, "desktop-operator-oversight");
}

async function main(): Promise<void> {
  const creds = loadCreds();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: extraHeaders(),
  });
  const page = await context.newPage();

  try {
    await runBdsFlow(page, creds, "desktop");
    await context.clearCookies();
    await runBdsFlow(page, creds, "mobile");
    await context.clearCookies();
    await runOperatorSmoke(page, creds);
    console.log("verify-preview-staff-time-playwright-qa: OK");
    console.log(`[KXD QA] base: ${BASE_URL}`);
    console.log(`[KXD QA] screenshots: ${OUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
