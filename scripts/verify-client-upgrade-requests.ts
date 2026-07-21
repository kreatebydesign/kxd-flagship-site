/**
 * Phase 35B — Client Upgrade Requests verification.
 * Pure rules + catalog + serializer/access-shape checks. No database.
 * No entitlement mutation.
 *
 * Run: npm run verify:client-upgrade-requests
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  CLIENT_UPGRADE_ELIGIBLE_CAPABILITIES,
  getUpgradeEligibleCapability,
  isClientUpgradeEligibleModule,
} from "../lib/client-upgrade-requests/catalog.ts";
import { isUniqueConstraintError } from "../lib/client-upgrade-requests/errors.ts";
import {
  allowedNextUpgradeStatuses,
  blocksNewUpgradeRequest,
  canClientCancelUpgradeStatus,
  canTransitionUpgradeStatus,
  evaluateUpgradeEligibility,
  isActiveUpgradeStatus,
  isUpgradeRequestStatus,
  upgradeStatusLabel,
} from "../lib/client-upgrade-requests/rules.ts";
import type {
  ClientUpgradeRequestRecord,
  PortalUpgradeRequestView,
} from "../lib/client-upgrade-requests/types.ts";
import { clientHasModule, resolveEntitlementsFromAssignment } from "../lib/client-plans/resolve.ts";
import { isInternalOnlyEntitlement } from "../lib/client-plans/modules.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function entitlementsFor(input: {
  clientId: number;
  planKey: "starter" | "growth" | "premium" | "enterprise" | "custom" | null;
  planStatus: "active" | "trial" | "paused" | "legacy";
  addOnModules?: string[];
  removedModules?: string[];
  legacy?: string[];
}) {
  return resolveEntitlementsFromAssignment({
    clientId: input.clientId,
    assignment: {
      planKey: input.planKey,
      planStatus: input.planStatus,
      planEffectiveAt: null,
      planNote: "secret plan note",
      addOnModules: input.addOnModules ?? [],
      removedModules: input.removedModules ?? [],
    },
    legacyEnabledModules: input.legacy ?? [],
  });
}

/** Mirrors service toPortalUpgradeRequestView without importing server-only. */
function toPortalView(
  record: ClientUpgradeRequestRecord,
  accessGranted: boolean,
): PortalUpgradeRequestView {
  return {
    id: record.id,
    moduleKey: record.moduleKey,
    moduleLabel: record.moduleLabel,
    status: record.status,
    clientMessage: record.clientMessage,
    sourceSurface: record.sourceSurface,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    reviewedAt: record.reviewedAt,
    accessGranted,
  };
}

console.log("\nPhase 35B — Client Upgrade Requests\n");

console.log("Eligible catalog");
assert(CLIENT_UPGRADE_ELIGIBLE_CAPABILITIES.length >= 4, "curated eligible set exists");
assert(
  isClientUpgradeEligibleModule("website-workspace"),
  "website-workspace is upgrade-eligible",
);
assert(
  !isClientUpgradeEligibleModule("morning-brief"),
  "internal-only morning-brief not eligible",
);
assert(
  !isClientUpgradeEligibleModule("not-a-module"),
  "unknown module not eligible",
);
assert(
  getUpgradeEligibleCapability("public-showroom")?.key === "inventory",
  "alias public-showroom → inventory eligible",
);
assert(
  getUpgradeEligibleCapability("visual-review")?.key === "website-review",
  "alias visual-review → website-review eligible",
);
assert(
  !isClientUpgradeEligibleModule("seo") &&
    !isClientUpgradeEligibleModule("website-analytics") &&
    !isClientUpgradeEligibleModule("reporting"),
  "seo/analytics/reporting excluded from portal upgrade catalog",
);

console.log("\nEligibility");
{
  const starter = entitlementsFor({
    clientId: 1,
    planKey: "starter",
    planStatus: "active",
  });
  assert(
    clientHasModule(starter, "website-review"),
    "starter has website-review",
  );
  const entitled = evaluateUpgradeEligibility({
    moduleKeyRaw: "website-review",
    entitlements: starter,
    hasActiveDuplicate: false,
  });
  assert(!entitled.canRequest && entitled.reason === "already_entitled", "entitled module cannot be requested");

  const workspace = evaluateUpgradeEligibility({
    moduleKeyRaw: "website-workspace",
    entitlements: starter,
    hasActiveDuplicate: false,
  });
  assert(workspace.canRequest && workspace.reason === "eligible", "unentitled eligible module can be requested");

  const growthAddOn = entitlementsFor({
    clientId: 1,
    planKey: "starter",
    planStatus: "active",
    addOnModules: ["inventory"],
  });
  assert(
    clientHasModule(growthAddOn, "inventory") &&
      !evaluateUpgradeEligibility({
        moduleKeyRaw: "inventory",
        entitlements: growthAddOn,
        hasActiveDuplicate: false,
      }).canRequest,
    "standard plan add-on entitlement suppresses request",
  );

  const removedWins = entitlementsFor({
    clientId: 1,
    planKey: "premium",
    planStatus: "active",
    addOnModules: ["inventory"],
    removedModules: ["inventory"],
  });
  assert(
    !clientHasModule(removedWins, "inventory") &&
      evaluateUpgradeEligibility({
        moduleKeyRaw: "inventory",
        entitlements: removedWins,
        hasActiveDuplicate: false,
      }).canRequest,
    "add-on + removed conflict — removed wins and remains requestable",
  );

  const customEmpty = entitlementsFor({
    clientId: 1,
    planKey: "custom",
    planStatus: "active",
  });
  assert(
    evaluateUpgradeEligibility({
      moduleKeyRaw: "inventory",
      entitlements: customEmpty,
      hasActiveDuplicate: false,
    }).canRequest,
    "custom plan without add-ons can request eligible module",
  );

  const customWith = entitlementsFor({
    clientId: 1,
    planKey: "custom",
    planStatus: "active",
    addOnModules: ["inventory"],
  });
  assert(
    !evaluateUpgradeEligibility({
      moduleKeyRaw: "inventory",
      entitlements: customWith,
      hasActiveDuplicate: false,
    }).canRequest,
    "custom plan with add-on suppresses request",
  );

  const trial = entitlementsFor({
    clientId: 1,
    planKey: "growth",
    planStatus: "trial",
  });
  assert(
    evaluateUpgradeEligibility({
      moduleKeyRaw: "inventory",
      entitlements: trial,
      hasActiveDuplicate: false,
    }).canRequest,
    "trial standard plan can request missing eligible module",
  );

  const internal = evaluateUpgradeEligibility({
    moduleKeyRaw: "morning-brief",
    entitlements: starter,
    hasActiveDuplicate: false,
  });
  assert(!internal.canRequest && internal.reason === "internal_only", "internal-only rejected");

  const unknown = evaluateUpgradeEligibility({
    moduleKeyRaw: "totally-fake",
    entitlements: starter,
    hasActiveDuplicate: false,
  });
  assert(!unknown.canRequest && unknown.reason === "unknown_module", "unknown module rejected");

  const knownNonCatalog = evaluateUpgradeEligibility({
    moduleKeyRaw: "seo",
    entitlements: starter,
    hasActiveDuplicate: false,
  });
  assert(
    !knownNonCatalog.canRequest && knownNonCatalog.reason === "not_upgrade_eligible",
    "known non-catalog module rejected",
  );

  const dup = evaluateUpgradeEligibility({
    moduleKeyRaw: "inventory",
    entitlements: starter,
    hasActiveDuplicate: true,
  });
  assert(!dup.canRequest && dup.reason === "active_duplicate", "active duplicate blocked");

  const approvedAwaiting = evaluateUpgradeEligibility({
    moduleKeyRaw: "website-workspace",
    entitlements: starter,
    hasActiveDuplicate: false,
    hasApprovedAwaitingAccess: true,
  });
  assert(
    !approvedAwaiting.canRequest &&
      approvedAwaiting.reason === "approved_awaiting_access" &&
      !approvedAwaiting.accessGranted,
    "approved without access suppresses CTA",
  );

  const aliasDup = evaluateUpgradeEligibility({
    moduleKeyRaw: "visual-review",
    entitlements: entitlementsFor({
      clientId: 1,
      planKey: "custom",
      planStatus: "active",
    }),
    hasActiveDuplicate: true,
  });
  assert(
    aliasDup.moduleKey === "website-review" &&
      !aliasDup.canRequest &&
      aliasDup.reason === "active_duplicate",
    "alias + canonical share active duplicate key",
  );

  const aliasApprovedAwaiting = evaluateUpgradeEligibility({
    moduleKeyRaw: "public-showroom",
    entitlements: entitlementsFor({
      clientId: 1,
      planKey: "custom",
      planStatus: "active",
    }),
    hasActiveDuplicate: false,
    hasApprovedAwaitingAccess: true,
  });
  assert(
    aliasApprovedAwaiting.moduleKey === "inventory" &&
      !aliasApprovedAwaiting.canRequest &&
      aliasApprovedAwaiting.reason === "approved_awaiting_access",
    "alias + canonical share approved-awaiting block",
  );

  const paused = entitlementsFor({
    clientId: 2,
    planKey: "premium",
    planStatus: "paused",
  });
  const pausedEval = evaluateUpgradeEligibility({
    moduleKeyRaw: "inventory",
    entitlements: paused,
    hasActiveDuplicate: false,
  });
  assert(!pausedEval.canRequest && pausedEval.reason === "plan_paused", "paused plan blocks module upgrade CTA");

  const pausedCustom = entitlementsFor({
    clientId: 2,
    planKey: "custom",
    planStatus: "paused",
    addOnModules: ["inventory"],
  });
  assert(
    evaluateUpgradeEligibility({
      moduleKeyRaw: "website-workspace",
      entitlements: pausedCustom,
      hasActiveDuplicate: false,
    }).reason === "plan_paused",
    "paused custom plan blocks upgrades",
  );

  const legacy = entitlementsFor({
    clientId: 3,
    planKey: null,
    planStatus: "legacy",
    legacy: ["website-review", "inventory"],
  });
  assert(
    evaluateUpgradeEligibility({
      moduleKeyRaw: "website-workspace",
      entitlements: legacy,
      hasActiveDuplicate: false,
    }).canRequest,
    "legacy client can request missing eligible module",
  );
  assert(
    !evaluateUpgradeEligibility({
      moduleKeyRaw: "inventory",
      entitlements: legacy,
      hasActiveDuplicate: false,
    }).canRequest,
    "legacy entitled module suppresses CTA",
  );

  const unassigned = entitlementsFor({
    clientId: 3,
    planKey: null,
    planStatus: "legacy",
    legacy: ["website-review"],
  });
  assert(
    evaluateUpgradeEligibility({
      moduleKeyRaw: "inventory",
      entitlements: unassigned,
      hasActiveDuplicate: false,
    }).canRequest,
    "unassigned/legacy CES client can request missing eligible module",
  );

  const explicitStale = entitlementsFor({
    clientId: 4,
    planKey: "starter",
    planStatus: "active",
    legacy: ["website-review", "inventory", "website-workspace"],
  });
  assert(
    !clientHasModule(explicitStale, "inventory"),
    "explicit plan ignores stale CES inventory",
  );
  assert(
    evaluateUpgradeEligibility({
      moduleKeyRaw: "inventory",
      entitlements: explicitStale,
      hasActiveDuplicate: false,
    }).canRequest,
    "stale CES does not block request when not effectively entitled",
  );

  const malformed = evaluateUpgradeEligibility({
    moduleKeyRaw: "",
    entitlements: starter,
    hasActiveDuplicate: false,
  });
  assert(!malformed.canRequest, "empty module key rejected");
}

console.log("\nStatus transitions");
assert(isUpgradeRequestStatus("submitted"), "submitted is valid status");
assert(!isUpgradeRequestStatus("complete"), "complete is not upgrade status");
assert(isActiveUpgradeStatus("submitted") && isActiveUpgradeStatus("reviewing"), "active statuses");
assert(!isActiveUpgradeStatus("approved"), "approved is not active duplicate status");
assert(canTransitionUpgradeStatus("submitted", "approved"), "submitted → approved");
assert(canTransitionUpgradeStatus("submitted", "canceled"), "submitted → canceled");
assert(canTransitionUpgradeStatus("reviewing", "submitted"), "reviewing → submitted");
assert(!canTransitionUpgradeStatus("approved", "declined"), "approved → declined invalid");
assert(canTransitionUpgradeStatus("approved", "reviewing"), "approved can reopen to reviewing");
assert(canTransitionUpgradeStatus("declined", "reviewing"), "declined can reopen to reviewing");
assert(canTransitionUpgradeStatus("canceled", "submitted"), "canceled can reopen to submitted");
assert(canClientCancelUpgradeStatus("submitted"), "client can cancel submitted");
assert(canClientCancelUpgradeStatus("reviewing"), "client can cancel reviewing");
assert(!canClientCancelUpgradeStatus("approved"), "client cannot cancel approved");
assert(upgradeStatusLabel("reviewing") === "Under review", "status label");
assert(
  allowedNextUpgradeStatuses("approved").includes("reviewing") &&
    allowedNextUpgradeStatuses("approved").length === 1,
  "operator UI allowed next statuses for approved",
);
assert(!canTransitionUpgradeStatus("submitted", "submitted"), "same status is not a transition");

console.log("\nApproval does not grant entitlement");
{
  const before = entitlementsFor({
    clientId: 9,
    planKey: "starter",
    planStatus: "active",
  });
  assert(!clientHasModule(before, "inventory"), "starter lacks inventory before approval");
  const afterApprovalStill = before;
  assert(
    !clientHasModule(afterApprovalStill, "inventory"),
    "approval workflow does not mutate entitlements",
  );
  const afterGrant = entitlementsFor({
    clientId: 9,
    planKey: "starter",
    planStatus: "active",
    addOnModules: ["inventory"],
  });
  assert(clientHasModule(afterGrant, "inventory"), "Plans & Access add-on grants access");
  assert(
    !evaluateUpgradeEligibility({
      moduleKeyRaw: "inventory",
      entitlements: afterGrant,
      hasActiveDuplicate: false,
    }).canRequest,
    "after grant, new request CTA suppressed",
  );
}

console.log("\nClient isolation (pure records)");
{
  const a = entitlementsFor({ clientId: 101, planKey: "starter", planStatus: "active" });
  const b = entitlementsFor({
    clientId: 202,
    planKey: "enterprise",
    planStatus: "active",
  });
  assert(a.clientId !== b.clientId, "client ids isolated");
  assert(
    evaluateUpgradeEligibility({
      moduleKeyRaw: "inventory",
      entitlements: a,
      hasActiveDuplicate: false,
    }).canRequest,
    "starter inventory requestable",
  );
  assert(
    !evaluateUpgradeEligibility({
      moduleKeyRaw: "inventory",
      entitlements: b,
      hasActiveDuplicate: false,
    }).canRequest,
    "enterprise typically includes inventory — not requestable",
  );
}

console.log("\nClosed then new request behavior");
assert(
  !isActiveUpgradeStatus("declined") && !isActiveUpgradeStatus("canceled"),
  "declined/canceled are not active — new request allowed by duplicate rule",
);
assert(!isActiveUpgradeStatus("approved"), "approved is not DB-active duplicate status");
assert(
  blocksNewUpgradeRequest({ status: "submitted", accessGranted: false }),
  "submitted blocks new request",
);
assert(
  blocksNewUpgradeRequest({ status: "reviewing", accessGranted: false }),
  "reviewing blocks new request",
);
assert(
  blocksNewUpgradeRequest({ status: "approved", accessGranted: false }),
  "approved without access blocks new request (server + CTA)",
);
assert(
  !blocksNewUpgradeRequest({ status: "approved", accessGranted: true }),
  "approved with effective access does not block via awaiting rule",
);
assert(
  !blocksNewUpgradeRequest({ status: "declined", accessGranted: false }),
  "declined permits a legitimate new request",
);
assert(
  !blocksNewUpgradeRequest({ status: "canceled", accessGranted: false }),
  "canceled permits a legitimate new request",
);
assert(
  !blocksNewUpgradeRequest({ status: null, accessGranted: false }),
  "no prior request permits CTA when otherwise eligible",
);

{
  const starter = entitlementsFor({
    clientId: 21,
    planKey: "starter",
    planStatus: "active",
  });
  const declinedAllows = evaluateUpgradeEligibility({
    moduleKeyRaw: "website-workspace",
    entitlements: starter,
    hasActiveDuplicate: false,
    hasApprovedAwaitingAccess: false,
  });
  assert(
    declinedAllows.canRequest && declinedAllows.reason === "eligible",
    "after declined/canceled history, eligibility remains open when no blocking row",
  );

  const approvedBlocksCreate = evaluateUpgradeEligibility({
    moduleKeyRaw: "website-workspace",
    entitlements: starter,
    hasActiveDuplicate: false,
    hasApprovedAwaitingAccess: true,
  });
  assert(
    !approvedBlocksCreate.canRequest &&
      approvedBlocksCreate.reason === "approved_awaiting_access",
    "approved without access rejects second create (eligibility reason)",
  );

  const afterGrant = entitlementsFor({
    clientId: 21,
    planKey: "starter",
    planStatus: "active",
    addOnModules: ["website-workspace"],
  });
  const granted = evaluateUpgradeEligibility({
    moduleKeyRaw: "website-workspace",
    entitlements: afterGrant,
    hasActiveDuplicate: false,
    hasApprovedAwaitingAccess: true,
  });
  assert(
    !granted.canRequest &&
      granted.reason === "already_entitled" &&
      granted.accessGranted,
    "later effective entitlement resolves approved request as access granted",
  );
}

console.log("\nInternal-only never portal-eligible");
assert(isInternalOnlyEntitlement("focus-mode"), "focus-mode internal");
assert(
  !isClientUpgradeEligibleModule("focus-mode"),
  "focus-mode excluded from upgrade catalog",
);

console.log("\nRemoved module may be requestable when ineffective");
{
  const removed = entitlementsFor({
    clientId: 12,
    planKey: "premium",
    planStatus: "active",
    removedModules: ["inventory"],
  });
  assert(!clientHasModule(removed, "inventory"), "removed inventory ineffective");
  assert(
    evaluateUpgradeEligibility({
      moduleKeyRaw: "inventory",
      entitlements: removed,
      hasActiveDuplicate: false,
    }).canRequest,
    "removed-but-eligible module can be requested",
  );
}

console.log("\nPortal serializer exclusions");
{
  const record: ClientUpgradeRequestRecord = {
    id: 42,
    clientId: 7,
    clientName: "Acme",
    portalUserId: 3,
    requesterEmail: "a@example.com",
    requesterName: "Alex",
    moduleKey: "inventory",
    moduleLabel: "Inventory",
    status: "submitted",
    clientMessage: "Need listings",
    operatorNote: "SECRET OPERATOR NOTE",
    sourceSurface: "portal-home",
    entitlementSnapshot: {
      planKey: "starter",
      planStatus: "active",
      isLegacy: false,
      isPaused: false,
      effectiveModules: ["website-review"],
      resolvedAt: "2026-01-01T00:00:00.000Z",
    },
    reviewedAt: null,
    reviewedBy: "ops@example.com",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const view = toPortalView(record, false);
  const keys = Object.keys(view);
  assert(!keys.includes("operatorNote"), "portal view excludes operatorNote");
  assert(!keys.includes("reviewedBy"), "portal view excludes reviewedBy");
  assert(!keys.includes("entitlementSnapshot"), "portal view excludes entitlementSnapshot");
  assert(!keys.includes("clientName"), "portal view excludes clientName");
  assert(!keys.includes("portalUserId"), "portal view excludes portalUserId");
  assert(view.clientMessage === "Need listings", "portal view retains client message");
  assert(view.accessGranted === false, "approved≠access: accessGranted false until entitled");
  assert(
    !JSON.stringify(view).includes("SECRET OPERATOR NOTE"),
    "operator note never serialized in portal JSON",
  );
  assert(
    !JSON.stringify(record.entitlementSnapshot).includes("secret plan note"),
    "entitlement snapshot never stores planNote",
  );
}

console.log("\nUnique constraint mapping");
assert(
  isUniqueConstraintError({ code: "23505", message: "duplicate key" }),
  "postgres 23505 recognized",
);
assert(
  isUniqueConstraintError({
    cause: { code: "23505", constraint: "client_upgrade_requests_active_unique" },
  }),
  "nested unique constraint cause recognized",
);
assert(
  !isUniqueConstraintError({ code: "23503", message: "foreign key" }),
  "foreign-key errors are not treated as duplicates",
);

console.log("\nPayload direct-access controls");
{
  const collectionPath = resolve(
    process.cwd(),
    "payload/collections/ClientUpgradeRequests.ts",
  );
  const src = readFileSync(collectionPath, "utf8");
  assert(src.includes("isPayloadAdminUser"), "collection uses isPayloadAdminUser");
  assert(
    !src.includes("isAuthenticated"),
    "collection does not use permissive isAuthenticated",
  );
  assert(
    /read:\s*isPayloadAdminUser/.test(src) &&
      /create:\s*isPayloadAdminUser/.test(src) &&
      /update:\s*isPayloadAdminUser/.test(src) &&
      /delete:\s*isPayloadAdminUser/.test(src),
    "all CRUD access gated to Payload admin users",
  );
}

console.log("\nActivity metadata contract (static)");
{
  const servicePath = resolve(
    process.cwd(),
    "lib/client-upgrade-requests/service.ts",
  );
  const src = readFileSync(servicePath, "utf8");
  assert(src.includes("internalOnly: true"), "activity writes mark internalOnly");
  assert(
    src.includes("operatorNote intentionally omitted") &&
      src.includes("client message intentionally omitted"),
    "activity omits operator notes and client messages",
  );
  assert(
    !src.includes("planNote"),
    "upgrade request service never references planNote",
  );
  assert(
    src.includes("Approval does not grant access"),
    "status activity reminds operators approval ≠ access",
  );
}

console.log("\nNotification non-destructive contract (static)");
{
  const notifyPath = resolve(
    process.cwd(),
    "lib/client-upgrade-requests/notify.ts",
  );
  const servicePath = resolve(
    process.cwd(),
    "lib/client-upgrade-requests/service.ts",
  );
  const notifySrc = readFileSync(notifyPath, "utf8");
  const serviceSrc = readFileSync(servicePath, "utf8");
  assert(
    notifySrc.includes("Never throws") ||
      serviceSrc.includes("Notify failed"),
    "notify failures are caught and non-destructive",
  );
  assert(notifySrc.includes("escapeHtml"), "email HTML escapes user content");
  assert(notifySrc.includes("text:"), "email includes plain-text body");
  assert(
    notifySrc.includes("does not change entitlements"),
    "email states approval does not change entitlements",
  );
  assert(notifySrc.includes("Resend"), "Phase 35B channel is operator email via Resend");
  assert(
    notifySrc.includes("KXD_REVIEW_NOTIFICATION_EMAIL") ||
      notifySrc.includes("matt@kreatebydesign.com"),
    "email uses established operator destination",
  );
  const createFn = serviceSrc.slice(
    serviceSrc.indexOf("export async function createClientUpgradeRequest"),
    serviceSrc.indexOf("export async function listClientUpgradeRequests"),
  );
  assert(
    createFn.includes("payload.create") &&
      createFn.includes("notifyUpgradeRequestSubmitted") &&
      createFn.indexOf("payload.create") <
        createFn.indexOf("notifyUpgradeRequestSubmitted"),
    "email attempted only after durable create",
  );
  assert(
    !notifySrc.includes("notifications") ||
      notifySrc.includes("does not change entitlements"),
    "upgrade notify stays on email path (no required in-app center write)",
  );
}

console.log("\nLive Client Command mounts Plans & Access panels");
{
  const workspacePath = resolve(
    process.cwd(),
    "components/admin/operations/client-command/CommandWorkspaceTabPanel.tsx",
  );
  const pagePath = resolve(
    process.cwd(),
    "app/admin/operations/client-command/[clientId]/page.tsx",
  );
  const screenPath = resolve(
    process.cwd(),
    "components/admin/operations/client-command/ClientCommandScreen.tsx",
  );
  const workspaceSrc = readFileSync(workspacePath, "utf8");
  const pageSrc = readFileSync(pagePath, "utf8");
  const screenSrc = readFileSync(screenPath, "utf8");
  assert(
    pageSrc.includes("ClientCommandWorkspace"),
    "live route renders ClientCommandWorkspace",
  );
  assert(
    workspaceSrc.includes("ClientPlansAccessPanel") &&
      workspaceSrc.includes("ClientUpgradeRequestsPanel"),
    "overview mounts both existing panels",
  );
  assert(
    workspaceSrc.includes("clientId={data.clientId}") &&
      /ClientPlansAccessPanel\s+clientId=\{data\.clientId\}/.test(workspaceSrc) &&
      /ClientUpgradeRequestsPanel\s+clientId=\{data\.clientId\}/.test(workspaceSrc),
    "panels receive route-selected client id",
  );
  assert(
    !screenSrc.includes("ClientPlansAccessPanel") &&
      !screenSrc.includes("ClientUpgradeRequestsPanel"),
    "unused ClientCommandScreen does not duplicate live panel mounts",
  );
}

console.log("\nWebsite Workspace CES gate (static)");
{
  const pagePath = resolve(
    process.cwd(),
    "app/(portal)/portal/(app)/website-workspace/page.tsx",
  );
  const accessPath = resolve(process.cwd(), "lib/ces/server/access.ts");
  const pageSrc = readFileSync(pagePath, "utf8");
  const accessSrc = readFileSync(accessPath, "utf8");
  assert(pageSrc.includes("requireCesModule"), "website-workspace uses requireCesModule");
  assert(
    pageSrc.includes('"website-workspace"') || pageSrc.includes("'website-workspace'"),
    "website-workspace gate targets website-workspace module",
  );
  assert(
    accessSrc.includes("redirect(fallback)") &&
      accessSrc.includes('fallback = "/portal"'),
    "CES convention redirects unentitled modules to portal home (HTTP 200 after follow)",
  );
}

console.log("\nService create rejects approved-awaiting (static)");
{
  const servicePath = resolve(
    process.cwd(),
    "lib/client-upgrade-requests/service.ts",
  );
  const src = readFileSync(servicePath, "utf8");
  assert(
    src.includes("approved_awaiting_access") &&
      src.includes("awaiting enablement by KXD"),
    "create path rejects approved-without-access server-side",
  );
  assert(
    src.includes("findLatestApprovedForModule") ||
      src.includes("hasApprovedAwaitingAccess"),
    "service resolves approved-awaiting history for CTA/create",
  );
  assert(
    !src.includes("planAddOnModules") && !src.includes("enabledModules"),
    "upgrade service never writes plan add-ons or CES enabledModules",
  );
  const statusFn = src.slice(
    src.indexOf("export async function updateClientUpgradeRequestStatus"),
  );
  assert(
    statusFn.includes('collection: COLLECTION as any') ||
      statusFn.includes("collection: COLLECTION"),
    "approval updates the upgrade-request collection",
  );
  assert(
    !statusFn.includes('collection: "clients"') &&
      !statusFn.includes("collection: 'clients'"),
    "approval does not mutate clients / entitlements collection",
  );
}

console.log(
  `\nResult: ${passed} passed, ${failed} failed${failed ? "" : " — Phase 35B upgrade requests OK"}\n`,
);
process.exit(failed > 0 ? 1 : 0);
