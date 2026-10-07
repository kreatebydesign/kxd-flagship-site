/**
 * Partner Portal Phase 3 — private invitation + activation verification.
 * Pure rules + contract checks (no DB writes).
 *
 * Run: npm run verify:partner-portal-phase3
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildPartnerInvitationTokenState,
  canResendPartnerInvitation,
  canRevokePartnerInvitation,
  derivePartnerRosterState,
  isAcceptablePartnerInvitationStatus,
  isPartnerInvitationExpired,
  maskPartnerInviteEmail,
  PARTNER_INVITATION_PUBLIC_ERROR,
  PARTNER_INVITATION_TTL_MS,
  partnerInvitationTokensMatch,
} from "../lib/portal/partner/invitation-rules";
import { resolvePartnerInvitationOrigin } from "../lib/portal/partner/email-invitation";
import { deriveNetworkCommand } from "../lib/portal/partner/network-command";
import type {
  NetworkCommandBookingInput,
  NetworkCommandEarningInput,
  NetworkCommandNoteInput,
  NetworkCommandProfileInput,
  NetworkCommandReferralInput,
  NetworkCommandSalesLeadInput,
} from "../lib/portal/partner/network-command";

const ROOT = process.cwd();
let checks = 0;

async function check(label: string, fn: () => void | Promise<void>) {
  await fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function read(rel: string): string {
  const full = path.join(ROOT, rel);
  assert.ok(existsSync(full), `missing file: ${rel}`);
  return readFileSync(full, "utf8");
}

function assertFileContains(rel: string, needle: string) {
  assert.ok(read(rel).includes(needle), `${rel} should contain: ${needle}`);
}

function assertFileDoesNotContain(rel: string, needle: string) {
  assert.ok(!read(rel).includes(needle), `${rel} must not contain: ${needle}`);
}

async function main() {
  console.log("\nverify-partner-portal-phase3\n");

  await check("invitation collection + migration registered", () => {
    assertFileContains(
      "payload/collections/KxdPartnerInvitations.ts",
      'slug: "kxd-partner-invitations"',
    );
    assertFileContains("payload.config.ts", "KxdPartnerInvitations");
    assertFileContains(
      "migrations/20261007_partner_portal_phase3_invitations.ts",
      'CREATE TABLE IF NOT EXISTS "kxd_partner_invitations"',
    );
    assertFileContains(
      "migrations/20261007_partner_portal_phase3_invitations.ts",
      "ADD VALUE IF NOT EXISTS 'invited'",
    );
    assertFileContains(
      "migrations/index.ts",
      "20261007_partner_portal_phase3_invitations",
    );
    assertFileContains(
      "payload/collections/KxdPartnerProfiles.ts",
      'value: "invited"',
    );
  });

  await check("token hash only — raw token never stored in schema", () => {
    const collection = read("payload/collections/KxdPartnerInvitations.ts");
    assert.ok(collection.includes('name: "tokenHash"'));
    assert.ok(!collection.includes('name: "rawToken"'));
    assert.ok(!collection.includes('name: "token"') || collection.includes("tokenHash"));
    assertFileContains(
      "lib/portal/partner/invitations.ts",
      "hashInvitationToken",
    );
    assertFileDoesNotContain(
      "lib/portal/partner/invitations.ts",
      "rawToken: tokenState.rawToken",
    );
    assertFileContains(
      "lib/portal/partner/invitations.ts",
      "tokenHash: tokenState.tokenHash",
    );
  });

  await check("7-day TTL + secure token round-trip", () => {
    assert.equal(PARTNER_INVITATION_TTL_MS, 7 * 24 * 60 * 60 * 1000);
    const state = buildPartnerInvitationTokenState();
    assert.ok(state.rawToken.length >= 32);
    assert.ok(partnerInvitationTokensMatch(state.rawToken, state.tokenHash));
    assert.equal(
      partnerInvitationTokensMatch("wrong-token", state.tokenHash),
      false,
    );
    const delta = state.expiresAt.getTime() - Date.now();
    assert.ok(delta > PARTNER_INVITATION_TTL_MS - 5_000);
    assert.ok(delta <= PARTNER_INVITATION_TTL_MS);
  });

  await check("expiry / revoke / accept status rules fail closed", () => {
    const now = Date.now();
    const future = new Date(now + 60_000).toISOString();
    const past = new Date(now - 60_000).toISOString();

    assert.equal(isPartnerInvitationExpired(past, now), true);
    assert.equal(isPartnerInvitationExpired(future, now), false);
    assert.equal(isAcceptablePartnerInvitationStatus("sent", future, now), true);
    assert.equal(isAcceptablePartnerInvitationStatus("opened", future, now), true);
    assert.equal(isAcceptablePartnerInvitationStatus("sent", past, now), false);
    assert.equal(isAcceptablePartnerInvitationStatus("accepted", future, now), false);
    assert.equal(isAcceptablePartnerInvitationStatus("revoked", future, now), false);
    assert.equal(isAcceptablePartnerInvitationStatus("expired", future, now), false);
  });

  await check("roster states: active unchanged; invited / expired / revoked", () => {
    assert.equal(
      derivePartnerRosterState({
        profileStatus: "active",
        invitationStatus: "accepted",
      }),
      "active",
    );
    assert.equal(
      derivePartnerRosterState({
        profileStatus: "active",
        invitationStatus: "revoked",
      }),
      "active",
    );
    assert.equal(
      derivePartnerRosterState({
        profileStatus: "invited",
        invitationStatus: "sent",
        invitationExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
      "invited",
    );
    assert.equal(
      derivePartnerRosterState({
        profileStatus: "invited",
        invitationStatus: "sent",
        invitationExpiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
      "expired",
    );
    assert.equal(
      derivePartnerRosterState({
        profileStatus: "inactive",
        invitationStatus: "revoked",
      }),
      "revoked",
    );
    assert.equal(
      canResendPartnerInvitation({
        profileStatus: "invited",
        invitationStatus: "sent",
        invitationExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
      true,
    );
    assert.equal(
      canResendPartnerInvitation({
        profileStatus: "active",
        invitationStatus: "accepted",
      }),
      false,
    );
    assert.equal(
      canRevokePartnerInvitation({
        profileStatus: "invited",
        invitationStatus: "sent",
      }),
      true,
    );
    assert.equal(
      canRevokePartnerInvitation({
        profileStatus: "active",
        invitationStatus: "accepted",
      }),
      false,
    );
  });

  await check("no user enumeration helpers in public copy", () => {
    assert.ok(PARTNER_INVITATION_PUBLIC_ERROR.includes("invalid"));
    assert.equal(maskPartnerInviteEmail("kyle@example.com"), "ky•••@example.com");
    assertFileContains(
      "app/api/portal/partner/activate/preview/route.ts",
      "PARTNER_INVITATION_PUBLIC_ERROR",
    );
    assertFileContains(
      "app/api/portal/partner/activate/accept/route.ts",
      "PARTNER_INVITATION_PUBLIC_ERROR",
    );
    assertFileDoesNotContain(
      "app/api/portal/partner/activate/preview/route.ts",
      "email:",
    );
  });

  await check("owner APIs + activate routes + rate limits wired", () => {
    assertFileContains(
      "app/api/admin/partner/invitations/route.ts",
      "createPartnerInvitation",
    );
    assertFileContains(
      "app/api/admin/partner/invitations/[id]/resend/route.ts",
      "resendPartnerInvitation",
    );
    assertFileContains(
      "app/api/admin/partner/invitations/[id]/revoke/route.ts",
      "revokePartnerInvitation",
    );
    assertFileContains(
      "lib/portal/identity/rate-limit.ts",
      '"admin-partner-invite"',
    );
    assertFileContains(
      "lib/portal/identity/rate-limit.ts",
      '"portal-partner-activate"',
    );
    assertFileContains(
      "lib/portal/identity/security-events.ts",
      "partner_invitation.created",
    );
    assertFileContains(
      "lib/portal/identity/security-events.ts",
      "partner_invitation.accepted",
    );
    assertFileContains(
      "lib/portal/identity/security-events.ts",
      "partner_invitation.revoked",
    );
    assertFileContains(
      "app/(portal)/portal/(auth)/partner/activate/page.tsx",
      "PartnerActivateForm",
    );
    assertFileContains(
      "components/admin/sales/NetworkCommandDesk.tsx",
      "Invite partner",
    );
    assertFileContains(
      "app/api/portal/partner/activate/accept/route.ts",
      "assertPartnerActivationOrigin",
    );
    assertFileContains(
      "app/api/portal/partner/activate/preview/route.ts",
      "assertPartnerActivationOrigin",
    );
    assertFileDoesNotContain(
      "app/api/portal/partner/activate/accept/route.ts",
      "assertPortalMutatingOrigin",
    );
  });

  await check("invited partners stay out of active session path", () => {
    assertFileContains(
      "lib/portal/partner/profile.ts",
      '{ status: { equals: "active" } }',
    );
    assertFileContains(
      "lib/portal/partner/invitations.ts",
      "active: false",
    );
    assertFileContains(
      "lib/portal/session.ts",
      "if (user.active === false) return null",
    );
    assertFileContains(
      "lib/portal/partner/access.ts",
      "getPartnerWriteSession",
    );
    assertFileContains(
      "lib/portal/session.ts",
      "portalPreviewReadOnlyResponse",
    );
  });

  await check("network command keeps active partners separate from invites", () => {
    const empty = {
      referrals: [] as NetworkCommandReferralInput[],
      bookings: [] as NetworkCommandBookingInput[],
      notes: [] as NetworkCommandNoteInput[],
      earnings: [] as NetworkCommandEarningInput[],
      salesLeads: [] as NetworkCommandSalesLeadInput[],
      policy: {
        performanceBonusEnabled: true,
        performanceBonusAmountCents: 25_000,
        performanceBonusProjectCount: 3,
        performanceBonusWindowDays: 90,
      },
      now: new Date(),
    };
    const active: NetworkCommandProfileInput = {
      id: 1,
      displayName: "Kyle",
      status: "active",
      notes: null,
      rosterState: "active",
    };
    const invited: NetworkCommandProfileInput = {
      id: 2,
      displayName: "Invited Friend",
      status: "invited",
      notes: null,
      rosterState: "invited",
      email: "friend@example.com",
      invitationId: 9,
      canResendInvitation: true,
      canRevokeInvitation: true,
    };
    const expired: NetworkCommandProfileInput = {
      id: 3,
      displayName: "Expired Invite",
      status: "invited",
      notes: null,
      rosterState: "expired",
      invitationId: 10,
      canResendInvitation: true,
      canRevokeInvitation: true,
    };
    const revoked: NetworkCommandProfileInput = {
      id: 4,
      displayName: "Revoked Invite",
      status: "inactive",
      notes: null,
      rosterState: "revoked",
      invitationId: 11,
      canRevokeInvitation: false,
    };

    const workspace = deriveNetworkCommand({
      profiles: [active, invited, expired, revoked],
      ...empty,
    });

    assert.equal(workspace.activePartners.map((p) => p.id).join(","), "1");
    assert.equal(
      workspace.invitedPartners.map((p) => p.id).sort().join(","),
      "2,3",
    );
    assert.equal(workspace.inactivePartners.map((p) => p.id).join(","), "4");
    assert.notEqual(workspace.networkDecision.partnerId, 2);
    assert.notEqual(workspace.networkDecision.partnerId, 3);
    assert.notEqual(workspace.networkDecision.partnerId, 4);
    assert.doesNotMatch(JSON.stringify(workspace.activePartners), /Invited Friend/);
  });

  await check("production invite origins never leak localhost or Vercel hosts", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevUrl = process.env.NETWORK_PUBLIC_URL;
    delete process.env.NETWORK_PUBLIC_URL;
    // @ts-expect-error test override
    process.env.NODE_ENV = "production";
    const expected = "https://network.kreatebydesign.com";
    assert.equal(resolvePartnerInvitationOrigin("https://network.kreatebydesign.com"), expected);
    assert.equal(resolvePartnerInvitationOrigin("https://foo.vercel.app"), expected);
    assert.equal(resolvePartnerInvitationOrigin("http://localhost:3000"), expected);
    assert.equal(resolvePartnerInvitationOrigin("http://127.0.0.1:3000"), expected);
    assert.equal(resolvePartnerInvitationOrigin("https://evil.example.com"), expected);
    // @ts-expect-error restore
    process.env.NODE_ENV = prevEnv;
    if (prevUrl != null) process.env.NETWORK_PUBLIC_URL = prevUrl;
    else delete process.env.NETWORK_PUBLIC_URL;
  });

  await check("does not reuse CES portal invitation system", () => {
    assertFileDoesNotContain(
      "lib/portal/partner/invitations.ts",
      "portal-invitations",
    );
    assertFileContains(
      "lib/portal/partner/invitations.ts",
      "kxd-partner-invitations",
    );
    assertFileContains(
      "lib/portal/partner/email-invitation.ts",
      "KXD Network",
    );
    assertFileDoesNotContain(
      "lib/portal/partner/email-invitation.ts",
      "Client HQ",
    );
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
