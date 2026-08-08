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

  console.log("\n12+ checks passed — operator portal preview verified.\n");
}

main();
