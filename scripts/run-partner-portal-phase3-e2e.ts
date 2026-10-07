/**
 * Local E2E: invite → activate → submit first introduction.
 * Also covers expiry, replay, revoke, isolation, and invited-session denial.
 *
 * Run (local DB only):
 *   KXD_SERVER_ONLY_SHIM=1 npx tsx --env-file=.env.local \
 *     --import ./scripts/shims/register-server-only.mjs \
 *     scripts/run-partner-portal-phase3-e2e.ts
 *
 * Does not push, deploy, or run production migrations.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { getPayload } from "payload";
import config from "../payload.config";
import {
  acceptPartnerInvitation,
  createPartnerInvitation,
  findPartnerInvitationByRawToken,
  revokePartnerInvitation,
} from "../lib/portal/partner/invitations";
import { findActivePartnerProfileForUser } from "../lib/portal/partner/profile";
import {
  listPartnerReferrals,
  submitPartnerReferral,
} from "../lib/portal/partner/referrals";
import { readFileSync } from "node:fs";
import path from "node:path";

// Force email-fail path so we receive the one-time activate URL once.
delete process.env.RESEND_API_KEY;

const suffix = randomBytes(4).toString("hex");
const inviteEmail = `phase3-invite-${suffix}@example.com`;
const inviteName = `Phase3 Invite ${suffix}`;
const password = `Phase3!${suffix}Aa1`;

function tokenFromUrl(url: string): string {
  const parsed = new URL(url);
  const token = parsed.searchParams.get("token");
  assert.ok(token && token.length >= 16, "activate URL must include token");
  return token;
}

async function cleanup(ids: {
  invitationIds: number[];
  profileIds: number[];
  portalUserIds: number[];
  referralIds: number[];
}) {
  const payload = await getPayload({ config });
  for (const id of ids.referralIds) {
    try {
      await payload.delete({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "partner-referrals" as any,
        id,
        overrideAccess: true,
      });
    } catch {
      /* best effort */
    }
  }
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
  console.log("\nrun-partner-portal-phase3-e2e\n");

  const payload = await getPayload({ config });
  const cleanupIds = {
    invitationIds: [] as number[],
    profileIds: [] as number[],
    portalUserIds: [] as number[],
    referralIds: [] as number[],
  };

  try {
    // --- Invite ---
    const created = await createPartnerInvitation({
      displayName: inviteName,
      email: inviteEmail,
      personalNote: "Local Phase 3 E2E invitation.",
      origin: "http://localhost:3000",
    });
    cleanupIds.invitationIds.push(created.invitation.id);
    cleanupIds.profileIds.push(created.invitation.partnerProfileId);
    cleanupIds.portalUserIds.push(created.invitation.portalUserId);

    assert.equal(created.emailSent, false, "E2E expects email-fail copy path");
    assert.ok(created.oneTimeActivateUrl, "one-time activate URL required when email fails");
    const rawToken = tokenFromUrl(created.oneTimeActivateUrl!);
    console.log("  ✓ invitation created with one-time link (email not configured)");

    const portalUser = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: created.invitation.portalUserId,
      depth: 0,
      overrideAccess: true,
    })) as { active?: boolean; accessMode?: string };
    assert.equal(portalUser.active, false);
    assert.equal(portalUser.accessMode, "partner");

    const beforeAccept = await findActivePartnerProfileForUser(
      created.invitation.portalUserId,
    );
    assert.equal(beforeAccept, null, "invited profile must not be session-active");
    console.log("  ✓ invited user denied active partner session");

    // --- Expire path ---
    const expireInvite = await createPartnerInvitation({
      displayName: `Expire ${suffix}`,
      email: `phase3-expire-${suffix}@example.com`,
      origin: "http://localhost:3000",
    });
    cleanupIds.invitationIds.push(expireInvite.invitation.id);
    cleanupIds.profileIds.push(expireInvite.invitation.partnerProfileId);
    cleanupIds.portalUserIds.push(expireInvite.invitation.portalUserId);
    const expireToken = tokenFromUrl(expireInvite.oneTimeActivateUrl!);
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-invitations" as any,
      id: expireInvite.invitation.id,
      data: { expiresAt: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    });
    assert.equal(await findPartnerInvitationByRawToken(expireToken), null);
    const expireAccept = await acceptPartnerInvitation({
      rawToken: expireToken,
      password,
    });
    assert.equal(expireAccept.ok, false);
    console.log("  ✓ expired invitation fails closed");

    // --- Revoke path ---
    const revokeInvite = await createPartnerInvitation({
      displayName: `Revoke ${suffix}`,
      email: `phase3-revoke-${suffix}@example.com`,
      origin: "http://localhost:3000",
    });
    cleanupIds.invitationIds.push(revokeInvite.invitation.id);
    cleanupIds.profileIds.push(revokeInvite.invitation.partnerProfileId);
    cleanupIds.portalUserIds.push(revokeInvite.invitation.portalUserId);
    const revokeToken = tokenFromUrl(revokeInvite.oneTimeActivateUrl!);
    await revokePartnerInvitation({ invitationId: revokeInvite.invitation.id });
    assert.equal(await findPartnerInvitationByRawToken(revokeToken), null);
    const revokeAccept = await acceptPartnerInvitation({
      rawToken: revokeToken,
      password,
    });
    assert.equal(revokeAccept.ok, false);
    console.log("  ✓ revoked invitation fails closed");

    // --- Malformed token ---
    const malformed = await acceptPartnerInvitation({
      rawToken: "not-a-real-token",
      password,
    });
    assert.equal(malformed.ok, false);
    console.log("  ✓ malformed token fails closed");

    // --- Activate ---
    const accepted = await acceptPartnerInvitation({
      rawToken,
      password,
      displayName: inviteName,
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) throw new Error("accept failed");
    console.log("  ✓ invitation accepted; account activated");

    const replay = await acceptPartnerInvitation({
      rawToken,
      password,
    });
    assert.equal(replay.ok, false);
    console.log("  ✓ replay of used token fails closed");

    const activeProfile = await findActivePartnerProfileForUser(
      accepted.portalUserId,
    );
    assert.ok(activeProfile);
    assert.equal(activeProfile?.status, "active");
    assert.equal(activeProfile?.id, accepted.partnerProfileId);

    const userAfter = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      id: accepted.portalUserId,
      depth: 0,
      overrideAccess: true,
    })) as { active?: boolean };
    assert.equal(userAfter.active, true);
    console.log("  ✓ active partner profile + portal user after accept");

    // Operator preview write denial remains wired on partner mutating APIs.
    const partnerAccess = readFileSync(
      path.join(process.cwd(), "lib/portal/partner/access.ts"),
      "utf8",
    );
    assert.ok(partnerAccess.includes("getPartnerWriteSession"));
    assert.ok(partnerAccess.includes("portalPreviewReadOnlyResponse"));
    console.log("  ✓ partner write path keeps operator-preview read-only denial");

    // --- First introduction ---
    const intro = await submitPartnerReferral({
      partnerId: accepted.partnerProfileId,
      partnerName: inviteName,
      data: {
        businessName: `Phase3 Biz ${suffix}`,
        contactName: "Intro Contact",
        contactRole: "Owner",
        phone: "555-0100",
        email: `intro-${suffix}@example.com`,
        website: "https://example.com",
        instagramSocial: "",
        industry: "Hospitality",
        whatTheyWantMoreOf: "Qualified discovery calls",
        visibleProblemOpportunity: "Inconsistent lead flow",
        whyNow: "Phase 3 E2E",
        decisionMakerConfirmed: true,
        bestTimeForDiscoveryCall: "Weekdays",
        partnerNotes: "Local E2E introduction",
      },
    });
    assert.equal(intro.ok, true);
    if (!intro.ok) {
      throw new Error("intro submit failed");
    }
    cleanupIds.referralIds.push(intro.referralId);
    console.log("  ✓ first introduction submitted");

    // --- Isolation: other partner cannot see this referral ---
    const otherProfiles = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      where: {
        and: [
          { status: { equals: "active" } },
          { id: { not_equals: accepted.partnerProfileId } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (otherProfiles.docs[0]) {
      const otherId = Number(otherProfiles.docs[0].id);
      const otherList = await listPartnerReferrals(otherId);
      assert.equal(
        otherList.some((row) => row.id === intro.referralId),
        false,
        "other partner must not see E2E referral",
      );
      console.log("  ✓ partner isolation preserved against existing active partner");
    } else {
      console.log("  · skipped cross-partner isolation (no other active partner in local DB)");
    }

    const ownList = await listPartnerReferrals(accepted.partnerProfileId);
    assert.ok(ownList.some((row) => row.id === intro.referralId));
    console.log("  ✓ activated partner sees own introduction");

    console.log("\nPhase 3 local E2E passed.\n");
  } finally {
    await cleanup(cleanupIds);
    console.log("  · cleaned up E2E fixtures");
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
