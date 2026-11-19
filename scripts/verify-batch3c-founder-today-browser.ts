/**
 * Batch 3C — Today browser interaction QA (localhost).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const BASE_URL = (process.env.QA_BASE_URL?.trim() || "http://localhost:3017").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "storage/perf/batch3c-today-visual");

type Check = { name: string; pass: boolean; detail?: string };
const checks: Check[] = [];
const jsErrors: string[] = [];

function record(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
  console.log(pass ? `  ✔ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function loadCreds() {
  if (process.env.KXD_LOCAL_QA_EMAIL && process.env.KXD_LOCAL_QA_PASSWORD) {
    return {
      email: process.env.KXD_LOCAL_QA_EMAIL.trim(),
      password: process.env.KXD_LOCAL_QA_PASSWORD.trim(),
    };
  }
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
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("pageerror", (err) => jsErrors.push(err.message));

  const { email, password } = loadCreds();
  await login(page, email, password);

  const t0 = performance.now();
  await page.goto(`${BASE_URL}/admin/operations/today`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.locator(".kxd-founder-today").waitFor({ timeout: 90_000 });
  const todayLoadMs = Math.round(performance.now() - t0);
  record("Today loads", page.url().includes("/admin/operations/today"), `${todayLoadMs}ms`);

  record(
    "Primary move visible",
    (await page.locator('[data-today-primary-move="true"]').count()) >= 1,
  );

  const why = page.getByRole("button", { name: /Why this/i });
  if ((await why.count()) > 0) {
    await why.click();
    const panel = await page.locator(".kxd-os-why-this__panel").isVisible();
    record("Why this disclosure", panel);
  } else {
    record("Why this disclosure", true, "no explainability payload (skipped)");
  }

  await page.getByRole("link", { name: /Open clients needing attention|Review client portfolio/i }).first().click();
  await page.waitForURL(/view=attention/, { timeout: 60_000 });
  record("Clients needs attention link", page.url().includes("view=attention"), page.url());

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${BASE_URL}/admin/operations/today`, { waitUntil: "domcontentloaded" });
  await page.locator(".kxd-founder-today").waitFor({ timeout: 60_000 });

  for (const ritual of [
    { label: "Focus", path: "/admin/operations/focus", sidebar: true },
    { label: "Review", path: "/admin/operations/review", sidebar: true },
    { label: "Brief", path: "/admin/operations/brief", sidebar: false },
  ]) {
    if (ritual.sidebar) {
      const link = page.locator(".kxd-os-sidebar__ritual-link", { hasText: ritual.label });
      if ((await link.count()) > 0) {
        const href = await link.first().getAttribute("href");
        if (href) {
          await page.goto(`${BASE_URL}${href}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
          record(`${ritual.label} ritual navigation`, page.url().includes(ritual.path));
        } else {
          record(`${ritual.label} ritual navigation`, false, "missing href");
        }
      } else {
        record(`${ritual.label} ritual navigation`, false, "sidebar link missing");
      }
    } else {
      await page.goto(`${BASE_URL}${ritual.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const briefOk =
        ritual.path === "/admin/operations/brief"
          ? page.url().includes("/admin/operations/today")
          : page.url().includes(ritual.path);
      record(
        `${ritual.label} ritual navigation`,
        briefOk,
        ritual.path === "/admin/operations/brief"
          ? "Brief merges to Today (home policy)"
          : "direct route",
      );
    }
    await page.goto(`${BASE_URL}/admin/operations/today`, { waitUntil: "domcontentloaded" });
    await page.locator(".kxd-founder-today").waitFor({ timeout: 60_000 });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/admin/operations/today`, { waitUntil: "domcontentloaded" });
  const toggle = page.locator(".kxd-founder-mobile-nav-toggle");
  if ((await toggle.count()) > 0) {
    await toggle.click();
    const navOpen = await page.locator("#kxd-founder-mobile-nav").isVisible();
    record("Mobile founder navigation", navOpen);
  } else {
    record("Mobile founder navigation", false, "toggle missing");
  }

  const t1 = performance.now();
  await page.goto(`${BASE_URL}/admin/operations/today`, { waitUntil: "domcontentloaded" });
  await page.locator(".kxd-founder-today").waitFor({ timeout: 60_000 });
  const todayWarmMs = Math.round(performance.now() - t1);
  record("Today warm return", true, `${todayWarmMs}ms`);

  record("No JavaScript errors", jsErrors.length === 0, jsErrors.join("; ") || "none");

  await browser.close();

  fs.mkdirSync(OUT, { recursive: true });
  const outPath = path.join(OUT, `browser-${Date.now()}.json`);
  fs.writeFileSync(
    outPath,
    `${JSON.stringify(
      { capturedAt: new Date().toISOString(), baseUrl: BASE_URL, timingsMs: { todayLoadMs, todayWarmMs }, jsErrors, checks },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${outPath}`);

  if (checks.some((c) => !c.pass)) process.exit(1);
  console.log("Batch 3C Today browser QA passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});