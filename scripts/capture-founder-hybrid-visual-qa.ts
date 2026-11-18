/**
 * Founder Hybrid — authenticated visual capture (local QA SQLite only).
 *
 *   QA_BASE_URL=http://localhost:3014 npx tsx scripts/capture-founder-hybrid-visual-qa.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const BASE_URL = (process.env.QA_BASE_URL?.trim() || "http://localhost:3014").replace(/\/$/, "");
const OUT_ROOT = path.join(process.cwd(), "storage/perf/founder-hybrid-visual");
const QA_META = path.join(process.cwd(), "storage/qa/batch1-qa-meta.json");

const VIEWPORTS = [
  { label: "desktop-1920", width: 1920, height: 1080 },
  { label: "laptop-1440", width: 1440, height: 900 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "mobile-390", width: 390, height: 844 },
] as const;

const ROUTES = [
  { slug: "today", path: "/admin/operations/today" },
  { slug: "clients", path: "/admin/operations/clients" },
  { slug: "work", path: "/admin/work" },
  { slug: "sales", path: "/admin/sales" },
] as const;

function loadClientId(): string {
  const fromEnv = process.env.KXD_BATCH1_QA_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  if (fs.existsSync(QA_META)) {
    const meta = JSON.parse(fs.readFileSync(QA_META, "utf8")) as { clientId?: number };
    if (meta.clientId != null) return String(meta.clientId);
  }
  return "1";
}

function loadLocalQaCreds(): { email: string; password: string } {
  const email = process.env.KXD_LOCAL_QA_EMAIL?.trim();
  const password = process.env.KXD_LOCAL_QA_PASSWORD?.trim();
  if (email && password) return { email, password };
  throw new Error(
    "Set KXD_LOCAL_QA_EMAIL and KXD_LOCAL_QA_PASSWORD for local visual capture.",
  );
}

async function login(page: Page) {
  const { email, password } = loadLocalQaCreds();
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Payload login failed");
  const token = res.headers.get("set-cookie")?.match(/payload-token=([^;]+)/)?.[1];
  if (!token) throw new Error("No payload-token");
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

async function capture(page: Page, filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await page.screenshot({ path: filePath, fullPage: true });
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(OUT_ROOT, stamp);
  fs.mkdirSync(runDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page);

  const clientId = loadClientId();
  const allRoutes = [
    ...ROUTES,
    { slug: "client-command", path: `/admin/operations/client-command/${clientId}` },
  ];

  const report: Record<string, unknown> = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    viewportCount: VIEWPORTS.length,
    routes: allRoutes.map((r) => r.slug),
    files: [] as string[],
    checks: [] as { name: string; pass: boolean; detail?: string }[],
  };

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const route of allRoutes) {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(vp.width < 900 ? 400 : 200);
      const fileName = `${route.slug}__${vp.label}.png`;
      const filePath = path.join(runDir, fileName);
      await capture(page, filePath);
      (report.files as string[]).push(filePath);

      const sidebars = await page.locator(".kxd-os-sidebar").count();
      const shells = await page.locator(".kxd-os-shell--app").count();
      const primary =
        vp.width >= 900
          ? await page.locator(".kxd-founder-sidebar__primary .kxd-founder-sidebar__link").count()
          : await page.locator(".kxd-founder-mobile-nav-toggle").count();

      (report.checks as { name: string; pass: boolean; detail?: string }[]).push({
        name: `${route.slug}@${vp.label}`,
        pass: sidebars === 1 && shells === 1 && primary >= 1,
        detail: `sidebars=${sidebars}, shells=${shells}, nav=${primary}`,
      });
    }
  }

  const manifest = path.join(runDir, "manifest.json");
  fs.writeFileSync(manifest, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${manifest}`);

  const failed = (report.checks as { pass: boolean }[]).filter((c) => !c.pass).length;
  await browser.close();
  if (failed > 0) {
    console.error(`${failed} visual capture check(s) failed`);
    process.exit(1);
  }
  console.log("Founder Hybrid visual capture passed.");
}

void main();