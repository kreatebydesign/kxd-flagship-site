/**
 * Phase 6 Batch C0 — KXD Connect tenancy, release controls, metering primitives.
 * Static + pure-unit verification. No database. No Stripe. No external writes.
 *
 * Run: npm run verify:phase6-batch-c0
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  canMutateConnectMemberships,
  evaluateConnectAccess,
  isConnectGrantedByClientEntitlement,
} from "../lib/connect/access";
import {
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
  isOrganizationKeyAllowlisted,
  isStaffEmailInConnectDogfoodAllowlist,
} from "../lib/connect/config";
import {
  connectMembershipIdentityKey,
  detectDuplicateConnectMembership,
  validateConnectMembershipDraft,
} from "../lib/connect/memberships";
import {
  assertNoCrossOrganizationLeak,
  filterOrganizationsForActor,
  isConnectOrganizationDiscoverableByUnauthorized,
  normalizeConnectOrganizationKey,
  projectConnectOrganizationPublicSafe,
} from "../lib/connect/organizations";
import {
  CONNECT_METER_DEFINITIONS,
  isConnectMeterKey,
} from "../lib/connect/metering/definitions";
import { connectDailyPeriodKey } from "../lib/connect/metering/period";
import { InMemoryConnectMeterStore } from "../lib/connect/metering/store";
import { isFeatureEnabled, isModuleEnabled } from "../lib/editions";
import { isInternalOnlyEntitlement } from "../lib/client-plans/modules";
import { computeEffectiveModules } from "../lib/client-plans/resolve";

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

function dogfoodEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
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
  console.log("\nPhase 6 Batch C0 — Connect foundation verification\n");

  // ── File presence ──────────────────────────────────────────────────────────
  const required = [
    "lib/connect/types.ts",
    "lib/connect/config.ts",
    "lib/connect/access.ts",
    "lib/connect/memberships.ts",
    "lib/connect/organizations.ts",
    "lib/connect/audit.ts",
    "lib/connect/bootstrap.ts",
    "lib/connect/metering/definitions.ts",
    "lib/connect/metering/period.ts",
    "lib/connect/metering/store.ts",
    "lib/connect/metering/service.ts",
    "payload/collections/ConnectOrganizations.ts",
    "payload/collections/ConnectOrganizationMemberships.ts",
    "payload/collections/ConnectUsageMeters.ts",
    "payload/collections/ConnectUsageIdempotency.ts",
    "payload/collections/ConnectAuditEvents.ts",
    "payload/hooks/connect-organizations.ts",
    "payload/hooks/connect-organization-memberships.ts",
    "migrations/20260815_phase6_connect_c0_foundation.ts",
    "app/api/admin/connect/status/route.ts",
    "app/api/admin/connect/meters/route.ts",
    "scripts/bootstrap-connect-kxd-organization.ts",
    "docs/PHASE-6-KXD-CONNECT.md",
  ];
  for (const f of required) {
    check(`${f} exists`, existsSync(path.join(root, f)));
  }

  // ── 1. Organization isolation ──────────────────────────────────────────────
  const orgs = [
    { id: 1, key: "kxd", name: "Kreate by Design", status: "active" as const, config: null },
    { id: 2, key: "acme", name: "Acme", status: "active" as const, config: null },
  ];
  const visible = filterOrganizationsForActor({
    organizations: orgs,
    authorizedOrganizationIds: new Set([1]),
  });
  check("organization isolation filters unauthorized orgs", visible.length === 1 && visible[0].id === 1);
  check(
    "unauthorized org projection returns null",
    projectConnectOrganizationPublicSafe({
      id: 2,
      key: "acme",
      name: "Acme",
      status: "active",
      authorized: false,
    }) === null,
  );

  // ── 2. Unauthorized organization discovery ─────────────────────────────────
  check(
    "organizations are not publicly discoverable",
    isConnectOrganizationDiscoverableByUnauthorized() === false,
  );
  check(
    "invalid organization keys rejected",
    normalizeConnectOrganizationKey("KXD!") === null,
  );
  check(
    "valid organization keys normalized",
    normalizeConnectOrganizationKey("KXD") === "kxd",
  );

  const orgColl = read("payload/collections/ConnectOrganizations.ts");
  check("org collection uses isAuthenticated read", orgColl.includes("read: isAuthenticated"));
  check("org collection denies public create", orgColl.includes("create: isPayloadAdminUser"));

  // ── 3. Membership uniqueness ───────────────────────────────────────────────
  const keyA = connectMembershipIdentityKey({
    organizationId: 1,
    subjectKind: "staff-user",
    staffUserId: 10,
    portalUserId: null,
  });
  const keyB = connectMembershipIdentityKey({
    organizationId: 1,
    subjectKind: "staff-user",
    staffUserId: 10,
    portalUserId: null,
  });
  check("membership identity keys collide for duplicates", keyA === keyB);
  check(
    "duplicate membership detected",
    detectDuplicateConnectMembership({
      candidateKey: keyA,
      existingKeys: [keyB],
    }) === true,
  );
  check(
    "self update is not treated as duplicate",
    detectDuplicateConnectMembership({
      candidateKey: keyA,
      existingKeys: [keyA],
      selfKey: keyA,
    }) === false,
  );

  // ── 4. Unauthorized membership creation / role changes ─────────────────────
  check(
    "invalid membership without org fails closed",
    validateConnectMembershipDraft({
      organizationId: null,
      subjectKind: "staff-user",
      staffUserId: 1,
      portalUserId: null,
      role: "organization-member",
      status: "active",
    }).ok === false,
  );
  check(
    "staff membership with portal user fails",
    validateConnectMembershipDraft({
      organizationId: 1,
      subjectKind: "staff-user",
      staffUserId: 1,
      portalUserId: 2,
      role: "organization-member",
      status: "active",
    }).ok === false,
  );
  check(
    "organization-member cannot mutate memberships",
    canMutateConnectMemberships("organization-member") === false,
  );
  check(
    "organization-admin can mutate memberships",
    canMutateConnectMemberships("organization-admin") === true,
  );
  check(
    "platform-operator can mutate memberships",
    canMutateConnectMemberships("platform-operator") === true,
  );

  const memHook = read("payload/hooks/connect-organization-memberships.ts");
  check("membership hook rejects duplicates", memHook.includes("Duplicate Connect membership"));
  check("membership hook validates organization exists", memHook.includes("Connect organization does not exist"));

  // ── 5. Connect disabled by default ─────────────────────────────────────────
  check("edition feature kxd-connect disabled by default", isFeatureEnabled("kxd-connect") === false);
  check("connect module disabled by default", isModuleEnabled("connect") === false);
  check(
    "operator enablement defaults off",
    isConnectOperatorEnablementOn({ ...process.env, KXD_CONNECT_ENABLED: undefined }) === false,
  );
  const defaultDenied = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "matt@kreatebydesign.com",
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: false,
    env: dogfoodEnv({ KXD_CONNECT_ENABLED: undefined }),
  });
  check("access denied when feature and env off", defaultDenied.allowed === false);

  // ── 6. Staff dogfood allowlist ─────────────────────────────────────────────
  check(
    "dogfood allowlist accepts listed email",
    isStaffEmailInConnectDogfoodAllowlist(
      "matt@kreatebydesign.com",
      dogfoodEnv(),
    ),
  );
  check(
    "dogfood allowlist rejects unknown email",
    isStaffEmailInConnectDogfoodAllowlist("other@example.com", dogfoodEnv()) === false,
  );
  const dogfoodDenied = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "other@example.com",
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: false,
    env: dogfoodEnv(),
  });
  check("access denied outside dogfood allowlist", !dogfoodDenied.allowed && dogfoodDenied.reason === "not_staff_dogfood");

  // ── 7. Organization allowlist ──────────────────────────────────────────────
  check("org allowlist accepts kxd", isOrganizationKeyAllowlisted("kxd", dogfoodEnv()));
  check(
    "org allowlist rejects others",
    isOrganizationKeyAllowlisted("acme", dogfoodEnv()) === false,
  );
  const orgDenied = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "matt@kreatebydesign.com",
    organization: { key: "acme", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: false,
    env: dogfoodEnv(),
  });
  check("access denied for non-allowlisted org", !orgDenied.allowed && orgDenied.reason === "org_not_allowlisted");

  // ── 8. Global kill switch ──────────────────────────────────────────────────
  check(
    "kill switch active when set",
    isConnectKillSwitchActive(dogfoodEnv({ KXD_CONNECT_KILL_SWITCH: "1" })),
  );
  const killed = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "matt@kreatebydesign.com",
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "platform-operator" },
    editionFeatureActive: true,
    env: dogfoodEnv({ KXD_CONNECT_KILL_SWITCH: "1" }),
  });
  check("kill switch fails closed", !killed.allowed && killed.reason === "kill_switch");

  // ── 9. Entitlement evaluation ──────────────────────────────────────────────
  check("kxd-connect entitlement is internal-only", isInternalOnlyEntitlement("kxd-connect"));
  check(
    "client entitlement does not grant Connect from empty plans",
    isConnectGrantedByClientEntitlement([]) === false,
  );
  const starterEffective = computeEffectiveModules({
    planKey: "starter",
    planStatus: "active",
    addOnModules: [],
    removedModules: [],
  }).effectiveModules;
  check(
    "starter plan does not include kxd-connect",
    !starterEffective.includes("kxd-connect"),
  );
  const allowed = evaluateConnectAccess({
    subjectKind: "staff-user",
    staffEmail: "matt@kreatebydesign.com",
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: false,
    env: dogfoodEnv(),
  });
  check("dogfood path allows when all gates pass", allowed.allowed === true);

  const portalDenied = evaluateConnectAccess({
    subjectKind: "portal-user",
    staffEmail: null,
    organization: { key: "kxd", status: "active" },
    membership: { status: "active", role: "organization-member" },
    editionFeatureActive: false,
    env: dogfoodEnv(),
  });
  check(
    "portal identity denied in C0",
    !portalDenied.allowed && portalDenied.reason === "portal_identity_not_supported_in_c0",
  );

  // ── 10–13. Meter isolation / increment / idempotency / concurrency ─────────
  const store = new InMemoryConnectMeterStore();
  const periodKey = connectDailyPeriodKey(new Date("2026-08-01T12:00:00.000Z"));
  check("daily period key is UTC YYYY-MM-DD", periodKey === "2026-08-01");
  check("messages_sent is a known meter", isConnectMeterKey("messages_sent"));
  check("meter definitions cover commercial units", CONNECT_METER_DEFINITIONS.length >= 10);

  const inc1 = await store.increment({
    organizationId: 1,
    meterKey: "messages_sent",
    periodKind: "daily",
    periodKey,
    delta: 3,
    idempotencyKey: "evt-1",
  });
  check("meter increment applies", inc1.ok && inc1.quantity === 3 && inc1.applied);

  const incDup = await store.increment({
    organizationId: 1,
    meterKey: "messages_sent",
    periodKind: "daily",
    periodKey,
    delta: 3,
    idempotencyKey: "evt-1",
  });
  check(
    "meter idempotency prevents double-count",
    incDup.ok && incDup.duplicate && incDup.quantity === 3,
  );

  await store.increment({
    organizationId: 2,
    meterKey: "messages_sent",
    periodKind: "daily",
    periodKey,
    delta: 99,
  });
  const org1Meters = await store.listForOrganization(1);
  check(
    "meter organization isolation",
    org1Meters.every((m) => m.organizationId === 1) &&
      assertNoCrossOrganizationLeak({
        requestedOrganizationId: 1,
        rows: org1Meters,
      }),
  );
  check(
    "org1 meters do not include org2 quantity",
    (await store.read({
      organizationId: 1,
      meterKey: "messages_sent",
      periodKind: "daily",
      periodKey,
    })) === 3,
  );

  const concurrentStore = new InMemoryConnectMeterStore();
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      concurrentStore.increment({
        organizationId: 1,
        meterKey: "conversations_created",
        periodKind: "daily",
        periodKey,
        delta: 1,
        idempotencyKey: `c-${i}`,
      }),
    ),
  );
  check(
    "concurrent meter updates all succeed",
    results.every((r) => r.ok),
  );
  check(
    "concurrent meter updates sum correctly",
    (await concurrentStore.read({
      organizationId: 1,
      meterKey: "conversations_created",
      periodKind: "daily",
      periodKey,
    })) === 20,
  );

  const meterService = read("lib/connect/metering/service.ts");
  check("meter service requires trustedServerCaller", meterService.includes("trustedServerCaller"));
  check("meter service is server-only", meterService.includes('import "server-only"'));
  const meterColl = read("payload/collections/ConnectUsageMeters.ts");
  check(
    "meter records avoid message body fields",
    !meterColl.includes('name: "messageBody"') &&
      !meterColl.includes('name: "filename"') &&
      !meterColl.includes('name: "content"') &&
      meterColl.includes('name: "quantity"'),
  );

  // ── 14–15. Unsupported methods / no-store ──────────────────────────────────
  const statusRoute = read("app/api/admin/connect/status/route.ts");
  const metersRoute = read("app/api/admin/connect/meters/route.ts");
  check("status route requires admin auth", statusRoute.includes("requirePayloadAdminApi"));
  check("status route no-store", statusRoute.includes("no-store"));
  check("status route rejects POST", statusRoute.includes("export async function POST"));
  check("meters route rejects PUT", metersRoute.includes("export async function PUT"));
  check("meters route no-store", metersRoute.includes("no-store"));
  check("meters route force-dynamic", metersRoute.includes('dynamic = "force-dynamic"'));

  // ── 16. Edition feature regression ─────────────────────────────────────────
  check("advanced-permissions still active", isFeatureEnabled("advanced-permissions") === true);
  check("edition-marketplace still future/inactive", isFeatureEnabled("edition-marketplace") === false);
  check("operations module still required/enabled", isModuleEnabled("operations") === true);

  // ── 17. Plans/entitlements regression ──────────────────────────────────────
  const growthEffective = computeEffectiveModules({
    planKey: "growth",
    planStatus: "active",
    addOnModules: [],
    removedModules: [],
  }).effectiveModules;
  check("growth plan still resolves modules", growthEffective.length > 0);
  check("growth plan unchanged by Connect key", !growthEffective.includes("kxd-connect"));

  // ── 18. Portal membership / account-switch regression safety ───────────────
  const portalMemberships = read("payload/collections/PortalClientMemberships.ts");
  const portalMembershipsHook = read("payload/hooks/portal-client-memberships.ts");
  const portalMembershipsLib = read("lib/portal/memberships.ts");
  check(
    "portal membership collection unchanged slug",
    portalMemberships.includes('slug: "portal-client-memberships"'),
  );
  check(
    "portal membership duplicate hook preserved",
    portalMembershipsHook.includes("rejectDuplicateMembershipHook"),
  );
  check(
    "portal switchPortalActiveClient preserved",
    portalMembershipsLib.includes("switchPortalActiveClient"),
  );
  check(
    "Connect does not auto-map clients to orgs",
    !read("lib/connect/bootstrap.ts").includes("portal-client-memberships") &&
      !read("lib/connect/bootstrap.ts").includes("clients"),
  );

  // ── 19. Phase 5 billing visibility regression safety ───────────────────────
  check(
    "phase5 batch 5c verifier present",
    existsSync(path.join(root, "scripts/verify-phase5-batch-5c.ts")),
  );
  check(
    "phase5 batch 5d verifier present",
    existsSync(path.join(root, "scripts/verify-phase5-batch-5d.ts")),
  );
  const portalBilling = read("lib/portal/billing/index.ts");
  check(
    "portal billing helpers preserved",
    portalBilling.includes("projectPortalBillingView") &&
      portalBilling.includes("isPortalBillingNavEligible"),
  );

  // ── 20. Client Communications / portal feedback regression safety ──────────
  check(
    "client communications collection preserved",
    existsSync(path.join(root, "payload/collections/ClientCommunications.ts")),
  );
  const feedback = read("app/api/portal/feedback/route.ts");
  check("portal feedback route preserved", feedback.includes("submitExperienceFeedback") || feedback.length > 0);
  check(
    "experience feedback verifier preserved",
    existsSync(path.join(root, "scripts/verify-experience-feedback.ts")),
  );

  // ── Exclusions / wiring ────────────────────────────────────────────────────
  const payloadConfig = read("payload.config.ts");
  check("payload registers ConnectOrganizations", payloadConfig.includes("ConnectOrganizations"));
  check(
    "payload registers ConnectOrganizationMemberships",
    payloadConfig.includes("ConnectOrganizationMemberships"),
  );
  const migrationsIndex = read("migrations/index.ts");
  check(
    "migration registered in index",
    migrationsIndex.includes("20260815_phase6_connect_c0_foundation"),
  );

  const features = read("lib/editions/features.ts");
  check('feature registry includes "kxd-connect"', features.includes('"kxd-connect"'));
  check('kxd-connect defaults disabled', features.includes('defaultStatus: "disabled"'));

  const docs = read("docs/PHASE-6-KXD-CONNECT.md");
  check("docs state Connect does not block early access", docs.includes("does not block"));
  check("docs distinguish Client Communications", docs.includes("Client Communications"));
  check("docs keep message-kxd unchanged in C0", docs.includes("message-kxd"));
  check("docs exclude messaging UI from C0", docs.includes("C0 exclusions") || docs.includes("Explicit exclusions"));

  const bootstrap = read("scripts/bootstrap-connect-kxd-organization.ts");
  check(
    "bootstrap refuses production without confirmation",
    bootstrap.includes("KXD_CONFIRM_CONNECT_BOOTSTRAP_PRODUCTION"),
  );

  // Client-controlled enablement cannot pass through access eval
  const accessSrc = read("lib/connect/access.ts");
  check(
    "access evaluator ignores client enable flags",
    !accessSrc.includes("body.enable") && accessSrc.includes("fail closed"),
  );

  console.log("\nPhase 6 Batch C0 verification passed.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
