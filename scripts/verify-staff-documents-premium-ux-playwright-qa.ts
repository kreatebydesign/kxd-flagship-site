/**
 * Staff Documents premium UX — authenticated Preview browser QA (PR #111+).
 *
 *   VERCEL_DEPLOYMENT_ID=dpl_… \
 *   QA_BASE_URL=https://kxd-flagship-site-git-feat-staff-documents-premium-ux-kxd.vercel.app \
 *   KXD_PREVIEW_QA_CREDENTIALS_PATH=/tmp/kxd-preview-qa-credentials.json \
 *   npm run verify:staff-documents-premium-ux-playwright-qa
 *
 * Credentials: preview QA BDS user (see docs/KXD-OS-PREVIEW-DATABASE.md). Never commit the file.
 * Does not submit signatures or acknowledgments.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { KXD_AGREEMENT_LOGO_PUBLIC_PATH } from "../lib/agreement-presentation/tokens.ts";
import {
  extractPayloadTokenCookie,
  resolveVercelProtectionBypass,
  vercelDeploymentCurl,
} from "./lib/vercel-deployment-curl.ts";

const CREDENTIALS_PATH =
  process.env.KXD_PREVIEW_QA_CREDENTIALS_PATH?.trim() ||
  process.env.KXD_QA_CREDENTIALS_PATH?.trim() ||
  "/tmp/kxd-preview-qa-credentials.json";

const DEPLOYMENT =
  process.env.VERCEL_DEPLOYMENT_ID?.trim() || "dpl_3WSGnSp1EMCr37YRaqUCaxYWhFKQ";

const BASE_URL =
  process.env.QA_BASE_URL?.trim() ||
  process.env.PREVIEW_BASE_URL?.trim() ||
  "https://kxd-flagship-site-git-feat-staff-documents-premium-ux-kxd.vercel.app";

const OUT_DIR = path.resolve(
  process.env.KXD_STAFF_DOC_QA_SCREENSHOT_DIR?.trim() ||
    path.join(process.cwd(), "storage/qa-screenshots/pr111-staff-documents-premium-ux"),
);

const VIEWPORTS = [
  { label: "mobile-390", width: 390, height: 844 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "desktop-1440", width: 1440, height: 900 },
] as const;

type Creds = {
  users: {
    bds: { email: string; password: string };
    operator?: { email: string; password: string };
  };
};

function loadCreds(): Creds {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `STAFF_DOC_QA_AUTH_REQUIRED: missing credentials at ${CREDENTIALS_PATH}. ` +
        "Run seed:preview-staff-time-qa on preview-kxd-os or set KXD_PREVIEW_QA_CREDENTIALS_PATH.",
    );
  }
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8")) as Creds;
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
  await context.addCookies([
    {
      name: "payload-token",
      value: token,
      domain: hostFromBaseUrl(),
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

async function screenshot(page: Page, name: string): Promise<string> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`[staff-doc QA] screenshot: ${file}`);
  return file;
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  assert.ok(overflow <= 2, `horizontal overflow ${overflow}px`);
}

async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function assertListNoDuplicatePending(page: Page): Promise<void> {
  const attentionLinks = await page
    .locator('section[aria-label="Needs your attention"] a.kxd-staff-doc-list__link')
    .all();
  const onFileLinks = await page
    .locator('section:not([aria-label="Needs your attention"]) a.kxd-staff-doc-list__link')
    .all();
  const attentionHrefs = new Set<string>();
  for (const link of attentionLinks) {
    const href = await link.getAttribute("href");
    if (href) attentionHrefs.add(href);
  }
  for (const link of onFileLinks) {
    const href = await link.getAttribute("href");
    if (href && attentionHrefs.has(href)) {
      throw new Error(`Duplicate document row in On file: ${href}`);
    }
  }
}

async function captureList(page: Page, viewport: (typeof VIEWPORTS)[number]): Promise<void> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE_URL}/admin/operations/staff/documents`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  assert.ok(!page.url().includes("/admin/login"), "expected authenticated staff documents list");
  await page.getByRole("heading", { name: /policies and agreements/i }).waitFor({ timeout: 30_000 });
  await assertNoHorizontalOverflow(page);
  await assertListNoDuplicatePending(page);
  await screenshot(page, `${viewport.label}-documents-list`);

  const reviewCta = page.locator(".kxd-staff-doc-list__cta", { hasText: /review & (sign|acknowledge)/i });
  const pendingSection = page.locator('section[aria-label="Needs your attention"]');
  if ((await pendingSection.count()) > 0) {
    assert.ok((await reviewCta.count()) > 0, "pending list should show Review & sign/acknowledge CTA");
  }
}

async function captureDetail(page: Page, viewport: (typeof VIEWPORTS)[number]): Promise<void> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE_URL}/admin/operations/staff/documents`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  const firstLink = page.locator("a.kxd-staff-doc-list__link").first();
  if ((await firstLink.count()) === 0) {
    console.log("[staff-doc QA] no documents assigned — skipping detail captures");
    return;
  }
  await firstLink.click();
  await page.waitForURL(/\/admin\/operations\/staff\/documents\/\d+/, { timeout: 60_000 });
  await page.getByRole("heading", { name: /review document/i }).waitFor({ timeout: 30_000 });

  const logo = page.locator(`img.kxd-agreement-doc__logo[src="${KXD_AGREEMENT_LOGO_PUBLIC_PATH}"]`);
  assert.ok((await logo.count()) > 0, "official KXD agreement logo must be present");

  const scroll = page.locator(".kxd-staff-doc-review .kxd-agreement-doc-card__scroll");
  assert.ok((await scroll.count()) > 0, "agreement scroll region expected");
  await scroll.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(400);

  await assertNoHorizontalOverflow(page);
  await screenshot(page, `${viewport.label}-document-detail-scrolled`);

  const consentBoxes = page.locator('.kxd-staff-doc-consent input[type="checkbox"]');
  if ((await consentBoxes.count()) > 0) {
    for (const box of await consentBoxes.all()) {
      assert.equal(await box.isChecked(), false, "consent checkboxes must not be pre-checked");
      const id = await box.getAttribute("id");
      assert.ok(id, "checkbox must have id for label association");
      const label = page.locator(`label[for="${id}"]`);
      assert.ok((await label.count()) > 0, `label[for=${id}] expected`);
    }
    await consentBoxes.first().focus();
    await page.keyboard.press("Tab");
  }
}

async function assertSecurityScope(page: Page): Promise<void> {
  const oversight = await page.evaluate(async () => {
    const res = await fetch("/api/admin/staff/documents/operator/assign", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return res.status;
  });
  assert.ok(oversight === 403 || oversight === 401, `BDS operator assign should be denied (${oversight})`);
}

async function main(): Promise<void> {
  const creds = loadCreds();
  const bypass = await resolveVercelProtectionBypass(DEPLOYMENT);
  assert.ok(bypass.length > 8, "protection bypass resolved");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = await collectConsoleErrors(page);

  try {
    await seedSessionCookies(context, bypass, creds.users.bds.email, creds.users.bds.password);

    for (const viewport of VIEWPORTS) {
      await captureList(page, viewport);
    }
    for (const viewport of VIEWPORTS) {
      await captureDetail(page, viewport);
    }

    await assertSecurityScope(page);

    const severe = consoleErrors.filter(
      (e) => !/favicon|404.*\.map|Failed to load resource.*404/i.test(e),
    );
    if (severe.length > 0) {
      console.warn("[staff-doc QA] console errors:", severe.slice(0, 8));
    }

    const report = {
      deployment: DEPLOYMENT,
      baseUrl: BASE_URL,
      screenshotsDir: OUT_DIR,
      viewports: VIEWPORTS.map((v) => v.label),
      consoleErrorCount: severe.length,
    };
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, "qa-report.json"), JSON.stringify(report, null, 2));
    console.log("verify:staff-documents-premium-ux-playwright-qa: OK");
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
