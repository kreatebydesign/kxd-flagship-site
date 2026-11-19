/**
 * Batch 3B — portfolio search, filters, and attention rules (pure functions).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  countAttentionRows,
  resolveAttentionReasons,
  rowNeedsAttention,
} from "@/lib/client-portfolio/attention";
import { filterPortfolioRows } from "@/lib/client-portfolio/filter-rows";
import { DEFAULT_PORTFOLIO_FILTERS } from "@/lib/client-portfolio/types";
import type { PortfolioRow } from "@/lib/client-portfolio/types";
import { parsePortfolioSearchParams } from "@/lib/client-portfolio/url-state";

function baseRow(partial: Partial<PortfolioRow> & Pick<PortfolioRow, "clientId" | "name">): PortfolioRow {
  return {
    clientId: partial.clientId,
    name: partial.name,
    slug: partial.slug ?? null,
    companyWebsite: partial.companyWebsite ?? null,
    primaryContactName: partial.primaryContactName ?? null,
    primaryContactEmail: partial.primaryContactEmail ?? null,
    clientRelationshipHealth: partial.clientRelationshipHealth ?? null,
    clientStatus: partial.clientStatus ?? "active",
    brandTier: partial.brandTier ?? null,
    tier: partial.tier ?? null,
    monthlyRevenue: partial.monthlyRevenue ?? null,
    potentialMonthlyRevenue: partial.potentialMonthlyRevenue ?? null,
    estimatedAnnualValue: partial.estimatedAnnualValue ?? null,
    healthScore: partial.healthScore ?? null,
    relationshipStatus: partial.relationshipStatus ?? "active",
    nextAction: partial.nextAction ?? null,
    nextActionDueDate: partial.nextActionDueDate ?? null,
    internalPriority: partial.internalPriority ?? null,
    caseStudyPotential: partial.caseStudyPotential ?? null,
    upsellSummary: partial.upsellSummary ?? null,
    hasExecutiveProfile: partial.hasExecutiveProfile ?? true,
    executiveProfileId: partial.executiveProfileId ?? 1,
  };
}

const FIXED_NOW = new Date("2026-11-18T12:00:00Z");

let passed = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✔ ${label}`);
  } catch (e) {
    console.error(`  ✗ ${label}`, e);
    process.exitCode = 1;
  }
}

console.log("\nBatch 3B — client portfolio filters\n");

check("paused engagement alone does not need attention", () => {
  const row = baseRow({ clientId: 1, name: "Paused Co", clientStatus: "paused" });
  assert.equal(rowNeedsAttention(row, {}, FIXED_NOW), false);
});

check("invalid due date does not flag overdue", () => {
  const row = baseRow({
    clientId: 2,
    name: "Bad Date",
    nextActionDueDate: "not-a-date",
  });
  const reasons = resolveAttentionReasons(row, undefined, FIXED_NOW);
  assert.equal(
    reasons.some((r) => r.code === "next-action-overdue"),
    false,
  );
});

check("overdue next action flags attention", () => {
  const row = baseRow({
    clientId: 3,
    name: "Late",
    nextActionDueDate: "2026-11-01",
  });
  assert.equal(rowNeedsAttention(row, {}, FIXED_NOW), true);
  const labels = resolveAttentionReasons(row, undefined, FIXED_NOW).map((r) => r.label);
  assert.ok(labels.includes("Next action overdue"));
});

check("multiple attention reasons preserved", () => {
  const row = baseRow({
    clientId: 4,
    name: "Multi",
    internalPriority: "high",
    relationshipStatus: "at-risk",
    clientRelationshipHealth: "needs-attention",
    hasExecutiveProfile: false,
    nextActionDueDate: "2026-11-01",
  });
  const warnings = { 4: "dup" };
  const reasons = resolveAttentionReasons(row, warnings[4], FIXED_NOW);
  assert.ok(reasons.length >= 4);
  const codes = new Set(reasons.map((r) => r.code));
  assert.ok(codes.has("high-priority"));
  assert.ok(codes.has("executive-at-risk"));
  assert.ok(codes.has("relationship-needs-attention"));
  assert.ok(codes.has("profile-pending"));
  assert.ok(codes.has("duplicate"));
});

check("search matches contact email case-insensitive", () => {
  const rows = [
    baseRow({
      clientId: 10,
      name: "Alpha",
      primaryContactEmail: "Ops@Example.COM",
    }),
    baseRow({ clientId: 11, name: "Beta" }),
  ];
  const { rows: out } = filterPortfolioRows(
    rows,
    { ...DEFAULT_PORTFOLIO_FILTERS, query: "ops@example" },
    {},
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].clientId, 10);
});

check("attention view filters to flagged clients only", () => {
  const rows = [
    baseRow({ clientId: 20, name: "Ok" }),
    baseRow({ clientId: 21, name: "Hot", internalPriority: "critical" }),
  ];
  const { rows: out, attentionCount } = filterPortfolioRows(
    rows,
    { ...DEFAULT_PORTFOLIO_FILTERS, view: "attention" },
    {},
  );
  assert.equal(attentionCount, 1);
  assert.equal(out.length, 1);
  assert.equal(out[0].clientId, 21);
});

check("filters combine (engagement + priority)", () => {
  const rows = [
    baseRow({
      clientId: 30,
      name: "A",
      clientStatus: "active",
      internalPriority: "high",
    }),
    baseRow({
      clientId: 31,
      name: "B",
      clientStatus: "paused",
      internalPriority: "high",
    }),
  ];
  const { rows: out } = filterPortfolioRows(
    rows,
    {
      ...DEFAULT_PORTFOLIO_FILTERS,
      engagementStatus: "active",
      internalPriority: "high",
    },
    {},
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].clientId, 30);
});

check("URL params parse round-trip keys", () => {
  const parsed = parsePortfolioSearchParams({
    q: "acme",
    view: "attention",
    engagement: "active",
    execRel: "at-risk",
    priority: "high",
    tier: "exec:A",
    profile: "without-profile",
    sort: "name",
  });
  assert.equal(parsed.query, "acme");
  assert.equal(parsed.view, "attention");
  assert.equal(parsed.sort, "name");
});

check("executive-client-profile merge includes search fields", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "lib/executive-client-profile.ts"),
    "utf8",
  );
  assert.ok(src.includes("companyWebsite"));
  assert.ok(src.includes("clientRelationshipHealth"));
});

console.log("");
if (process.exitCode === 1) {
  console.error("Batch 3B filter verification FAILED");
  process.exit(1);
}
console.log(`Batch 3B filter verification passed (${passed} checks).`);