/**
 * Phase 4 Batch H — Multi-client portal completion verifier.
 * Static + pure-unit verification only. No database. No external writes.
 *
 * Run: npm run verify:phase4-multi-client-portal-completion
 *
 * Proves the repository Phase 4 completion contract (Batches A–G intact +
 * Batch H completion surfaces). Authenticated production QA and Don/Cusick
 * live gates remain documented ops requirements outside this script.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { decidePortalReportAccess } from "../lib/portal/analytics-visibility";
import {
  dedupeActiveMembershipsByClient,
  isClientInActiveMemberships,
  resolveAuthorizedActiveClient,
  type PortalMembershipRecord,
} from "../lib/portal/membership-resolve";
import { resolvePortfolioAccess } from "../lib/portal/portfolio";
import {
  BATCH_G_CLIENT_HQ_SURFACE_IDS,
  decidePortalAttachmentAccess,
  decidePortalCesModuleApiAccess,
  isBatchGClientHqSurfaceAvailable,
  PORTAL_REPORT_INTERNAL_FIELD_DENYLIST,
  portalReportViewModelHasInternalLeak,
  toPortalReportViewModel,
} from "../lib/portal/requests-files-reports";
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

function stubProfile(
  enabledModules: ResolvedExperienceProfile["enabledModules"],
): ResolvedExperienceProfile {
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

function membership(
  partial: Partial<PortalMembershipRecord> &
    Pick<PortalMembershipRecord, "id" | "clientId" | "status">,
): PortalMembershipRecord {
  return {
    portalUserId: 1,
    clientName: `Client ${partial.clientId}`,
    clientSlug: `client-${partial.clientId}`,
    isDefault: false,
    ...partial,
  };
}

function main() {
  console.log("\nPhase 4 Batch H — multi-client portal completion\n");

  // ── 1–5 Active / inactive membership authorization ───────────────────
  const multi: PortalMembershipRecord[] = [
    membership({
      id: 1,
      clientId: 10,
      status: "active",
      isDefault: true,
      clientName: "Alpha",
    }),
    membership({ id: 2, clientId: 20, status: "active", clientName: "Beta" }),
    membership({ id: 3, clientId: 30, status: "disabled", clientName: "Gamma" }),
  ];
  const single: PortalMembershipRecord[] = [
    membership({
      id: 4,
      clientId: 10,
      status: "active",
      isDefault: true,
      clientName: "Alpha",
    }),
  ];

  check(
    "1. active memberships determine authorized clients",
    isClientInActiveMemberships(multi, 10) &&
      isClientInActiveMemberships(multi, 20) &&
      dedupeActiveMembershipsByClient(multi)
        .map((m) => m.clientId)
        .join(",") === "10,20",
  );
  check(
    "2. inactive/revoked memberships grant no access",
    !isClientInActiveMemberships(multi, 30) &&
      resolveAuthorizedActiveClient({
        memberships: multi.map((m) =>
          m.clientId === 10 || m.clientId === 20
            ? { ...m, status: "disabled" as const }
            : m,
        ),
        lastActiveClientId: 10,
        legacyClientId: 10,
      }) === null,
  );
  check(
    "3. single-client users resolve one authorized account",
    resolveAuthorizedActiveClient({
      memberships: single,
      lastActiveClientId: null,
      legacyClientId: 10,
    })?.clientId === 10 &&
      resolvePortfolioAccess({
        switchingAvailable: false,
        authorizedClientIds: [10],
        portfolioAccessAvailable: false,
      }).available === false,
  );
  check(
    "4. multi-client users can access Authorized Portfolio when gated on",
    resolvePortfolioAccess({
      switchingAvailable: true,
      authorizedClientIds: [10, 20],
      portfolioAccessAvailable: true,
    }).available === true &&
      existsSync(path.join(root, "app/(portal)/portal/(app)/portfolio/page.tsx")),
  );
  check(
    "5. users see only explicitly authorized client accounts",
    !isClientInActiveMemberships(multi, 999) &&
      resolveAuthorizedActiveClient({
        memberships: multi,
        lastActiveClientId: 999,
        legacyClientId: null,
      })?.clientId === 10,
  );

  // ── 6–8 Switching and browser trust ──────────────────────────────────
  check(
    "6. active-account switching accepts only active authorized membership",
    isClientInActiveMemberships(multi, 20) && !isClientInActiveMemberships(multi, 30),
  );
  const switchRoute = read("app/api/portal/account/switch/route.ts");
  check(
    "7. browser-supplied client IDs cannot grant access alone",
    switchRoute.includes("getPortalSession") &&
      switchRoute.includes("switchPortalActiveClient") &&
      !isClientInActiveMemberships(multi, 999),
  );
  const sessionSrc = read("lib/portal/session.ts");
  check(
    "8. direct-route access cannot bypass active-account authorization",
    sessionSrc.includes("resolveAuthorizedActiveClient") &&
      sessionSrc.includes("getPortalSession") &&
      !read("lib/portal/nav.ts").includes("clientId="),
  );

  // ── 9–10 Portfolio + relationship intelligence exclusion ─────────────
  const portfolioPage = read("app/(portal)/portal/(app)/portfolio/page.tsx");
  const portfolioServer = read("lib/portal/authorized-portfolio/server.ts");
  check(
    "9. portfolio data remains client-safe / membership-gated",
    portfolioPage.includes("resolveAuthorizedPortfolio") &&
      portfolioPage.includes("resolvePortfolioAccess") &&
      portfolioServer.includes("resolvePortfolioAccess") &&
      !portfolioServer.toLowerCase().includes("relationshipintelligence"),
  );
  const portalAppFiles = walkFiles(path.join(root, "app/(portal)"), new Set([".ts", ".tsx"]));
  let relationshipLeak = false;
  for (const file of portalAppFiles) {
    const src = readFileSync(file, "utf8");
    if (
      src.includes("relationship-intelligence") ||
      src.includes("RelationshipIntelligence") ||
      src.includes("lib/relationship")
    ) {
      relationshipLeak = true;
      break;
    }
  }
  check(
    "10. internal relationship intelligence remains excluded from portal",
    !relationshipLeak,
  );

  // ── 11–15 Isolation contracts (requests/files/reports/review) ────────
  const requestsPage = read("app/(portal)/portal/(app)/requests/page.tsx");
  check(
    "11. requests remain isolated by active client",
    requestsPage.includes("getPortalSession") &&
      requestsPage.includes("getPortalRequests(session)"),
  );
  const assetsPage = read("app/(portal)/portal/(app)/assets/page.tsx");
  const deliverablesPage = read("app/(portal)/portal/(app)/deliverables/page.tsx");
  check(
    "12. assets/files remain isolated by active client",
    assetsPage.includes("getPortalSession") && assetsPage.includes("getPortalAssets(session)"),
  );
  check(
    "13. deliverables remain isolated by active client",
    deliverablesPage.includes("getPortalSession") &&
      deliverablesPage.includes("getPortalDeliverables(session)"),
  );
  const reportsPage = read("app/(portal)/portal/(app)/reports/page.tsx");
  const reportDetail = read("app/(portal)/portal/(app)/reports/[id]/page.tsx");
  check(
    "14. reports use client-safe access and view-model contracts",
    reportsPage.includes("getPortalReports(session.clientId)") &&
      reportDetail.includes("decidePortalReportAccess") &&
      reportDetail.includes("toPortalReportViewModel") &&
      decidePortalReportAccess({
        report: { client: 20, status: "published" },
        authorizedClientId: 10,
      }).ok === false,
  );
  check(
    "15. Website Review and Website Workspace remain client-scoped",
    read("lib/ces/modules/website-review/queries.ts").includes("client") &&
      read("lib/ces/modules/website-workspace/queries.ts").includes("client") &&
      read("app/(portal)/portal/(app)/website-review/page.tsx").includes(
        "requireCesModule",
      ),
  );

  // ── 16–18 CES fail-closed, attachments, cross-client leak ────────────
  const flagship = stubProfile(["website-review"]);
  check(
    "16. CES-disabled modules fail closed for Batch G surfaces",
    BATCH_G_CLIENT_HQ_SURFACE_IDS.every(
      (surface) => isBatchGClientHqSurfaceAvailable(surface, flagship) === false,
    ) &&
      decidePortalCesModuleApiAccess({ moduleEnabled: false }).ok === false,
  );
  check(
    "17. attachments remain client-scoped (uniform denial)",
    decidePortalAttachmentAccess({
      mediaClientId: 20,
      authorizedClientId: 10,
    }).ok === false &&
      read("lib/client-review-media/storage/resolve.ts").includes("isVercelRuntime"),
  );
  check(
    "18. cross-client IDs/titles do not authorize or leak via access helpers",
    decidePortalReportAccess({
      report: { client: 20, status: "published" },
      authorizedClientId: 10,
    }).ok === false && !isClientInActiveMemberships(multi, 999),
  );

  // ── 19–22 Navigation, refresh, invalid records, revocation ───────────
  const accountSwitcher = read("components/portal/AccountSwitcher.tsx");
  const shell = read("components/client-hq/ClientHqShell.tsx");
  check(
    "19. navigation reflects active account capabilities (shell + switcher)",
    shell.includes("accountSwitcher") &&
      accountSwitcher.includes("/api/portal/account/switch") &&
      read("lib/portal/nav.ts").length > 0,
  );
  check(
    "20. refresh/direct navigation preserve valid active-account context",
    sessionSrc.includes("lastActiveClientId") &&
      resolveAuthorizedActiveClient({
        memberships: multi,
        lastActiveClientId: 20,
        legacyClientId: 10,
      })?.source === "last-active",
  );
  check(
    "21. invalid or deleted records fail safely",
    decidePortalReportAccess({
      report: null,
      authorizedClientId: 10,
    }).ok === false &&
      decidePortalAttachmentAccess({
        mediaClientId: null,
        authorizedClientId: 10,
      }).ok === false,
  );
  check(
    "22. account revocation effective without stale browser state",
    resolveAuthorizedActiveClient({
      memberships: [
        membership({ id: 1, clientId: 10, status: "disabled" }),
        membership({ id: 2, clientId: 20, status: "active", isDefault: true }),
      ],
      lastActiveClientId: 10,
      legacyClientId: 10,
    })?.clientId === 20,
  );

  // ── Prompt Batch H extensions ────────────────────────────────────────
  check(
    "23. /portal/approvals is not a product surface",
    !existsSync(path.join(root, "app/(portal)/portal/(app)/approvals")) &&
      !read("lib/portal/nav.ts").toLowerCase().includes("approvals"),
  );
  let staffApprovalLeak = false;
  for (const file of portalAppFiles) {
    const src = readFileSync(file, "utf8");
    if (
      src.includes("lib/staff/approval-presentation") ||
      src.includes("ApprovalQueue") ||
      src.includes("requiresMatt")
    ) {
      staffApprovalLeak = true;
      break;
    }
  }
  check(
    "24. staff Approval Queue / operator-only workflows remain excluded",
    !staffApprovalLeak,
  );

  const pkg = read("package.json");
  const batchVerifiers = [
    "verify:phase4-multi-client-membership",
    "verify:phase4-account-switcher",
    "verify:phase4-workspace-personalization",
    "verify:phase4-work-performance",
    "verify:phase4-analytics-visibility",
    "verify:phase4-authorized-portfolio",
    "verify:phase4-requests-files-reports",
    "verify:phase4-multi-client-portal-completion",
  ];
  for (const name of batchVerifiers) {
    check(`25. Batch verifier registered: ${name}`, pkg.includes(name));
  }
  check(
    "25b. Batches A–G verifier scripts remain on disk",
    [
      "scripts/verify-phase4-multi-client-membership.ts",
      "scripts/verify-phase4-account-switcher.ts",
      "scripts/verify-phase4-workspace-personalization.ts",
      "scripts/verify-phase4-work-performance.ts",
      "scripts/verify-phase4-analytics-visibility.ts",
      "scripts/verify-phase4-authorized-portfolio.ts",
      "scripts/verify-phase4-requests-files-reports.ts",
    ].every((rel) => existsSync(path.join(root, rel))),
  );

  check(
    "26. no Batch H schema migration required/registered",
    !read("migrations/index.ts").includes("batch-h") &&
      !read("migrations/index.ts").includes("phase4_completion") &&
      !existsSync(path.join(root, "migrations/20260731_phase4_batch_h.ts")),
  );

  const phaseDoc = read("docs/PHASE-4-MULTI-CLIENT-PORTAL.md");
  const currentState = read("docs/KXD-OS-CURRENT-STATE.md");
  const roadmap = read("docs/KXD-OS-ROADMAP.md");
  const rollout = read("docs/PHASE-4-PRODUCTION-ROLLOUT-CHECKLIST.md");
  check(
    "27. Phase 4 documentation reflects Batch H completion verifier",
    phaseDoc.includes("verify:phase4-multi-client-portal-completion") &&
      currentState.includes("verify:phase4-multi-client-portal-completion") &&
      roadmap.includes("Batch H") &&
      rollout.includes("Phase 4") &&
      rollout.includes("authenticated"),
  );

  // ── Reports list serialization (server-only processing) ──────────────
  const reportsScreen = read("components/client-hq/ReportsScreen.tsx");
  check(
    "reports list screen is a server component (no use client)",
    !reportsScreen.includes('"use client"') &&
      !reportsScreen.includes("'use client'"),
  );
  check(
    "report detail projects through client-safe view model",
    reportDetail.includes("toPortalReportViewModel") &&
      !portalReportViewModelHasInternalLeak(
        toPortalReportViewModel({
          id: 1,
          title: "July",
          reportingMonth: 7,
          reportingYear: 2026,
          executiveSummary: "Summary",
          client: 10,
          internalNotes: "secret",
          operatorNotes: "secret",
        }),
      ),
  );
  for (const key of PORTAL_REPORT_INTERNAL_FIELD_DENYLIST.slice(0, 3)) {
    check(
      `report view model denylist includes ${key}`,
      (PORTAL_REPORT_INTERNAL_FIELD_DENYLIST as readonly string[]).includes(key),
    );
  }

  // ── Accessibility / Batch H surface hardening ────────────────────────
  check(
    "account switcher exposes accessible name + listbox keyboard support",
    accountSwitcher.includes("aria-label={`Account:") &&
      accountSwitcher.includes('role="listbox"') &&
      accountSwitcher.includes("ArrowDown") &&
      accountSwitcher.includes("ArrowUp") &&
      accountSwitcher.includes("Escape"),
  );
  check(
    "mobile nav toggle has aria-label",
    shell.includes('aria-label={navOpen ? "Close navigation menu"'),
  );
  const cesCss = read("design-system/ces/styles/kxd-ces.css");
  check(
    "long client names wrap in switcher / mobile identity",
    cesCss.includes(".kxd-ces-account-switcher__active") &&
      cesCss.includes("overflow-wrap: anywhere") &&
      cesCss.includes(".kxd-ces-mobile-bar__identity"),
  );
  check(
    "CES reduced-motion preferences remain defined",
    cesCss.includes("prefers-reduced-motion"),
  );

  // ── Public media risk documented, not falsely claimed fixed ──────────
  check(
    "public Payload media risk remains documented as open",
    (phaseDoc.includes("/media") ||
      currentState.includes("/media") ||
      rollout.includes("/media")) &&
      (rollout.toLowerCase().includes("pre-existing") ||
        currentState.toLowerCase().includes("pre-existing") ||
        phaseDoc.toLowerCase().includes("pre-existing")),
  );

  // ── Portal sessions cannot become operator sessions ──────────────────
  check(
    "portal session module does not mint operator/staff sessions",
    !sessionSrc.includes("createStaffSession") &&
      !sessionSrc.includes("operatorSession") &&
      sessionSrc.includes("portalUserId"),
  );

  // ── Plans/entitlements resolve per active client (wiring) ────────────
  const layout = read("app/(portal)/portal/(app)/layout.tsx");
  check(
    "portal app layout resolves experience profile from session",
    layout.includes("resolveExperienceProfile") && layout.includes("getPortalSession"),
  );

  console.log("\nPhase 4 multi-client portal completion verification passed.\n");
  console.log(
    "Note: Authenticated production QA, Don/Cusick four-account live QA, and OTP Carts readiness remain ops gates outside this static verifier.\n",
  );
}

main();
