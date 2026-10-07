/**
 * Owner Desk Active roster classification regression.
 * Active = active partner profile + active portal user.
 *
 * Run: npm run verify:network-command-roster-active
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { derivePartnerRosterState } from "../lib/portal/partner/invitation-rules";
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

async function check(label: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

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

async function main() {
  console.log("\nverify-network-command-roster-active\n");

  await check("active profile + active portal user = Active roster", () => {
    assert.equal(
      derivePartnerRosterState({
        profileStatus: "active",
        portalUserActive: true,
      }),
      "active",
    );
    const workspace = deriveNetworkCommand({
      profiles: [
        {
          id: 10,
          displayName: "Active Partner",
          status: "active",
          portalUserActive: true,
          notes: null,
        },
      ],
      ...empty,
    });
    assert.equal(workspace.activePartners.map((p) => p.id).join(","), "10");
    assert.equal(workspace.inactivePartners.length, 0);
  });

  await check("inactive profile + inactive portal user = not Active roster", () => {
    assert.equal(
      derivePartnerRosterState({
        profileStatus: "inactive",
        portalUserActive: false,
        invitationStatus: "accepted",
      }),
      "inactive",
    );
    assert.equal(
      derivePartnerRosterState({
        profileStatus: "active",
        portalUserActive: false,
        invitationStatus: "accepted",
      }),
      "inactive",
    );
    const workspace = deriveNetworkCommand({
      profiles: [
        {
          id: 11,
          displayName: "M4TT",
          status: "inactive",
          portalUserActive: false,
          notes: null,
        },
        {
          id: 12,
          displayName: "Deactivated portal",
          status: "active",
          portalUserActive: false,
          notes: null,
        },
      ],
      ...empty,
    });
    assert.equal(workspace.activePartners.length, 0);
    assert.equal(
      workspace.inactivePartners.map((p) => p.id).sort().join(","),
      "11,12",
    );
  });

  await check("Kyle’s valid active record remains Active", () => {
    const kyle: NetworkCommandProfileInput = {
      id: 1,
      displayName: "Kyle",
      status: "active",
      portalUserActive: true,
      notes: null,
    };
    assert.equal(
      derivePartnerRosterState({
        profileStatus: kyle.status,
        portalUserActive: kyle.portalUserActive,
        invitationStatus: "accepted",
      }),
      "active",
    );
    const workspace = deriveNetworkCommand({
      profiles: [
        kyle,
        {
          id: 99,
          displayName: "M4TT",
          status: "inactive",
          portalUserActive: false,
          notes: null,
        },
      ],
      ...empty,
    });
    assert.equal(workspace.activePartners.map((p) => p.id).join(","), "1");
    assert.equal(workspace.activePartners[0]?.displayName, "Kyle");
    assert.equal(workspace.inactivePartners.map((p) => p.id).join(","), "99");
  });

  await check("Owner Desk loader joins portal-users.active for rosterState", () => {
    const operator = readFileSync(
      path.join(ROOT, "lib/portal/partner/operator.ts"),
      "utf8",
    );
    assert.ok(operator.includes("loadPortalUserActiveByIds"));
    assert.ok(operator.includes("portalUserActive"));
    assert.ok(operator.includes("derivePartnerRosterState"));
    assert.ok(operator.includes('collection: "portal-users"'));
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
