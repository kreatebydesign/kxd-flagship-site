/**
 * Partner Portal Phase 1 + 1.1 — focused architecture + isolation verification.
 * Run: npx tsx scripts/verify-partner-portal-phase1.ts
 *
 * Pure file/contract checks. Does not write production data or create invitations.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  PARTNER_COMPENSATION,
  PARTNER_PLAYBOOK_SECTIONS,
} from "../lib/portal/partner/playbook";
import { isPartnerLoginRedirect } from "../lib/portal/partner/login-intent";
import {
  NETWORK_HOST,
  NETWORK_ROOT_LOGIN_PATH,
  networkRootRedirectPath,
} from "../lib/portal/network-root";
import { PORTAL_HOST } from "../lib/portal/constants";
import { PARTNER_VISIBILITY_STATES } from "../lib/portal/partner/types";

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
  console.log("\nverify-partner-portal-phase1 (+ phase 1.1)\n");

  await check("partner collections registered (not public partners logo wall)", () => {
    assertFileContains("payload/collections/KxdPartnerProfiles.ts", 'slug: "kxd-partner-profiles"');
    assertFileContains("payload/collections/PartnerReferrals.ts", 'slug: "partner-referrals"');
    assertFileContains("payload/collections/PartnerEarnings.ts", 'slug: "partner-earnings"');
    assertFileContains(
      "payload/collections/PartnerBookingRequests.ts",
      'slug: "partner-booking-requests"',
    );
    assertFileContains("payload/collections/PartnerReferralNotes.ts", 'slug: "partner-referral-notes"');
    assertFileContains(
      "payload/collections/PartnerCommissionPolicies.ts",
      'slug: "partner-commission-policies"',
    );
    assertFileContains("payload.config.ts", "KxdPartnerProfiles");
    assertFileContains("payload.config.ts", "PartnerReferrals");
    assertFileContains("payload.config.ts", "PartnerReferralNotes");
    assertFileContains("payload.config.ts", "PartnerCommissionPolicies");
    assertFileDoesNotContain(
      "payload/collections/KxdPartnerProfiles.ts",
      'slug: "partners"',
    );
  });

  await check("portal-users accessMode + optional client for partners", () => {
    assertFileContains("payload/collections/PortalUsers.ts", 'name: "accessMode"');
    assertFileContains("payload/collections/PortalUsers.ts", 'value: "partner"');
    assertFileContains("payload/collections/PortalUsers.ts", "required: false");
  });

  await check("sales-leads partner attribution fields", () => {
    assertFileContains("payload/collections/SalesLeads.ts", 'name: "sourcePartnerReferral"');
    assertFileContains("payload/collections/SalesLeads.ts", 'name: "sourcedByPartner"');
  });

  await check("migrations registered and additive", () => {
    assertFileContains(
      "migrations/20261004_partner_portal_phase1.ts",
      'CREATE TABLE IF NOT EXISTS "kxd_partner_profiles"',
    );
    assertFileContains(
      "migrations/20261004_partner_portal_phase1.ts",
      'CREATE TABLE IF NOT EXISTS "partner_referrals"',
    );
    assertFileContains(
      "migrations/20261004_partner_portal_phase1.ts",
      'CREATE TABLE IF NOT EXISTS "partner_earnings"',
    );
    assertFileContains(
      "migrations/20261005_partner_portal_phase1_1.ts",
      'CREATE TABLE IF NOT EXISTS "partner_referral_notes"',
    );
    assertFileContains(
      "migrations/20261005_partner_portal_phase1_1.ts",
      'CREATE TABLE IF NOT EXISTS "partner_commission_policies"',
    );
    assertFileContains(
      "migrations/index.ts",
      "20261004_partner_portal_phase1",
    );
    assertFileContains(
      "migrations/index.ts",
      "20261005_partner_portal_phase1_1",
    );
  });

  await check("session isolation: partner vs client", () => {
    assertFileContains("lib/portal/session.ts", 'accessMode: "partner"');
    assertFileContains("lib/portal/session.ts", "findActivePartnerProfileForUser");
    assertFileContains(
      "lib/portal/session.ts",
      "Partner sessions cannot use client portal APIs",
    );
    assertFileContains(
      "app/(portal)/portal/(app)/layout.tsx",
      'session.accessMode === "partner"',
    );
    assertFileContains(
      "lib/ces/profile/resolve.ts",
      "PORTAL_PARTNER_NO_CES",
    );
  });

  await check("partner routes and APIs exist", () => {
    const routes = [
      "app/(portal)/portal/(partner)/partner/page.tsx",
      "app/(portal)/portal/(partner)/partner/playbook/page.tsx",
      "app/(portal)/portal/(partner)/partner/submit-lead/page.tsx",
      "app/(portal)/portal/(partner)/partner/leads/page.tsx",
      "app/(portal)/portal/(partner)/partner/leads/[referralKey]/page.tsx",
      "app/(portal)/portal/(partner)/partner/earnings/page.tsx",
      "app/(portal)/portal/(partner)/partner/book/page.tsx",
      "app/api/portal/partner/referrals/route.ts",
      "app/api/portal/partner/referrals/[referralId]/notes/route.ts",
      "app/api/portal/partner/earnings/route.ts",
      "app/api/portal/partner/booking-requests/route.ts",
      "app/api/portal/partner/discovery-slots/route.ts",
      "app/api/portal/partner/bookings/route.ts",
      "app/admin/sales/partners/page.tsx",
      "components/admin/sales/NetworkCommandDesk.tsx",
      "app/api/admin/partner/referrals/route.ts",
      "app/api/admin/partner/earnings/route.ts",
      "app/api/admin/partner/policy/route.ts",
    ];
    for (const rel of routes) {
      assert.ok(existsSync(path.join(ROOT, rel)), `missing ${rel}`);
    }
  });

  await check("submit attribution is session-only (ignore body partner ids)", () => {
    assertFileContains(
      "app/api/portal/partner/referrals/route.ts",
      "Never trust body partner ids",
    );
    assertFileContains(
      "app/api/portal/partner/referrals/route.ts",
      "gatePartnerApiSession({ write: true })",
    );
    assertFileContains(
      "lib/portal/partner/access.ts",
      "getPartnerWriteSession",
    );
  });

  await check("operator preview write gate reused", () => {
    assertFileContains(
      "lib/portal/partner/access.ts",
      "portalPreviewReadOnlyResponse",
    );
    assertFileContains(
      "lib/portal/partner/access.ts",
      "getPortalWriteSession",
    );
  });

  await check("never writes client-inquiries", () => {
    assertFileDoesNotContain(
      "lib/portal/partner/referrals.ts",
      "client-inquiries",
    );
    assertFileDoesNotContain(
      "app/api/portal/partner/referrals/route.ts",
      "client-inquiries",
    );
    assertFileContains(
      "lib/portal/partner/referrals.ts",
      'source: "partner-referral"',
    );
    assertFileContains(
      "lib/portal/partner/referrals.ts",
      "sourcePartnerReferral",
    );
  });

  await check("partner-facing visibility states exact set", () => {
    assert.deepEqual([...PARTNER_VISIBILITY_STATES], [
      "submitted",
      "reviewing",
      "qualified",
      "discovery_booked",
      "proposal_in_motion",
      "won",
      "not_moving_forward",
    ]);
  });

  await check("playbook has 8 sections + exact compensation model", () => {
    assert.equal(PARTNER_PLAYBOOK_SECTIONS.length, 8);
    assert.equal(
      PARTNER_PLAYBOOK_SECTIONS.map((s) => s.id).join(","),
      "the-role,what-kxd-sells,who-to-target,qualification-signals,conversation-scripts,objections,lead-handoff,commission-structure",
    );
    assert.match(PARTNER_COMPENSATION.projectShare, /10%/);
    assert.match(PARTNER_COMPENSATION.retainerShare, /first 3 paid months/);
    assert.match(PARTNER_COMPENSATION.approvalRule, /internally approves/);
  });

  await check("referral input normalization requires core fields", () => {
    const src = read("lib/portal/partner/referrals.ts");
    assert.ok(src.includes("Business name is required."));
    assert.ok(src.includes("Contact name is required."));
    assert.ok(src.includes("export function normalizePartnerReferralInput"));
  });

  await check("partner lead ownership on detail + notes", () => {
    assertFileContains(
      "lib/portal/partner/referrals.ts",
      "sourcedByPartner: { equals: input.partnerId }",
    );
    assertFileContains(
      "lib/portal/partner/notes.ts",
      "assertPartnerOwnsReferral",
    );
    assertFileContains(
      "lib/portal/partner/notes.ts",
      "sourcedByPartner: { equals: input.partnerId }",
    );
    assertFileContains(
      "app/api/portal/partner/referrals/[referralId]/notes/route.ts",
      "gatePartnerApiSession({ write: true })",
    );
  });

  await check("no internal-note exposure on partner surfaces", () => {
    assertFileDoesNotContain(
      "app/(portal)/portal/(partner)/partner/leads/[referralKey]/page.tsx",
      "internalNotes",
    );
    assertFileDoesNotContain(
      "lib/portal/partner/referrals.ts",
      "internalNotes",
    );
    assertFileDoesNotContain(
      "lib/portal/partner/notes.ts",
      "internalNotes",
    );
    assertFileContains(
      "payload/collections/PartnerEarnings.ts",
      "Never shown to partners",
    );
    assertFileDoesNotContain(
      "lib/portal/partner/earnings.ts",
      "operatorNotes",
    );
  });

  await check("commission visibility + policy defaults", () => {
    assertFileContains(
      "lib/portal/partner/earnings.ts",
      'status !== "approved" && status !== "paid"',
    );
    assertFileContains(
      "payload/collections/PartnerEarnings.ts",
      "isPayloadAdminUser",
    );
    assertFileContains(
      "payload/collections/PartnerEarnings.ts",
      'value: "pending_approval"',
    );
    assertFileContains(
      "lib/portal/partner/commission.ts",
      "projectRateBps: 1000",
    );
    assertFileContains(
      "lib/portal/partner/commission.ts",
      "monthlyBonusMonths: 3",
    );
    assertFileContains(
      "lib/portal/partner/commission.ts",
      "retentionKickerMonth: 4",
    );
    assertFileContains(
      "lib/portal/partner/commission.ts",
      "performanceBonusAmountCents: 25_000",
    );
    assertFileContains(
      "lib/portal/partner/commission.ts",
      "Math.round((eligibleCollectedCents * rateBps) / 10_000)",
    );
    assertFileContains(
      "app/api/admin/partner/earnings/route.ts",
      "requirePayloadAdminApi",
    );
    assertFileDoesNotContain(
      "app/api/portal/partner/earnings/route.ts",
      "createPartnerEarningEntry",
    );
  });

  await check("calendar booking reuses KXD Google Calendar + fallback", () => {
    assertFileContains(
      "lib/portal/partner/calendar-booking.ts",
      "getGoogleCalendarConnectionStatus",
    );
    assertFileContains(
      "lib/portal/partner/calendar-booking.ts",
      "createCalendarEvent",
    );
    assertFileContains(
      "lib/portal/partner/calendar-booking.ts",
      "createGoogleMeet: true",
    );
    assertFileContains(
      "lib/portal/partner/calendar-booking.ts",
      "Calendar unavailable",
    );
    assertFileContains(
      "lib/portal/partner/calendar-booking.ts",
      'mode: "request"',
    );
    assertFileContains(
      "lib/portal/partner/calendar-booking.ts",
      "requestPartnerBookingChange",
    );
    assertFileContains(
      "lib/portal/partner/calendar-booking.ts",
      "findExistingPartnerSlotBooking",
    );
    assertFileContains(
      "lib/portal/partner/calendar-booking.ts",
      "before Google Calendar write",
    );
    assertFileDoesNotContain(
      "app/api/portal/partner/bookings/route.ts",
      "refresh_token",
    );
    assertFileDoesNotContain(
      "app/api/portal/partner/discovery-slots/route.ts",
      "GOOGLE_REFRESH",
    );
    assertFileDoesNotContain(
      "app/api/portal/partner/bookings/route.ts",
      "googleEventId",
    );
  });

  await check("booking attribution stored on booking records", () => {
    assertFileContains(
      "lib/portal/partner/calendar-booking.ts",
      "relatedPartnerReferral: input.data.relatedPartnerReferralId",
    );
    assertFileContains(
      "lib/portal/partner/calendar-booking.ts",
      "sourcedByPartner: input.partnerId",
    );
    assertFileContains(
      "lib/portal/partner/calendar-booking.ts",
      "Partner referral id:",
    );
  });

  await check("partner/client/admin route separation", () => {
    assertFileContains(
      "app/(portal)/portal/(partner)/layout.tsx",
      "getPartnerSession",
    );
    assertFileContains(
      "app/(portal)/portal/(app)/layout.tsx",
      'session.accessMode === "partner"',
    );
    assertFileContains(
      "app/admin/sales/partners/page.tsx",
      "loadNetworkCommandWorkspace",
    );
    assertFileContains(
      "app/api/admin/partner/policy/route.ts",
      "requirePayloadAdminApi",
    );
  });

  await check("partner login variant is gated by safe /portal/partner redirect", () => {
    assert.equal(isPartnerLoginRedirect("/portal/partner"), true);
    assert.equal(isPartnerLoginRedirect("/portal/partner/leads"), true);
    assert.equal(isPartnerLoginRedirect("/portal"), false);
    assert.equal(isPartnerLoginRedirect("/portal/login"), false);
    assert.equal(isPartnerLoginRedirect("//evil.example"), false);
    assert.equal(isPartnerLoginRedirect("https://example.com/portal/partner"), false);
    assert.equal(isPartnerLoginRedirect(undefined), false);
    assertFileContains(
      "lib/portal/partner/login-intent.ts",
      "Sign in to your partner room.",
    );
    assertFileContains(
      "app/(portal)/portal/(auth)/login/page.tsx",
      "isPartnerLoginRedirect",
    );
    assertFileContains(
      "app/(portal)/portal/(auth)/login/page.tsx",
      'variant={partnerEntry ? "partner" : "client"}',
    );
    assertFileContains(
      "lib/ces/copy/portal-language.ts",
      'authLoginEyebrow: "Your workspace"',
    );
    assertFileContains(
      "lib/ces/copy/portal-language.ts",
      "Review your site, share feedback, and follow every revision",
    );
    assertFileDoesNotContain(
      "lib/ces/copy/portal-language.ts",
      "Sign in to your partner room.",
    );
    assertFileContains(
      "components/portal/PortalLoginForm.tsx",
      'requested.startsWith("/portal/partner")',
    );
    assertFileContains(
      "app/api/portal/auth/login/route.ts",
      "createPortalSession",
    );
  });

  await check("network.kreatebydesign.com / redirects to partner login only", () => {
    assert.equal(NETWORK_HOST, "network.kreatebydesign.com");
    assert.equal(
      networkRootRedirectPath("/", NETWORK_HOST),
      "/portal/login?redirect=/portal/partner",
    );
    assert.equal(networkRootRedirectPath("/", `${NETWORK_HOST}:443`), NETWORK_ROOT_LOGIN_PATH);
    assert.equal(networkRootRedirectPath("/", PORTAL_HOST), null);
    assert.equal(networkRootRedirectPath("/", "kreatebydesign.com"), null);
    assert.equal(networkRootRedirectPath("/", "www.kreatebydesign.com"), null);
    assert.equal(networkRootRedirectPath("/portal/login", NETWORK_HOST), null);
    assert.equal(networkRootRedirectPath("/portal/partner", NETWORK_HOST), null);
    assertFileContains("middleware.ts", "networkRootResponseKind");
    assertFileContains("middleware.ts", "networkShareCrawlerHtml");
    assertFileContains(
      "middleware.ts",
      'if (pathname === "/" && isPortalHost(request))',
    );
    assertFileContains(
      "app/(portal)/portal/(auth)/login/page.tsx",
      "host !== NETWORK_HOST",
    );
  });

  await check("partner hitting CES upgrade APIs fail closed 403", () => {
    assertFileContains(
      "lib/portal/session.ts",
      'code: "PORTAL_PARTNER_NO_CES"',
    );
    assertFileContains(
      "lib/portal/session.ts",
      "export function portalPartnerNoCesResponse",
    );
    assertFileContains(
      "lib/portal/session.ts",
      "return portalPartnerNoCesResponse()",
    );
    assertFileContains(
      "app/api/portal/upgrade-requests/route.ts",
      "portalPartnerNoCesResponse",
    );
    assertFileContains(
      "app/api/portal/upgrade-requests/[id]/cancel/route.ts",
      "portalPartnerNoCesResponse",
    );
    const upgrade = read("app/api/portal/upgrade-requests/route.ts");
    const partnerGate = upgrade.indexOf("portalPartnerNoCesResponse()");
    const listCall = upgrade.indexOf("listClientUpgradeRequests(");
    const createCall = upgrade.indexOf("createClientUpgradeRequest(");
    assert.ok(partnerGate >= 0, "upgrade-requests must return partner no-CES 403");
    assert.ok(
      partnerGate < listCall,
      "partner 403 must run before CES upgrade list",
    );
    assert.ok(
      partnerGate < createCall,
      "partner 403 must run before CES upgrade write",
    );
  });

  await check("no CES module registration for partner portal", () => {
    assertFileDoesNotContain("lib/ces/modules/canonical.ts", "partner-portal");
    assertFileDoesNotContain("lib/ces/modules/registry.ts", "/portal/partner");
  });

  await check("network command stays on admin sales partners, not a second system", () => {
    assertFileContains(
      "lib/portal/partner/referrals.ts",
      "countPartnerPathMetrics",
    );
    assertFileContains(
      "lib/portal/partner/operator.ts",
      "loadNetworkCommandWorkspace",
    );
    assertFileContains(
      "app/admin/sales/partners/page.tsx",
      "NetworkCommandDesk",
    );
    assertFileDoesNotContain(
      "app/(portal)/portal/(partner)/partner/page.tsx",
      "deriveNetworkCommand",
    );
    assertFileDoesNotContain("payload/collections/KxdPartnerProfiles.ts", "hireStatus");
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
