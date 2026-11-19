/**
 * Operator navigation measurement — structural audit + optional live HTTP timing.
 *
 * Structural (default): architecture signals for shell persistence and loading boundaries.
 * Live: set KXD_OPERATOR_BASE_URL (e.g. http://localhost:3000) and KXD_OPERATOR_COOKIE
 * (Payload session cookie header value) to measure unauthenticated vs authenticated TTFB.
 *
 * Run: npx tsx scripts/measure-operator-navigation.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "storage/perf/batch1-nav-performance");

type RouteProbe = {
  label: string;
  path: string;
};

const FOUNDER_PROBES: RouteProbe[] = [
  { label: "today", path: "/admin/operations/today" },
  { label: "clients", path: "/admin/operations/clients" },
  { label: "work", path: "/admin/work" },
  { label: "client-command", path: "/admin/operations/client-command/1" },
];

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function structuralReport() {
  const shell = read("components/admin/operations/shared/OperationsShell.tsx");
  const layout = read("app/admin/operations/(studio)/layout.tsx");
  return {
    mode: "structural" as const,
    capturedAt: new Date().toISOString(),
    persistentChrome: layout.includes("StudioOperationsChrome"),
    shellPassthrough: shell.includes('chrome?.mode === "layout"'),
    loadingBoundaries: {
      clients: read("app/admin/operations/(studio)/clients/loading.tsx").includes(
        "kxd-os-page-loading",
      ),
      clientCommand: read(
        "app/admin/operations/(studio)/client-command/[clientId]/loading.tsx",
      ).includes("kxd-os-page-loading"),
      work: read("app/admin/work/loading.tsx").includes("kxd-os-page-loading"),
    },
    sharedPayload: read("lib/payload/get-payload.ts").includes("getSharedPayload"),
    notes:
      "Structural mode does not measure milliseconds. Use live mode with admin cookie for TTFB.",
  };
}

async function liveProbe(baseUrl: string, cookie: string | undefined, route: RouteProbe) {
  const url = new URL(route.path, baseUrl);
  const start = performance.now();
  const res = await fetch(url, {
    redirect: "manual",
    headers: cookie ? { cookie } : undefined,
  });
  const elapsedMs = Math.round(performance.now() - start);
  return {
    label: route.label,
    path: route.path,
    status: res.status,
    elapsedMs,
    redirected: res.status >= 300 && res.status < 400,
  };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const baseUrl = process.env.KXD_OPERATOR_BASE_URL?.trim();
  const cookie = process.env.KXD_OPERATOR_COOKIE?.trim();

  const report: Record<string, unknown> = {
    capturedAt: new Date().toISOString(),
    structural: structuralReport(),
  };

  if (baseUrl) {
    const live: unknown[] = [];
    for (const route of FOUNDER_PROBES) {
      try {
        live.push(await liveProbe(baseUrl, cookie, route));
      } catch (err) {
        live.push({
          label: route.label,
          path: route.path,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    report.live = {
      mode: cookie ? "authenticated-cookie" : "unauthenticated-or-redirect",
      baseUrl,
      routes: live,
    };
  } else {
    report.live = {
      skipped: true,
      reason: "Set KXD_OPERATOR_BASE_URL to enable HTTP timing probes.",
    };
  }

  const outPath = path.join(outDir, `navigation-${Date.now()}.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(report, null, 2));
}

void main();