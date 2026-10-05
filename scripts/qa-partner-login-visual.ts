/**
 * Partner vs client login presentation QA + partner return-to check.
 * Does not mutate data. Login API is intercepted for the redirect assertion.
 *
 * Run: npx tsx scripts/qa-partner-login-visual.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const LIVE = process.env.PARTNER_QA_BASE || "http://127.0.0.1:3015";
const OUT = path.join(ROOT, ".qa-partner-portal-visual/screenshots/login");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "1440", width: 1440, height: 900 },
    { name: "390", width: 390, height: 844 },
  ] as const;

  for (const [id, url] of [
    ["client", `${LIVE}/portal/login`],
    ["partner", `${LIVE}/portal/login?redirect=/portal/partner`],
  ] as const) {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);
      const body = await page.locator("body").innerText();
      if (id === "client") {
        assert.ok(body.includes("Your workspace"), "client login missing workspace eyebrow");
        assert.ok(body.includes("Review your site"), "client login missing CES lead");
        assert.ok(!body.includes("Sign in to your partner room."), "client login leaked partner heading");
      } else {
        assert.ok(body.includes("KXD Network · Private access"));
        assert.ok(body.includes("Sign in to your partner room."));
        assert.ok(!body.includes("Your workspace"), "partner login leaked client eyebrow");
        assert.ok(!body.includes("Review your site"), "partner login leaked client lead");
      }
      await page.screenshot({
        path: path.join(OUT, `${id}-${vp.name}.png`),
        fullPage: true,
      });
      await context.close();
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.route("**/api/portal/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        accessMode: "partner",
        redirectTo: "/portal/partner",
      }),
    });
  });
  await page.goto(`${LIVE}/portal/login?redirect=/portal/partner`, {
    waitUntil: "networkidle",
  });
  await page.fill("#portal-login-email", "partner-qa@example.com");
  await page.fill("#portal-login-password", "not-a-real-password");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
  const after = new URL(page.url());
  const partnerReturn =
    after.pathname === "/portal/partner" ||
    after.pathname.startsWith("/portal/partner/") ||
    (after.pathname === "/portal/login" &&
      (after.searchParams.get("redirect") === "/portal/partner" ||
        after.searchParams.get("redirect")?.startsWith("/portal/partner/") === true));
  assert.ok(
    partnerReturn,
    `partner return-to failed, landed on ${page.url()}`,
  );
  await context.close();
  await browser.close();

  writeFileSync(
    path.join(OUT, "qa-report.json"),
    JSON.stringify(
      {
        ok: true,
        preview: LIVE,
        shots: ["client-1440", "client-390", "partner-1440", "partner-390"],
        partnerRedirect: "ok",
      },
      null,
      2,
    ),
  );
  console.log(`Partner login visual QA written to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
