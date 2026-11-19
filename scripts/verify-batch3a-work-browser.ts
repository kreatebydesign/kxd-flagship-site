/**
 * Batch 3A — Work + Clients interaction QA (localhost QA only).
 *
 *   QA_BASE_URL=http://localhost:3015 KXD_LOCAL_QA_EMAIL=... KXD_LOCAL_QA_PASSWORD=... \
 *     npx tsx scripts/verify-batch3a-work-browser.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const BASE_URL = (process.env.QA_BASE_URL?.trim() || "http://localhost:3015").replace(/\/$/, "");
const OUT = path.join(process.cwd(), "storage/perf/batch3a-visual");

type Check = { name: string; pass: boolean; detail?: string };

const checks: Check[] = [];

function record(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
  console.log(pass ? `  ✔ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
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
    return { email: "demo-operator@localhost.invalid", password: "LocalReview2026!" };
  }
  return null;
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
  if (!creds) {
    console.error("BLOCKED: no local QA credentials available");
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await login(page, creds.email, creds.password);

  await page.goto(`${BASE_URL}/admin/operations/clients`, { waitUntil: "networkidle" });
  await page.locator(".kxd-founder-clients").waitFor({ timeout: 60_000 });
  const quickActions = await page.locator(".kxd-os-quick-action-bar").count();
  record("Clients: no quick action matrix", quickActions === 0, `count=${quickActions}`);
  const mrrLabel = await page.getByText("Portfolio MRR").count();
  const mrrValue = await page.locator(".kxd-founder-metric__value").count();
  record(
    "Clients: portfolio MRR visible",
    mrrLabel >= 1 && mrrValue >= 1,
    `label=${mrrLabel}, values=${mrrValue}`,
  );
  const workspace = page.locator('a[href*="/admin/operations/client-command/"]').first();
  record("Clients: workspace link present", (await workspace.count()) >= 1);
  await workspace.click();
  await page.waitForURL(/\/admin\/operations\/client-command\//, { timeout: 120_000 });
  await page.waitForLoadState("domcontentloaded");
  record("Clients: Client Command navigation", page.url().includes("/client-command/"));
  const shells = await page.locator(".kxd-os-shell--app").count();
  record("Client Command: single app shell", shells === 1, `shells=${shells}`);

  await page.goto(`${BASE_URL}/admin/work`, { waitUntil: "domcontentloaded" });
  const execHeaders = await page.locator(".kxd-exec-header").count();
  record("Work: single executive header", execHeaders <= 1, `execHeaders=${execHeaders}`);
  const views = page.locator(".kxd-os-work-engine__views");
  record("Work: view strip renders", (await views.count()) === 1);
  await page.getByRole("button", { name: /Overdue/ }).click();
  await page.waitForTimeout(300);
  const overdueActive = await page.locator(".kxd-os-work-engine__view--active").filter({ hasText: "Overdue" }).count();
  record("Work: Overdue view switch", overdueActive === 1, `active=${overdueActive}`);
  await page.getByRole("button", { name: "Filters" }).click();
  await page.waitForTimeout(300);
  const filtersOpen = await page.locator(".kxd-os-work-engine__filters-panel").count();
  record("Work: filters panel opens", filtersOpen >= 1, `panels=${filtersOpen}`);
  const createTrigger = page.getByRole("button", { name: /Create work/i }).or(page.locator("text=Create work").first());
  if ((await createTrigger.count()) > 0) {
    await createTrigger.first().click();
    await page.waitForTimeout(400);
    const composer = await page.locator("[data-kxd-work-composer], .kxd-os-work-composer").count();
    record(
      "Work: composer trigger responds",
      composer >= 1 || (await page.locator("dialog, [role='dialog']").count()) >= 1,
      `composerNodes=${composer}`,
    );
  } else {
    record("Work: composer trigger responds", false, "Create work control not found");
  }

  await browser.close();

  fs.mkdirSync(OUT, { recursive: true });
  const outPath = path.join(OUT, `work-browser-${Date.now()}.json`);
  fs.writeFileSync(
    outPath,
    `${JSON.stringify({ capturedAt: new Date().toISOString(), baseUrl: BASE_URL, checks }, null, 2)}\n`,
  );
  console.log(`Wrote ${outPath}`);

  const failed = checks.filter((c) => !c.pass).length;
  if (failed > 0) process.exit(1);
  console.log("Batch 3A work/clients interaction QA passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});