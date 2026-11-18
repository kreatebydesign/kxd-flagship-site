/**
 * Batch 1 — authenticated operator navigation browser QA (local only).
 *
 *   QA_BASE_URL=http://localhost:3013 npx tsx scripts/verify-batch1-nav-browser.ts
 *
 * Credentials: KXD_QA_CREDENTIALS_PATH or KXD_LOCAL_QA_EMAIL + KXD_LOCAL_QA_PASSWORD
 * (never logged). Fallback: local demo operator from seed-local-audit-report-review.ts
 * when running against localhost SQLite.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const BASE_URL = (process.env.QA_BASE_URL?.trim() || "http://localhost:3013").replace(/\/$/, "");
const OUT_DIR = path.join(process.cwd(), "storage/perf/batch1-nav-performance");
const QA_META = path.join(process.cwd(), "storage/qa/batch1-qa-meta.json");

function resolveQaClientId(): string | null {
  const fromEnv = process.env.KXD_BATCH1_QA_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  if (fs.existsSync(QA_META)) {
    const meta = JSON.parse(fs.readFileSync(QA_META, "utf8")) as { clientId?: number };
    if (meta.clientId != null) return String(meta.clientId);
  }
  return null;
}

type Creds = { email: string; password: string };

function loadCreds(): Creds | null {
  const email = process.env.KXD_LOCAL_QA_EMAIL?.trim();
  const password = process.env.KXD_LOCAL_QA_PASSWORD?.trim();
  if (email && password) return { email, password };

  const filePath =
    process.env.KXD_QA_CREDENTIALS_PATH?.trim() ||
    process.env.KXD_PREVIEW_QA_CREDENTIALS_PATH?.trim() ||
    "";
  if (filePath && fs.existsSync(filePath)) {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      users?: { operator?: Creds; bds?: Creds };
    };
    const op = raw.users?.operator ?? raw.users?.bds;
    if (op?.email && op?.password) return op;
  }

  if (BASE_URL.includes("localhost") || BASE_URL.includes("127.0.0.1")) {
    return {
      email: "demo-operator@localhost.invalid",
      password: "LocalReview2026!",
    };
  }
  return null;
}

async function loginViaApi(creds: Creds): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  if (!res.ok) return false;
  const setCookie = res.headers.get("set-cookie") ?? "";
  return setCookie.includes("payload-token");
}

async function navigateTimed(page: Page, targetPath: string): Promise<number> {
  const t0 = performance.now();
  await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  return Math.round(performance.now() - t0);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const creds = loadCreds();
  if (!creds) {
    console.error("BLOCKED: no QA credentials path and not localhost demo.");
    process.exit(2);
  }

  const loginOk = await loginViaApi(creds);
  if (!loginOk) {
    console.error("BLOCKED: Payload login failed (check local DB user).");
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const loginRes = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  const token = loginRes.headers.get("set-cookie")?.match(/payload-token=([^;]+)/)?.[1];
  assert.ok(token, "payload-token after login");
  const host = new URL(BASE_URL).hostname;
  await context.addCookies([
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

  const page = await context.newPage();
  const results: Record<string, unknown> = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    auth: "local-qa",
    timingsMs: {} as Record<string, number>,
    checks: [] as { name: string; pass: boolean; detail?: string }[],
  };

  const addCheck = (name: string, pass: boolean, detail?: string) => {
    results.checks = (results.checks as { name: string; pass: boolean; detail?: string }[]).concat([
      { name, pass, detail },
    ]);
    console.log(pass ? `  ✔ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  };

  const todayMs = await navigateTimed(page, "/admin/operations/today");
  (results.timingsMs as Record<string, number>).today = todayMs;
  addCheck("Today loads authenticated", page.url().includes("/admin/operations/today"));
  const todaySidebars = await page.locator(".kxd-os-sidebar").count();
  const founderPrimaryLinks = await page.locator(".kxd-founder-sidebar__primary .kxd-founder-sidebar__link").count();
  addCheck(
    "Today uses persistent founder navigation",
    todaySidebars === 1 && founderPrimaryLinks === 7,
    `sidebars=${todaySidebars}, primary=${founderPrimaryLinks}`,
  );

  const clientsMs = await navigateTimed(page, "/admin/operations/clients");
  (results.timingsMs as Record<string, number>).clients = clientsMs;
  addCheck("Clients loads", page.url().includes("/admin/operations/clients"));
  const sidebarAfterClients = await page.locator(".kxd-os-sidebar").count();
  addCheck("Sidebar visible on Clients", sidebarAfterClients > 0);

  const clientLink = page.locator('a[href*="/admin/operations/client-command/"]').first();
  const hasClient = (await clientLink.count()) > 0;
  if (hasClient) {
    const navStart = performance.now();
    await clientLink.click();
    await page.waitForURL(/\/admin\/operations\/client-command\//, { timeout: 120_000 });
    await page.waitForLoadState("domcontentloaded");
    const clientCmdMs = Math.round(performance.now() - navStart);
    (results.timingsMs as Record<string, number>).clientCommandClick = clientCmdMs;
    addCheck("Client Command via click", page.url().includes("/admin/operations/client-command/"));
  } else {
    const directHref = page.locator('a[href^="/admin/operations/clients/"]').first();
    const qaClientId = resolveQaClientId();
    const cid =
      (await directHref.count()) > 0
        ? (await directHref.getAttribute("href"))?.split("/").filter(Boolean).pop()
        : qaClientId ?? "1";
    const navStart = performance.now();
    await page.goto(`${BASE_URL}/admin/operations/client-command/${cid}`, {
      waitUntil: "domcontentloaded",
    });
    (results.timingsMs as Record<string, number>).clientCommandDirect = Math.round(
      performance.now() - navStart,
    );
    addCheck(
      "Client Command direct navigation",
      page.url().includes("/admin/operations/client-command/"),
      hasClient ? undefined : "Portfolio empty — used client id fallback",
    );
  }

  const qaClientId = resolveQaClientId() ?? "1";
  const directWarmMs = await navigateTimed(
    page,
    `/admin/operations/client-command/${qaClientId}`,
  );
  (results.timingsMs as Record<string, number>).clientCommandDirectWarm = directWarmMs;

  const sidebars = await page.locator(".kxd-os-sidebar").count();
  addCheck("Sidebar persisted on Client Command (single)", sidebars === 1);
  const clientsNavActive = await page
    .locator('a[href="/admin/operations/clients"].kxd-founder-sidebar__link--active')
    .count();
  addCheck("Client Command highlights Clients in founder nav", clientsNavActive === 1);

  const shellStack = await page.locator(".kxd-os-shell--app").count();
  addCheck("No duplicate operation shells", shellStack === 1);

  await page.goto(`${BASE_URL}/admin/operations/clients`, { waitUntil: "domcontentloaded" });
  const remountClientId = resolveQaClientId() ?? "1";
  await page.goto(`${BASE_URL}/admin/operations/client-command/${remountClientId}`, {
    waitUntil: "domcontentloaded",
  });
  addCheck(
    "Clients → Client Command remounts chrome once",
    (await page.locator(".kxd-os-sidebar").count()) === 1,
  );

  await page.goBack({ waitUntil: "domcontentloaded" });
  addCheck("Back returns to Clients", page.url().includes("/admin/operations/clients"));

  await page.goForward({ waitUntil: "domcontentloaded" });
  addCheck("Forward returns to Client Command", page.url().includes("/admin/operations/client-command/"));

  const workMs = await navigateTimed(page, "/admin/work");
  (results.timingsMs as Record<string, number>).work = workMs;
  addCheck("Work loads", page.url().includes("/admin/work"));
  addCheck(
    "Work uses founder navigation",
    (await page.locator(".kxd-os-sidebar").count()) === 1 &&
      (await page.locator('a[href="/admin/work"].kxd-founder-sidebar__link--active').count()) === 1,
  );

  const salesMs = await navigateTimed(page, "/admin/sales");
  (results.timingsMs as Record<string, number>).sales = salesMs;
  addCheck("Sales loads", page.url().includes("/admin/sales"));
  addCheck(
    "Sales uses founder navigation",
    (await page.locator(".kxd-os-sidebar").count()) === 1 &&
      (await page.locator('a[href="/admin/sales"].kxd-founder-sidebar__link--active').count()) === 1,
  );

  const financeMs = await navigateTimed(page, "/admin/operations/accounts");
  (results.timingsMs as Record<string, number>).finance = financeMs;
  addCheck("Finance loads", page.url().includes("/admin/operations/accounts"));

  const insightsMs = await navigateTimed(page, "/admin/operations/intelligence");
  (results.timingsMs as Record<string, number>).insights = insightsMs;
  addCheck("Insights loads", page.url().includes("/admin/operations/intelligence"));

  const backTodayMs = await navigateTimed(page, "/admin/operations/today");
  (results.timingsMs as Record<string, number>).todayReturn = backTodayMs;
  addCheck("Today return loads", page.url().includes("/admin/operations/today"));
  addCheck(
    "Today workflow: primary move marker",
    (await page.locator('[data-today-primary-move="true"]').count()) >= 1,
  );
  addCheck(
    "Today workflow: quiet exits",
    (await page.locator(".kxd-founder-today__quiet-exits a").count()) >= 5,
  );

  const ritualLink = page.locator('a[href="/admin/operations/today"].kxd-exec-today__cta-link, a.kxd-exec-today__cta-link').first();
  if ((await ritualLink.count()) > 0) {
    // primary nav on Today uses OperatorNavLink when href present
  }

  await page.screenshot({
    path: path.join(OUT_DIR, `browser-qa-today-${Date.now()}.png`),
    fullPage: false,
  });

  await browser.close();

  const outPath = path.join(OUT_DIR, `browser-qa-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`\nWrote ${outPath}`);

  const failed = (results.checks as { pass: boolean }[]).filter((c) => !c.pass).length;
  if (failed > 0) {
    process.exit(1);
  }
  console.log("\nBatch 1 browser QA passed.");
}

void main();