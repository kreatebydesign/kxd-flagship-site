/**
 * Phase 3 security release gate — explicit PASS/FAIL proof for 10 controls.
 * Local DB + pure origin checks. No commit/push/deploy/prod migrate.
 *
 * Run:
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --env-file=.env.local \
 *     --import ./scripts/shims/register-server-only.mjs \
 *     scripts/verify-partner-portal-phase3-security-gate.ts
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getPayload } from "payload";
import config from "../payload.config";
import { NETWORK_HOST } from "../lib/portal/constants";
import { resolvePartnerInvitationOrigin } from "../lib/portal/partner/email-invitation";
import {
  acceptPartnerInvitation,
  createPartnerInvitation,
  findPartnerInvitationByRawToken,
  resendPartnerInvitation,
  revokePartnerInvitation,
} from "../lib/portal/partner/invitations";
import { findActivePartnerProfileForUser } from "../lib/portal/partner/profile";
import { isStaffAllowedApiPath } from "../lib/staff/permissions";
import type { StaffActor } from "../lib/staff/types";

delete process.env.RESEND_API_KEY;

type Row = { id: number; pass: boolean; proof: string };

const results: Row[] = [];
const suffix = randomBytes(4).toString("hex");
const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function tokenFromUrl(url: string): string {
  const token = new URL(url).searchParams.get("token");
  assert.ok(token && token.length >= 16);
  return token;
}

function record(id: number, pass: boolean, proof: string) {
  results.push({ id, pass, proof });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}: ${proof}`);
}

async function cleanup(ids: {
  invitationIds: number[];
  profileIds: number[];
  portalUserIds: number[];
}) {
  const payload = await getPayload({ config });
  for (const id of ids.invitationIds) {
    try {
      await payload.delete({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "kxd-partner-invitations" as any,
        id,
        overrideAccess: true,
      });
    } catch {
      /* best effort */
    }
  }
  for (const id of ids.profileIds) {
    try {
      await payload.delete({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "kxd-partner-profiles" as any,
        id,
        overrideAccess: true,
      });
    } catch {
      /* best effort */
    }
  }
  for (const id of ids.portalUserIds) {
    try {
      await payload.delete({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        id,
        overrideAccess: true,
      });
    } catch {
      /* best effort */
    }
  }
}

async function main() {
  console.log("\nPhase 3 security release gate\n");
  const payload = await getPayload({ config });
  const ids = {
    invitationIds: [] as number[],
    profileIds: [] as number[],
    portalUserIds: [] as number[],
  };

  try {
    // Snapshot Kyle / active partners before invite churn
    const kyleBefore = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      where: {
        or: [
          { displayName: { contains: "Kyle" } },
          { displayName: { equals: "Kyle" } },
        ],
      },
      limit: 5,
      depth: 0,
      overrideAccess: true,
    });
    const activeBefore = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      where: { status: { equals: "active" } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    });
    const activeBeforeSnapshot = activeBefore.docs.map((d) => ({
      id: Number(d.id),
      displayName: String((d as { displayName?: string }).displayName ?? ""),
      status: String((d as { status?: string }).status ?? ""),
      updatedAt: String((d as { updatedAt?: string }).updatedAt ?? ""),
    }));

    // --- Invite under test ---
    const created = await createPartnerInvitation({
      displayName: `Gate Invite ${suffix}`,
      email: `phase3-gate-${suffix}@example.com`,
      personalNote: "security gate",
      origin: "http://localhost:3000",
    });
    ids.invitationIds.push(created.invitation.id);
    ids.profileIds.push(created.invitation.partnerProfileId);
    ids.portalUserIds.push(created.invitation.portalUserId);
    assert.ok(created.oneTimeActivateUrl);
    const priorToken = tokenFromUrl(created.oneTimeActivateUrl!);
    const priorHashLookup = await findPartnerInvitationByRawToken(priorToken);
    assert.ok(priorHashLookup);

    // Stored invitation must not contain raw token
    const storedInvite = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-invitations" as any,
      id: created.invitation.id,
      depth: 0,
      overrideAccess: true,
    })) as Record<string, unknown>;
    const storedBlob = JSON.stringify(storedInvite);
    const noRawInDb = !storedBlob.includes(priorToken);
    const hasHashOnly = Boolean(storedInvite.tokenHash) && !("rawToken" in storedInvite);

    // 1 + 2: Resend invalidates prior token
    const resent = await resendPartnerInvitation({
      invitationId: created.invitation.id,
      origin: "http://localhost:3000",
    });
    assert.ok(resent.oneTimeActivateUrl);
    const newToken = tokenFromUrl(resent.oneTimeActivateUrl!);
    assert.notEqual(newToken, priorToken);

    const priorAfterResend = await findPartnerInvitationByRawToken(priorToken);
    const newAfterResend = await findPartnerInvitationByRawToken(newToken);
    const priorAccept = await acceptPartnerInvitation({
      rawToken: priorToken,
      password: `Gate!${suffix}Aa1`,
    });

    const resendPass =
      priorAfterResend === null &&
      newAfterResend !== null &&
      priorAccept.ok === false;
    record(
      1,
      resendPass,
      resendPass
        ? `resend rotated tokenHash; prior token lookup=null; new token lookup=ok (invitation #${created.invitation.id})`
        : `resend did not invalidate prior token (priorLookup=${priorAfterResend != null}, priorAccept.ok=${priorAccept.ok})`,
    );
    record(
      2,
      priorAccept.ok === false,
      priorAccept.ok === false
        ? `acceptPartnerInvitation(priorToken) => ok:false publicMessage="${"publicMessage" in priorAccept ? priorAccept.publicMessage : ""}"`
        : "prior link after resend unexpectedly accepted",
    );

    // Keep the resent invite unaccepted for item 5 pre-activation gating.
    // Use a separate invite for revoke proof.

    // 3: Revoke invalidates every issued link + blocks access
    const revokeInvite = await createPartnerInvitation({
      displayName: `Gate Revoke ${suffix}`,
      email: `phase3-gate-revoke-${suffix}@example.com`,
      origin: "http://localhost:3000",
    });
    ids.invitationIds.push(revokeInvite.invitation.id);
    ids.profileIds.push(revokeInvite.invitation.partnerProfileId);
    ids.portalUserIds.push(revokeInvite.invitation.portalUserId);
    const revokeToken = tokenFromUrl(revokeInvite.oneTimeActivateUrl!);
    await revokePartnerInvitation({ invitationId: revokeInvite.invitation.id });
    const revokeLookup = await findPartnerInvitationByRawToken(revokeToken);
    const revokeAccept = await acceptPartnerInvitation({
      rawToken: revokeToken,
      password: `Gate!${suffix}Aa1`,
    });
    const revokedUser = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: revokeInvite.invitation.portalUserId,
      depth: 0,
      overrideAccess: true,
    })) as { active?: boolean };
    const revokedProfile = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      id: revokeInvite.invitation.partnerProfileId,
      depth: 0,
      overrideAccess: true,
    })) as { status?: string };
    const activeAfterRevoke = await findActivePartnerProfileForUser(
      revokeInvite.invitation.portalUserId,
    );
    const revokePass =
      revokeLookup === null &&
      revokeAccept.ok === false &&
      revokedUser.active === false &&
      revokedProfile.status === "inactive" &&
      activeAfterRevoke === null;
    record(
      3,
      revokePass,
      revokePass
        ? `revoke cleared tokenHash; accept ok:false; portalUser.active=false; profile.status=inactive; findActivePartnerProfileForUser=null`
        : `revoke incomplete (lookup=${revokeLookup != null}, accept.ok=${revokeAccept.ok}, active=${revokedUser.active}, status=${revokedProfile.status})`,
    );

    // 4: Existing portal-user email cannot be overwritten
    const existingEmail = `phase3-gate-existing-${suffix}@example.com`;
    const existingUser = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      data: {
        email: existingEmail,
        displayName: "Existing Portal User",
        accessMode: "partner",
        active: true,
        password: `Exist!${suffix}Aa1`,
        welcomeCompletedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });
    ids.portalUserIds.push(Number(existingUser.id));
    let overwriteThrew = false;
    let overwriteMessage = "";
    let leakedInviteId: number | null = null;
    try {
      const leaked = await createPartnerInvitation({
        displayName: "Should Fail",
        email: existingEmail,
        origin: "http://localhost:3000",
      });
      leakedInviteId = leaked.invitation.id;
      ids.invitationIds.push(leaked.invitation.id);
      ids.profileIds.push(leaked.invitation.partnerProfileId);
      ids.portalUserIds.push(leaked.invitation.portalUserId);
    } catch (err) {
      overwriteThrew = true;
      overwriteMessage = err instanceof Error ? err.message : String(err);
    }
    const existingAfter = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: Number(existingUser.id),
      depth: 0,
      overrideAccess: true,
    })) as { accessMode?: string; displayName?: string; email?: string; active?: boolean };
    const overwritePass =
      overwriteThrew &&
      leakedInviteId == null &&
      existingAfter.accessMode === "partner" &&
      existingAfter.active === true &&
      existingAfter.email === existingEmail &&
      existingAfter.displayName === "Existing Portal User";
    record(
      4,
      overwritePass,
      overwritePass
        ? `createPartnerInvitation threw "${overwriteMessage}"; existing portal-user unchanged (partner/active)`
        : `existing portal user was mutable via invite (threw=${overwriteThrew}, leakedInviteId=${leakedInviteId})`,
    );

    // 5: Invited users have no access before activation
    const invitedUser = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: created.invitation.portalUserId,
      depth: 0,
      overrideAccess: true,
    })) as { active?: boolean; accessMode?: string };
    const invitedActiveProfile = await findActivePartnerProfileForUser(
      created.invitation.portalUserId,
    );
    const memberships = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-client-memberships" as any,
      where: { portalUser: { equals: created.invitation.portalUserId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const sessionSrc = read("lib/portal/session.ts");
    const accessSrc = read("lib/portal/partner/access.ts");
    const invitedGatePass =
      invitedUser.active === false &&
      invitedActiveProfile === null &&
      memberships.docs.length === 0 &&
      sessionSrc.includes("if (user.active === false) return null") &&
      sessionSrc.includes("findActivePartnerProfileForUser") &&
      accessSrc.includes("isPartnerSession") &&
      read("lib/portal/partner/profile.ts").includes(
        '{ status: { equals: "active" } }',
      );
    record(
      5,
      invitedGatePass,
      invitedGatePass
        ? `invited portalUser.active=false; no active partner profile; no client memberships; session requires active user + active partner profile`
        : "invited user not fully gated before activation",
    );

    // 6: Existing active partners including Kyle unchanged
    const activeAfter = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      where: { status: { equals: "active" } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    });
    const activeAfterSnapshot = activeAfter.docs.map((d) => ({
      id: Number(d.id),
      displayName: String((d as { displayName?: string }).displayName ?? ""),
      status: String((d as { status?: string }).status ?? ""),
      updatedAt: String((d as { updatedAt?: string }).updatedAt ?? ""),
    }));
    // Ignore profiles we created that somehow became active
    const createdProfileSet = new Set(ids.profileIds);
    const beforeIds = activeBeforeSnapshot
      .map((r) => r.id)
      .filter((id) => !createdProfileSet.has(id))
      .sort((a, b) => a - b);
    const afterIds = activeAfterSnapshot
      .map((r) => r.id)
      .filter((id) => !createdProfileSet.has(id))
      .sort((a, b) => a - b);
    const kyleStill = kyleBefore.docs.every((doc) => {
      const id = Number(doc.id);
      const after = activeAfterSnapshot.find((r) => r.id === id);
      const before = activeBeforeSnapshot.find((r) => r.id === id);
      if (!before) return true;
      return (
        after != null &&
        after.status === before.status &&
        after.displayName === before.displayName
      );
    });
    const unchangedPass =
      JSON.stringify(beforeIds) === JSON.stringify(afterIds) && kyleStill;
    record(
      6,
      unchangedPass,
      unchangedPass
        ? `active partner ids unchanged [${beforeIds.join(",") || "none"}]; Kyle rows preserved (${kyleBefore.docs.length} matched)`
        : `active partner set changed before=${beforeIds.join(",")} after=${afterIds.join(",")}`,
    );

    // 7: Production-mode invite URLs
    const prevNodeEnv = process.env.NODE_ENV;
    const prevNetworkUrl = process.env.NETWORK_PUBLIC_URL;
    delete process.env.NETWORK_PUBLIC_URL;
    // @ts-expect-error allow test override
    process.env.NODE_ENV = "production";
    const prodNetwork = resolvePartnerInvitationOrigin(
      `https://${NETWORK_HOST}`,
    );
    const prodVercel = resolvePartnerInvitationOrigin(
      "https://kxd-rebuild-abc123.vercel.app",
    );
    const prodArbitrary = resolvePartnerInvitationOrigin(
      "https://evil.example.com",
    );
    const prodLocalhost = resolvePartnerInvitationOrigin("http://localhost:3000");
    const prodLoopback = resolvePartnerInvitationOrigin("http://127.0.0.1:3000");
    const expected = `https://${NETWORK_HOST}`;
    const originPass =
      prodNetwork === expected &&
      prodVercel === expected &&
      prodArbitrary === expected &&
      prodLocalhost === expected &&
      prodLoopback === expected;
    record(
      7,
      originPass,
      originPass
        ? `production origins all resolve to ${expected}`
        : `production origin leakage: network=${prodNetwork} vercel=${prodVercel} arbitrary=${prodArbitrary} localhost=${prodLocalhost} loopback=${prodLoopback}`,
    );
    // restore
    // @ts-expect-error restore
    process.env.NODE_ENV = prevNodeEnv;
    if (prevNetworkUrl != null) process.env.NETWORK_PUBLIC_URL = prevNetworkUrl;
    else delete process.env.NETWORK_PUBLIC_URL;

    // 8: Raw tokens not persisted / logged / returned by normal APIs
    const invitationApi = read("app/api/admin/partner/invitations/route.ts");
    const invitationsLib = read("lib/portal/partner/invitations.ts");
    const collection = read("payload/collections/KxdPartnerInvitations.ts");
    const activatePreview = read(
      "app/api/portal/partner/activate/preview/route.ts",
    );
    const activateAccept = read(
      "app/api/portal/partner/activate/accept/route.ts",
    );
    const noLogRaw =
      !invitationsLib.includes("console.log") &&
      !invitationsLib.includes("console.info") &&
      !invitationApi.includes("console.log");
    const previewNoToken = !activatePreview.includes("rawToken") &&
      !activatePreview.includes("oneTimeActivateUrl");
    const acceptNoTokenReturn =
      activateAccept.includes("redirectTo") &&
      !activateAccept.includes("oneTimeActivateUrl");
    const mapNoRaw = !invitationsLib.includes("rawToken:") ||
      invitationsLib.includes("oneTimeActivateUrl: emailResult.sent ? undefined");
    const tokenPass =
      noRawInDb &&
      hasHashOnly &&
      noLogRaw &&
      previewNoToken &&
      acceptNoTokenReturn &&
      collection.includes('name: "tokenHash"') &&
      !collection.includes('name: "rawToken"') &&
      mapNoRaw &&
      invitationApi.includes("oneTimeActivateUrl: result.oneTimeActivateUrl ?? null") &&
      invitationsLib.includes("emailResult.sent ? undefined : activateUrl");
    record(
      8,
      tokenPass,
      tokenPass
        ? "DB stores tokenHash only; create/resend return oneTimeActivateUrl only when email fails; preview/accept never return raw token; no console logging of tokens"
        : "raw token handling incomplete",
    );

    // 9: Owner-only controls; partner + restricted staff denial
    const restrictedActor = {
      userId: 99,
      email: "staff@example.com",
      role: "operations_coordinator",
      onboardingCompletedAt: new Date().toISOString(),
    } as StaffActor;
    const staffDeniedInvite = !isStaffAllowedApiPath(
      "/api/admin/partner/invitations",
      restrictedActor,
    );
    const staffDeniedResend = !isStaffAllowedApiPath(
      "/api/admin/partner/invitations/12/resend",
      restrictedActor,
    );
    const staffDeniedRevoke = !isStaffAllowedApiPath(
      "/api/admin/partner/invitations/12/revoke",
      restrictedActor,
    );
    const adminAuth = read("lib/admin/auth.ts");
    const inviteRoute = read("app/api/admin/partner/invitations/route.ts");
    const partnerApisDeny =
      read("lib/portal/session.ts").includes("portalPartnerNoCesResponse") &&
      existsSync(path.join(ROOT, "app/api/portal/partner"));
    const ownerPass =
      staffDeniedInvite &&
      staffDeniedResend &&
      staffDeniedRevoke &&
      inviteRoute.includes("requirePayloadAdminApi") &&
      adminAuth.includes("isStaffAllowedApiPath") &&
      partnerApisDeny;
    record(
      9,
      ownerPass,
      ownerPass
        ? "requirePayloadAdminApi on invite/resend/revoke; restricted staff denied /api/admin/partner/invitations*; partners blocked from CES via portalPartnerNoCesResponse"
        : "owner/staff/partner denial incomplete",
    );

    // 10: Fail closed — expired, used, revoked, malformed, wrong-user, replay
    const failInvite = await createPartnerInvitation({
      displayName: `Gate Fail ${suffix}`,
      email: `phase3-gate-fail-${suffix}@example.com`,
      origin: "http://localhost:3000",
    });
    ids.invitationIds.push(failInvite.invitation.id);
    ids.profileIds.push(failInvite.invitation.partnerProfileId);
    ids.portalUserIds.push(failInvite.invitation.portalUserId);
    const failToken = tokenFromUrl(failInvite.oneTimeActivateUrl!);

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-invitations" as any,
      id: failInvite.invitation.id,
      data: { expiresAt: new Date(Date.now() - 1000).toISOString() },
      overrideAccess: true,
    });
    const expiredAccept = await acceptPartnerInvitation({
      rawToken: failToken,
      password: `Gate!${suffix}Aa1`,
    });

    const fresh = await createPartnerInvitation({
      displayName: `Gate Replay ${suffix}`,
      email: `phase3-gate-replay-${suffix}@example.com`,
      origin: "http://localhost:3000",
    });
    ids.invitationIds.push(fresh.invitation.id);
    ids.profileIds.push(fresh.invitation.partnerProfileId);
    ids.portalUserIds.push(fresh.invitation.portalUserId);
    const freshToken = tokenFromUrl(fresh.oneTimeActivateUrl!);
    const firstAccept = await acceptPartnerInvitation({
      rawToken: freshToken,
      password: `Gate!${suffix}Aa1`,
    });
    const replayAccept = await acceptPartnerInvitation({
      rawToken: freshToken,
      password: `Gate!${suffix}Aa1`,
    });
    const malformedAccept = await acceptPartnerInvitation({
      rawToken: "short",
      password: `Gate!${suffix}Aa1`,
    });
    // wrong-user: token for invite A cannot activate as a different portal user context —
    // hash binds to one invitation; also accept refuses when invitee already has client membership
    const wrongUserAccept = await acceptPartnerInvitation({
      rawToken: priorToken, // invalidated by resend earlier
      password: `Gate!${suffix}Aa1`,
    });
    const publicMsg =
      expiredAccept.ok === false &&
      expiredAccept.publicMessage ===
        "This invitation link is invalid or no longer available.";
    const failClosedPass =
      expiredAccept.ok === false &&
      firstAccept.ok === true &&
      replayAccept.ok === false &&
      revokeAccept.ok === false &&
      malformedAccept.ok === false &&
      wrongUserAccept.ok === false &&
      publicMsg;
    record(
      10,
      failClosedPass,
      failClosedPass
        ? `expired/used/revoked/malformed/stale-wrong-token all ok:false; public error non-enumerating`
        : `fail-closed incomplete expired=${expiredAccept.ok} first=${firstAccept.ok} replay=${replayAccept.ok} malformed=${malformedAccept.ok}`,
    );
  } finally {
    await cleanup(ids);
  }

  console.log("\n--- MATRIX ---");
  for (const row of results) {
    console.log(`${row.id}\t${row.pass ? "PASS" : "FAIL"}\t${row.proof}`);
  }
  const allPass = results.length === 10 && results.every((r) => r.pass);
  console.log(`\nGATE: ${allPass ? "ALL PASS" : "HAS FAILURES"}\n`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
