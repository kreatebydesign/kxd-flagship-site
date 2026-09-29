/**
 * Focused verifier — pre-provisioned inactive invitation claim lifecycle.
 *
 * Pure planner tests only. No database. No email. No activation.
 *
 * Run: npm run verify:portal-invitation-preprovisioned-claim
 */

import {
  planInvitationAcceptance,
  planPreprovisionedUserClaim,
  membershipRoleSatisfiesInvitation,
  validateInvitationToken,
  type InvitationRecordLike,
  type ExistingMembershipLike,
} from "../lib/portal/identity/invitation-rules";
import {
  generateInvitationToken,
  hashInvitationToken,
  normalizePortalEmail,
} from "../lib/portal/identity/crypto";

function check(label: string, pass: boolean, detail?: string) {
  if (!pass) {
    console.error(`  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
    throw new Error(detail ? `${label}: ${detail}` : label);
  }
  console.log(`  ✔ ${label}`);
}

function inv(partial: Partial<InvitationRecordLike> = {}): InvitationRecordLike {
  const token = generateInvitationToken();
  return {
    status: "sent",
    tokenHash: hashInvitationToken(token),
    tokenVersion: 1,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    email: "person@example.com",
    allowExistingUserExpansion: false,
    memberships: [{ clientId: 5, role: "client-owner" }],
    ...partial,
  };
}

function main() {
  console.log("\nPre-provisioned invitation claim verification\n");

  // Role satisfy helper
  check(
    "equal role satisfies",
    membershipRoleSatisfiesInvitation({
      existingRole: "client-owner",
      invitedRole: "client-owner",
    }),
  );
  check(
    "higher role satisfies lower invitation",
    membershipRoleSatisfiesInvitation({
      existingRole: "client-owner",
      invitedRole: "client-member",
    }),
  );
  check(
    "lower role does not satisfy",
    !membershipRoleSatisfiesInvitation({
      existingRole: "client-member",
      invitedRole: "client-owner",
    }),
  );

  // A — inactive + matching membership → claim
  const billyStyle = planInvitationAcceptance({
    invitation: inv({
      email: "billy@example.com",
      memberships: [{ clientId: 5, role: "client-owner" }],
    }),
    existingUser: { id: 14, email: "billy@example.com", active: false },
    existingMemberships: [
      { clientId: 5, role: "client-owner", status: "active" },
    ],
  });
  check("A Billy-style claim allowed", billyStyle.mode === "claim-preprovisioned-user");
  if (billyStyle.mode === "claim-preprovisioned-user") {
    check("A preserves CMM only", billyStyle.preservedClientIds.join(",") === "5");
  }

  // B / E — inactive + extras → claim, extras preserved
  const donStyle = planInvitationAcceptance({
    invitation: inv({
      email: "don@example.com",
      allowExistingUserExpansion: false,
      memberships: [
        { clientId: 5, role: "client-owner" },
        { clientId: 9, role: "client-owner" },
        { clientId: 14, role: "client-owner" },
        { clientId: 10, role: "client-owner" },
      ],
    }),
    existingUser: { id: 13, email: "don@example.com", active: false },
    existingMemberships: [
      { clientId: 5, role: "client-owner", status: "active" },
      { clientId: 9, role: "client-owner", status: "active" },
      { clientId: 14, role: "client-owner", status: "active" },
      { clientId: 10, role: "client-owner", status: "active" },
    ],
  });
  check("B/E Don-style claim allowed", donStyle.mode === "claim-preprovisioned-user");
  if (donStyle.mode === "claim-preprovisioned-user") {
    check(
      "B/E extras preserved",
      donStyle.preservedClientIds.join(",") === "5,9,10,14",
    );
  }

  // Invitation subset of memberships (extras beyond invitation)
  const extrasBeyondInvite = planInvitationAcceptance({
    invitation: inv({
      email: "don@example.com",
      memberships: [{ clientId: 5, role: "client-owner" }],
    }),
    existingUser: { id: 13, email: "don@example.com", active: false },
    existingMemberships: [
      { clientId: 5, role: "client-owner", status: "active" },
      { clientId: 9, role: "client-owner", status: "active" },
      { clientId: 14, role: "client-owner", status: "active" },
      { clientId: 10, role: "client-owner", status: "active" },
    ],
  });
  check(
    "B extras beyond invitation still claimable",
    extrasBeyondInvite.mode === "claim-preprovisioned-user",
  );
  if (extrasBeyondInvite.mode === "claim-preprovisioned-user") {
    check(
      "B does not strip extras from preserved list",
      extrasBeyondInvite.preservedClientIds.join(",") === "5,9,10,14",
    );
  }

  // F — email mismatch
  const mismatch = planInvitationAcceptance({
    invitation: inv({ email: "invitee@example.com" }),
    existingUser: { id: 1, email: "other@example.com", active: false },
    existingMemberships: [
      { clientId: 5, role: "client-owner", status: "active" },
    ],
  });
  check("F email mismatch refused", mismatch.mode === "refuse");

  // G — expired token validation
  const raw = generateInvitationToken();
  const expiredValidation = validateInvitationToken({
    invitation: inv({
      tokenHash: hashInvitationToken(raw),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    }),
    rawToken: raw,
  });
  check("G expired invitation invalid", expiredValidation.ok === false);

  // H — revoked
  const revoked = validateInvitationToken({
    invitation: inv({
      status: "revoked",
      tokenHash: hashInvitationToken(raw),
    }),
    rawToken: raw,
  });
  check("H revoked invitation invalid", revoked.ok === false);

  // I — already accepted
  const accepted = validateInvitationToken({
    invitation: inv({
      status: "accepted",
      tokenHash: hashInvitationToken(raw),
    }),
    rawToken: raw,
  });
  check("I accepted invitation invalid", accepted.ok === false);

  // J — malformed token
  const badToken = validateInvitationToken({
    invitation: inv({ tokenHash: hashInvitationToken(raw) }),
    rawToken: "short",
  });
  check("J malformed/mismatched token invalid", badToken.ok === false);

  // K — required membership absent
  const missing = planInvitationAcceptance({
    invitation: inv({
      memberships: [
        { clientId: 5, role: "client-owner" },
        { clientId: 9, role: "client-owner" },
      ],
    }),
    existingUser: { id: 1, email: "person@example.com", active: false },
    existingMemberships: [
      { clientId: 5, role: "client-owner", status: "active" },
    ],
  });
  check(
    "K missing required membership refused",
    missing.mode === "refuse",
  );

  // L — role elevation required
  const elevation = planInvitationAcceptance({
    invitation: inv({
      memberships: [{ clientId: 5, role: "client-owner" }],
    }),
    existingUser: { id: 1, email: "person@example.com", active: false },
    existingMemberships: [
      { clientId: 5, role: "client-member", status: "active" },
    ],
  });
  check(
    "L role elevation refused",
    elevation.mode === "refuse" &&
      elevation.reason === "claim-role-elevation",
  );

  // M — planner email mismatch (different existing identity)
  const wrongIdentity = planPreprovisionedUserClaim({
    invitationMemberships: [{ clientId: 5, role: "client-owner" }],
    existingUser: { id: 99, email: "someone-else@example.com", active: false },
    existingMemberships: [
      { clientId: 5, role: "client-owner", status: "active" },
    ],
    invitationEmail: "person@example.com",
  });
  check(
    "M different existing user refused",
    wrongIdentity.mode === "refuse" && wrongIdentity.reason === "email-mismatch",
  );

  // N — inactive without matching invitation memberships
  const arbitrary = planInvitationAcceptance({
    invitation: inv({ memberships: [{ clientId: 5, role: "client-owner" }] }),
    existingUser: { id: 1, email: "person@example.com", active: false },
    existingMemberships: [],
  });
  check(
    "N arbitrary inactive without memberships refused",
    arbitrary.mode === "refuse",
  );

  // P — disabled membership
  const disabled: ExistingMembershipLike[] = [
    { clientId: 5, role: "client-owner", status: "disabled" },
  ];
  const disabledPlan = planInvitationAcceptance({
    invitation: inv(),
    existingUser: { id: 1, email: "person@example.com", active: false },
    existingMemberships: disabled,
  });
  check(
    "P disabled membership refused",
    disabledPlan.mode === "refuse" &&
      disabledPlan.reason === "claim-membership-inactive",
  );

  // Regression — create-user still works
  const create = planInvitationAcceptance({
    invitation: inv(),
    existingUser: null,
    existingMemberships: [],
  });
  check("regression create-user", create.mode === "create-user");

  // Regression — expand still works
  const expand = planInvitationAcceptance({
    invitation: inv({
      allowExistingUserExpansion: true,
      memberships: [
        { clientId: 5, role: "client-member" },
        { clientId: 9, role: "client-owner" },
      ],
    }),
    existingUser: { id: 1, email: "person@example.com", active: true },
    existingMemberships: [
      { clientId: 5, role: "client-member", status: "active" },
    ],
  });
  check("regression expand-memberships", expand.mode === "expand-memberships");
  if (expand.mode === "expand-memberships") {
    check(
      "regression expand adds only missing",
      expand.membershipsToAdd.map((m) => m.clientId).join(",") === "9",
    );
  }

  // Regression — active + nothing to add still refused
  const nothing = planInvitationAcceptance({
    invitation: inv({ allowExistingUserExpansion: true }),
    existingUser: { id: 1, email: "person@example.com", active: true },
    existingMemberships: [
      { clientId: 5, role: "client-owner", status: "active" },
    ],
  });
  check(
    "regression active nothing-to-add refused",
    nothing.mode === "refuse" && nothing.reason === "nothing-to-add",
  );

  // Regression — expansion flag required for active users
  const noFlag = planInvitationAcceptance({
    invitation: inv({ allowExistingUserExpansion: false }),
    existingUser: { id: 1, email: "person@example.com", active: true },
    existingMemberships: [],
  });
  check(
    "regression expansion-not-allowed",
    noFlag.mode === "refuse" && noFlag.reason === "expansion-not-allowed",
  );

  check(
    "email normalize helper stable",
    normalizePortalEmail("Person@Example.com") === "person@example.com",
  );

  console.log("\nPre-provisioned invitation claim verification passed.\n");
}

main();
