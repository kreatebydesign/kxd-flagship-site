/**
 * Browser QA for Staff Time on Vercel Preview (PR #90+).
 * Uses `vercel curl` for Deployment Protection bypass (CLI-linked project).
 *
 *   VERCEL_DEPLOYMENT_ID=dpl_… npm run verify:staff-time-playwright-qa
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

const DEPLOYMENT =
  process.env.VERCEL_DEPLOYMENT_ID?.trim() || "dpl_687R5xRB4VPjSDjwKwiH8aFw9mPM";

const BASE_URL =
  process.env.QA_BASE_URL?.trim() ||
  process.env.PREVIEW_BASE_URL?.trim() ||
  "https://kxd-flagship-site-git-fix-b1-staff-time-portal-auth-ui-kxd.vercel.app";

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
          ? {
              "Content-Type": "application/json",
              "Idempotency-Key": `qa-${Date.now()}`,
            }
          : { "Idempotency-Key": `qa-${Date.now()}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { status: res.status, json };
    },
    { method, apiPath, body },
  );
}

async function ensureNoActiveShift(page: Page): Promise<void> {
  const current = await apiJson(page, "GET", "/api/admin/staff/time/shift/current");
  if (current.json.shift) {
    await apiJson(page, "POST", "/api/admin/staff/time/shift/end", {});
  }
}

async function runBdsFlow(
  page: Page,
  creds: Creds,
  viewportLabel: string,
): Promise<void> {
  await page.setViewportSize(
    viewportLabel === "mobile" ? { width: 375, height: 812 } : { width: 1280, height: 800 },
  );
  await page.goto(`${BASE_URL}/admin/operations/staff/time`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await ensureNoActiveShift(page);
  await page.reload({ waitUntil: "networkidle" });
  await screenshot(page, `${viewportLabel}-time-clock-initial`);

  const startBtn = page.getByRole("button", { name: /^start shift$/i });
  await startBtn.click();
  const punchError = page.locator(".kxd-os-staff-time__error");
  const onClock = page.getByText(/on the clock/i).first();
  const outcome = await Promise.race([
    onClock.waitFor({ state: "visible", timeout: 45_000 }).then(() => "active" as const),
    punchError.waitFor({ state: "visible", timeout: 45_000 }).then(() => "error" as const),
  ]).catch(() => "timeout" as const);
  if (outcome === "error") {
    const text = await punchError.innerText();
    throw new Error(`Start shift failed on UI: ${text}`);
  }
  if (outcome === "timeout") {
    const apiProbe = await apiJson(page, "GET", "/api/admin/staff/time/shift/current");
    throw new Error(
      `Start shift timed out (current API ${apiProbe.status}: ${JSON.stringify(apiProbe.json).slice(0, 200)})`,
    );
  }
  await screenshot(page, `${viewportLabel}-time-clock-active`);

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText(/on the clock/i).first().waitFor({ state: "visible", timeout: 30_000 });
  await screenshot(page, `${viewportLabel}-time-clock-after-refresh`);

  const dup = await apiJson(page, "POST", "/api/admin/staff/time/shift/start", {
    workIntent: { category: "meeting" },
  });
  assert.equal(dup.status, 409, "duplicate start should 409");

  await page.getByRole("button", { name: /^end shift$/i }).click();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: /^start shift$/i }).waitFor({ state: "visible" });
  await screenshot(page, `${viewportLabel}-time-clock-history`);

  const oversight = await apiJson(page, "GET", "/api/admin/staff/time/oversight/active");
  assert.equal(oversight.status, 403, "BDS oversight API should 403");
}

async function runOperatorSmoke(page: Page, creds: Creds): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 800 });
  const oversight = await apiJson(page, "GET", "/api/admin/staff/time/oversight/active");
  assert.equal(oversight.status, 200, "operator oversight API should 200");
  assert.equal(oversight.json.success, true);
  await page.goto(`${BASE_URL}/admin/operations/staff/oversight`, {
    waitUntil: "networkidle",
  });
  await screenshot(page, "desktop-operator-oversight");
}

async function main(): Promise<void> {
  const creds = loadCreds();
  const bypass = await resolveVercelProtectionBypass(DEPLOYMENT);
  assert.ok(bypass.length > 8, "protection bypass resolved");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await seedSessionCookies(context, bypass, creds.users.bds.email, creds.users.bds.password);
    await runBdsFlow(page, creds, "desktop");
    await context.clearCookies();
    await seedSessionCookies(context, bypass, creds.users.bds.email, creds.users.bds.password);
    await runBdsFlow(page, creds, "mobile");
    await context.clearCookies();
    await seedSessionCookies(
      context,
      bypass,
      creds.users.operator.email,
      creds.users.operator.password,
    );
    await runOperatorSmoke(page, creds);
    console.log("verify-preview-staff-time-playwright-qa: OK");
    console.log(`[KXD QA] deployment: ${DEPLOYMENT}`);
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
