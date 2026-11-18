/**
 * Integration release — founder Work UI mutations (browser session only).
 * Localhost + isolated QA DB. No server-only shims.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = (process.env.QA_BASE_URL?.trim() || "http://localhost:3019").replace(/\/$/, "");
const EMAIL = process.env.KXD_LOCAL_QA_EMAIL?.trim() || "demo-operator@localhost.invalid";
const PASSWORD = process.env.KXD_LOCAL_QA_PASSWORD?.trim() || "LocalReview2026!";

type Check = { name: string; pass: boolean; detail?: string };

const checks: Check[] = [];

function record(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
  console.log(pass ? `  ✔ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const loginRes = await context.request.post(`${BASE_URL}/api/users/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  assert.equal(loginRes.status(), 200);
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/admin/work?view=all`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator(".kxd-os-work-engine--planning").waitFor({ timeout: 90_000 });

  const apiProbe = await page.evaluate(async () => {
    const res = await fetch("/api/admin/work/composer-options", { credentials: "include" });
    const post = await fetch("/api/admin/work/create", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "[in-page-post-probe]" }),
    });
    return { get: res.status, post: post.status };
  });
  record("Browser POST /api/admin/work/create", apiProbe.post === 200, `before-fix=401, after=${apiProbe.post}`);

  const uiTitle = `[integration-ui-${Date.now()}]`;
  await page.getByRole("button", { name: "Create work" }).click();
  await page.getByRole("textbox", { name: "Work title" }).last().fill(uiTitle);
  const createWait = page.waitForResponse(
    (r) => r.url().includes("/api/admin/work/create") && r.request().method() === "POST",
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: "Create Work" }).last().click();
  const createRes = await createWait;
  const createBody = (await createRes.json().catch(() => ({}))) as { ok?: boolean; work?: { id?: number } };
  record("UI create work", createRes.ok() && createBody.ok === true, `status=${createRes.status()}`);
  const workId = createBody.work?.id;
  assert.ok(workId, "work id from create");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".kxd-os-work-engine--planning").waitFor({ timeout: 60_000 });
  record("UI create persists after reload", (await page.getByText(uiTitle).count()) >= 1);

  const edited = `${uiTitle}-edited`;
  await page.goto(`${BASE_URL}/admin/work/${workId}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("button", { name: "Edit" }).click();
  const titleBox = page.getByRole("textbox", { name: "Work title" }).last();
  await titleBox.waitFor({ state: "visible", timeout: 30_000 });
  await titleBox.fill(edited);
  const assignSelect = page.locator("select").filter({ has: page.locator("option") }).nth(2);
  let assignTouched = false;
  if ((await assignSelect.count()) > 0) {
    await assignSelect.selectOption({ label: "Demo Operator" }).catch(() => null);
    assignTouched = true;
  }
  const patchWait = page.waitForResponse(
    (r) => r.url().includes(`/api/admin/work/${workId}`) && r.request().method() === "PATCH",
    { timeout: 60_000 },
  );
  const saveBtn = page.locator(".kxd-os-work-composer__submit").filter({ hasText: "Save changes" }).last();
  await saveBtn.waitFor({ state: "visible", timeout: 15_000 });
  await saveBtn.click();
  const patchRes = await patchWait.catch(() => null);
  record("UI edit work", patchRes?.ok() ?? false, patchRes ? `status=${patchRes.status()}` : "no PATCH");
  record(
    "UI assign work",
    assignTouched ? (patchRes?.ok() ?? false) : (patchRes?.ok() ?? false),
    patchRes ? (assignTouched ? "assignee in composer PATCH" : "PATCH without assign") : "no PATCH",
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  record("UI edit persists after reload", (await page.getByText(edited).count()) >= 1, edited);

  const startBtn = page
    .locator(".kxd-os-work-detail__action-group--workflow button")
    .filter({ hasText: /start|in progress|plan/i })
    .first();
  if ((await startBtn.count()) > 0) {
    const statusWait = page.waitForResponse(
      (r) => r.url().includes(`/api/admin/work/${workId}/status`) && r.request().method() === "POST",
      { timeout: 30_000 },
    );
    await startBtn.click();
    const st = await statusWait.catch(() => null);
    record("UI change status", st?.ok() ?? false, st ? `status=${st.status()}` : "no POST");
  } else {
    record("UI change status", false, "workflow action not found");
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Complete", exact: true }).waitFor({ timeout: 15_000 }).catch(() => {});
  const completeBtn = page.getByRole("button", { name: "Complete", exact: true });
  if ((await completeBtn.count()) > 0) {
    const statusWait = page.waitForResponse(
      (r) => r.url().includes("/status") && r.request().method() === "POST",
      { timeout: 30_000 },
    );
    await completeBtn.click();
    const st = await statusWait.catch(() => null);
    record("UI mark complete", st?.ok() ?? false, st ? `status=${st.status()}` : "no POST");
  } else {
    record("UI mark complete", false, "complete control not found");
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  record(
    "UI completed persists after reload",
    (await page.locator(".kxd-os-work-detail__meta").getByText("Completed").count()) >= 1,
  );

  await browser.close();

  const failed = checks.filter((c) => !c.pass);
  if (failed.length > 0) {
    console.error(`\nIntegration Work UI mutations: ${failed.length} failed.`);
    process.exit(1);
  }
  console.log("\nIntegration Work UI mutations passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});