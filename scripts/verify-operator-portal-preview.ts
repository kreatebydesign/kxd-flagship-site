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

  const membershipToken = buildOperatorPortalPreviewSession({
    adminUserId: 7,
    adminEmail: "matt@kreatebydesign.com",
    clientId: 5,
    clientName: "Cusick Morgan Motorsports",
    clientSlug: "cusick-morgan-motorsports",
    asPortalUserId: 13,
    asPortalUserDisplayName: "Don Cusick",
  });
  const membershipDecoded = decodeOperatorPortalPreviewSession(
    encodeOperatorPortalPreviewSession(membershipToken),
  );
  check(
    "membership-scoped preview token preserves asPortalUserId",
    Boolean(
      membershipDecoded &&
        membershipDecoded.asPortalUserId === 13 &&
        membershipDecoded.asPortalUserDisplayName === "Don Cusick",
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
    "single-client preview uses sentinel portalUserId 0",
    session.includes("let portalUserId = 0") || session.includes("portalUserId = 0"),
  );
  check(
    "membership-scoped preview resolves subject portalUserId without activating",
    session.includes("asPortalUserId") &&
      session.includes("portal-users") &&
      !session.includes("active: true"),
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
  check(
    "start supports membership-scoped preview via portalUserId",
    start.includes("portalUserId") &&
      start.includes("listPortalMembershipsForUser") &&
      start.includes("asPortalUserId") &&
      start.includes("does not activate"),
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
  check(
    "portal exit returns to Portal Access for membership-scoped preview",
    exitPortal.includes("asPortalUserId") &&
      exitPortal.includes("/admin/operations/portal-access"),
  );

  const actions = read("lib/client-command/workspace-actions.ts");
  check(
    "Client Command exposes Preview Client Portal + Manage Portal Access",
    actions.includes('id: "preview-portal"') &&
      actions.includes("Preview Client Portal") &&
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

  const portalAccess = read(
    "components/admin/operations/portal-access/PortalAccessScreen.tsx",
  );
  check(
    "Portal Access exposes Preview Client Portal for users with memberships",
    portalAccess.includes("PortalAccessPreviewButton") &&
      portalAccess.includes("portalUserId={user.id}"),
  );

  const layout = read("app/(portal)/portal/(app)/layout.tsx");
  check(
    "portal layout skips MFA/welcome for operator preview",
    layout.includes("!session.isOperatorPreview") &&
      layout.includes("operatorPreview="),
  );
  check(
    "portal layout enables account context for membership-scoped preview",
    layout.includes("membershipScopedPreview") &&
      layout.includes("resolvePortalAccountContext"),
  );

  const banner = read("components/portal/OperatorPortalPreviewBanner.tsx");
  check(
    "preview banner shows Operator Preview label + Exit Preview",
    banner.includes("Operator Preview") && banner.includes("Exit Preview"),
  );
  check(
    "preview banner names membership-scoped subject",
    banner.includes("Viewing portal as") &&
      banner.includes("asPortalUserDisplayName"),
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
  check(
    "staff-test preserves membership-scoped subject",
    staffTest.includes("asPortalUserId: prior.asPortalUserId") &&
      staffTest.includes("asPortalUserDisplayName: prior.asPortalUserDisplayName"),
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
    "account switch allows membership-scoped preview cookie remint without user mutation",
    switchRoute.includes("switchOperatorPortalPreviewClient") &&
      switchRoute.includes("asPortalUserId"),
  );
  check(
    "account switch still uses write session for real portal users",
    switchRoute.includes("getPortalWriteSession") &&
      switchRoute.includes("switchPortalActiveClient"),
  );

  const requests = read("app/api/portal/requests/route.ts");
  check(
    "portal request mutation uses write session",
    requests.includes("getPortalWriteSession"),
  );

  const switchHelper = read("lib/portal/operator-preview/switch-client.ts");
  check(
    "preview switch helper never syncs portal-user lastActive",
    switchHelper.includes("setOperatorPortalPreviewCookie") &&
      !switchHelper.includes("syncPortalUserLegacyClientAndPreference"),
  );

  console.log("\noperator portal preview checks passed.\n");
}

main();
