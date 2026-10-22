/**
 * Authenticated Playwright QA — staff template editor (local dev server).
 * Creates disposable users/templates only; never touches production template #1/#2.
 *
 *   STAFF_TEMPLATE_EDITOR_UI=1 node --env-file=.env.local --import tsx \
 *     scripts/verify-staff-template-editor-ui.ts
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const enabled = process.env.STAFF_TEMPLATE_EDITOR_UI === "1";
if (!enabled) {
  console.log(
    "\nverify:staff-template-editor-ui — skipped (set STAFF_TEMPLATE_EDITOR_UI=1)\n",
  );
  process.exit(0);
}

const BASE = process.env.QA_BASE_URL?.trim() || "http://localhost:3000";
const runTag = `editor-ui-${Date.now()}`;
const email = `operator-${runTag}@kreatebydesign.com`;
const password = `Test-${runTag}`;

async function main(): Promise<void> {
  const dbUrl =
    process.env.STAFF_DOC_DISPOSABLE_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URI?.trim();
  if (!dbUrl) throw new Error("DATABASE_URL required.");
  if (process.env.KXD_DATABASE_IS_PRODUCTION === "1") {
    throw new Error("Refusing to run UI verification on production.");
  }

  process.env.DATABASE_URL = dbUrl;
  process.env.DATABASE_URI = dbUrl;

  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  const payload = await getPayload({ config });

  const user = await payload.create({
    collection: "users",
    data: {
      email,
      displayName: "Editor UI Verify",
      role: "admin",
      staffRole: "none",
      password,
    } as never,
    overrideAccess: true,
  });

  const { createRealStaffDocumentTemplate } = await import(
    "../lib/staff-documents/template-operator.ts"
  );
  const adminActor = {
    userId: Number(user.id),
    email,
    displayName: "Editor UI Verify",
    role: "admin" as const,
    staffRole: "none" as const,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  };

  const { id: templateId } = await createRealStaffDocumentTemplate({
    actor: adminActor,
    title: `UI Verify Agreement ${runTag}`,
    body: `PARTIES\nEmployer: Kreate by Design LLC\n\nSCOPE\n• Verification only for ${runTag}.`,
    kind: "employment-agreement",
  });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginRes = await context.request.post(`${BASE}/api/users/login`, {
    data: { email, password },
  });
  assert.equal(loginRes.status(), 200, "local admin login must succeed (is dev server running?)");

  const page = await context.newPage();

  await page.emulateMedia({ colorScheme: "dark" });
  const editorUrl = `${BASE}/admin/operations/staff/oversight/documents/templates/${templateId}`;
  await page.goto(editorUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".kxd-os-staff-docs-template-editor", { timeout: 60_000 });

  const scrollBg = await page
    .locator(".kxd-agreement-doc-card__scroll")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  assert.match(scrollBg, /rgb\(247, 243, 235\)|#f7f3eb/i, "ivory preview surface");

  const titleColor = await page
    .locator(".kxd-agreement-doc__title")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  assert.match(titleColor, /rgb\(44, 40, 36\)|#2c2824/i, "readable agreement title");

  const titleInput = page.locator(".kxd-os-staff-docs-template-editor__field").nth(1).locator("input");
  await titleInput.fill(`${await titleInput.inputValue()} (edit)`);
  const dirtyState = page.locator(".kxd-os-staff-docs-template-editor__save-state");
  await dirtyState.waitFor({ state: "visible" });
  assert.match((await dirtyState.textContent()) ?? "", /unsaved/i);

  const submitBtn = page.getByRole("button", { name: /submit for legal review/i });
  assert.equal(await submitBtn.isDisabled(), true, "legal review blocked while dirty");

  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes(`/templates/${templateId}`) &&
        res.request().method() === "PATCH" &&
        res.ok(),
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: /^save draft$/i }).click(),
  ]);
  await page.waitForFunction(
    () => {
      const el = document.querySelector(".kxd-os-staff-docs-template-editor__save-state");
      return el && !/unsaved/i.test(el.textContent ?? "");
    },
    { timeout: 30_000 },
  );
  assert.equal(await submitBtn.isDisabled(), false, "legal review allowed after save");

  await submitBtn.click();
  await page.waitForTimeout(2500);
  const statusText = await page.locator(".kxd-os-staff-docs-template-editor__doc-meta").textContent();
  assert.match(statusText ?? "", /legal review/i);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(editorUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".kxd-os-staff-docs-template-editor", { timeout: 60_000 });
  const editorBox = await page.locator(".kxd-os-staff-docs-template-editor").boundingBox();
  assert.ok(editorBox && editorBox.width <= 390, "mobile layout renders editor");

  await browser.close();
  console.log("\n  ✓ staff template editor UI (authenticated, disposable data)\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
