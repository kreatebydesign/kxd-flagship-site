import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canApplyRegistrationPaymentTransition,
  isRegistrationSourceExternalId,
  parseRegistrationPaymentPatch,
} from "./registration-payment";

describe("registration payment source ids", () => {
  it("accepts evtreg ids", () => {
    assert.equal(isRegistrationSourceExternalId("evtreg_mwgumtez_k1l3nb"), true);
    assert.equal(isRegistrationSourceExternalId("PRIMAL-WEB-20260816-ABC123"), false);
  });
});

describe("registration payment parse", () => {
  it("parses nested payment object from signed body", () => {
    const patch = parseRegistrationPaymentPatch(
      {
        payment: {
          paymentStatus: "paid",
          paymentAmountCents: 599500,
          paymentCurrency: "usd",
          stripeCheckoutSessionId: "cs_test_1",
          programLabel: "2-Day Performance School",
          courseId: "performance-school-2day",
          paidAt: "2026-11-28T12:00:00.000Z",
        },
        eventStartDate: "2026-12-01",
      },
      "evtreg_abc_def",
    );
    assert.equal(patch.registrationId, "evtreg_abc_def");
    assert.equal(patch.paymentStatus, "paid");
    assert.equal(patch.paymentAmountCents, 599500);
    assert.equal(patch.eventStartsOn, "2026-12-01");
  });

  it("ignores payment fields without registration identity", () => {
    const patch = parseRegistrationPaymentPatch(
      { paymentStatus: "paid", paymentAmountCents: 100 },
      "PRIMAL-WEB-20261117-ABCDEF12",
    );
    assert.equal(patch.paymentStatus, null);
    assert.equal(patch.paymentAmountCents, null);
  });

  it("parses campaign school order payment via registrationId", () => {
    const orderId = "cschool-20261118-E7404D79";
    const patch = parseRegistrationPaymentPatch(
      {
        registrationId: orderId,
        payment: {
          paymentStatus: "paid",
          paymentAmountCents: 599500,
          paymentCurrency: "usd",
          stripeCheckoutSessionId: "cs_test_bf",
          stripePaymentIntentId: "pi_test_bf",
          paidAt: "2026-11-18T18:24:31.651Z",
          programLabel: "2-Day Performance School",
          courseId: "performance-school-2day",
          eventStartsOn: null,
          eventEndsOn: null,
        },
      },
      orderId,
    );
    assert.equal(patch.registrationId, orderId);
    assert.equal(patch.paymentStatus, "paid");
    assert.equal(patch.paymentAmountCents, 599500);
    assert.equal(patch.eventStartsOn, null);
    assert.equal(patch.eventEndsOn, null);
  });
});

describe("registration payment transitions", () => {
  it("rejects pending overwriting paid", () => {
    assert.equal(canApplyRegistrationPaymentTransition("paid", "pending"), false);
  });

  it("allows paid after pending", () => {
    assert.equal(canApplyRegistrationPaymentTransition("pending", "paid"), true);
  });

  it("allows refund from paid only", () => {
    assert.equal(canApplyRegistrationPaymentTransition("paid", "refunded"), true);
    assert.equal(canApplyRegistrationPaymentTransition("pending", "refunded"), false);
  });

  it("locks refunded", () => {
    assert.equal(canApplyRegistrationPaymentTransition("refunded", "paid"), false);
  });
});