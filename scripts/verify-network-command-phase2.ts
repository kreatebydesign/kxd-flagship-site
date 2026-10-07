/**
 * Network Command Phase 2 — fixture tests for the derived read model.
 * Run: node --import tsx scripts/verify-network-command-phase2.ts
 *
 * Does not write production data.
 */

import assert from "node:assert/strict";
import { deriveNetworkCommand } from "../lib/portal/partner/network-command";
import { countPartnerPathMetrics } from "../lib/portal/partner/path-metrics";
import type {
  NetworkCommandBookingInput,
  NetworkCommandEarningInput,
  NetworkCommandInput,
  NetworkCommandNoteInput,
  NetworkCommandProfileInput,
  NetworkCommandReferralInput,
  NetworkCommandSalesLeadInput,
} from "../lib/portal/partner/network-command";

const NOW = new Date("2026-10-06T12:00:00.000Z");
let checks = 0;

async function check(label: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

const POLICY = {
  performanceBonusEnabled: true,
  performanceBonusAmountCents: 25_000,
  performanceBonusProjectCount: 3,
  performanceBonusWindowDays: 90,
};

function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return hoursAgo(days * 24);
}

function partnerA(): NetworkCommandProfileInput {
  return {
    id: 1,
    displayName: "Partner A",
    status: "active",
    notes: null,
  };
}

function partnerB(): NetworkCommandProfileInput {
  return {
    id: 2,
    displayName: "Partner B",
    status: "active",
    notes: "Selective operator note.",
  };
}

function bReferrals(): NetworkCommandReferralInput[] {
  return [
    {
      id: 21,
      partnerId: 2,
      businessName: "Harbor Goods",
      contactName: "Ann Harbor",
      visibilityState: "submitted",
      internalStatus: "new",
      decisionMakerConfirmed: false,
      internalNotes: null,
      promotedSalesLeadId: 201,
      createdAt: hoursAgo(60),
    },
    {
      id: 22,
      partnerId: 2,
      businessName: "North Studio",
      contactName: "Lee North",
      visibilityState: "qualified",
      internalStatus: "qualified",
      decisionMakerConfirmed: false,
      internalNotes: null,
      promotedSalesLeadId: 202,
      createdAt: daysAgo(10),
    },
    {
      id: 23,
      partnerId: 2,
      businessName: "Cedar Hospitality",
      contactName: "Pat Cedar",
      visibilityState: "discovery_booked",
      internalStatus: "in_conversation",
      decisionMakerConfirmed: false,
      internalNotes: null,
      promotedSalesLeadId: 203,
      createdAt: daysAgo(8),
    },
    {
      id: 24,
      partnerId: 2,
      businessName: "Atlas Interiors",
      contactName: "Sam Atlas",
      visibilityState: "won",
      internalStatus: "closed",
      decisionMakerConfirmed: false,
      internalNotes: null,
      promotedSalesLeadId: 204,
      createdAt: daysAgo(6),
    },
  ];
}

function bSalesLeads(): NetworkCommandSalesLeadInput[] {
  return [
    {
      id: 201,
      partnerId: 2,
      sourceReferralId: 21,
      companyName: "Harbor Goods",
      status: "new",
      nextFollowUp: hoursAgo(-24),
    },
    {
      id: 202,
      partnerId: 2,
      sourceReferralId: 22,
      companyName: "North Studio",
      status: "discovery",
      nextFollowUp: hoursAgo(-48),
    },
    {
      id: 203,
      partnerId: 2,
      sourceReferralId: 23,
      companyName: "Cedar Hospitality",
      status: "nurturing",
      nextFollowUp: hoursAgo(-72),
    },
    {
      id: 204,
      partnerId: 2,
      sourceReferralId: 24,
      companyName: "Atlas Interiors",
      status: "won",
      nextFollowUp: null,
    },
  ];
}

function bEarnings(): NetworkCommandEarningInput[] {
  return [
    {
      id: 301,
      partnerId: 2,
      earningType: "project_commission",
      paymentStatus: "pending_approval",
      amountCents: 12_000,
      relatedBusinessName: "Atlas Interiors",
      relatedReferralId: 24,
      relatedSalesLeadId: 204,
      approvedAt: null,
      paidAt: null,
      createdAt: daysAgo(1),
    },
    {
      id: 302,
      partnerId: 2,
      earningType: "project_commission",
      paymentStatus: "approved",
      amountCents: 8_000,
      relatedBusinessName: "Cedar Hospitality",
      relatedReferralId: 23,
      relatedSalesLeadId: 203,
      approvedAt: daysAgo(5),
      paidAt: null,
      createdAt: daysAgo(5),
    },
    {
      id: 303,
      partnerId: 2,
      earningType: "project_commission",
      paymentStatus: "approved",
      amountCents: 9_000,
      relatedBusinessName: "North Studio",
      relatedReferralId: 22,
      relatedSalesLeadId: 202,
      approvedAt: daysAgo(4),
      paidAt: null,
      createdAt: daysAgo(4),
    },
  ];
}

function workspace(overrides: Partial<NetworkCommandInput> = {}) {
  const input: NetworkCommandInput = {
    profiles: [partnerA(), partnerB()],
    referrals: bReferrals(),
    bookings: [] as NetworkCommandBookingInput[],
    notes: [] as NetworkCommandNoteInput[],
    earnings: bEarnings(),
    salesLeads: bSalesLeads(),
    policy: POLICY,
    now: NOW,
    ...overrides,
  };
  return deriveNetworkCommand(input);
}

async function main() {
  console.log("\nverify-network-command-phase2\n");

  await check("home path predicates match command path counts", () => {
    const vis = bReferrals().map((row) => row.visibilityState);
    const path = countPartnerPathMetrics({
      visibilityStates: vis,
      openBookingCount: 0,
    });
    assert.equal(path.submittedLeads, 4);
    assert.equal(path.qualifiedLeads, 3);
    assert.equal(path.bookedCalls, 2);
    assert.equal(path.wonClients, 1);
  });

  const derived = workspace();
  const a = derived.activePartners.find((p) => p.id === 1);
  const b = derived.activePartners.find((p) => p.id === 2);
  assert.ok(a && b, "both active partners present");

  await check("Partner A: onboarding, zeros, no rates, no bonus, no hire language", () => {
    assert.equal(a.signal, "onboarding");
    assert.equal(a.signalExplanation, "Active. No introductions yet.");
    assert.equal(a.submittedLeads, 0);
    assert.equal(a.qualifiedLeads, 0);
    assert.equal(a.bookedCalls, 0);
    assert.equal(a.wonClients, 0);
    assert.equal(a.approvedEarningsCents, 0);
    assert.equal(a.paidEarningsCents, 0);
    assert.equal(a.qualifiedRate.percent, null);
    assert.equal(a.discoveryRate.percent, null);
    assert.equal(a.wonRate.percent, null);
    assert.equal(a.bonusProgress, null);
    assert.equal(a.nextAction.kind, "none");
    assert.doesNotMatch(a.signalExplanation, /hire/i);
    assert.equal(a.highPotential, null);
  });

  await check("Partner B: path, rates, bonus, needs review, no hire", () => {
    assert.equal(b.submittedLeads, 4);
    assert.equal(b.qualifiedLeads, 3);
    assert.equal(b.bookedCalls, 2);
    assert.equal(b.wonClients, 1);
    assert.equal(b.qualifiedRate.percent, 75);
    assert.equal(b.discoveryRate.percent, 67);
    assert.equal(b.wonRate.percent, null);
    assert.equal(b.signal, "needs_review");
    assert.equal(b.nextAction.kind, "approve_earning");
    assert.match(b.signalExplanation, /Pending ledger entry #301/);
    assert.ok(b.bonusProgress);
    assert.equal(b.bonusProgress?.count, 2);
    assert.equal(b.bonusProgress?.required, 3);
    assert.equal(b.bonusProgress?.alreadyOnLedger, false);
    assert.match(b.bonusProgress?.sentence ?? "", /2 of 3/);
    assert.match(b.bonusProgress?.sentence ?? "", /\$250/);
    assert.doesNotMatch(b.bonusProgress?.sentence ?? "", /created/i);
    assert.ok(b.highPotential);
    assert.match(
      b.highPotential?.sentence ?? "",
      /A reading of the record\. Not a hiring decision\./,
    );
    assert.doesNotMatch(b.highPotential?.sentence ?? "", /\bhire\b/i);
    assert.equal(b.paidEarningsCents, 0);
    assert.equal(b.approvedEarningsCents, 17_000);
    assert.equal(b.pendingApprovalCents, 12_000);
  });

  await check("network decision is the pending earning, inactive excluded", () => {
    assert.equal(derived.networkDecision.kind, "approve_earning");
    assert.equal(derived.networkDecision.partnerId, 2);
    assert.equal(derived.inactivePartners.length, 0);
  });

  await check("decision-maker is never inferred from missing checkbox", () => {
    assert.equal(
      b.referrals.every((row) => row.decisionMakerConfirmed === false),
      true,
    );
    assert.doesNotMatch(b.highPotential?.sentence ?? "", /decision-maker/);
  });

  await check("discovery rate stays on the visibility funnel when bookings exceed qualified", () => {
    const extra = workspace({
      bookings: Array.from({ length: 5 }, (_, i) => ({
        id: 900 + i,
        partnerId: 2,
        status: "submitted",
        bookingMode: "request",
        preferredTimes: "anytime",
        slotStart: null,
        relatedReferralId: 22,
        createdAt: daysAgo(1),
      })),
    });
    const partner = extra.activePartners.find((row) => row.id === 2);
    assert.ok(partner);
    assert.equal(partner.bookedCalls, 5);
    assert.equal(partner.discoveryRate.numerator, 2);
    assert.equal(partner.discoveryRate.denominator, 3);
    assert.equal(partner.discoveryRate.percent, 67);
    assert.ok((partner.discoveryRate.percent ?? 0) <= 100);
  });

  await check("inactive partner is not in the network decision", () => {
    const quiet = workspace({
      profiles: [
        { ...partnerA(), status: "inactive" },
        partnerB(),
      ],
    });
    assert.equal(quiet.inactivePartners.map((p) => p.id).join(","), "1");
    assert.equal(quiet.networkDecision.partnerId, 2);
  });

  await check("invited partners are listed separately and never drive the decision", () => {
    const withInvite = workspace({
      profiles: [
        partnerA(),
        partnerB(),
        {
          id: 3,
          displayName: "Invited C",
          status: "invited",
          notes: null,
          rosterState: "invited",
          invitationId: 30,
          canResendInvitation: true,
          canRevokeInvitation: true,
        },
      ],
    });
    assert.equal(withInvite.invitedPartners.map((p) => p.id).join(","), "3");
    assert.equal(withInvite.activePartners.length, 2);
    assert.equal(withInvite.networkDecision.partnerId, 2);
  });

  await check("no hire / score / rank vocabulary in the model", () => {
    const blob = JSON.stringify(derived);
    assert.doesNotMatch(blob, /hiring score|hire score|ai score|rank/i);
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
