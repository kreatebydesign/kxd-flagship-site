/**
 * Operator Portal Preview — focused architecture verifier (no DB).
 * Run: npx tsx scripts/verify-operator-portal-preview.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { isWellFormedOperatorPortalPreviewCookie } from "../lib/portal/constants";
import {
  buildOperatorPortalPreviewSession,
  decodeOperatorPortalPreviewSession,
  encodeOperatorPortalPreviewSession,
} from "../lib/portal/operator-preview/token";

const root = process.cwd();

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✓ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) throw new Error(label);
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function main() {
  console.log("\nverify:operator-portal-preview\n");

  const token = buildOperatorPortalPreviewSession({
    adminUserId: 7,
    adminEmail: "matt@kreatebydesign.com",
    clientId: 14,
    clientName: "OTP Carts",
    clientSlug: "otp-carts",
  });
  const encoded = encodeOperatorPortalPreviewSession(token);
  const decoded = decodeOperatorPortalPreviewSession(encoded);
  check(
    "preview token round-trips with kind + client scope",
    Boolean(
      decoded &&
        decoded.kind === "operator-portal-preview" &&
        decoded.adminUserId === 7 &&
        decoded.clientId === 14 &&
        decoded.clientSlug === "otp-carts",
    ),
  );
  const [body] = encoded.split(".");
  check(
    "preview token rejects tampered signature",
    decodeOperatorPortalPreviewSession(
      `${body}.${"0".repeat(64)}`,
    ) == null,
  );
  check(
    "middleware well-formed gate accepts encoded cookie",
    isWellFormedOperatorPortalPreviewCookie(encoded),
  );
  check(
    "middleware well-formed gate rejects portal-user cookie shape",
    !isWellFormedOperatorPortalPreviewCookie("12.abcdef"),
  );

  const session = read("lib/portal/session.ts");
  check(
    "portal session prefers operator preview over portal-user cookie",
    session.includes("resolveOperatorPreviewSession") &&
      session.includes("isStudioPayloadOperator") &&
      session.includes("isOperatorPreview: true"),
  );
  check(
    "write session denies operator preview",
    session.includes("getPortalWriteSession") &&
      session.includes("session.isOperatorPreview"),
  );
  check(
    "Website Review write helper allows staff-test only",
    session.includes("canWriteWebsiteReview") &&
      session.includes('mode === "staff-test"') &&
      session.includes("getPortalWebsiteReviewWriteSession"),
  );
  check(
    "preview uses sentinel portalUserId 0 (not a real membership)",
    session.includes("portalUserId: 0"),
  );

  const middleware = read("middleware.ts");
  check(
    "middleware allows portal paths with operator preview + admin cookie",
    middleware.includes("OPERATOR_PORTAL_PREVIEW_COOKIE") &&
      middleware.includes("hasOperatorPreview") &&
      middleware.includes("hasPayloadAuthCookie(request)"),
  );

  const start = read("app/api/admin/portal/preview/start/route.ts");
  check(
    "start requires studio operator (restricted staff denied)",
    start.includes("isStudioPayloadOperator") &&
      start.includes("Restricted staff cannot preview"),
  );
  check(
    "start destroys real portal-user session before preview",
    start.includes("destroyPortalSession"),
  );
  check(
    "start publishes non-client-attributed activity",
    start.includes("portal.operator-preview-started") &&
      start.includes("attributedToPortalUser: false"),
  );
  check(
    "start emits explicit switch audit when reminting another client",
    start.includes("portal.operator-preview-switched") &&
      start.includes("fromClientId") &&
      start.includes("toClientId: clientId") &&
      start.includes("getOperatorPortalPreviewCookieSession"),
  );

  const reportView = read("app/api/portal/reports/[id]/view/route.ts");
  check(
    "report view skips viewCount increment during operator preview",
    reportView.includes("session.isOperatorPreview") &&
      reportView.includes("recordPortalReportView"),
  );
  check(
    "report view still records views for real portal users",
    /if\s*\(\s*!session\.isOperatorPreview\s*\)[\s\S]*recordPortalReportView/.test(
      reportView,
    ),
  );

  const exitPortal = read("app/api/portal/preview/exit/route.ts");
  check(
    "portal exit requires matching studio operator",
    exitPortal.includes("getPayloadAdminUser") &&
      exitPortal.includes("Number(admin.id) !== preview.adminUserId"),
  );

  const actions = read("lib/client-command/workspace-actions.ts");
  check(
    "Client Command exposes Preview Portal + Manage Portal Access",
    actions.includes('id: "preview-portal"') &&
      actions.includes('action: "portal-preview-start"') &&
      actions.includes('id: "manage-portal-access"') &&
      !actions.includes('id: "open-portal"'),
  );

  const workspace = read(
    "components/admin/operations/client-command/ClientCommandWorkspace.tsx",
  );
  check(
    "Client Command wires PortalPreviewQuickAction",
    workspace.includes("PortalPreviewQuickAction") &&
      workspace.includes('action === "portal-preview-start"'),
  );

  const layout = read("app/(portal)/portal/(app)/layout.tsx");
  check(
    "portal layout skips MFA/welcome for operator preview",
    layout.includes("!session.isOperatorPreview") &&
      layout.includes("operatorPreview="),
  );
  check(
    "portal layout disables account switcher in preview",
    layout.includes("session.isOperatorPreview") &&
      layout.includes("resolvePortalAccountContext"),
  );

  const banner = read("components/portal/OperatorPortalPreviewBanner.tsx");
  check(
    "preview banner shows Operator Preview label + Exit Preview",
    banner.includes("Operator Preview ·") && banner.includes("Exit Preview"),
  );
  check(
    "preview banner can elevate to Staff Test Mode",
    banner.includes("Enable Staff Test Mode") &&
      banner.includes("/api/admin/portal/preview/staff-test") &&
      banner.includes("Staff Test Mode"),
  );

  const staffTest = read("app/api/admin/portal/preview/staff-test/route.ts");
  check(
    "staff-test route requires studio operator + existing preview cookie",
    staffTest.includes("isStudioPayloadOperator") &&
      staffTest.includes("getOperatorPortalPreviewCookieSession") &&
      staffTest.includes('"staff-test"') &&
      staffTest.includes("setOperatorPortalPreviewCookie"),
  );

  const reviewRoute = read("app/api/portal/website-review/route.ts");
  check(
    "website-review submit uses staff-test write gate",
    reviewRoute.includes("canWriteWebsiteReview") &&
      reviewRoute.includes("resolveWebsiteReviewActor"),
  );

  const shell = read("components/client-hq/ClientHqShell.tsx");
  check(
    "preview banner sits outside .kxd-os-app so it cannot steal a grid track",
    /operatorPreview[\s\S]*OperatorPortalPreviewBanner[\s\S]*className=\{`kxd-os-app/.test(shell) &&
      !/kxd-os-app[\s\S]*OperatorPortalPreviewBanner/.test(shell),
  );
  check(
    "preview banner sits outside KxdShell so large-desktop atelier cannot clip studio chrome",
    shell.indexOf("OperatorPortalPreviewBanner") < shell.indexOf("<KxdShell") &&
      shell.indexOf("OperatorPortalPreviewBanner") < shell.indexOf("kxd-os-shell--app"),
  );

  const switchRoute = read("app/api/portal/account/switch/route.ts");
  check(
    "account switch uses write session (preview cannot switch clients)",
    switchRoute.includes("getPortalWriteSession"),
  );

  const requests = read("app/api/portal/requests/route.ts");
  check(
    "portal request mutation uses write session",
    requests.includes("getPortalWriteSession"),
  );

  console.log("\n16+ checks passed — operator portal preview verified.\n");
}

main();
