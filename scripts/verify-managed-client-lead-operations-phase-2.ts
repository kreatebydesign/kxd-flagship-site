/**
 * Managed Client Lead Operations Phase 2 — focused verification.
 * Run: npm run verify:managed-client-lead-operations-phase-2
 *
 * Pure contract + architecture surface checks. Does not write production data.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  ACQUISITION_OPERATIONS_PHASE_2,
  CANONICAL_OWNERS,
  getManagedClientLeadPolicy,
  isChannelAllowedForPolicy,
  listManagedClientLeadPolicies,
} from "../lib/acquisition-operations";
import {
  OTP_COMMISSION_BOUNDARY,
  buildManagedClientInquiryKey,
  draftInquiryFromCsiWebsiteLead,
  resolveInquiryKeyFromSource,
  resolveReconciliationState,
  calculateResponseTimeSeconds,
  isCrossClientLeak,
  clientIdMatchesClientKey,
  evidenceOnlySideEffects,
  ledgerScopeWhere,
  LIFECYCLE_DIMENSION_FIELDS,
  CLIENT_INQUIRIES_COLLECTION,
} from "../lib/managed-client-leads";

const ROOT = process.cwd();
let checks = 0;

async function check(label: string, fn: () => void | Promise<void>) {
  await fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function assertFileContains(rel: string, needle: string) {
  const full = path.join(ROOT, rel);
  assert.ok(existsSync(full), `missing file: ${rel}`);
  const text = readFileSync(full, "utf8");
  assert.ok(text.includes(needle), `${rel} should contain: ${needle}`);
}

function assertFileDoesNotContain(rel: string, needle: string) {
  const full = path.join(ROOT, rel);
  assert.ok(existsSync(full), `missing file: ${rel}`);
  const text = readFileSync(full, "utf8");
  assert.ok(!text.includes(needle), `${rel} must not contain: ${needle}`);
}

async function main() {
  console.log("\nverify-managed-client-lead-operations-phase-2\n");

  await check("client-inquiries collection exists and is not sales-leads", () => {
    assert.equal(existsSync(path.join(ROOT, "payload/collections/ClientInquiries.ts")), true);
    assert.equal(CANONICAL_OWNERS.managed_client_received_inquiry, "client-inquiries");
    assert.equal(CANONICAL_OWNERS.kxd_sales_opportunity, "sales-leads");
    assertFileContains("payload/collections/ClientInquiries.ts", 'slug: "client-inquiries"');
    assertFileDoesNotContain(
      "payload/collections/ClientInquiries.ts",
      'relationTo: "sales-leads"',
    );
    assertFileDoesNotContain("payload/collections/ClientInquiries.ts", "commissionAmount");
  });

  await check("migration registered and not production-applied by this pass", () => {
    assertFileContains(
      "migrations/20260830_managed_client_lead_operations.ts",
      'CREATE TABLE IF NOT EXISTS "client_inquiries"',
    );
    assertFileContains(
      "migrations/20260830_managed_client_lead_operations.ts",
      "client_inquiries_source_csi_uidx",
    );
    assertFileContains(
      "migrations/20260830_managed_client_lead_operations.ts",
      "client_inquiries_client_source_external_uidx",
    );
    assertFileContains(
      "migrations/20260830_managed_client_lead_operations.ts",
      "client_inquiries_inquiry_key_uidx",
    );
    assertFileDoesNotContain(
      "migrations/20260830_managed_client_lead_operations.ts",
      "sales_leads",
    );
    assertFileDoesNotContain(
      "migrations/20260830_managed_client_lead_operations.ts",
      "commission_amount",
    );
    assertFileDoesNotContain(
      "migrations/20260830_managed_client_lead_operations.ts",
      "commission_status",
    );
    assertFileContains("migrations/index.ts", "20260830_managed_client_lead_operations");
  });

  await check("policy registry activates Primal + OTP without shared if-branching", () => {
    const primal = getManagedClientLeadPolicy("primal-motorsports");
    const otp = getManagedClientLeadPolicy("otp-carts");
    assert.ok(primal);
    assert.ok(otp);
    assert.equal(primal!.enabled, true);
    assert.equal(primal!.attributionReconciliationEnabled, true);
    assert.equal(primal!.commissionOnConfirmedSale, false);
    assert.ok(primal!.ga4PropertyIds.includes("549908814"));
    assert.ok(primal!.ga4PropertyIds.includes("530873364"));
    assert.equal(otp!.commissionOnConfirmedSale, true);
    assert.equal(otp!.commissionAmountCents, 30_000);
    assert.equal(otp!.supportsSaleConfirmation, false);
    assert.equal(otp!.portalModuleEnabled, false);
    assert.equal(isChannelAllowedForPolicy(primal!, "form"), true);
    assert.equal(listManagedClientLeadPolicies().length >= 2, true);

    // Shared domain services must not hardcode client product branches.
    assertFileDoesNotContain(
      "lib/managed-client-leads/receive.ts",
      'if (clientKey === "primal',
    );
    assertFileDoesNotContain(
      "lib/managed-client-leads/receive.ts",
      'if (clientKey === "otp',
    );
    assertFileDoesNotContain(
      "lib/managed-client-leads/update-lifecycle.ts",
      "confirmCsiWebsiteLeadSale",
    );
  });

  await check("identity + response time + reconciliation helpers", () => {
    const key = buildManagedClientInquiryKey({
      clientKey: "primal-motorsports",
      receivedAt: "2026-08-15T12:00:00.000Z",
      suffix: "TEST01",
    });
    assert.equal(key, "MCI-primal-motorsports-20260815-TEST01");
    assert.equal(
      resolveInquiryKeyFromSource({
        clientKey: "otp-carts",
        sourceExternalId: "OTP-WEB-20260815-ABC",
      }),
      "OTP-WEB-20260815-ABC",
    );
    assert.equal(
      calculateResponseTimeSeconds(
        "2026-08-15T12:00:00.000Z",
        "2026-08-15T12:05:00.000Z",
      ),
      300,
    );
    assert.equal(
      resolveReconciliationState({
        hasReceivedInquiry: true,
        hasAttributionEvidence: false,
        reconciliationEnabled: true,
      }),
      "inquiry_without_ads",
    );
    assert.equal(
      resolveReconciliationState({
        hasReceivedInquiry: false,
        hasAttributionEvidence: true,
        reconciliationEnabled: true,
      }),
      "ads_without_inquiry",
    );
    assert.equal(
      resolveReconciliationState({
        hasReceivedInquiry: true,
        hasAttributionEvidence: true,
        reconciliationEnabled: true,
      }),
      "matched",
    );
  });

  await check("OTP compatibility adapter preserves commission integrity", () => {
    const draft = draftInquiryFromCsiWebsiteLead({
      clientId: 14,
      clientKey: "otp-carts",
      sourceSystem: "otp-carts-website",
      externalEventId: "OTP-WEB-20260815-XYZ",
      eventRecordId: 99,
      occurredAt: "2026-08-15T18:00:00.000Z",
      payload: {
        leadId: "OTP-WEB-20260815-XYZ",
        customer: { name: "Test", email: "t@example.com", phone: null },
        message: "Interested in cart",
        modelInterest: "Model X",
        productInterest: null,
        formSource: "/contact",
      },
    });
    assert.equal(draft.clientKey, "otp-carts");
    assert.equal(draft.sourceExternalId, "OTP-WEB-20260815-XYZ");
    assert.equal(draft.sourceClientSiteEventId, 99);
    assert.equal(draft.channel, "form");
    assert.equal(OTP_COMMISSION_BOUNDARY.formSubmitCreatesCommission, false);
    assert.equal(OTP_COMMISSION_BOUNDARY.inquiryCreateCreatesCommission, false);
    assert.equal(
      OTP_COMMISSION_BOUNDARY.commissionRequiresExplicitCsiSaleConfirmation,
      true,
    );
    assertFileContains(
      "lib/client-site-intelligence/sale-commission.ts",
      "confirmCsiWebsiteLeadSale",
    );
    assertFileContains(
      "lib/client-site-intelligence/sale-commission.ts",
      "markCsiCommissionPaid",
    );
  });

  await check("operator UX + APIs are admin gated", () => {
    assertFileContains("lib/client-command/tabs.ts", 'id: "leads"');
    assertFileContains(
      "components/admin/operations/client-command/CommandWorkspaceTabPanel.tsx",
      "ClientLeadOperationsPanel",
    );
    assertFileContains(
      "app/api/admin/client-inquiries/receive/route.ts",
      "requirePayloadAdminApi",
    );
    assertFileContains(
      "app/api/admin/client-inquiries/[id]/lifecycle/route.ts",
      "isStudioPayloadOperator",
    );
    assertFileDoesNotContain(
      "components/portal/OperatorPortalPreviewBanner.tsx",
      "client-inquiries/receive",
    );
  });

  await check("client isolation fixtures — Primal vs OTP Carts", () => {
    assert.equal(
      isCrossClientLeak({
        inquiryClientId: 1,
        inquiryClientKey: "primal-motorsports",
        requestedClientId: 14,
        requestedClientKey: "otp-carts",
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
    assert.equal(
      clientIdMatchesClientKey({
        clientSlug: "primal-motorsports",
        clientKey: "otp-carts",
      }),
      false,
    );
    assert.equal(
      clientIdMatchesClientKey({
        clientSlug: "primal-motorsports",
        clientKey: "primal-motorsports",
      }),
      true,
    );
    const scope = ledgerScopeWhere(1, "primal-motorsports");
    const clauses = scope.and ?? [];
    assert.equal(clauses.length, 2);
    assert.deepEqual(clauses[0], { client: { equals: 1 } });
    assert.deepEqual(clauses[1], { clientKey: { equals: "primal-motorsports" } });
    assertFileContains("lib/managed-client-leads/load.ts", "ledgerScopeWhere");
    assertFileContains("lib/managed-client-leads/receive.ts", "clientId does not match clientKey");
    assert.equal(CLIENT_INQUIRIES_COLLECTION, "client-inquiries");
  });

  await check("lifecycle dimensions stay independent; GA evidence does not auto-verify", () => {
    assert.deepEqual(
      [...LIFECYCLE_DIMENSION_FIELDS],
      [
        "operationalStatus",
        "verificationState",
        "qualificationState",
        "outcomeState",
        "reconciliationState",
      ],
    );
    const collection = readFileSync(
      path.join(ROOT, "payload/collections/ClientInquiries.ts"),
      "utf8",
    );
    for (const field of LIFECYCLE_DIMENSION_FIELDS) {
      assert.ok(collection.includes(`name: "${field}"`), `missing field ${field}`);
    }
    const effects = evidenceOnlySideEffects({
      googleConversionObserved: true,
      verificationState: "unverified",
      qualificationState: "unreviewed",
    });
    assert.equal(effects.wouldAutoVerify, false);
    assert.equal(effects.wouldAutoQualify, false);
    assertFileContains(
      "lib/managed-client-leads/update-lifecycle.ts",
      "Evidence flag only — never auto-verify or auto-qualify",
    );
    assert.equal(
      calculateResponseTimeSeconds(
        "2026-08-15T10:00:00.000Z",
        "2026-08-15T10:12:30.000Z",
      ),
      750,
    );
  });

  await check("CSI ingest does not auto-create client-inquiries", () => {
    assertFileDoesNotContain(
      "lib/client-site-intelligence/ingest.ts",
      "receiveManagedClientInquiry",
    );
    assertFileDoesNotContain(
      "lib/client-site-intelligence/persist.ts",
      "client-inquiries",
    );
    assertFileDoesNotContain(
      "lib/client-site-intelligence/ingest.ts",
      "draftInquiryFromCsiWebsiteLead",
    );
    assertFileContains(
      "lib/managed-client-leads/otp-compatibility.ts",
      "Does not persist",
    );
  });

  await check("Activity publishes only meaningful business events", () => {
    assertFileContains(
      "lib/managed-client-leads/publish-activity.ts",
      "managed-client.inquiry.received",
    );
    assertFileContains(
      "lib/managed-client-leads/publish-activity.ts",
      "internalOnly: true",
    );
    assertFileDoesNotContain(
      "lib/managed-client-leads/publish-activity.ts",
      "HMAC",
    );
    assertFileDoesNotContain(
      "lib/managed-client-leads/publish-activity.ts",
      "signature verification",
    );
    assertFileDoesNotContain(
      "lib/managed-client-leads/publish-activity.ts",
      "GA4",
    );
  });

  await check("portal module disabled; no public write endpoint", () => {
    const primal = getManagedClientLeadPolicy("primal-motorsports");
    const otp = getManagedClientLeadPolicy("otp-carts");
    assert.equal(primal?.portalModuleEnabled, false);
    assert.equal(otp?.portalModuleEnabled, false);
    assert.equal(existsSync(path.join(ROOT, "app/api/portal/client-inquiries")), false);
    assert.equal(existsSync(path.join(ROOT, "app/api/client-inquiries")), false);
    assertFileContains(
      "app/api/admin/client-inquiries/receive/route.ts",
      "requirePayloadAdminApi",
    );
  });

  await check("Phase 2 does not create universal Leads collection", () => {
    assert.equal(existsSync(path.join(ROOT, "payload/collections/Leads.ts")), false);
    assert.ok(
      ACQUISITION_OPERATIONS_PHASE_2.implements.includes(
        "client-inquiries persistence (managed-client received inquiries)",
      ),
    );
    assert.ok(
      ACQUISITION_OPERATIONS_PHASE_2.deferred.includes("Portal Lead Operations module"),
    );
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
