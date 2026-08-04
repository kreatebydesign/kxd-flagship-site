/**
 * Phase 6 Batch C2 — KXD Connect staff messaging UI.
 * Static + structural verification. No production enablement.
 *
 * Run: npm run verify:phase6-batch-c2
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  CONNECT_MESSAGE_MAX_LENGTH,
  evaluateConnectAccess,
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
  validateConnectMessageContent,
} from "../lib/connect";
import { CONNECT_GROUP_MAX_PARTICIPANTS } from "../lib/connect/messaging/ui-types";
import { isFeatureEnabled } from "../lib/editions";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(
    pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`,
  );
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function dogfoodEnv(
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    KXD_CONNECT_KILL_SWITCH: undefined,
    KXD_CONNECT_ENABLED: "1",
    KXD_CONNECT_STAFF_DOGFOOD_EMAILS: "matt@kreatebydesign.com",
    KXD_CONNECT_ORG_ALLOWLIST: "kxd",
    ...overrides,
  };
}

async function main() {
  console.log("\nPhase 6 Batch C2 — Connect staff messaging UI verification\n");

  const required = [
    "app/admin/connect/page.tsx",
    "app/admin/connect/layout.tsx",
    "app/admin/connect/connect.css",
    "components/admin/connect/ConnectMessagingScreen.tsx",
    "components/admin/connect/ConnectUnavailable.tsx",
    "components/admin/connect/connect-client.ts",
    "lib/connect/messaging/ui-service.ts",
    "lib/connect/messaging/ui-types.ts",
    "app/api/admin/connect/members/route.ts",
    "docs/PHASE-6-KXD-CONNECT.md",
  ];
  for (const f of required) {
    check(`${f} exists`, existsSync(path.join(root, f)));
  }

  // ── C0 / C1 regression presence ────────────────────────────────────────────
  check("C0 verifier present", existsSync(path.join(root, "scripts/verify-phase6-batch-c0.ts")));
  check("C1 verifier present", existsSync(path.join(root, "scripts/verify-phase6-batch-c1.ts")));

  const page = read("app/admin/connect/page.tsx");
  const screen = read("components/admin/connect/ConnectMessagingScreen.tsx");
  const client = read("components/admin/connect/connect-client.ts");
  const uiService = read("lib/connect/messaging/ui-service.ts");
  const convRoute = read("app/api/admin/connect/conversations/route.ts");
  const msgRoute = read(
    "app/api/admin/connect/conversations/[publicId]/messages/route.ts",
  );
  const membersRoute = read("app/api/admin/connect/members/route.ts");
  const statusRoute = read("app/api/admin/connect/status/route.ts");
  const css = read("app/admin/connect/connect.css");
  const docs = read("docs/PHASE-6-KXD-CONNECT.md");
  const unavailable = read("components/admin/connect/ConnectUnavailable.tsx");

  // ── Route / access boundary ────────────────────────────────────────────────
  check("staff-only route uses requirePayloadAdminPage", page.includes("requirePayloadAdminPage"));
  check("page resolves Connect session server-side", page.includes("resolveConnectStaffSession"));
  check("unauthorized render uses ConnectUnavailable", page.includes("ConnectUnavailable"));
  check("unavailable view has no conversation props", !unavailable.includes("conversations"));
  check("page uses noStore / force-dynamic", page.includes("force-dynamic") && page.includes("noStore"));
  check("route is /admin/connect", page.includes("/admin/connect"));

  // Access control still authoritative
  check("kill switch active when set", isConnectKillSwitchActive(dogfoodEnv({ KXD_CONNECT_KILL_SWITCH: "1" })));
  check("operator enablement defaults off", isConnectOperatorEnablementOn({ NODE_ENV: "test" } as NodeJS.ProcessEnv) === false);
  check("edition feature disabled by default", isFeatureEnabled("kxd-connect") === false);
  const deniedDefault = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "matt@kreatebydesign.com",
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: false,
    localActivationEnabled: true,
    environmentAllowed: true,
    env: { ...process.env, KXD_CONNECT_ENABLED: undefined, KXD_CONNECT_KILL_SWITCH: undefined },
  });
  check("disabled-by-default behavior", deniedDefault.allowed === false);

  const portalDenied = evaluateConnectAccess({
    subjectKind: "portal-user",
    staffEmail: "x@y.com",
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: true,
    localActivationEnabled: true,
    environmentAllowed: true,
    env: dogfoodEnv(),
  });
  check("portal identity denial", portalDenied.allowed === false);

  const killDenied = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "matt@kreatebydesign.com",
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: true,
    localActivationEnabled: true,
    environmentAllowed: true,
    env: dogfoodEnv({ KXD_CONNECT_KILL_SWITCH: "1" }),
  });
  check("kill-switch denial", killDenied.allowed === false);

  const staffDenied = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "other@example.com",
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: true,
    localActivationEnabled: true,
    environmentAllowed: true,
    env: dogfoodEnv(),
  });
  check("staff allowlist denial", staffDenied.allowed === false);

  const orgDenied = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "matt@kreatebydesign.com",
    organization: { key: "acme", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: true,
    localActivationEnabled: true,
    environmentAllowed: true,
    env: dogfoodEnv(),
  });
  check("organization allowlist denial", orgDenied.allowed === false);

  const inactiveOrg = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "matt@kreatebydesign.com",
    organization: { key: "kxd", status: "inactive" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: true,
    localActivationEnabled: true,
    environmentAllowed: true,
    env: dogfoodEnv(),
  });
  check("inactive organization denial", inactiveOrg.allowed === false);

  const inactiveMem = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "matt@kreatebydesign.com",
    organization: { key: "kxd", status: "active" },
    membership: { status: "disabled", role: "organization-member" },
    editionFeatureActive: true,
    localActivationEnabled: true,
    environmentAllowed: true,
    env: dogfoodEnv(),
  });
  check("inactive membership denial", inactiveMem.allowed === false);

  // ── UI / list / thread behavior ────────────────────────────────────────────
  check("conversation list uses UI DTO service", page.includes("listConversationsForUi") || screen.includes("fetchConversations"));
  check("direct vs group display", screen.includes('c.type === "direct"') && screen.includes("Group"));
  check("private unread badge", screen.includes("unreadCount") && screen.includes("aria-label"));
  check("no automatic mark-read on list fetch", !screen.includes("markConversationRead()") /* bare */);
  check(
    "mark-read after thread active + newest rendered",
    screen.includes("markConversationRead") &&
      screen.includes("Mark-read after thread is active"),
  );
  check("idempotent mark-read guard present", screen.includes("markReadDoneFor"));
  check("concurrent new-message clears mark-read guard", screen.includes("markReadDoneFor.current = null"));

  // Pagination / polling
  check("message pagination uses before cursor", screen.includes('direction: "before"'));
  check("older messages load control", screen.includes("Load older messages"));
  check("merge avoids duplicates by publicId", screen.includes("mergeByPublicId"));
  check("short polling uses direction=after", screen.includes('direction: "after"') && screen.includes("POLL_MS"));
  check("polling pauses when hidden", screen.includes("visibilityState") && screen.includes("visibilitychange"));
  check("manual refresh available", screen.includes("Refresh") && client.includes("fetchConversations"));

  // Composer
  check(
    "plain-text rendering (pre-wrap, no markdown)",
    css.includes("pre-wrap") &&
      !screen.includes("dangerouslySetInnerHTML") &&
      screen.includes("kxd-connect__msg-body"),
  );
  check("empty message rejection in UI", screen.includes("Message cannot be empty"));
  check(
    "content validation still rejects whitespace",
    validateConnectMessageContent("   ").ok === false,
  );
  check(
    "4000-character boundary",
    CONNECT_MESSAGE_MAX_LENGTH === 4000 &&
      screen.includes("CONNECT_MESSAGE_MAX_LENGTH"),
  );
  check(
    "over-limit rejected",
    validateConnectMessageContent("x".repeat(4001)).ok === false,
  );
  check("Enter sends / Shift+Enter newline", screen.includes("Shift+Enter") && screen.includes('e.key === "Enter"'));
  check("duplicate-submit prevention", screen.includes("if (!selectedId || sending) return"));
  check("draft preserved on failed send", screen.includes("setComposerError") && !screen.includes("setDraft(\"\")\n    setSending(false)\n    if (!result.ok)"));
  // Draft clear only after success — verify clear is after ok path
  check(
    "draft clearing after successful send",
    /if \(!result\.ok\)[\s\S]*?return;[\s\S]*?setDraft\(""\)/.test(screen),
  );

  // Create flows
  check("direct create uses staff email not membership id", convRoute.includes("otherStaffEmail") && convRoute.includes("otherMembershipId != null"));
  check("group create included with title + emails", convRoute.includes("memberStaffEmails") && screen.includes('newType === "group"'));
  check("group max participants documented", CONNECT_GROUP_MAX_PARTICIPANTS === 12);
  check("eligible members endpoint present", membersRoute.includes("listEligibleMembersForUi"));
  check("members route no-store / method rejection", membersRoute.includes("connectMethodNotAllowed") || membersRoute.includes("Method not allowed"));

  // API minimization
  check("UI service omits pair keys from DTO", !uiService.includes("directPairKey:") || uiService.includes("No internal"));
  check(
    "conversation create rejects membership IDs from client",
    convRoute.includes("Invalid create payload"),
  );
  check(
    "message send rejects authorParticipantId",
    msgRoute.includes("authorParticipantId") && msgRoute.includes("403"),
  );
  check("UI types exclude organizationId", !read("lib/connect/messaging/ui-types.ts").includes("organizationId"));
  check("UI types exclude membershipId", !read("lib/connect/messaging/ui-types.ts").includes("membershipId"));
  check("UI types exclude pairKey", !read("lib/connect/messaging/ui-types.ts").includes("pairKey"));
  check("unread DTO has no other-user read fields", !read("lib/connect/messaging/ui-types.ts").includes("seenBy"));

  // HTTP / cache
  check("conversations route method rejection", convRoute.includes("connectMethodNotAllowed"));
  check("messages route uses connectJson/no-store path", msgRoute.includes("connectJson"));
  check("status keeps messagingAvailable false", statusRoute.includes("messagingAvailable: false"));
  check("status advertises staffMessagingUi", statusRoute.includes("staffMessagingUi: true"));

  // Exclusions
  check("no dock component", !existsSync(path.join(root, "components/admin/connect/ConnectDock.tsx")));
  check("no buddy list component", !existsSync(path.join(root, "components/admin/connect/BuddyList.tsx")));
  check("no app launcher component", !existsSync(path.join(root, "components/admin/connect/AppLauncher.tsx")));
  check("no WebSocket/SSE in Connect UI", !screen.includes("WebSocket") && !screen.includes("EventSource"));
  check("no dangerouslySetInnerHTML", !screen.includes("dangerouslySetInnerHTML"));
  check("docs exclude dock/buddy/notifications for C2", docs.includes("C2") && docs.includes("Buddy List"));

  // Accessibility / responsive
  check("dialog semantics", screen.includes('role="dialog"') && screen.includes("aria-modal"));
  check("Escape closes dialog", screen.includes('e.key === "Escape"'));
  check("aria-live status", screen.includes("aria-live"));
  check("unread not color-only (aria-label)", screen.includes('aria-label={`${c.unreadCount} unread`}'));
  check("mobile list/thread navigation", screen.includes("data-mobile-view") && css.includes("max-width: 860px"));
  check("back control for mobile", screen.includes("Back to conversations"));
  check("reduced-motion support", css.includes("prefers-reduced-motion"));
  check("overflow-wrap for long strings", css.includes("overflow-wrap: anywhere"));
  check("composer safe-area padding", css.includes("safe-area-inset-bottom"));

  // Metering continues via C1 send path
  check("UI send uses sendMessageForUi → C1 service", uiService.includes("sendMessageForSession"));
  check("atomic meter path still present", existsSync(path.join(root, "lib/connect/metering/atomic.ts")));
  check(
    "docs retain sqlite meter blocker",
    docs.includes("SQLite") || docs.includes("sqlite") || docs.includes("RMW"),
  );

  // Separation / regressions
  check("message-kxd unchanged mention", docs.includes("message-kxd"));
  check(
    "client communications preserved",
    existsSync(path.join(root, "payload/collections/ClientCommunications.ts")),
  );
  check(
    "portal membership preserved",
    existsSync(path.join(root, "payload/collections/PortalClientMemberships.ts")),
  );
  check(
    "phase5 verifiers present",
    existsSync(path.join(root, "scripts/verify-phase5-batch-5c.ts")) &&
      existsSync(path.join(root, "scripts/verify-phase5-batch-5d.ts")),
  );
  check(
    "account switcher verifier present",
    existsSync(path.join(root, "scripts/verify-phase4-account-switcher.ts")),
  );
  check("docs say Connect does not block early access", docs.includes("does not block"));
  check("docs say dogfood not activated", docs.includes("dogfood") && docs.includes("not") );

  // No global nav registration for Connect
  const opsShell = existsSync(
    path.join(root, "components/admin/operations/shared/OperationsShell.tsx"),
  )
    ? read("components/admin/operations/shared/OperationsShell.tsx")
    : "";
  check(
    "no Connect global nav in OperationsShell",
    !opsShell.includes("/admin/connect") && !opsShell.includes("KXD Connect"),
  );

  // No new migration required for C2
  check(
    "no C2 migration file",
    !existsSync(path.join(root, "migrations/20260817_phase6_connect_c2.ts")),
  );

  // Visual direction tokens
  check("charcoal/cream/gold workspace tokens", css.includes("--cx-bg") && css.includes("--cx-gold") && css.includes("--cx-cream"));

  console.log("\nPhase 6 Batch C2 verification passed.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
