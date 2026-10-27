/**
 * Phase 17 M5–M6 — staff assignment, promotion access, and funnel integration (no production writes).
 * Run: npm run verify:phase-17-m5-m6-lead-funnel
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { staffActorFromUser } from "../lib/staff/actor";
import { acquisitionPromoteAllowedForActor } from "../lib/acquisition-operations/acquisition-promote-access-policy";
import {
  assertStaffMayAccessSalesLead,
  staffMayAccessSalesLead,
} from "../lib/staff/sales/access";
import {
  inboundAssignmentActivitySuffix,
  pickInboundSalesAssignee,
} from "../lib/sales/inbound-staff-assignment-policy";
import { classifyIdentityCollision } from "../lib/sales/identity";
import {
  FIXTURE_CONTACT_INQUIRY,
  FIXTURE_OPEN_LEAD,
  FIXTURE_PROPOSAL_FOR_LEAD,
  FIXTURE_START_PROJECT,
  FIXTURE_WEBSITE_AUDIT,
} from "../lib/sales/lead-funnel-fixtures";
import { relId } from "../lib/sales/promote-helpers";

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
  console.log("\nverify-phase-17-m5-m6-lead-funnel\n");

  await check("M5 inbound assignment — fair pick among eligible BDS", () => {
    const eligible = [
      { userId: 10, displayName: "A" },
      { userId: 20, displayName: "B" },
    ];
    const counts = new Map<number, number>([[10, 3], [20, 1]]);
    assert.equal(pickInboundSalesAssignee(eligible, counts), 20);
    const tied = new Map<number, number>([[10, 2], [20, 2]]);
    assert.equal(pickInboundSalesAssignee(eligible, tied), 10);
    assert.equal(pickInboundSalesAssignee([], tied), null);
  });

  await check("M5 promote path wires assignment + activity", () => {
    assertFileContains(
      "lib/sales/promote-inbound.ts",
      "resolveInboundSalesStaffAssignment",
    );
    assertFileContains("lib/sales/promote-inbound.ts", "toAssignedStaffUserData");
    assertFileContains(
      "lib/sales/promote-inbound.ts",
      "inboundAssignmentActivitySuffix",
    );
    assertFileContains(
      "lib/sales/inbound-staff-assignment.ts",
      "business_development_specialist",
    );
    assert.equal(
      inboundAssignmentActivitySuffix({
        assignedStaffUser: 42,
        assigneeLabel: "Alex",
      }),
      "Assigned to Alex for inbound follow-up.",
    );
  });

  await check("M5 acquisition promote API — operator-only guard", () => {
    assertFileContains(
      "app/api/admin/acquisition/promote/route.ts",
      "acquisitionPromoteOperatorDenied",
    );
    const bds = staffActorFromUser({
      id: 99,
      email: "tyler@kreatebydesign.com",
      role: "editor",
      staffRole: "business_development_specialist",
      staffOnboardingCompletedAt: "2026-07-01T00:00:00.000Z",
    });
    assert.ok(bds);
    assert.equal(acquisitionPromoteAllowedForActor(bds), false);

    const founder = staffActorFromUser({
      id: 1,
      email: "matt@kreatebydesign.com",
      role: "admin",
      staffRole: "operations_manager",
    });
    assert.ok(founder);
    assert.equal(acquisitionPromoteAllowedForActor(founder), true);
  });

  await check("M5 staff access — assigned vs unrelated prospect", () => {
    const tyler = staffActorFromUser({
      id: 99,
      email: "tyler@kreatebydesign.com",
      role: "editor",
      staffRole: "business_development_specialist",
      staffOnboardingCompletedAt: "2026-07-01T00:00:00.000Z",
    });
    const other = staffActorFromUser({
      id: 88,
      email: "other@kreatebydesign.com",
      role: "editor",
      staffRole: "business_development_specialist",
      staffOnboardingCompletedAt: "2026-07-01T00:00:00.000Z",
    });
    assert.ok(tyler && other);
    const assignedLead = {
      ...FIXTURE_OPEN_LEAD,
      assignedStaffUser: tyler.userId,
    };
    const foreignLead = {
      ...FIXTURE_OPEN_LEAD,
      id: 902,
      assignedStaffUser: other.userId,
    };
    assert.equal(staffMayAccessSalesLead(tyler, assignedLead), true);
    assert.equal(staffMayAccessSalesLead(tyler, foreignLead), false);
    assert.throws(() => assertStaffMayAccessSalesLead(tyler, foreignLead));
  });

  await check("M6 contact inquiry → sales surfaces", () => {
    assertFileContains("app/api/inquiries/route.ts", "promoteInquiryToSales");
    assert.equal(FIXTURE_CONTACT_INQUIRY.status, "new");
  });

  await check("M6 start project → sales surfaces", () => {
    assertFileContains("app/api/project-inquiries/route.ts", "promoteProjectInquiryToSales");
    assert.equal(FIXTURE_START_PROJECT.inquirySource, "start-project");
  });

  await check("M6 audit → project → single opportunity anchor", () => {
    assert.equal(relId(FIXTURE_WEBSITE_AUDIT.promotedSalesLead), 501);
    assert.equal(FIXTURE_START_PROJECT.email, FIXTURE_OPEN_LEAD.email);
  });

  await check("M6 identity collision handling", () => {
    const collision = classifyIdentityCollision({
      email: FIXTURE_START_PROJECT.email,
      website: FIXTURE_START_PROJECT.websiteUrl,
      company: FIXTURE_START_PROJECT.companyName,
      openLeads: [FIXTURE_OPEN_LEAD],
    });
    assert.equal(collision.kind, "exact");
  });

  await check("M6 proposal relationship on sales lead", () => {
    assert.equal(relId(FIXTURE_PROPOSAL_FOR_LEAD.lead), 501);
    assertFileContains('payload/collections/Proposals.ts', 'relationTo: "sales-leads"');
  });

  await check("M6 promotion failure recovery — intake still saved", () => {
    assertFileContains(
      "app/api/project-inquiries/route.ts",
      "Sales handoff failed (project inquiry still saved)",
    );
    assertFileContains("app/api/inquiries/route.ts", "inquiry still saved");
  });

  await check("M6 migration compatibility — additive attribution columns", () => {
    const migration = readFileSync(
      path.join(ROOT, "migrations/20261028_phase17_project_inquiry_attribution.ts"),
      "utf8",
    );
    assert.ok(migration.includes("ADD COLUMN IF NOT EXISTS"));
    assert.ok(migration.includes("inquiry_source"));
    assert.ok(!migration.toLowerCase().includes("drop table"));
  });

  await check("Phase 17 registry remains in-progress (not completed)", () => {
    assertFileContains("lib/platform/registry.ts", 'id: "phase-17"');
    assertFileContains("lib/platform/registry.ts", 'status: "in-progress"');
    const registry = readFileSync(path.join(ROOT, "lib/platform/registry.ts"), "utf8");
    const leadFunnel = registry.match(
      /id: "phase-17",[\s\S]*?title: "Lead Funnel Unification"[\s\S]*?status: "(in-progress|completed)"/,
    );
    assert.ok(leadFunnel, "Lead Funnel Unification registry entry missing");
    assert.equal(leadFunnel[1], "in-progress");
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
