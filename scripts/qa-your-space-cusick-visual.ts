/**
 * Cusick (client 5) Your Space visual QA — local dev + Preview Postgres.
 *
 *   npx tsx scripts/qa-your-space-cusick-visual.ts
 *
 * Env (never commit values):
 *   QA_BASE_URL (default http://127.0.0.1:3000)
 *   KXD_FOUNDER_OPERATOR_EMAIL
 *   KXD_FOUNDER_OPERATOR_PASSWORD
 *   KXD_FOUNDER_OPERATOR_USER_ID (optional, default 1)
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  buildOperatorPortalPreviewSession,
  encodeOperatorPortalPreviewSession,
} from "../lib/portal/operator-preview/token";

const base = (process.env.QA_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const outDir = ".qa-your-space-visual/screenshots";

const routes: Array<[string, string]> = [
  ["overview", "/portal"],
  ["kxd-work", "/portal/deliverables"],
  ["performance", "/portal/analytics"],
  ["reports", "/portal/reports"],
  ["website-review", "/portal/website-review"],
  ["website-health", "/portal/website-health"],
  ["requests", "/portal/requests"],
  ["account", "/portal/settings"],
];

const widths: Array<[string, number, number]> = [
  ["1440", 1440, 900],
  ["1280", 1280, 800],
  ["768", 768, 1024],
  ["430", 430, 932],
  ["375", 375, 812],
];

function parseSetCookies(headers: Headers): string[] {
  const anyHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };
  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function cookieValue(setCookie: string[], name: string): string {
  for (const line of setCookie) {
    const m = line.match(new RegExp(`^${name}=([^;]+)`));
    if (m) return m[1];
  }
  return "";
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const email = process.env.KXD_FOUNDER_OPERATOR_EMAIL?.trim();
  const password = process.env.KXD_FOUNDER_OPERATOR_PASSWORD?.trim();
  const adminUserId = Number(process.env.KXD_FOUNDER_OPERATOR_USER_ID ?? "1");
  if (!email || !password) {
    console.error(
      "[qa-your-space] Set KXD_FOUNDER_OPERATOR_EMAIL and KXD_FOUNDER_OPERATOR_PASSWORD in the shell (do not commit).",
    );
    process.exit(2);
  }

  const loginRes = await fetch(`${base}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    console.error("[qa-your-space] Login failed:", loginRes.status);
    process.exit(3);
  }
  const payloadToken = cookieValue(parseSetCookies(loginRes.headers), "payload-token");
  if (!payloadToken) {
    console.error("[qa-your-space] No payload-token in login response.");
    process.exit(3);
  }

  const previewBody = encodeOperatorPortalPreviewSession(
    buildOperatorPortalPreviewSession({
      adminUserId: Number.isFinite(adminUserId) && adminUserId > 0 ? adminUserId : 1,
      adminEmail: email,
      clientId: 5,
      clientName: "Cusick Morgan Motorsports",
      clientSlug: "cusick-morgan-motorsports",
    }),
  );

  const startRes = await fetch(`${base}/api/admin/portal/preview/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `payload-token=${payloadToken}`,
    },
    body: JSON.stringify({ clientId: 5 }),
  });
  if (!startRes.ok) {
    console.error("[qa-your-space] Preview start failed:", startRes.status);
    process.exit(4);
  }
  const previewCookie =
    cookieValue(parseSetCookies(startRes.headers), "kxd-operator-portal-preview") ||
    previewBody;

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "payload-token",
      value: payloadToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "kxd-operator-portal-preview",
      value: previewCookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const report: {
    captured: Array<{ id: string; route: string; width: string; file: string }>;
    defects: Array<Record<string, unknown>>;
  } = { captured: [], defects: [] };

  for (const [id, route] of routes) {
    for (const [label, w, h] of widths) {
      const page = await context.newPage();
      await page.setViewportSize({ width: w, height: h });
      const url = `${base}${route}`;
      try {
        const res = await page.goto(url, {
          waitUntil: "networkidle",
          timeout: 120_000,
        });
        if (!res || res.status() >= 400) {
          throw new Error(`HTTP ${res?.status()}`);
        }
        const [scrollW, clientW] = await page.evaluate(() => [
          document.documentElement.scrollWidth,
          document.documentElement.clientWidth,
        ]);
        if (scrollW > clientW + 2) {
          report.defects.push({
            id,
            route,
            width: label,
            issue: "horizontal_overflow",
            scrollW,
            clientW,
          });
        }
        if (id === "overview" && label === "1440") {
          const logo = page.locator(".kxd-ces-identity__logo img");
          if ((await logo.count()) === 0) {
            report.defects.push({ id, issue: "logo_not_found" });
          } else {
            const src = await logo.first().getAttribute("src");
            if (src && !src.includes("cusick-morgan")) {
              report.defects.push({ id, issue: "logo_src_unexpected", src });
            }
          }
        }
        const file = path.join(outDir, `${id}-${label}.png`);
        await page.screenshot({ path: file, fullPage: true });
        report.captured.push({ id, route, width: label, file });
      } catch (e) {
        report.defects.push({
          id,
          route,
          width: label,
          issue: "capture_failed",
          message: String(e),
        });
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();

  const reportPath = ".qa-your-space-visual/qa-report.json";
  const prior = fs.existsSync(reportPath)
    ? (JSON.parse(fs.readFileSync(reportPath, "utf8")) as Record<string, unknown>)
  : {};
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        ...prior,
        connection: {
          host: "ep-frosty-bonus-afx8tf8q.c-2.us-west-2.aws.neon.tech",
          branch: "preview-kxd-os",
          sqliteFallback: false,
        },
        visualQa: report,
        visualQaAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  console.log(
    `[qa-your-space] captured ${report.captured.length} screenshots; defects: ${report.defects.length}`,
  );
  if (report.defects.some((d) => d.issue === "capture_failed")) {
    process.exit(5);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
