/**
 * Founder Hybrid — restricted staff browser QA (local SQLite + localhost only).
 *
 *   QA_BASE_URL=http://localhost:3014 npx tsx scripts/verify-founder-hybrid-staff-browser.ts
 *
 * Requires `qa-bds-restricted@localhost.invalid` in the active QA DB (same password
 * as the demo operator seed). Does not log credentials.
 */
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";

const BASE_URL = (process.env.QA_BASE_URL?.trim() || "http://localhost:3014").replace(/\/$/, "");
const STAFF_EMAIL = "qa-bds-restricted@localhost.invalid";

async function login(page: Page, email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, "staff QA login");
  const token = res.headers.get("set-cookie")?.match(/payload-token=([^;]+)/)?.[1];
  assert.ok(token, "payload-token cookie");
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

async function expectRedirectAwayFrom(page: Page, path: string, forbidden: RegExp): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(300);
  const url = page.url();
  assert.ok(!forbidden.test(url), `expected staff blocked from ${path}, landed ${url}`);
}

async function main() {
  if (!BASE_URL.includes("localhost") && !BASE_URL.includes("127.0.0.1")) {
    console.error("BLOCKED: staff browser QA is local-only.");
    process.exit(2);
  }

  const password = process.env.KXD_LOCAL_QA_PASSWORD?.trim();
  if (!password) {
    console.error(
      "BLOCKED: set KXD_LOCAL_QA_PASSWORD (must match isolated QA DB; never log).",
    );
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await login(page, STAFF_EMAIL, password);

  await page.goto(`${BASE_URL}/admin/operations/today`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(400);
  assert.ok(
    page.url().includes("/admin/operations/staff"),
    "restricted staff cannot land on founder Today",
  );

  const founderNav = await page.locator(".kxd-founder-sidebar__primary .kxd-founder-sidebar__link").count();
  assert.equal(founderNav, 0, "founder seven-item nav must not render for staff");

  await expectRedirectAwayFrom(page, "/admin/operations/clients", /\/admin\/operations\/clients/);
  await expectRedirectAwayFrom(page, "/admin/operations/intelligence", /\/admin\/operations\/intelligence/);
  await expectRedirectAwayFrom(page, "/admin/operations/accounts", /\/admin\/operations\/accounts/);
  await expectRedirectAwayFrom(page, "/admin/sales", /\/admin\/sales/);

  await page.goto(`${BASE_URL}/admin/operations/staff`, { waitUntil: "domcontentloaded" });
  assert.ok(page.url().includes("/admin/operations/staff"), "staff home accessible");

  await browser.close();
  console.log("Founder Hybrid restricted-staff browser QA passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});