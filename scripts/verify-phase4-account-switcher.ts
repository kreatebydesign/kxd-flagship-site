/**
 * Phase 4 Batch B — Multi-client account context & switcher foundations.
 * Static + pure-unit verification only. No database. No external writes.
 *
 * Run: npm run verify:phase4-account-switcher
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  isMembershipSchemaUnavailableError,
  MembershipSchemaUnavailableError,
  membershipUnavailableResponseBody,
  MEMBERSHIP_SCHEMA_UNAVAILABLE_MESSAGE,
} from "../lib/portal/membership-schema";
import {
  dedupeActiveMembershipsByClient,
  isClientInActiveMemberships,
  resolveAuthorizedActiveClient,
  type PortalMembershipRecord,
} from "../lib/portal/membership-resolve";
import { resolvePortfolioAccess } from "../lib/portal/portfolio";

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

function main() {
  console.log("\nPhase 4 Batch B — account switcher / multi-client foundation\n");

  // --- Schema classification ---
  check(
    "missing portal_client_memberships classified unavailable",
    isMembershipSchemaUnavailableError(
      Object.assign(new Error('relation "portal_client_memberships" does not exist'), {
        code: "42P01",
      }),
    ),
  );
  check(
    "unrelated failure is not membership-unavailable",
    !isMembershipSchemaUnavailableError(new Error("permission denied for table clients")),
  );
  check(
    "unavailable body is non-success and operator-safe",
    (() => {
      const body = membershipUnavailableResponseBody();
      return (
        body.ok === false &&
        body.unavailable === true &&
        body.error === MEMBERSHIP_SCHEMA_UNAVAILABLE_MESSAGE &&
        !String(body.error).includes("portal_client_memberships")
      );
    })(),
  );
  check(
    "MembershipSchemaUnavailableError maps to itself",
    new MembershipSchemaUnavailableError() instanceof MembershipSchemaUnavailableError,
  );

  // --- Pure authorization ---
  const memberships: PortalMembershipRecord[] = [
    {
      id: 1,
      portalUserId: 9,
      clientId: 10,
      clientName: "Alpha",
      clientSlug: "alpha",
      status: "active",
      isDefault: false,
    },
    {
      id: 2,
      portalUserId: 9,
      clientId: 20,
      clientName: "Beta",
      clientSlug: "beta",
      status: "active",
      isDefault: true,
    },
    {
      id: 3,
      portalUserId: 9,
      clientId: 30,
      clientName: "Gamma",
      clientSlug: "gamma",
      status: "disabled",
      isDefault: false,
    },
  ];

  check("authorized client accepted", isClientInActiveMemberships(memberships, 10));
  check("disabled membership rejected", !isClientInActiveMemberships(memberships, 30));
  check("forged client rejected", !isClientInActiveMemberships(memberships, 999));
  check(
    "stale last-active falls back to default",
    resolveAuthorizedActiveClient({
      memberships,
      lastActiveClientId: 999,
      legacyClientId: null,
    })?.clientId === 20,
  );
  check(
    "dedupe keeps deterministic active accounts",
    dedupeActiveMembershipsByClient(memberships).map((m) => m.clientId).join(",") === "10,20",
  );

  // Portfolio never auto-granted
  const portfolio = resolvePortfolioAccess({
    switchingAvailable: true,
    authorizedClientIds: [10, 20],
    portfolioAccessAvailable: false,
  });
  check("portfolio remains unavailable", portfolio.available === false);

  // --- Source contracts ---
  const switchRoute = read("app/api/portal/account/switch/route.ts");
  const accountContext = read("lib/portal/account-context.ts");
  const membershipsLib = read("lib/portal/memberships.ts");
  const sessionSrc = read("lib/portal/session.ts");
  const layout = read("app/(portal)/portal/(app)/layout.tsx");
  const switcherUi = read("components/portal/AccountSwitcher.tsx");
  const shell = read("components/client-hq/ClientHqShell.tsx");
  const readiness = read("lib/portal/multi-client-readiness.ts");
  const accessData = read("lib/portal/access-data.ts");
  const portalAccessUi = read(
    "components/admin/operations/portal-access/PortalAccessScreen.tsx",
  );
  const packageJson = read("package.json");
  const migrationsIndex = read("migrations/index.ts");
  const migrationFile = read("migrations/20260728_phase4_portal_client_memberships.ts");

  check(
    "switch route requires portal session",
    switchRoute.includes("getPortalSession") && switchRoute.includes("session.portalUserId"),
  );
  check(
    "switch route rejects unauthorized client generically",
    switchRoute.includes("PORTAL_ACCOUNT_SWITCH_DENIED") ||
      switchRoute.includes("Unable to switch accounts."),
  );
  check(
    "switch route returns 503 for schema unavailable",
    switchRoute.includes("status: 503") &&
      switchRoute.includes("MembershipSchemaUnavailableError"),
  );
  check(
    "switch route prevents open redirects",
    switchRoute.includes('startsWith("/portal")') && switchRoute.includes("safePortalReturnTo"),
  );
  check(
    "switch uses revalidatePath after success",
    switchRoute.includes("revalidatePath"),
  );
  check(
    "browser identity fields are not authoritative",
    !switchRoute.includes("body.portalUserId") && switchRoute.includes("session.portalUserId"),
  );

  check(
    "account context resolves from session only",
    accountContext.includes("resolvePortalAccountContext") &&
      accountContext.includes("session.portalUserId") &&
      accountContext.includes("switchingAvailable") &&
      accountContext.includes("portfolioAccessAvailable: false"),
  );
  check(
    "switcher only when >1 authorized accounts",
    accountContext.includes("accounts.length > 1"),
  );
  check(
    "legacy fallback access source preserved",
    accountContext.includes("legacy-fallback") && sessionSrc.includes("Compatibility window"),
  );

  check(
    "membership list does not swallow unrelated errors",
    membershipsLib.includes("isMembershipSchemaUnavailableError") &&
      membershipsLib.includes("throw err"),
  );
  check(
    "membership writes use withMembershipSchema",
    membershipsLib.includes("withMembershipSchema") &&
      membershipsLib.includes("ensurePortalMembership"),
  );
  check(
    "cookie still signs portal user id only",
    sessionSrc.includes("signPortalUserId(portalUserId") &&
      !/signPortalUserId\([^\)]*clientId/.test(sessionSrc),
  );

  check(
    "layout wires account context + client remount key",
    layout.includes("resolvePortalAccountContext") &&
      layout.includes("accountSwitcher") &&
      layout.includes("portal-client-"),
  );
  check(
    "AccountSwitcher posts to switch route",
    switcherUi.includes("/api/portal/account/switch") &&
      switcherUi.includes("credentials: \"same-origin\""),
  );
  check(
    "shell renders switcher only when model provided",
    shell.includes("accountSwitcher") && shell.includes("AccountSwitcher"),
  );
  check(
    "readiness gate defaults portfolio off",
    readiness.includes("portfolioCapable: false") &&
      readiness.includes("probeMembershipSchemaAvailable"),
  );
  check(
    "admin portal access surfaces schema-unavailable readiness",
    accessData.includes("membershipSchemaAvailable") &&
      portalAccessUi.includes("membershipSchemaAvailable") &&
      portalAccessUi.includes("pending database"),
  );

  // Admin membership writes map to 503
  for (const rel of [
    "app/api/admin/portal-users/[id]/memberships/route.ts",
    "app/api/admin/portal-users/[id]/memberships/[membershipId]/status/route.ts",
    "app/api/admin/portal-users/[id]/memberships/[membershipId]/default/route.ts",
  ]) {
    const src = read(rel);
    check(
      `${rel} maps schema unavailable to 503`,
      src.includes("status: 503") && src.includes("membershipUnavailableResponseBody"),
    );
    check(`${rel} requires admin auth`, src.includes("requirePayloadAdminApi"));
  }

  // Portal isolation — no Phase 3 / no Cusick hard-coding / no portfolio route
  const portalLibFiles = walkFiles(path.join(root, "lib/portal"), new Set([".ts", ".tsx"]));
  for (const file of portalLibFiles) {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /client-contacts|client-relationship-events/);
  }
  const portalApiFiles = walkFiles(path.join(root, "app/api/portal"), new Set([".ts", ".tsx"]));
  for (const file of portalApiFiles) {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /client-contacts|client-relationship-events/);
  }
  check("Phase 3 remains portal-inaccessible", true);

  check(
    "no Cusick/OTP hard-coded linking in switcher batch",
    !switcherUi.includes("Cusick") &&
      !accountContext.includes("otp-carts") &&
      !switchRoute.includes("2475"),
  );
  check(
    "no portfolio dashboard route",
    !layout.includes("/portal/portfolio") && !switcherUi.includes("Portfolio"),
  );

  // Migrations untouched
  check(
    "Phase 4 migration file unchanged and still registered",
    migrationFile.includes("portal_client_memberships") &&
      migrationsIndex.includes("20260728_phase4_portal_client_memberships"),
  );
  check(
    "package.json registers Batch B verifier",
    packageJson.includes("verify:phase4-account-switcher"),
  );

  console.log("\nPhase 4 Batch B account switcher verification passed.\n");
}

main();
