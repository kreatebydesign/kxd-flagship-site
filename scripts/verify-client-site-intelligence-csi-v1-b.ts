/**
 * Client Site Intelligence — csi-v1-b sale + commission lifecycle verifier.
 *
 * No database or production writes. Pure transition tests + static safety gates.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CSI_COMMISSION_DUE_ACTIVITY_EVENT_TYPE,
  CSI_COMMISSION_PAID_ACTIVITY_EVENT_TYPE,
  CSI_SALE_CONFIRMED_ACTIVITY_EVENT_TYPE,
  DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
} from "../lib/client-site-intelligence/constants.ts";
import {
  decideCommissionPayment,
  decideSaleConfirmation,
} from "../lib/client-site-intelligence/lifecycle-model.ts";
import { normalizeWebsiteLeadPayload } from "../lib/client-site-intelligence/normalize-website-lead.ts";
import type { ClientSiteEventRecord } from "../lib/client-site-intelligence/types.ts";
import { CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE } from "../lib/product-intelligence/client-site-intelligence/architecture.ts";

const root = process.cwd();
let passed = 0;

function ok(label: string): void {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function record(
  partial: Partial<ClientSiteEventRecord> = {},
): ClientSiteEventRecord {
  return {
    id: 41,
    clientId: 14,
    clientKey: "otp-carts",
    eventClass: "website_lead",
    externalEventId: "OTP-WEB-20260807-V1BTEST1",
    sourceSystem: "otp-carts-website",
    occurredAt: "2026-08-07T12:00:00.000Z",
    receivedAt: "2026-08-07T12:00:01.000Z",
    sensitivity: "sensitive_contact",
    visibilityState: "internal_only",
    processingStatus: "activity_published",
    payload: {
      leadId: "OTP-WEB-20260807-V1BTEST1",
      lifecycleStatus: "new",
      commissionStatus: "not_due",
      soldAt: null,
      saleReference: null,
    },
    ingestMeta: { commissionObligationCreated: false },
    activityTimelineEventId: 99,
    idempotencyKey: "otp-carts-website:OTP-WEB-20260807-V1BTEST1:website_lead",
    lifecycleStatus: "new",
    commissionStatus: "not_due",
    commissionAmountCents: null,
    soldAt: null,
    saleReference: null,
    cartModelReference: null,
    confirmedById: null,
    confirmedAt: null,
    commissionPaidAt: null,
    commissionPaymentReference: null,
    commissionPaidById: null,
    ...partial,
  };
}

async function main(): Promise<void> {
  console.log("\nverify:client-site-intelligence-csi-v1-b\n");

  {
    const normalized = normalizeWebsiteLeadPayload({
      eventClass: "website_lead",
      clientKey: "otp-carts",
      sourceSystem: "otp-carts-website",
      leadId: "OTP-WEB-20260807-V1BTEST1",
      lifecycleStatus: "sold_confirmed",
      commissionStatus: "paid",
      commissionAmountCents: 1,
      soldAt: "2026-08-07",
      saleReference: "FORGED",
    });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) throw new Error("normalization unexpectedly failed");
    assert.equal(normalized.payload.lifecycleStatus, "new");
    assert.equal(normalized.payload.commissionStatus, "not_due");
    assert.equal(
      normalized.payload.commissionAmountCents,
      DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
    );
    assert.equal(normalized.payload.soldAt, null);
    assert.equal(normalized.payload.saleReference, null);
    assert.ok(normalized.rejectedAuthorityFields.includes("lifecycleStatus"));
    assert.ok(normalized.rejectedAuthorityFields.includes("commissionStatus"));
    assert.ok(
      normalized.rejectedAuthorityFields.includes("commissionAmountCents"),
    );
    ok("website ingest cannot create sale or commission authority");
  }

  {
    assert.equal(decideSaleConfirmation(record()), "confirm");
    const due = record({
      lifecycleStatus: "sold_confirmed",
      commissionStatus: "due",
      commissionAmountCents: DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
      soldAt: "2026-08-07T12:00:00.000Z",
      saleReference: "ORDER-TEST-1",
      confirmedById: 1,
      confirmedAt: "2026-08-07T12:05:00.000Z",
    });
    assert.equal(decideSaleConfirmation(due), "already_confirmed");
    assert.equal(decideCommissionPayment(due), "pay");
    const paid = record({
      ...due,
      commissionStatus: "paid",
      commissionPaidAt: "2026-08-08T12:00:00.000Z",
      commissionPaymentReference: "PAYOUT-TEST-1",
      commissionPaidById: 1,
    });
    assert.equal(decideCommissionPayment(paid), "already_paid");
    assert.equal(decideSaleConfirmation(paid), "already_confirmed");
    ok("sale and payment transitions are idempotent");
  }

  {
    assert.throws(() => decideCommissionPayment(record()));
    assert.throws(() => decideSaleConfirmation(record({ clientKey: "otp" })));
    assert.throws(() =>
      decideSaleConfirmation(record({ eventClass: "confirmed_sale" })),
    );
    assert.throws(() =>
      decideSaleConfirmation(
        record({
          lifecycleStatus: "sold_confirmed",
          commissionStatus: "due",
          commissionAmountCents: 1,
        }),
      ),
    );
    assert.equal(DEFAULT_OTP_COMMISSION_AMOUNT_CENTS, 30_000);
    ok(
      "wrong client, wrong class, invalid state, and wrong amount fail closed",
    );
  }

  {
    assert.equal(
      CSI_SALE_CONFIRMED_ACTIVITY_EVENT_TYPE,
      "client-site.sale.confirmed",
    );
    assert.equal(
      CSI_COMMISSION_DUE_ACTIVITY_EVENT_TYPE,
      "client-site.commission.due",
    );
    assert.equal(
      CSI_COMMISSION_PAID_ACTIVITY_EVENT_TYPE,
      "client-site.commission.paid",
    );
    const service = read("lib/client-site-intelligence/sale-commission.ts");
    assert.match(service, /FOR UPDATE/);
    assert.match(service, /initTransaction/);
    assert.match(service, /commitTransaction/);
    assert.match(service, /killTransaction/);
    assert.match(service, /dedupe: true/);
    assert.match(service, /internalOnly: true/);
    assert.match(service, /buildCsiLifecycleActivitySourceId/);
    assert.match(service, /work\(session\.db\)/);
    assert.match(service, /UPDATE client_site_events/);
    assert.match(service, /requiredText\(\s*input\.paymentReference/);
    assert.doesNotMatch(service, /customer\.(email|phone|message|name)/);
    ok(
      "same-session row locking, Activity uniqueness, and payment evidence are enforced",
    );
  }

  {
    const route = read(
      "app/api/admin/client-site-intelligence/[eventId]/lifecycle/route.ts",
    );
    const collection = read("payload/collections/ClientSiteEvents.ts");
    const loader = read("lib/client-site-intelligence/load.ts");
    const ui = read(
      "components/admin/operations/client-command/ClientSiteIntelligencePanel.tsx",
    );
    assert.match(route, /requirePayloadAdminApi/);
    assert.match(route, /isStudioPayloadOperator/);
    assert.match(route, /confirm-sale/);
    assert.match(route, /mark-paid/);
    assert.doesNotMatch(route, /body\.(?:amount|commissionAmountCents)/);
    assert.match(collection, /create: denyAll/);
    assert.match(collection, /update: denyAll/);
    assert.match(collection, /delete: denyAll/);
    assert.match(loader, /OTP_CARTS_CLIENT_KEY/);
    assert.match(loader, /eventClass: \{ equals: "website_lead" \}/);
    assert.doesNotMatch(
      ui,
      /lead\.customer|customerEmail|lead\.email|lead\.phone/,
    );
    assert.match(ui, /Site intelligence/);
    assert.match(ui, /internal attribution/);
    assert.match(
      ui,
      /Website lead → Confirm sale → \$300 commission due → Mark paid/,
    );
    assert.match(ui, /I confirm this website lead resulted in a sold cart/);
    assert.match(ui, /I confirm the \$300 commission was paid outside KXD OS/);
    ok(
      "operator-only OTP workspace exposes no contact payload or portal surface",
    );
  }

  {
    const migration = read("migrations/20260824_csi_v1b_sale_commission.ts");
    const index = read("migrations/index.ts");
    assert.match(migration, /commission_amount_cents/);
    assert.match(migration, /confirmed_by_id/);
    assert.match(migration, /commission_paid_by_id/);
    assert.match(
      migration,
      /client_site_events_sale_commission_integrity_check/,
    );
    assert.match(
      migration,
      /executive_timeline_events_csi_lifecycle_dedupe_uidx/,
    );
    assert.match(migration, /"commission_amount_cents" = 30000/);
    assert.match(migration, /Intentional no-op/);
    assert.ok(
      index.indexOf("20260824_csi_v1b_sale_commission") >
        index.indexOf("20260823_client_site_events"),
    );
    ok("additive migration is registered once after csi-v1-a");
  }

  {
    assert.equal(
      CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.foundationProductionProven,
      true,
    );
    assert.equal(
      CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.saleConfirmationUiImplemented,
      true,
    );
    assert.equal(
      CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.commissionUiImplemented,
      true,
    );
    assert.equal(
      CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.nextImplementationBatch,
      "csi-v1-c",
    );
    assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.implemented, false);
    assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.shipped, false);
    ok("institutional gate advances only through csi-v1-b");
  }

  console.log(`\n${passed} checks passed — csi-v1-b lifecycle verified.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
