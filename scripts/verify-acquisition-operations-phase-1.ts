/**
 * Acquisition & Lead Operations Phase 1 — focused verification.
 * Run: npm run verify:acquisition-operations-phase-1
 *
 * Pure contract + architecture surface checks. Does not write production data,
 * create client-inquiries, or touch CSI/OTP commission paths.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  ACQUISITION_CONTEXTS,
  CANONICAL_OWNERS,
  KXD_CANONICAL_SALES_COLLECTION,
  KXD_SOURCE_RECORD_TYPES,
  MANAGED_CLIENT_SOURCE_RECORD_TYPES,
  getManagedClientLeadPolicy,
  isAcquisitionContext,
  isValidSourceRecordId,
  sourceRecordKey,
} from "../lib/acquisition-operations";
import {
  isInquiryEligibleForPromotion,
  isProjectInquiryEligibleForPromotion,
  isWebsiteAuditEligibleForPromotion,
  INQUIRY_BUDGET_MIDPOINTS,
  PROJECT_INVESTMENT_MIDPOINTS,
} from "../lib/sales/promote-helpers";

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
  console.log("\nverify-acquisition-operations-phase-1\n");

  await check("shared contracts exist", () => {
    assertFileContains("lib/acquisition-operations/index.ts", "Acquisition & Lead Operations");
    assertFileContains("lib/acquisition-operations/contexts.ts", "kxd_acquisition");
    assertFileContains("lib/acquisition-operations/contexts.ts", "managed_client");
    assertFileContains("lib/acquisition-operations/ownership.ts", "sales-leads");
    assertFileContains("lib/acquisition-operations/policy.ts", "ManagedClientLeadPolicy");
    assert.equal(MANAGED_CLIENT_SOURCE_RECORD_TYPES.client_inquiry, "client_inquiry");
  });

  await check("KXD Acquisition + Managed Client contexts without client hardcoding", () => {
    assert.equal(isAcquisitionContext("kxd_acquisition"), true);
    assert.equal(isAcquisitionContext("managed_client"), true);
    assert.equal(isAcquisitionContext("primal"), false);
    assert.equal(ACQUISITION_CONTEXTS.managed_client, "managed_client");
    // Phase 2 registers policies by clientKey — shared callers still must not branch on product names.
    assert.ok(getManagedClientLeadPolicy("primal-motorsports"));
    assert.ok(getManagedClientLeadPolicy("otp-carts"));
    assert.equal(getManagedClientLeadPolicy("unknown-client"), null);
  });

  await check("provenance / source identity helpers", () => {
    assert.equal(isValidSourceRecordId(12), true);
    assert.equal(isValidSourceRecordId(0), false);
    assert.equal(
      sourceRecordKey({
        context: "kxd_acquisition",
        sourceRecordType: KXD_SOURCE_RECORD_TYPES.inquiry,
        sourceRecordId: 42,
      }),
      "kxd_acquisition:inquiry:42",
    );
    assert.equal(CANONICAL_OWNERS.kxd_sales_opportunity, KXD_CANONICAL_SALES_COLLECTION);
    assert.equal(CANONICAL_OWNERS.managed_client_received_inquiry, "client-inquiries");
  });

  await check("inbound promotion surfaces", () => {
    assertFileContains("lib/sales/promote-inbound.ts", "promoteInquiryToSales");
    assertFileContains("lib/sales/promote-inbound.ts", "promoteProjectInquiryToSales");
    assertFileContains("lib/sales/promote-inbound.ts", "promoteWebsiteAuditToSales");
    assertFileContains("lib/sales/promote-inbound.ts", "sourceInquiry");
    assertFileContains("lib/sales/promote-inbound.ts", "sourceProjectInquiry");
    assertFileContains("lib/sales/promote-inbound.ts", "sourceWebsiteAudit");
    assertFileContains("lib/sales/promote-inbound.ts", "created: false");
    assertFileContains(
      "app/api/admin/acquisition/promote/route.ts",
      "requirePayloadAdminApi",
    );
  });

  await check("eligibility gates remain", () => {
    assert.equal(isInquiryEligibleForPromotion("new"), true);
    assert.equal(isInquiryEligibleForPromotion("spam"), false);
    assert.equal(isInquiryEligibleForPromotion("archived"), false);
    assert.equal(isProjectInquiryEligibleForPromotion("reviewing"), true);
    assert.equal(isProjectInquiryEligibleForPromotion("closed"), false);
    assert.equal(isWebsiteAuditEligibleForPromotion("qualified"), true);
    assert.equal(isWebsiteAuditEligibleForPromotion("closed-lost"), false);
    assert.equal(INQUIRY_BUDGET_MIDPOINTS["10k-25k"], 17_500);
    assert.equal(PROJECT_INVESTMENT_MIDPOINTS["50k-100k"], 75_000);
  });

  await check("first-party /contact auto-promotes; research remains operator-only", () => {
    assertFileContains("app/api/inquiries/route.ts", "promoteInquiryToSales");
    assertFileContains("app/api/inquiries/route.ts", "isFirstPartyInquirySource");
    assertFileDoesNotContain("app/api/inquiries/route.ts", "research-leads");
    assertFileDoesNotContain("app/api/inquiries/route.ts", "client-inquiries");
    assertFileDoesNotContain("lib/sales/promote-inbound.ts", "client-inquiries");
    const researchPromote = readFileSync(
      path.join(ROOT, "lib/sales/promote-research-lead.ts"),
      "utf8",
    );
    assert.ok(!researchPromote.includes("auto-promote"));
  });

  await check("sales provenance schema + unique indexes", () => {
    assertFileContains("payload/collections/SalesLeads.ts", "sourceInquiry");
    assertFileContains("payload/collections/SalesLeads.ts", "sourceProjectInquiry");
    assertFileContains("payload/collections/SalesLeads.ts", "sourceWebsiteAudit");
    assertFileContains("payload/collections/Inquiries.ts", "promotedSalesLead");
    assertFileContains("payload/collections/ProjectInquiries.ts", "promotedSalesLead");
    assertFileContains("payload/collections/WebsiteAudits.ts", "promotedSalesLead");
    assertFileContains(
      "migrations/20260829_acquisition_inbound_sales_promotion.ts",
      "sales_leads_source_inquiry_uidx",
    );
    assertFileContains(
      "migrations/20260829_acquisition_inbound_sales_promotion.ts",
      "sales_leads_source_project_inquiry_uidx",
    );
    assertFileContains(
      "migrations/20260829_acquisition_inbound_sales_promotion.ts",
      "sales_leads_source_website_audit_uidx",
    );
    assertFileContains("migrations/index.ts", "20260829_acquisition_inbound_sales_promotion");
  });

  await check("research → sales regression surfaces intact", () => {
    assertFileContains("lib/sales/promote-research-lead.ts", "promoteResearchLeadToSales");
    assertFileContains("lib/sales/promote-research-lead.ts", "sourceResearchLead");
    assertFileContains("lib/sales/promote-research-lead.ts", "promotedSalesLead");
    assertFileContains("components/admin/ResearchDesk.tsx", "Promote to Sales");
    assertFileContains(
      "app/api/admin/research-leads/promote/route.ts",
      "promoteResearchLeadToSales",
    );
  });

  await check("operator UX promote actions without Growth redesign", () => {
    assertFileContains(
      "components/admin/operations/growth/GrowthScreen.tsx",
      "PromoteToSalesButton",
    );
    assertFileContains(
      "components/admin/operations/audits/AuditsScreen.tsx",
      "PromoteToSalesButton",
    );
    assertFileContains(
      "components/admin/sales/OpportunityCard.tsx",
      "From contact inquiry",
    );
  });

  await check("referral persistence (small additive)", () => {
    assertFileContains("payload/collections/Inquiries.ts", 'name: "referral"');
    assertFileContains("payload/collections/Inquiries.ts", "maxLength: 200");
    assertFileContains("app/api/inquiries/route.ts", "referral: body.referral");
    assertFileContains("app/api/inquiries/route.ts", "slice(0, 200)");
  });

  await check("Phase 1 KXD promote does not touch CSI CRM / OTP commission", () => {
    assertFileDoesNotContain(
      "lib/sales/promote-inbound.ts",
      "client-site-events",
    );
    assertFileDoesNotContain(
      "lib/sales/promote-inbound.ts",
      "commission",
    );
    // Phase 2 owns client-inquiries; Phase 1 promote path must never write them.
    assertFileDoesNotContain(
      "lib/sales/promote-inbound.ts",
      "client-inquiries",
    );
  });

  await check("Phase 17 registry reflects partial progress only", () => {
    assertFileContains("lib/platform/registry.ts", 'id: "phase-17"');
    assertFileContains("lib/platform/registry.ts", 'status: "in-progress"');
    assertFileContains("lib/platform/registry.ts", "Partial:");
    const registry = readFileSync(path.join(ROOT, "lib/platform/registry.ts"), "utf8");
    assert.ok(!registry.includes('id: "phase-17"') || !/phase-17[\s\S]*?status: "completed"/.test(registry));
  });

  await check("CSI doctrine / no universal leads collection", () => {
    assert.equal(existsSync(path.join(ROOT, "payload/collections/Leads.ts")), false);
    assertFileContains(
      "lib/product-intelligence/client-site-intelligence/architecture.ts",
      "Website leads are attribution events, not CRM",
    );
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
