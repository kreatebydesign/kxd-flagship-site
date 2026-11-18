/**
 * Primal Lead Command — registration payment presentation (pure fixtures).
 *
 *   npx tsx scripts/verify-primal-lead-payment-presentation.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ClientInquiryRecord } from "../lib/managed-client-leads/types.ts";
import { isCrossClientLeak } from "../lib/managed-client-leads/isolation.ts";
import {
  formatLeadRegistrationPaymentAmount,
  formatLeadRegistrationPaymentLabel,
  leadHasRegistrationPayment,
  registrationPaymentStatusClass,
} from "../lib/client-command/leads/registration-presentation.ts";

const root = process.cwd();
let checks = 0;

function check(label: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ✔ ${label}`);
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function baseInquiry(overrides: Partial<ClientInquiryRecord> = {}): ClientInquiryRecord {
  return {
    id: 1,
    inquiryKey: "primal-qa-payment",
    clientId: 1,
    clientKey: "primal-motorsports",
    channel: "form",
    receivedAt: new Date().toISOString(),
    destinationInbox: null,
    landingPage: null,
    campaign: null,
    sourceMedium: null,
    contactName: "QA Driver",
    contactEmail: "qa@example.com",
    contactPhone: null,
    messageSummary: null,
    assignedOwnerId: null,
    firstRespondedAt: null,
    responseTimeSeconds: null,
    operationalStatus: "new",
    disposition: "none",
    leadQuality: "unreviewed",
    verificationState: "unverified",
    verifiedAt: null,
    verifiedById: null,
    qualificationState: "unreviewed",
    outcomeState: "open",
    outcomeNote: null,
    confirmedSaleReference: null,
    sourceSystem: "primal-motorsports-website",
    sourceExternalId: "evtreg_qa_k7h9",
    sourceClientSiteEventId: null,
    reconciliationState: "not_applicable",
    googleConversionObserved: false,
    operatorNotes: null,
    nextFollowUpAt: null,
    programInterest: "HPDE",
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    gclid: null,
    keyword: null,
    lostReason: null,
    wonRevenueCents: null,
    bookedProgram: null,
    locationId: null,
    assignedPortalOwnerId: null,
    registrationId: "evtreg_qa_k7h9",
    programLabel: "HPDE QA",
    courseId: null,
    paymentStatus: null,
    paymentAmountCents: null,
    paymentCurrency: null,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    paidAt: null,
    refundedAt: null,
    eventStartsOn: "2026-11-20",
    eventEndsOn: null,
    ...overrides,
  } as ClientInquiryRecord;
}

function main() {
  console.log("\nverify-primal-lead-payment-presentation\n");

  const detail = read("components/ces/leads/LeadDetailScreen.tsx");

  const states = [
    ["pending", "Payment pending", "kxd-lead-pay--pending"],
    ["paid", "Payment confirmed", "kxd-lead-pay--paid"],
    ["failed", "Payment failed", "kxd-lead-pay--failed"],
    ["refunded", "Refunded", "kxd-lead-pay--refunded"],
  ] as const;

  for (const [status, label, className] of states) {
    check(`${status} status label + class`, () => {
      const inquiry = baseInquiry({
        paymentStatus: status,
        paymentAmountCents: 139900,
        paymentCurrency: "usd",
      });
      assert.equal(formatLeadRegistrationPaymentLabel(inquiry), label);
      assert.equal(registrationPaymentStatusClass(status), className);
      assert.equal(leadHasRegistrationPayment(inquiry), true);
    });
  }

  check("Amount and currency formatting", () => {
    const inquiry = baseInquiry({
      paymentStatus: "paid",
      paymentAmountCents: 139900,
      paymentCurrency: "usd",
    });
    assert.equal(formatLeadRegistrationPaymentAmount(inquiry), "1,399.00 USD");
  });

  check("Registration panel hidden without payment identity", () => {
    const inquiry = baseInquiry({
      registrationId: null,
      paymentStatus: null,
      sourceExternalId: "PRIMAL-WEB-20261117-ABCDEF",
    });
    assert.equal(leadHasRegistrationPayment(inquiry), false);
  });

  check("Stripe checkout id only in Support identifiers details", () => {
    assert.ok(detail.includes("stripeCheckoutSessionId"));
    assert.ok(detail.includes("Support identifiers"));
    assert.ok(detail.includes('label="Checkout session"'));
    assert.equal(detail.includes("stripePaymentIntentId"), false);
  });

  check("Cross-client leak guard rejects foreign clientKey", () => {
    const foreign = baseInquiry({
      clientId: 99,
      clientKey: "otp-carts",
    });
    assert.equal(
      isCrossClientLeak({
        inquiryClientId: foreign.clientId,
        inquiryClientKey: foreign.clientKey,
        requestedClientId: 1,
        requestedClientKey: "primal-motorsports",
      }),
      true,
    );
    assert.equal(
      isCrossClientLeak({
        inquiryClientId: 1,
        inquiryClientKey: "primal-motorsports",
        requestedClientId: 1,
        requestedClientKey: "primal-motorsports",
      }),
      false,
    );
  });

  check("Lead detail mounts registration payment panel when payment present", () => {
    assert.ok(detail.includes("kxd-lead-panel--registration"));
    assert.ok(detail.includes("leadHasRegistrationPayment"));
    assert.ok(detail.includes("formatLeadRegistrationPaymentAmount"));
  });

  console.log(`\n${checks} checks passed.\n`);
}

main();