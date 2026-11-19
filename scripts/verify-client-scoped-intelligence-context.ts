/**
 * Regression — Client Command scoped intelligence vs portfolio context.
 *
 * Structural (default): isolation contracts + wiring (no DB).
 * Live (optional): insight/recommendation equivalence for one client when SQLite is present.
 *
 *   npx tsx scripts/verify-client-scoped-intelligence-context.ts
 *   KXD_SERVER_ONLY_SHIM=1 PAYLOAD_SQLITE_PATH=file:./storage/qa/batch1-nav.sqlite \
 *     tsx --import ./scripts/shims/register-server-only.mjs scripts/verify-client-scoped-intelligence-context.ts --live
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const live = process.argv.includes("--live");

let failed = 0;
function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failed += 1;
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

const CLIENT_SCOPED_COLLECTIONS = [
  "retainers",
  "client-projects",
  "monthly-deliverables",
  "client-requests",
  "client-onboarding",
  "website-audits",
  "client-infrastructure",
  "infrastructure-events",
  "client-timeline-events",
  "executive-timeline-events",
  "portal-users",
  "executive-client-profiles",
  "sales-leads",
  "proposals",
  "monthly-reports",
  "executive-notes",
  "creative-campaigns",
  "flyer-requests",
  "promo-video-requests",
  "social-post-requests",
];

console.log("\nClient scoped intelligence context\n");

const ctxSrc = read("lib/intelligence/context.ts");
const engine = read("lib/client-command/engine.ts");
const page = read("app/admin/operations/(studio)/client-command/[clientId]/page.tsx");
const workspace = read("lib/client-command/workspace-data.ts");

check(
  "scoped loader is request-memoized per client id",
  ctxSrc.includes("export const loadClientScopedIntelligenceContext = cache("),
);
check(
  "scoped loader queries client field on linked collections",
  CLIENT_SCOPED_COLLECTIONS.every((c) => ctxSrc.includes(`findForClient("${c}"`)),
);
check(
  "command center does not load portfolio intelligence universe",
  engine.includes("loadClientScopedIntelligenceContext") &&
    !engine.includes("loadIntelligenceContext("),
);
check(
  "portfolio intelligence remains available for briefings",
  ctxSrc.includes("export const loadIntelligenceContext = cache(loadIntelligenceContextUncached)"),
);
check(
  "health context still supplied for client health scoring",
  ctxSrc.includes("loadHealthContext()") && engine.includes("calculateClientHealth"),
);
check(
  "page enforces operator access before bundle",
  page.includes("requireOperatorClientPageAccess") && page.includes("skipSessionAccessCheck: true"),
);
check(
  "bundle defaults to session access check when page gate omitted",
  workspace.includes("skipSessionAccessCheck") && workspace.includes("isCurrentSessionDeniedClientData"),
);

function clientIdField(doc: Record<string, unknown>): number | null {
  const raw = doc.client;
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "object" && raw !== null && "id" in raw) return Number((raw as { id: unknown }).id);
  return null;
}

async function runLive() {
  const {
    loadIntelligenceContext,
    loadClientScopedIntelligenceContext,
    clientId,
  } = await import("@/lib/intelligence/context");
  const { buildClientRecommendations } = await import("@/lib/intelligence/recommendations");
  const { buildClientInsightSections } = await import("@/lib/intelligence/summaries");
  const { calculateClientHealth } = await import("@/lib/client-health/health-engine");

  const full = await loadIntelligenceContext();
  const activeId =
    full.clients.find((c) => c.status === "active")?.id ??
    full.clients[0]?.id;
  if (activeId == null) {
    console.log("  (live skipped — no clients in DB)");
    return;
  }
  const cid = Number(activeId);

  const scoped = await loadClientScopedIntelligenceContext(cid);
  assert.ok(scoped, "scoped context should resolve for active client");

  check("scoped context contains exactly one client record", scoped.clients.length === 1);
  check("scoped clientsById only has target id", scoped.clientsById.size === 1 && scoped.clientsById.has(cid));

  const linkedKeys: (keyof typeof scoped)[] = [
    "retainers",
    "projects",
    "deliverables",
    "requests",
    "onboardings",
    "audits",
    "infrastructure",
    "infraEvents",
    "timeline",
    "executiveTimeline",
    "portalUsers",
    "executiveProfiles",
    "salesLeads",
    "proposals",
    "monthlyReports",
    "executiveNotes",
    "campaigns",
    "flyers",
    "videos",
    "socialPosts",
  ];

  for (const key of linkedKeys) {
    const rows = scoped[key] as Record<string, unknown>[];
    if (!Array.isArray(rows)) continue;
    const alien = rows.find((row) => {
      const rowCid = clientIdField(row);
      return rowCid != null && rowCid !== cid;
    });
    check(`isolation: ${String(key)}`, !alien, alien ? `foreign client ${clientId(alien.client)}` : undefined);
  }

  const recPortfolio = buildClientRecommendations(cid, full);
  const recScoped = buildClientRecommendations(cid, scoped);
  const recKey = (r: { id: string }) => r.id;
  const portfolioIds = recPortfolio.map(recKey).sort().join(",");
  const scopedIds = recScoped.map(recKey).sort().join(",");
  check("recommendations equivalent for target client", portfolioIds === scopedIds, portfolioIds);

  const insightsPortfolio = await buildClientInsightSections(cid, full);
  const insightsScoped = await buildClientInsightSections(cid, scoped);
  const stripTimeline = (x: typeof insightsPortfolio) =>
    x ? JSON.stringify({ ...x, timeline: undefined }) : null;
  check(
    "insight sections equivalent (excluding timeline fetch)",
    stripTimeline(insightsPortfolio) === stripTimeline(insightsScoped),
  );

  const healthPortfolio = calculateClientHealth(cid, full.healthCtx);
  const healthScoped = calculateClientHealth(cid, scoped.healthCtx);
  check(
    "health score uses shared health context",
    healthPortfolio.overallScore === healthScoped.overallScore,
  );
}

async function main() {
  if (live) {
    console.log("  Live equivalence (SQLite)\n");
    await runLive();
  } else {
    console.log("  Structural (no DB). Pass --live with server-only shim for equivalence.\n");
  }

  console.log("");
  if (failed > 0) {
    console.error(`FAILED ${failed} check(s)`);
    process.exit(1);
  }
  console.log("Client scoped intelligence verification passed.");
}

void main();