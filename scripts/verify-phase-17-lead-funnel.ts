/**
 * Phase 17 M4 — deterministic lead funnel verification (no production writes).
 * Run: npm run verify:phase-17-lead-funnel
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { classifyIdentityCollision } from "../lib/sales/identity";
import {
  FIXTURE_CONTACT_INQUIRY,
  FIXTURE_INTELLIGENCE_PROJECT,
  FIXTURE_OPEN_LEAD,
  FIXTURE_PROPOSAL_FOR_LEAD,
  FIXTURE_START_PROJECT,
  FIXTURE_WEBSITE_AUDIT,
} from "../lib/sales/lead-funnel-fixtures";
import {
  deriveIntakeChannelFromAcquisition,
  extractAuditIdFromProjectInquiryNotes,
  isIntelligenceProjectInquiry,
  normalizeProjectInquirySource,
  resolveProjectInquiryWebsiteAuditId,
} from "../lib/sales/project-inquiry-intake";
import {
  isFirstPartyStartProjectAutoPromote,
  isInquiryEligibleForPromotion,
  isProjectInquiryEligibleForPromotion,
  relId,
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

async function main() {
  console.log("\nverify-phase-17-lead-funnel\n");

  await check("M2 schema + migration surfaces", () => {
    assertFileContains("payload/collections/ProjectInquiries.ts", 'name: "inquirySource"');
    assertFileContains("payload/collections/ProjectInquiries.ts", 'name: "intakeChannel"');
    assertFileContains("payload/collections/ProjectInquiries.ts", 'name: "sourceWebsiteAudit"');
    assertFileContains(
      "migrations/20261028_phase17_project_inquiry_attribution.ts",
      "inquiry_source",
    );
    assertFileContains("migrations/index.ts", "20261028_phase17_project_inquiry_attribution");
    assertFileContains("app/api/project-inquiries/route.ts", "inquirySource:");
    assertFileContains("app/api/project-inquiries/route.ts", "intakeChannel");
  });

  await check("intake attribution helpers", () => {
    assert.equal(normalizeProjectInquirySource("kxd-intelligence"), "kxd-intelligence");
    assert.equal(normalizeProjectInquirySource(""), "start-project");
    assert.equal(
      deriveIntakeChannelFromAcquisition({
        submissionTouch: { channel: "organic-search" },
      }),
      "organic-search",
    );
    assert.equal(extractAuditIdFromProjectInquiryNotes("Audit ID: 42"), 42);
    assert.equal(
      resolveProjectInquiryWebsiteAuditId({
        sourceWebsiteAudit: 9001,
        notes: "Audit ID: 1",
      }),
      9001,
    );
  });

  await check("contact inquiry → sales eligibility", () => {
    assert.equal(isInquiryEligibleForPromotion("new"), true);
    assert.equal(isInquiryEligibleForPromotion("spam"), false);
    assertFileContains("app/api/inquiries/route.ts", "promoteInquiryToSales");
  });

  await check("start project → sales auto-promote gate", () => {
    assert.equal(isFirstPartyStartProjectAutoPromote({ inquirySource: "start-project" }), true);
    assert.equal(isProjectInquiryEligibleForPromotion("new"), true);
    assert.equal(isProjectInquiryEligibleForPromotion("closed"), false);
  });

  await check("intelligence / audit-linked start project handling", () => {
    assert.equal(isIntelligenceProjectInquiry(FIXTURE_INTELLIGENCE_PROJECT), true);
    assert.equal(isFirstPartyStartProjectAutoPromote(FIXTURE_INTELLIGENCE_PROJECT), false);
    assert.equal(
      resolveProjectInquiryWebsiteAuditId(FIXTURE_INTELLIGENCE_PROJECT),
      9001,
    );
    assertFileContains("lib/sales/promote-inbound.ts", "resolveSalesLeadViaWebsiteAudit");
    assertFileContains("app/api/project-inquiries/route.ts", "shouldLinkIntelligence");
  });

  await check("identity collision — exact email match", () => {
    const collision = classifyIdentityCollision({
      email: FIXTURE_START_PROJECT.email,
      website: FIXTURE_START_PROJECT.websiteUrl,
      company: FIXTURE_START_PROJECT.companyName,
      openLeads: [FIXTURE_OPEN_LEAD],
    });
    assert.equal(collision.kind, "exact");
    if (collision.kind === "exact") {
      assert.equal(collision.via, "email");
      assert.equal(Number(collision.salesLead.id), 501);
    }
  });

  await check("duplicate prevention — idempotent source keys", () => {
    assertFileContains("lib/sales/promote-inbound.ts", "resolveExistingBySource");
    assertFileContains(
      "migrations/20260829_acquisition_inbound_sales_promotion.ts",
      "sales_leads_source_project_inquiry_uidx",
    );
  });

  await check("sales opportunity → proposal relationship", () => {
    assert.equal(relId(FIXTURE_PROPOSAL_FOR_LEAD.lead), 501);
    assertFileContains('payload/collections/Proposals.ts', 'relationTo: "sales-leads"');
  });

  await check("failed promotion recovery — inquiry still saved pattern", () => {
    assertFileContains(
      "app/api/project-inquiries/route.ts",
      "Sales handoff failed (project inquiry still saved)",
    );
    assertFileContains("app/api/inquiries/route.ts", "inquiry still saved");
  });

  await check("audit promote unifies with existing project opportunity", () => {
    assertFileContains("lib/sales/promote-inbound.ts", "projectInquiriesForAudit");
    assert.equal(relId(FIXTURE_WEBSITE_AUDIT.promotedSalesLead), 501);
  });

  await check("operator intelligence create override", () => {
    assertFileContains("app/api/admin/acquisition/promote/route.ts", "allowIntelligenceCreate: true");
    assertFileContains("lib/sales/promote-inbound.ts", "allowIntelligenceCreate");
  });

  await check("existing record preservation — additive migration only", () => {
    const migration = readFileSync(
      path.join(ROOT, "migrations/20261028_phase17_project_inquiry_attribution.ts"),
      "utf8",
    );
    assert.ok(migration.includes("ADD COLUMN IF NOT EXISTS"));
    assert.ok(!migration.toLowerCase().includes("drop table"));
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
