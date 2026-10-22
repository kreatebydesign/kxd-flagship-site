/**
 * Post-release smoke: staff oversight + operator correction UI (production).
 * Uses persisted operator browser profile when available.
 */
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = "https://www.kreatebydesign.com";
const profileDir = join(process.cwd(), ".cache/kxd-prod-operator-browser");

async function main(): Promise<void> {
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    viewport: { width: 1440, height: 900 },
  });
  const page = context.pages()[0] ?? (await context.newPage());

  await page.goto(`${BASE}/admin/operations/staff/oversight`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });

  const url = page.url();
  if (url.includes("/admin/login")) {
    throw new Error(
      "PRODUCTION_UI_AUTH_REQUIRED: open oversight in headed browser and log in, then rerun.",
    );
  }

  const hasCorrections = await page.getByRole("region", { name: "Operator time corrections" }).count();
  const hasClock = await page.getByRole("region", { name: "Active time clock" }).count();

  const apiProbe = await page.evaluate(async () => {
    const res = await fetch("/api/admin/staff/time/oversight/active", {
      credentials: "include",
    });
    const data = (await res.json()) as { success?: boolean };
    return { status: res.status, success: data.success === true };
  });

  if (hasCorrections < 1 || hasClock < 1) {
    throw new Error("Oversight sections missing on production UI.");
  }
  if (!apiProbe.success || apiProbe.status !== 200) {
    throw new Error(`Oversight API failed: ${apiProbe.status}`);
  }

  const operatorDenied = await page.evaluate(async () => {
    const res = await fetch("/api/admin/staff/time/operator/historical-shift", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return res.status;
  });

  if (operatorDenied !== 400 && operatorDenied !== 200) {
    throw new Error(`Unexpected operator API status for empty body: ${operatorDenied}`);
  }

  console.log("verify-v1-staff-003-production-ui: OK");
  console.log(JSON.stringify({ url, hasCorrections, hasClock, apiProbe, operatorDenied }));
  await context.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
