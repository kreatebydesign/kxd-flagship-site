/**
 * Batch 3D — Work interaction QA (localhost isolated DB only).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const BASE_URL = (process.env.QA_BASE_URL?.trim() || "http://localhost:3018").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "storage/perf/batch3d-work-visual");

type Check = { name: string; pass: boolean; detail?: string };

const checks: Check[] = [];

function record(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
  console.log(pass ? `  ✔ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

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
  assert.equal(res.status, 200);
  const token = res.headers.get("set-cookie")?.match(/payload-token=([^;]+)/)?.[1];
  assert.ok(token);
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
  const creds = loadCreds();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors: string[] = [];
  page.on("pageerror", (err) => jsErrors.push(String(err)));

  await login(page, creds.email, creds.password);

  const coldStart = Date.now();
  await page.goto(`${BASE_URL}/admin/work`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator(".kxd-os-work-engine--planning").waitFor({ timeout: 90_000 });
  const workLoadMs = Date.now() - coldStart;
  record("Work loads", true, `${workLoadMs}ms`);

  const clientLink = page.locator('a.kxd-os-work-engine__client--linked').first();
  record("Client link on row", (await clientLink.count()) >= 1);
  if ((await clientLink.count()) > 0) {
    const href = await clientLink.getAttribute("href");
    record("Client link uses command route", Boolean(href?.includes("/client-command/")), href ?? "");
    if (href) {
      const target = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 120_000 });
      record("Client Command opens", page.url().includes("/client-command/"), page.url());
    } else {
      record("Client Command opens", false, "missing href");
    }
  }

  await page.goto(`${BASE_URL}/admin/work`, { waitUntil: "domcontentloaded" });
  await page.locator(".kxd-os-work-engine--planning").waitFor({ timeout: 90_000 });

  await page.getByRole("button", { name: /^Overdue/i }).first().click();
  await page.waitForURL(/view=overdue/, { timeout: 10_000 }).catch(() => {});
  const overdueUrl = page.url();
  record("Overdue view in URL", overdueUrl.includes("view=overdue"), overdueUrl);

  const switchStart = Date.now();
  await page.getByRole("button", { name: /^Today/i }).first().click();
  await page.waitForTimeout(150);
  const viewSwitchMs = Date.now() - switchStart;
  record("View switch (client)", viewSwitchMs < 5000, `${viewSwitchMs}ms`);

  await page.goto(`${BASE_URL}/admin/work?view=all`, { waitUntil: "domcontentloaded" });
  await page.locator(".kxd-os-work-engine--planning").waitFor({ timeout: 60_000 });
  const firstRow = page.locator(".kxd-os-work-engine__row--3d").first();
  if ((await firstRow.count()) > 0) {
    await firstRow.click();
    await page.waitForURL(/\/admin\/work\/\d+/, { timeout: 60_000 });
    record("Work detail navigation", /\/admin\/work\/\d+/.test(page.url()), page.url());
  } else {
    record("Work detail navigation", false, "no rows");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/admin/work`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator(".kxd-os-work-engine__views-more").waitFor({ timeout: 60_000 });
  await page.locator(".kxd-os-work-engine__views-primary").waitFor({ timeout: 60_000 });
  const primaryCount = await page.locator(".kxd-os-work-engine__views-primary .kxd-os-work-engine__view").count();
  record("Mobile primary view tabs", primaryCount >= 4, `count=${primaryCount}`);
  const waitLabel = await page
    .locator(".kxd-os-work-engine__views-primary .kxd-os-work-engine__view")
    .filter({ hasText: "Waiting on client" })
    .count();
  record("Mobile Waiting on client label", waitLabel >= 1, `found=${waitLabel}`);
  const more = page.getByRole("button", { name: "More views" });
  await more.waitFor({ state: "visible", timeout: 15_000 });
  await more.click();
  await page.locator(".kxd-os-work-engine__views-menu").waitFor({ timeout: 10_000 });
  const menu = await page.locator(".kxd-os-work-engine__views-menu").count();
  record("Mobile overflow menu", menu >= 1);

  const warmStart = Date.now();
  await page.goto(`${BASE_URL}/admin/work`, { waitUntil: "domcontentloaded" });
  await page.locator(".kxd-os-work-engine--planning").waitFor({ timeout: 60_000 });
  const workWarmMs = Date.now() - warmStart;
  record("Work warm navigation", true, `${workWarmMs}ms`);

  record("No JavaScript errors", jsErrors.length === 0, jsErrors.join("; ") || "none");

  await browser.close();

  fs.mkdirSync(OUT, { recursive: true });
  const outPath = path.join(OUT, `browser-${Date.now()}.json`);
  fs.writeFileSync(
    outPath,
  `${JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        timingsMs: { workLoadMs, viewSwitchMs, workWarmMs },
        jsErrors,
        checks,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${outPath}`);

  if (checks.some((c) => !c.pass)) process.exit(1);
  console.log("Batch 3D Work browser QA passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});