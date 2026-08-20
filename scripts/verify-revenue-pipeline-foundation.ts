/**
 * Revenue Pipeline foundation — focused verification.
 * Run: npm run verify:revenue-pipeline-foundation
 *
 * Pure logic + architecture surface checks. Does not write production data
 * and does not auto-promote historical research leads.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  normalizeResearchIntake,
  looksLikeEmail,
  classifyLegacyLeadUrl,
  resolveResearchContactDisplay,
} from "../lib/research-leads/intake";
import { buildOpportunityIntelligencePromoteSummary } from "../lib/research-leads/opportunity-intelligence";
import { STATUS_TO_SECTION, WORKSPACE_SECTIONS } from "../lib/sales/workspace-stages";
import { isNextAction, NEXT_ACTIONS } from "../lib/sales/next-action";

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
  console.log("\nverify-revenue-pipeline-foundation\n");

  await check("architecture surfaces exist", () => {
    assertFileContains("migrations/20260827_revenue_pipeline_foundation.ts", "opportunity_url");
    assertFileContains("migrations/index.ts", "20260827_revenue_pipeline_foundation");
    assertFileContains("payload/collections/ResearchLeads.ts", "opportunityUrl");
    assertFileContains("payload/collections/ResearchLeads.ts", "contactEmail");
    assertFileContains("payload/collections/SalesLeads.ts", "sourceResearchLead");
    assertFileContains("payload/collections/SalesLeads.ts", "nextAction");
    assertFileContains("lib/sales/promote-research-lead.ts", "promoteResearchLeadToSales");
    assertFileContains("lib/sales/workspace.ts", "getSalesWorkspace");
    assertFileContains("app/api/admin/research-leads/promote/route.ts", "requirePayloadAdminApi");
    assertFileContains("components/junior-creators/JuniorLeadForm.tsx", "Opportunity Link");
    assertFileContains("components/admin/sales/PipelineScreen.tsx", "Who needs you");
    assertFileContains("components/admin/sales/PipelineScreen.tsx", "showQuickActions={false}");
    assertFileContains("components/admin/ResearchDesk.tsx", "Promote to Sales");
    // Capability invariant: operators can open an add form that POSTs to research-leads.
    // Do not assert a brittle literal button chrome string (label casing/punctuation may change).
    assertFileContains("components/admin/ResearchDesk.tsx", "showAddForm");
    assertFileContains("components/admin/ResearchDesk.tsx", "/api/admin/research-leads");
    assertFileContains("app/api/admin/research-leads/route.ts", "requirePayloadAdminApi");
    assertFileContains("app/api/admin/research-leads/route.ts", "export async function POST");
  });

  await check("1. opportunity URL only is accepted", () => {
    const r = normalizeResearchIntake({
      opportunityUrl: "https://portland.craigslist.org/job/123",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.opportunityUrl, "https://portland.craigslist.org/job/123");
      assert.equal(r.data.contactEmail, null);
      assert.equal(r.data.contactPhone, null);
    }
  });

  await check("2. contact email only is accepted", () => {
    const r = normalizeResearchIntake({
      contactEmail: "owner@example.com",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.contactEmail, "owner@example.com");
      assert.equal(r.data.opportunityUrl, null);
    }
  });

  await check("3. phone only is accepted", () => {
    const r = normalizeResearchIntake({ contactPhone: "(503) 555-0199" });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.contactPhone, "(503) 555-0199");
  });

  await check("4. empty contact/opportunity rejected", () => {
    const r = normalizeResearchIntake({ notes: "no contact" });
    assert.equal(r.ok, false);
  });

  await check("5. email is never treated as URL", () => {
    assert.equal(looksLikeEmail("relay-xyz@sale.craigslist.org"), true);
    const bad = normalizeResearchIntake({
      opportunityUrl: "relay-xyz@sale.craigslist.org",
    });
    assert.equal(bad.ok, false);

    const legacy = classifyLegacyLeadUrl("relay-xyz@sale.craigslist.org");
    assert.equal(legacy.contactEmail, "relay-xyz@sale.craigslist.org");
    assert.equal(legacy.opportunityUrl, null);

    const display = resolveResearchContactDisplay({
      leadUrl: "relay-xyz@sale.craigslist.org",
    });
    assert.equal(display.contactEmail, "relay-xyz@sale.craigslist.org");
    assert.equal(display.opportunityUrl, null);
  });

  await check("6. URL remains exact (no silent rewrite of path)", () => {
    const url = "https://portland.craigslist.org/w4w/d/portland-help/123456.html";
    const r = normalizeResearchIntake({ opportunityUrl: url });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.opportunityUrl, url);
  });

  await check("7. attribution fields exist on sales schema", () => {
    assertFileContains(
      "payload/collections/SalesLeads.ts",
      "sourcedByJuniorCreator",
    );
    assertFileContains("payload/collections/SalesLeads.ts", "sourcedByName");
    assertFileContains(
      "lib/sales/promote-research-lead.ts",
      "sourcedByJuniorCreator",
    );
  });

  await check("8–13. promote workflow surfaces + unique guard", () => {
    assertFileContains(
      "lib/sales/promote-research-lead.ts",
      "sourceResearchLead",
    );
    assertFileContains(
      "lib/sales/promote-research-lead.ts",
      "created: false",
    );
    assertFileContains(
      "migrations/20260827_revenue_pipeline_foundation.ts",
      "sales_leads_source_research_lead_uidx",
    );
    assertFileContains(
      "lib/sales/promote-research-lead.ts",
      "promotedSalesLead",
    );
    assertFileContains(
      "lib/sales/promote-research-lead.ts",
      "logSalesActivity",
    );
  });

  await check("14–15. sales workspace + contextual actions", () => {
    assertFileContains("components/admin/sales/OpportunityCard.tsx", "mailto:");
    assertFileContains("components/admin/sales/OpportunityCard.tsx", "tel:");
    assertFileContains("components/admin/sales/OpportunityCard.tsx", "View Opportunity");
    assert.equal(WORKSPACE_SECTIONS.length, 6);
    assert.equal(STATUS_TO_SECTION.new, "new-leads");
    assert.equal(STATUS_TO_SECTION.discovery, "needs-response");
    assert.equal(STATUS_TO_SECTION.nurturing, "in-conversation");
    assert.equal(STATUS_TO_SECTION.proposal, "proposal-decision");
    assert.equal(STATUS_TO_SECTION.negotiation, "proposal-decision");
    assert.equal(STATUS_TO_SECTION.won, "won");
    assert.equal(STATUS_TO_SECTION.lost, "not-moving");
  });

  await check("16. promote/manage gated by admin auth", () => {
    assertFileContains(
      "app/api/admin/research-leads/promote/route.ts",
      "requirePayloadAdminApi",
    );
    assertFileContains(
      "app/api/admin/sales/leads/route.ts",
      "requirePayloadAdminApi",
    );
  });

  await check("17. historical leadUrl still classifiable; no auto-promote", () => {
    const urlLegacy = classifyLegacyLeadUrl(
      "https://eugene.craigslist.org/job/999",
    );
    assert.equal(urlLegacy.opportunityUrl, "https://eugene.craigslist.org/job/999");
    const text = readFileSync(
      path.join(ROOT, "lib/sales/promote-research-lead.ts"),
      "utf8",
    );
    assert.ok(!text.includes("auto-promote"));
    assert.ok(!text.includes("find({ collection: \"research-leads\""));
  });

  await check("next action is first-class", () => {
    assert.ok(NEXT_ACTIONS.some((a) => a.value === "respond-today"));
    assert.equal(isNextAction("none"), true);
    assert.equal(isNextAction("invented"), false);
  });

  await check("migration is additive only (no DROP of legacy lead_url)", () => {
    const mig = readFileSync(
      path.join(ROOT, "migrations/20260827_revenue_pipeline_foundation.ts"),
      "utf8",
    );
    assert.ok(mig.includes("ADD COLUMN IF NOT EXISTS"));
    assert.ok(!mig.includes('DROP COLUMN IF EXISTS "lead_url"'));
    assert.ok(!mig.includes("UPDATE research_leads SET"));
  });

  await check("Opportunity Intelligence V1 fields + promote snapshot", () => {
    assertFileContains("payload/collections/ResearchLeads.ts", "triggerType");
    assertFileContains("payload/collections/ResearchLeads.ts", "digitalGap");
    assertFileContains("payload/collections/ResearchLeads.ts", "commercialBand");
    assertFileContains(
      "migrations/20260902_research_lead_opportunity_intelligence.ts",
      "ADD COLUMN IF NOT EXISTS",
    );
    assertFileContains("migrations/index.ts", "20260902_research_lead_opportunity_intelligence");
    assertFileContains("lib/sales/promote-research-lead.ts", "buildOpportunityIntelligencePromoteSummary");
    assertFileContains("components/admin/ResearchDesk.tsx", "OpportunityIntelligenceEditor");
    assert.ok(
      !readFileSync(path.join(ROOT, "payload/collections/SalesLeads.ts"), "utf8").includes(
        "triggerType",
      ),
      "SalesLeads must not gain OI schema fields",
    );

    const empty = buildOpportunityIntelligencePromoteSummary({});
    assert.equal(empty, null);

    const partial = buildOpportunityIntelligencePromoteSummary({
      grade: "A",
      triggerType: "second-location",
      digitalGap: "New location is not yet represented online.",
      urgency: "high",
      commercialBand: "2.5-7.5k",
      recommendedChannel: "email",
      eventDate: null,
    });
    assert.ok(partial);
    assert.ok(partial!.includes("Grade: A"));
    assert.ok(partial!.includes("Trigger: Second location"));
    assert.ok(partial!.includes("Digital gap: New location is not yet represented online."));
    assert.ok(partial!.includes("Urgency: High"));
    assert.ok(partial!.includes("Commercial potential: $2,500–$7,500"));
    assert.ok(partial!.includes("Recommended first contact: Email"));
    assert.ok(!partial!.includes("Event:"));
    assert.ok(!partial!.includes("null"));
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
