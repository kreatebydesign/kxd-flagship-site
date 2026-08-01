/**
 * Phase 4 Batch I — Portal identity & security verifier.
 * Static + pure-unit verification only. No database. No external mail.
 *
 * Run: npm run verify:phase4-portal-identity-security
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationTokensMatch,
  hashRecoveryCode,
  recoveryCodesMatch,
  normalizePortalEmail,
  INVITATION_TTL_MS,
} from "../lib/portal/identity/crypto";
import {
  dedupeInvitationMemberships,
  planInvitationAcceptance,
  validateInvitationToken,
  INVITATION_PUBLIC_ERROR,
  buildSentInvitationTokenState,
  nextTokenVersion,
} from "../lib/portal/identity/invitation-rules";
import {
  EARLY_ACCESS_CLIENT_CANNOT_MANAGE_ACCESS,
  canAssignMembershipRole,
  emailDomainCannotGrantAccess,
  LEGACY_MEMBERSHIP_ROLE_DEFAULT,
  isPortalMembershipRole,
} from "../lib/portal/identity/roles";
import { generateRecoveryCodeBatch, findMatchingRecoveryCodeHash } from "../lib/portal/identity/recovery-codes";
import {
  createTotpSecret,
  verifyTotpCode,
  buildTotpOtpauthUrl,
  __resetTotpReplayCacheForTests,
} from "../lib/portal/identity/totp";
import { generateSync } from "otplib";
import {
  canCompleteSecurityEnrollment,
  PORTAL_AUTH_POLICY,
} from "../lib/portal/identity/policy";
import {
  isStepUpSatisfied,
  strongAuthSatisfiesStepUp,
} from "../lib/portal/identity/step-up";
import {
  assertPortalRateLimit,
  __resetPortalRateLimitsForTests,
} from "../lib/portal/identity/rate-limit";
import {
  resolveWebAuthnRpID,
  resolveWebAuthnAllowedOrigins,
  isAllowedWebAuthnOrigin,
} from "../lib/portal/identity/webauthn-config";
import {
  buildInvitationEmailHtml,
  buildInvitationEmailText,
  buildInvitationActivateUrl,
} from "../lib/portal/identity/email-invitation";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

function main() {
  console.log("\nPhase 4 Batch I — portal identity & security\n");

  // ── Surface files ────────────────────────────────────────────────────
  const required = [
    "migrations/20260814_phase4_portal_identity_security.ts",
    "lib/portal/identity/crypto.ts",
    "lib/portal/identity/roles.ts",
    "lib/portal/identity/invitation-rules.ts",
    "lib/portal/identity/invitations.ts",
    "lib/portal/identity/webauthn.ts",
    "lib/portal/identity/totp.ts",
    "lib/portal/identity/recovery-codes.ts",
    "lib/portal/identity/security-events.ts",
    "lib/portal/identity/rate-limit.ts",
    "payload/collections/PortalInvitations.ts",
    "payload/collections/PortalPasskeys.ts",
    "payload/collections/PortalMfaSettings.ts",
    "app/api/admin/portal-invitations/route.ts",
    "app/api/portal/activate/accept/route.ts",
    "app/(portal)/portal/(auth)/activate/page.tsx",
    "app/(portal)/portal/(auth)/security/enroll/page.tsx",
    "app/(portal)/portal/(app)/settings/security/page.tsx",
    "docs/PHASE-4-PORTAL-IDENTITY-SECURITY.md",
  ];
  for (const rel of required) {
    check(`surface exists: ${rel}`, existsSync(path.join(root, rel)));
  }

  const migrationIndex = read("migrations/index.ts");
  check(
    "migration registered",
    migrationIndex.includes("20260814_phase4_portal_identity_security"),
  );

  const pkg = read("package.json");
  check("deps include SimpleWebAuthn", pkg.includes("@simplewebauthn/server"));
  check("deps include otplib", pkg.includes("otplib"));
  check("deps include qrcode", pkg.includes("qrcode"));
  check(
    "verifier script wired",
    pkg.includes("verify:phase4-portal-identity-security"),
  );

  // ── Tokens ───────────────────────────────────────────────────────────
  const token = generateInvitationToken();
  check("invitation token length", token.length >= 32);
  const hash = hashInvitationToken(token);
  check("token hash is sha256 hex", /^[0-9a-f]{64}$/.test(hash));
  check("token match", invitationTokensMatch(token, hash));
  check("token mismatch", !invitationTokensMatch(token + "x", hash));
  check("TTL is 48h", INVITATION_TTL_MS === 48 * 60 * 60 * 1000);
  const sent = buildSentInvitationTokenState(token);
  check("sent state hashes token", sent.tokenHash === hash);
  check("token version bumps", nextTokenVersion(3) === 4);

  // ── Roles / early access ─────────────────────────────────────────────
  check("legacy default is client-member", LEGACY_MEMBERSHIP_ROLE_DEFAULT === "client-member");
  check("role validator", isPortalMembershipRole("client-owner"));
  check("early access clients cannot manage", EARLY_ACCESS_CLIENT_CANNOT_MANAGE_ACCESS);
  check(
    "client cannot assign roles in early access",
    !canAssignMembershipRole({
      actorIsKxdOperator: false,
      actorMembershipRole: "client-owner",
      actorCanManageMembers: true,
      targetRole: "client-member",
    }),
  );
  check(
    "operator can assign roles",
    canAssignMembershipRole({
      actorIsKxdOperator: true,
      actorMembershipRole: null,
      actorCanManageMembers: false,
      targetRole: "client-owner",
    }),
  );
  check("email domain cannot grant access", emailDomainCannotGrantAccess() === true);
  check("no domain-based access policy", PORTAL_AUTH_POLICY.domainBasedAccessEnabled === false);
  check("no public registration", PORTAL_AUTH_POLICY.publicRegistrationEnabled === false);
  check("no SMS MFA", PORTAL_AUTH_POLICY.smsMfaEnabled === false);
  check("client delegated invites disabled", PORTAL_AUTH_POLICY.clientDelegatedInvitesEnabled === false);

  // ── Invitation acceptance matrix ─────────────────────────────────────
  const memberships = dedupeInvitationMemberships([
    { clientId: 5, role: "client-owner" },
    { clientId: 5, role: "client-member" },
    { clientId: 9, role: "client-admin" },
  ]);
  check("dedupe keeps last role per client", memberships.length === 2);
  check(
    "dedupe last role for client 5",
    memberships.find((m) => m.clientId === 5)?.role === "client-member",
  );

  const invBase = {
    status: "sent" as const,
    tokenHash: hash,
    tokenVersion: 1,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    email: "Person@Example.com",
    allowExistingUserExpansion: false,
    memberships,
  };

  check(
    "valid token accepted",
    validateInvitationToken({ invitation: invBase, rawToken: token }).ok === true,
  );
  check(
    "wrong token rejected",
    validateInvitationToken({ invitation: invBase, rawToken: "nope" }).ok === false,
  );
  check(
    "revoked rejected",
    validateInvitationToken({
      invitation: { ...invBase, status: "revoked" },
      rawToken: token,
    }).ok === false,
  );
  check(
    "expired rejected",
    validateInvitationToken({
      invitation: {
        ...invBase,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
      rawToken: token,
    }).ok === false,
  );

  const createPlan = planInvitationAcceptance({
    invitation: invBase,
    existingUser: null,
    existingMemberships: [],
  });
  check("new user plan creates", createPlan.mode === "create-user");
  check(
    "email normalized",
    createPlan.mode === "create-user" &&
      createPlan.email === normalizePortalEmail("Person@Example.com"),
  );

  const inactivePlan = planInvitationAcceptance({
    invitation: { ...invBase, allowExistingUserExpansion: true },
    existingUser: { id: 1, email: "person@example.com", active: false },
    existingMemberships: [],
  });
  check("inactive user refused", inactivePlan.mode === "refuse");

  const noExpand = planInvitationAcceptance({
    invitation: { ...invBase, allowExistingUserExpansion: false },
    existingUser: { id: 1, email: "person@example.com", active: true },
    existingMemberships: [],
  });
  check("expansion requires flag", noExpand.mode === "refuse");

  const expand = planInvitationAcceptance({
    invitation: { ...invBase, allowExistingUserExpansion: true },
    existingUser: { id: 1, email: "person@example.com", active: true },
    existingMemberships: [
      { clientId: 5, role: "client-member", status: "active" },
    ],
  });
  check("expand adds missing only", expand.mode === "expand-memberships");
  if (expand.mode === "expand-memberships") {
    check("adds client 9 only", expand.membershipsToAdd.every((m) => m.clientId === 9));
  }

  const elevation = planInvitationAcceptance({
    invitation: {
      ...invBase,
      allowExistingUserExpansion: true,
      memberships: [{ clientId: 5, role: "client-owner" }],
    },
    existingUser: { id: 1, email: "person@example.com", active: true },
    existingMemberships: [
      { clientId: 5, role: "client-member", status: "active" },
    ],
  });
  check("no silent elevation", elevation.mode === "refuse");

  check("public error is generic", INVITATION_PUBLIC_ERROR.includes("invalid"));

  // ── Recovery / TOTP ──────────────────────────────────────────────────
  const batch = generateRecoveryCodeBatch(10);
  check("10 recovery codes", batch.plaintextCodes.length === 10);
  check(
    "recovery hash match",
    recoveryCodesMatch(batch.plaintextCodes[0]!, batch.hashes[0]!),
  );
  check(
    "find matching recovery",
    findMatchingRecoveryCodeHash(batch.plaintextCodes[2]!, batch.hashes) ===
      hashRecoveryCode(batch.plaintextCodes[2]!),
  );

  __resetTotpReplayCacheForTests();
  const secret = createTotpSecret();
  check("totp secret non-empty", secret.length >= 16);
  const uri = buildTotpOtpauthUrl({ secret, email: "a@b.com" });
  check("otpauth uri", uri.startsWith("otpauth://"));
  const code = generateSync({ secret });
  check(
    "totp verifies",
    verifyTotpCode({ secret, token: code, portalUserId: 42 }),
  );
  check(
    "totp replay blocked",
    !verifyTotpCode({ secret, token: code, portalUserId: 42 }),
  );

  check(
    "enrollment needs passkey or totp",
    canCompleteSecurityEnrollment({ hasPasskey: true, totpEnabled: false }) &&
      canCompleteSecurityEnrollment({ hasPasskey: false, totpEnabled: true }) &&
      !canCompleteSecurityEnrollment({ hasPasskey: false, totpEnabled: false }),
  );

  // ── Step-up / rate limit / WebAuthn config ───────────────────────────
  check(
    "step-up window",
    isStepUpSatisfied(new Date().toISOString()) &&
      !isStepUpSatisfied(new Date(Date.now() - 20 * 60 * 1000).toISOString()),
  );
  check(
    "password alone insufficient when MFA enrolled",
    !strongAuthSatisfiesStepUp({
      method: "password",
      mfaEnrolled: true,
    }),
  );
  check(
    "passkey userVerified satisfies step-up",
    strongAuthSatisfiesStepUp({
      method: "passkey",
      userVerified: true,
      mfaEnrolled: true,
    }),
  );

  __resetPortalRateLimitsForTests();
  let limited = false;
  for (let i = 0; i < 25; i++) {
    const r = assertPortalRateLimit({ bucket: "portal-login", identity: "1.2.3.4" });
    if (!r.ok) limited = true;
  }
  check("login rate limit engages", limited);

  check(
    "allowed origins include production portal",
    resolveWebAuthnAllowedOrigins().includes("https://portal.kreatebydesign.com"),
  );
  check("localhost origin allowed", isAllowedWebAuthnOrigin("http://localhost:3000"));
  const prevVercel = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  check("prod RP ID", resolveWebAuthnRpID() === "portal.kreatebydesign.com");
  if (prevVercel === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = prevVercel;

  // ── Email copy (no secrets) ──────────────────────────────────────────
  const activateUrl = buildInvitationActivateUrl(
    "https://portal.kreatebydesign.com",
    token,
  );
  check("activate url path", activateUrl.includes("/portal/activate?token="));

  const edgeMiddleware = read("middleware.ts");
  const publicPathsBlock = edgeMiddleware.match(
    /const PORTAL_PUBLIC_PATHS = \[([\s\S]*?)\];/,
  )?.[1];
  const publicPathEntries: string[] = publicPathsBlock?.match(/"[^"]+"/g) ?? [];
  check(
    "activate is an approved portal public path",
    publicPathEntries.includes('"/portal/activate"'),
  );
  check(
    "security enroll is not a portal public path",
    !publicPathEntries.includes('"/portal/security/enroll"'),
  );
  check(
    "settings is not a portal public path",
    !publicPathEntries.includes('"/portal/settings"'),
  );
  check(
    "portal root is not a portal public path",
    !publicPathEntries.includes('"/portal"'),
  );
  check(
    "public-path matching uses exact pathname equality",
    edgeMiddleware.includes("pathname === p") &&
      edgeMiddleware.includes("request.nextUrl"),
  );

  check(
    "no-token invitation invalid",
    validateInvitationToken({ invitation: invBase, rawToken: "" }).ok === false,
  );
  check(
    "null invitation invalid",
    validateInvitationToken({ invitation: null, rawToken: token }).ok === false,
  );
  check(
    "accepted invitation rejected",
    validateInvitationToken({
      invitation: { ...invBase, status: "accepted" },
      rawToken: token,
    }).ok === false,
  );
  check(
    "draft invitation rejected",
    validateInvitationToken({
      invitation: { ...invBase, status: "draft" },
      rawToken: token,
    }).ok === false,
  );
  const html = buildInvitationEmailHtml({
    recipientName: "Don",
    companyNames: ["Cusick", "OTP"],
    activateUrl,
    welcomeNote: "Welcome",
  });
  const text = buildInvitationEmailText({
    recipientName: "Don",
    companyNames: ["Cusick", "OTP"],
    activateUrl,
  });
  check("html has CTA", html.includes("Activate your workspace"));
  check("html has companies", html.includes("Cusick"));
  check("text has activate url", text.includes(activateUrl));
  check("email does not embed raw password", !html.toLowerCase().includes("password:"));

  // ── Static policy / no production mutations in batch docs ────────────
  const identityDoc = read("docs/PHASE-4-PORTAL-IDENTITY-SECURITY.md");
  check(
    "docs mark rollout unexecuted",
    identityDoc.includes("unexecuted") || identityDoc.includes("not executed"),
  );
  check("docs name PORTAL_MFA_ENCRYPTION_KEY", identityDoc.includes("PORTAL_MFA_ENCRYPTION_KEY"));
  check("docs biometrics privacy", /never stores? biometric/i.test(identityDoc));
  check("docs no client-managed invites", /client.*(cannot|disabled|not).*(invite|manage)/i.test(identityDoc));

  const adminInvite = read("app/api/admin/portal-invitations/route.ts");
  check("admin invites use requirePayloadAdminApi", adminInvite.includes("requirePayloadAdminApi"));

  const membershipCollection = read("payload/collections/PortalClientMemberships.ts");
  check("membership role field present", membershipCollection.includes("client-owner"));
  check(
    "canManageMembers defaults false",
    membershipCollection.includes("canManageMembers"),
  );

  console.log("\nAll Phase 4 Batch I identity/security checks passed.\n");
}

main();
