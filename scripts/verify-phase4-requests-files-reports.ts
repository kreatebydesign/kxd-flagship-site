/**
 * Phase 4 Batch G — Requests, files, reports, and approval decision.
 * Static + pure-unit verification only. No database. No external writes.
 *
 * Run: npm run verify:phase4-requests-files-reports
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  decidePortalReportAccess,
} from "../lib/portal/analytics-visibility";
import {
  isClientInActiveMemberships,
  resolveAuthorizedActiveClient,
} from "../lib/portal/membership-resolve";
import {
  BATCH_G_CLIENT_HQ_SURFACE_IDS,
  decidePortalAttachmentAccess,
  decidePortalCesModuleApiAccess,
  decidePortalRelatedProjectAccess,
  isBatchGClientHqSurfaceAvailable,
  PORTAL_ATTACHMENT_NOT_FOUND_MESSAGE,
  PORTAL_REPORT_INTERNAL_FIELD_DENYLIST,
  portalReportViewModelHasInternalLeak,
  toPortalReportViewModel,
} from "../lib/portal/requests-files-reports";
import { resolvePortfolioAccess } from "../lib/portal/portfolio";
import { isVercelBlobStorageConfigured } from "../lib/client-review-media/storage/resolve";
import type { ResolvedExperienceProfile } from "../lib/ces/types";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function walkFiles(dir: string, exts: Set<string>, out: string[] = []): string[] {
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".next" ||
      ent.name === ".git" ||
      ent.name === ".tmp"
    ) {
      continue;
    }
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, exts, out);
    else if (exts.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function stubProfile(enabledModules: ResolvedExperienceProfile["enabledModules"]): ResolvedExperienceProfile {
  return {
    profileId: null,
    source: "fallback",
    identity: {
      clientId: 1,
      clientName: "Fixture",
      clientSlug: "fixture",
      logoUrl: null,
      logoAlt: "Fixture",
      websiteUrl: null,
    },
    visual: {
      primaryColor: "#080808",
      secondaryColor: "#f5f0e8",
      accentColor: "#c4a574",
      surfaceTint: null,
      borderRadiusPreset: "default",
      motionPreset: "calm",
    },
    hospitality: {
      welcomeEyebrow: "Welcome",
      reassuranceLine: "You’re in good hands.",
      supportTone: "warm-professional",
      portalSidebarLabel: "Client HQ",
      partnerFooterLine: "Kreate by Design",
      showPartnerMark: true,
    },
    enabledModules,
    reportingCapabilities: [],
    presentation: null,
    terminology: {},
    cssVars: {},
  };
}

function main() {
  console.log("\nPhase 4 Batch G — requests, files, reports, and approval decision\n");

  // ── Product decision locked ──────────────────────────────────────────
  const phaseDoc = read("docs/PHASE-4-MULTI-CLIENT-PORTAL.md");
  check(
    "Phase 4 plan locks Batch G approval decision",
    phaseDoc.includes("Product decision (locked)") &&
      phaseDoc.includes("awaiting your input") &&
      phaseDoc.includes("Do not** create a new Approvals product"),
  );
  check(
    "Phase 4 plan forbids Approvals route/nav/collection",
    phaseDoc.includes("`/portal/approvals`") &&
      phaseDoc.includes("Approvals nav item") &&
      phaseDoc.includes("No Approvals product"),
  );
  check(
    "Batch G status marked implemented with verifier",
    phaseDoc.includes("verify:phase4-requests-files-reports") &&
      phaseDoc.includes("Batch G — Requests, files, reports, and approval decision"),
  );
  check(
    "Batch H remains final completion phase",
    phaseDoc.includes("Batch H — Privacy, responsive, accessibility, rollout, and completion") &&
      (phaseDoc.includes("Batch H not started") ||
        phaseDoc.includes("verify:phase4-multi-client-portal-completion")),
  );

  // ── Pure membership / active-client isolation ────────────────────────
  const memberships = [
    {
      id: 1,
      portalUserId: 1,
      clientId: 10,
      clientName: "A",
      clientSlug: "a",
      status: "active" as const,
      isDefault: true,
    },
    {
      id: 2,
      portalUserId: 1,
      clientId: 20,
      clientName: "B",
      clientSlug: "b",
      status: "active" as const,
      isDefault: false,
    },
    {
      id: 3,
      portalUserId: 1,
      clientId: 30,
      clientName: "C",
      clientSlug: "c",
      status: "disabled" as const,
      isDefault: false,
    },
  ];
  check(
    "active membership authorizes listed client",
    isClientInActiveMemberships(memberships, 10),
  );
  check(
    "revoked membership does not authorize",
    !isClientInActiveMemberships(memberships, 30),
  );
  check(
    "unknown client never authorizes",
    !isClientInActiveMemberships(memberships, 99),
  );
  const resolved = resolveAuthorizedActiveClient({
    memberships,
    lastActiveClientId: 20,
    legacyClientId: 10,
  });
  check(
    "active-client preference accepted only when membership-active",
    resolved?.clientId === 20,
  );
  const stale = resolveAuthorizedActiveClient({
    memberships,
    lastActiveClientId: 30,
    legacyClientId: 10,
  });
  check(
    "stale revoked lastActiveClientId rebounds to authorized default",
    stale?.clientId === 10,
  );

  // ── Requests / related project ───────────────────────────────────────
  check(
    "related project accepts matching active client",
    decidePortalRelatedProjectAccess({
      projectClientId: 10,
      authorizedClientId: 10,
    }).ok === true,
  );
  check(
    "related project rejects cross-client",
    decidePortalRelatedProjectAccess({
      projectClientId: 99,
      authorizedClientId: 10,
    }).ok === false,
  );
  const missingProject = decidePortalRelatedProjectAccess({
    projectClientId: null,
    authorizedClientId: 10,
  });
  const foreignProject = decidePortalRelatedProjectAccess({
    projectClientId: 99,
    authorizedClientId: 10,
  });
  check(
    "related project rejects missing/invalid uniformly",
    missingProject.ok === false &&
      missingProject.reason === "missing" &&
      foreignProject.ok === false &&
      foreignProject.reason === "cross-client",
  );
  const requestsApi = read("app/api/portal/requests/route.ts");
  check(
    "requests API forces session.clientId ownership",
    requestsApi.includes("client: session.clientId") &&
      requestsApi.includes("decidePortalRelatedProjectAccess") &&
      !requestsApi.includes("body.client"),
  );
  check(
    "requests API returns uniform invalid-project denial",
    requestsApi.includes("Invalid project selection.") &&
      requestsApi.includes("catch {") &&
      requestsApi.includes("projectClient = null"),
  );
  const requestsPage = read("app/(portal)/portal/(app)/requests/page.tsx");
  check(
    "requests page scopes via getPortalRequests(session)",
    requestsPage.includes("getPortalRequests(session)") &&
      requestsPage.includes("isBatchGClientHqSurfaceAvailable(\"requests\""),
  );
  const portalData = read("lib/portal/data.ts");
  check(
    "getPortalRequests scopes by session.clientId",
    portalData.includes('scopedFind("client-requests", session.clientId)'),
  );
  check(
    "getPortalDeliverables scopes by session.clientId",
    portalData.includes('scopedFind("monthly-deliverables", session.clientId)'),
  );
  check(
    "getPortalAssets scopes onboarding/brand-kit by clientId",
    portalData.includes("where: { client: { equals: clientId } }") &&
      portalData.includes("getPortalAssets"),
  );

  // ── Deliverables / assets pages ──────────────────────────────────────
  for (const [surface, rel] of [
    ["assets", "app/(portal)/portal/(app)/assets/page.tsx"],
    ["deliverables", "app/(portal)/portal/(app)/deliverables/page.tsx"],
    ["reports", "app/(portal)/portal/(app)/reports/page.tsx"],
  ] as const) {
    const src = read(rel);
    check(
      `${surface} page gates with Batch G surface availability`,
      src.includes(`isBatchGClientHqSurfaceAvailable("${surface}"`) &&
        src.includes('redirect("/portal")'),
    );
  }

  // ── Reports — Batch E access model retained + view-model hardening ───
  check(
    "published report for active client allowed",
    decidePortalReportAccess({
      report: { status: "published", client: 7 },
      authorizedClientId: 7,
    }).ok === true,
  );
  const crossClientReport = decidePortalReportAccess({
    report: { status: "published", client: 99 },
    authorizedClientId: 7,
  });
  check(
    "cross-client report denied",
    crossClientReport.ok === false && crossClientReport.reason === "cross-client",
  );
  check(
    "unpublished report denied",
    decidePortalReportAccess({
      report: { status: "draft", client: 7 },
      authorizedClientId: 7,
    }).ok === false,
  );
  check(
    "missing report denied",
    decidePortalReportAccess({
      report: null,
      authorizedClientId: 7,
    }).ok === false,
  );

  const leakedReport = {
    id: 42,
    title: "June Report",
    reportingMonth: 6,
    reportingYear: 2026,
    portalHtml: "<p>ok</p>",
    htmlExport: "<p>ok</p>",
    internalNotes: "SECRET",
    approvalStatus: "approved",
    approvedBy: "Matt",
    reportApprovedBy: 1,
    pdfStorageKey: "private/key",
    dataProvenance: {},
    connectorStatus: {},
    reportData: { secret: true },
    approvedSnapshot: {},
    client: { id: 7, name: "Other" },
  };
  const viewModel = toPortalReportViewModel(leakedReport);
  check("report view model keeps id/title/month/year/html", viewModel.id === 42);
  check(
    "report view model strips every internal denylist field",
    !portalReportViewModelHasInternalLeak(viewModel as unknown as Record<string, unknown>) &&
      PORTAL_REPORT_INTERNAL_FIELD_DENYLIST.every(
        (key) => !Object.prototype.hasOwnProperty.call(viewModel, key),
      ),
  );
  check(
    "report view model does not expose nested client object",
    !("client" in viewModel),
  );

  const reportDetailPage = read("app/(portal)/portal/(app)/reports/[id]/page.tsx");
  check(
    "report detail uses decidePortalReportAccess + view model",
    reportDetailPage.includes("decidePortalReportAccess") &&
      reportDetailPage.includes("toPortalReportViewModel") &&
      reportDetailPage.includes("notFound()"),
  );
  const reportView = read("components/client-hq/ReportViewScreen.tsx");
  check(
    "ReportViewScreen accepts PortalReportViewModel only",
    reportView.includes("PortalReportViewModel") &&
      !reportView.includes("internalNotes") &&
      !reportView.includes("approvalStatus"),
  );
  const reportViewApi = read("app/api/portal/reports/[id]/view/route.ts");
  check(
    "report view API denies forged ids uniformly",
    reportViewApi.includes("decidePortalReportAccess") &&
      reportViewApi.includes('status: 404') &&
      !reportViewApi.includes("Forbidden"),
  );

  // ── Attachments ──────────────────────────────────────────────────────
  check(
    "attachment access allows matching client",
    decidePortalAttachmentAccess({
      mediaClientId: 10,
      authorizedClientId: 10,
    }).ok === true,
  );
  const crossAttachment = decidePortalAttachmentAccess({
    mediaClientId: 99,
    authorizedClientId: 10,
  });
  check(
    "attachment access denies cross-client",
    crossAttachment.ok === false && crossAttachment.reason === "cross-client",
  );
  const missingAttachment = decidePortalAttachmentAccess({
    mediaClientId: null,
    authorizedClientId: 10,
  });
  check(
    "attachment access denies missing media client",
    missingAttachment.ok === false && missingAttachment.reason === "missing",
  );
  check(
    "uniform attachment not-found message is locked",
    PORTAL_ATTACHMENT_NOT_FOUND_MESSAGE === "Not found.",
  );

  for (const rel of [
    "app/api/portal/website-review/attachments/[id]/route.ts",
    "app/api/portal/website-workspace/attachments/[id]/route.ts",
  ]) {
    const src = read(rel);
    check(
      `${rel} uses decidePortalAttachmentAccess`,
      src.includes("decidePortalAttachmentAccess") &&
        src.includes("PORTAL_ATTACHMENT_NOT_FOUND_MESSAGE"),
    );
    check(
      `${rel} does not leak File unavailable oracle`,
      !src.includes("File unavailable."),
    );
    check(
      `${rel} requires CES module entitlement`,
      src.includes("decidePortalCesModuleApiAccess") &&
        src.includes("isCesModuleEnabled"),
    );
  }

  const reviewUpload = read("app/api/portal/website-review/upload/route.ts");
  check(
    "website-review upload requires CES module",
    reviewUpload.includes("decidePortalCesModuleApiAccess") &&
      reviewUpload.includes('"website-review"'),
  );
  check(
    "website-review DELETE uses uniform not-found for missing/foreign",
    reviewUpload.includes("PORTAL_ATTACHMENT_NOT_FOUND_MESSAGE") &&
      reviewUpload.includes("decidePortalAttachmentAccess"),
  );
  check(
    "website-review upload uses durable client-review storage adapter",
    reviewUpload.includes("getDefaultClientReviewStorageAdapter") &&
      reviewUpload.includes("clientId: session.clientId"),
  );

  const workspaceUpload = read("app/api/portal/website-workspace/upload/route.ts");
  check(
    "website-workspace upload requires CES module",
    workspaceUpload.includes("decidePortalCesModuleApiAccess") &&
      workspaceUpload.includes('"website-workspace"'),
  );
  check(
    "website-workspace upload uses durable storage adapter",
    workspaceUpload.includes("getDefaultClientReviewStorageAdapter") &&
      workspaceUpload.includes("clientId: session.clientId"),
  );

  const reviewSubmit = read("app/api/portal/website-review/route.ts");
  check(
    "website-review submit requires CES module + session client",
    reviewSubmit.includes("decidePortalCesModuleApiAccess") &&
      reviewSubmit.includes("client: session.clientId") &&
      !reviewSubmit.includes("body.client"),
  );

  const moduleDenied = decidePortalCesModuleApiAccess({ moduleEnabled: false });
  check(
    "CES module API access fails closed when disabled",
    moduleDenied.ok === false && moduleDenied.reason === "module-unavailable",
  );
  check(
    "CES module API access allows when enabled",
    decidePortalCesModuleApiAccess({ moduleEnabled: true }).ok === true,
  );

  // ── Website Review / Workspace page scoping ──────────────────────────
  for (const rel of [
    "app/(portal)/portal/(app)/website-review/page.tsx",
    "app/(portal)/portal/(app)/website-review/[requestId]/page.tsx",
    "app/(portal)/portal/(app)/website-review/request/page.tsx",
    "app/(portal)/portal/(app)/website-workspace/page.tsx",
    "app/(portal)/portal/(app)/website-workspace/requests/[requestId]/page.tsx",
  ]) {
    const src = read(rel);
    check(
      `${path.basename(path.dirname(rel))}/${path.basename(rel)} requires CES module`,
      src.includes("requireCesModule") || src.includes("isCesModuleEnabled"),
    );
  }

  const wrQueries = read("lib/ces/modules/website-review/queries.ts");
  check(
    "website-review queries filter by client",
    wrQueries.includes("client") &&
      (wrQueries.includes("equals: clientId") || wrQueries.includes("session.clientId") || wrQueries.includes("clientId")),
  );
  const wwQueries = read("lib/ces/modules/website-workspace/queries.ts");
  check(
    "website-workspace queries filter by client",
    wwQueries.includes("client") &&
      (wwQueries.includes("equals: clientId") || wwQueries.includes("clientId")),
  );

  // ── Surface gating mirrors CES launch nav ────────────────────────────
  const flagship = stubProfile(["website-review"]);
  const classic = stubProfile([]);
  for (const surface of BATCH_G_CLIENT_HQ_SURFACE_IDS) {
    check(
      `flagship CES hides ${surface} surface`,
      isBatchGClientHqSurfaceAvailable(surface, flagship) === false,
    );
    check(
      `non-flagship keeps ${surface} surface available`,
      isBatchGClientHqSurfaceAvailable(surface, classic) === true,
    );
  }

  // ── No Approvals product ─────────────────────────────────────────────
  check(
    "no /portal/approvals page exists",
    !existsSync(path.join(root, "app/(portal)/portal/(app)/approvals/page.tsx")) &&
      !existsSync(path.join(root, "app/(portal)/portal/(app)/approvals")),
  );
  const nav = read("lib/portal/nav.ts");
  check(
    "portal nav has no Approvals item",
    !nav.toLowerCase().includes("approvals") && !nav.includes("/portal/approvals"),
  );
  const portalAppDir = path.join(root, "app/(portal)");
  const portalFiles = walkFiles(portalAppDir, new Set([".ts", ".tsx"]));
  for (const file of portalFiles) {
    const rel = path.relative(root, file);
    const src = readFileSync(file, "utf8");
    check(
      `${rel} does not import staff approval presentation`,
      !src.includes("lib/staff/approval-presentation") &&
        !src.includes("ApprovalQueue") &&
        !src.includes("requiresMatt"),
    );
  }

  // ── Batch F portfolio intact ─────────────────────────────────────────
  check(
    "Batch F portfolio gate still membership-only",
    resolvePortfolioAccess({
      switchingAvailable: true,
      authorizedClientIds: [1, 2],
      portfolioAccessAvailable: true,
    }).available === true,
  );
  check(
    "Batch F portfolio unavailable for single-account",
    resolvePortfolioAccess({
      switchingAvailable: false,
      authorizedClientIds: [1],
      portfolioAccessAvailable: false,
    }).available === false,
  );
  check(
    "Batch F portfolio page still present",
    existsSync(path.join(root, "app/(portal)/portal/(app)/portfolio/page.tsx")),
  );
  check(
    "Batch F verifier still registered",
    read("package.json").includes("verify:phase4-authorized-portfolio"),
  );

  // ── Upload durability contract remains ───────────────────────────────
  const storageResolve = read("lib/client-review-media/storage/resolve.ts");
  check(
    "production Vercel refuses local-disk upload fallback",
    storageResolve.includes("isVercelRuntime") &&
      storageResolve.includes("storage is not configured on Vercel"),
  );
  // Helper remains callable (env-dependent; not asserting true in CI).
  check(
    "blob configuration helper is exported",
    typeof isVercelBlobStorageConfigured === "function",
  );

  // ── No Batch G migration ─────────────────────────────────────────────
  check(
    "no Batch G migration registered",
    !read("migrations/index.ts").includes("requests-files-reports") &&
      !existsSync(
        path.join(root, "migrations/20260731_phase4_requests_files_reports.ts"),
      ),
  );
  check(
    "package.json registers Batch G verifier",
    read("package.json").includes("verify:phase4-requests-files-reports"),
  );

  // ── Pure helpers stay DB-free ────────────────────────────────────────
  const pureDir = path.join(root, "lib/portal/requests-files-reports");
  for (const file of walkFiles(pureDir, new Set([".ts"]))) {
    const rel = path.relative(root, file);
    const src = readFileSync(file, "utf8");
    check(
      `${rel} stays free of Payload/database`,
      !src.includes("getPayload") &&
        !src.includes("@payload-config") &&
        !src.includes("DATABASE_URL"),
    );
  }

  // ── Account switch still server-validated ────────────────────────────
  const switchRoute = read("app/api/portal/account/switch/route.ts");
  check(
    "account switch revalidates via switchPortalActiveClient",
    switchRoute.includes("getPortalSession") &&
      switchRoute.includes("switchPortalActiveClient"),
  );
  check(
    "account switch never trusts browser client alone",
    switchRoute.includes("Never trusts browser identity") ||
      switchRoute.includes("switchPortalActiveClient"),
  );

  // ── Query-string year filter cannot escape client scope ──────────────
  const reportsPage = read("app/(portal)/portal/(app)/reports/page.tsx");
  check(
    "reports year query filters only after getPortalReports(session.clientId)",
    reportsPage.includes("getPortalReports(session.clientId)") &&
      reportsPage.includes("filterYear"),
  );

  // ── Docs: current-state / roadmap mention Batch G ────────────────────
  const currentState = read("docs/KXD-OS-CURRENT-STATE.md");
  check(
    "current-state documents Batch G verifier",
    currentState.includes("verify:phase4-requests-files-reports"),
  );
  const roadmap = read("docs/KXD-OS-ROADMAP.md");
  check(
    "roadmap records Phase 4 Batches through H",
    roadmap.includes("Batch H") &&
      (roadmap.includes("Batches A–G") ||
        roadmap.includes("Batches A–H") ||
        roadmap.includes("verify:phase4-multi-client-portal-completion")),
  );

  console.log("\nPhase 4 Batch G requests/files/reports verification passed.\n");
}

main();
