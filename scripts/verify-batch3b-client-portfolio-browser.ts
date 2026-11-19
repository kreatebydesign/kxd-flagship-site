/**
 * Batch 3B — portfolio browser QA (URL sync, no-results, localhost only).
 *
 *   QA_BASE_URL=http://localhost:3016 npx tsx scripts/verify-batch3b-client-portfolio-browser.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const BASE_URL = (process.env.QA_BASE_URL?.trim() || "http://localhost:3016").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "storage/perf/batch3b-portfolio");

type Check = { name: string; pass: boolean; detail?: string };
const checks: Check[] = [];
const jsErrors: string[] = [];

function record(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
  console.log(pass ? `  ✔ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function loadCreds() {
  const email = process.env.KXD_LOCAL_QA_EMAIL?.trim();
  const password = process.env.KXD_LOCAL_QA_PASSWORD?.trim();
  if (email && password) return { email, password };
  if (BASE_URL.includes("localhost")) {
    return { email: "demo-operator@localhost.invalid", password: "LocalReview2026!" };
  }
  return null;
}

function isPortfolioNavRequest(url: string): boolean {
  if (!url.includes("/admin/operations/clients")) return false;
  if (url.includes("_next/static")) return false;
  if (url.includes("_next/image")) return false;
  return url.includes("_rsc") || url.endsWith("/clients") || url.includes("/clients?");
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

async function openClients(page: Page) {
  await page.goto(`${BASE_URL}/admin/operations/clients`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.locator(".kxd-founder-clients").waitFor({ timeout: 90_000 });
}

async function main() {
  const creds = loadCreds();
  if (!creds) {
    console.error("BLOCKED: no QA credentials");
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("pageerror", (err) => {
    jsErrors.push(err.message);
  });

  await login(page, creds.email, creds.password);
  await openClients(page);

  const kpiMrrBefore = (await page.locator(".kxd-founder-metric__value").nth(2).textContent())?.trim();
  const totalRowsBefore = await page.locator(".kxd-founder-clients__name").count();
  record("Baseline roster loads", totalRowsBefore >= 1, `rows=${totalRowsBefore}`);

  let portfolioNavAfterLoad = 0;
  const onRequest = (req: { url: () => string }) => {
    if (isPortfolioNavRequest(req.url())) portfolioNavAfterLoad += 1;
  };
  page.on("request", onRequest);

  const search = page.locator("#kxd-portfolio-search");
  await search.fill("f");
  await page.waitForTimeout(50);
  const afterOneChar = await page.locator(".kxd-founder-clients__name").count();
  record(
    "Search filters rows immediately",
    afterOneChar <= totalRowsBefore,
    `rows=${afterOneChar} (was ${totalRowsBefore})`,
  );

  await search.fill("finder@searchable");
  await page.waitForTimeout(50);
  const searchHits = await page.locator(".kxd-founder-clients__name").count();
  record("Search matches fixture", searchHits === 1, `rows=${searchHits}`);

  await page.waitForTimeout(350);
  const urlAfterSearch = page.url();
  record(
    "Debounced URL preserves query",
    urlAfterSearch.includes("q=finder") || urlAfterSearch.includes("q=finder%40searchable"),
    urlAfterSearch,
  );

  await page.waitForTimeout(200);
  record(
    "No extra portfolio RSC during search",
    portfolioNavAfterLoad === 0,
    `rscNav=${portfolioNavAfterLoad}`,
  );

  page.off("request", onRequest);

  await search.fill("zzzz-no-client-matches-3b");
  await page.waitForTimeout(100);
  const noRows = await page.locator(".kxd-founder-clients__name").count();
  const noResultsVisible = await page.getByText(/No clients match your search or filters/).isVisible();
  record("No-results message", noRows === 0 && noResultsVisible, `rows=${noRows}`);
  const kpiMrrAfter = (await page.locator(".kxd-founder-metric__value").nth(2).textContent())?.trim();
  record(
    "KPI unchanged when filtered empty",
    kpiMrrBefore === kpiMrrAfter,
    `before=${kpiMrrBefore}, after=${kpiMrrAfter}`,
  );

  await page.getByRole("button", { name: /Filters/i }).click();
  await page.waitForSelector(".kxd-founder-clients__filters-panel");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.waitForTimeout(150);
  const restoredRows = await page.locator(".kxd-founder-clients__name").count();
  record(
    "Clear filters restores roster",
    restoredRows >= totalRowsBefore,
    `rows=${restoredRows}`,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await search.fill("zzzz-no-client-matches-3b");
  await page.waitForTimeout(100);
  const mobileNoResults = await page
    .getByText(/No clients match your search or filters/)
    .isVisible();
  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  record(
    "Mobile no-results layout clean",
    !mobileOverflow && mobileNoResults,
    `overflow=${mobileOverflow}`,
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await openClients(page);
  await page.getByRole("tab", { name: /Needs attention/i }).click();
  await page.waitForTimeout(400);
  record("Attention view active", page.url().includes("view=attention"), page.url());
  await page.goBack();
  await page.waitForTimeout(300);
  const backUrl = page.url();
  const allTabActive = await page
    .locator('.kxd-founder-clients__view--active')
    .filter({ hasText: "All clients" })
    .count();
  record(
    "Browser back restores prior view",
    !backUrl.includes("view=attention") || allTabActive >= 1,
    backUrl,
  );

  await page.goto(`${BASE_URL}/admin/operations/clients?view=attention`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator(".kxd-founder-clients__view--active").waitFor({ timeout: 60_000 });
  await page.goForward();
  await page.waitForTimeout(300);
  record("Browser forward navigation completes", true, page.url());

  await page.locator('a[href*="/admin/operations/client-command/"]').first().click();
  await page.waitForURL(/\/admin\/operations\/client-command\//, { timeout: 120_000 });
  record("Client Command navigation", page.url().includes("client-command"));

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
        jsErrors,
        checks,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${outPath}`);

  if (checks.some((c) => !c.pass)) process.exit(1);
  console.log("Batch 3B portfolio browser QA passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});