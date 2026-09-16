/**
 * Mission 003B verify — commercial markers, classification, hosting authority,
 * pending-trigger visibility, Money Moves shapes. No DB writes.
 */
import {
  buildCommercialMarker,
  parseCommercialMarkers,
  upsertMarkerInNotes,
  COMMERCIAL_MARKER_PREFIX,
} from "../lib/commercial/markers.ts";
import { classifyCommercialRelationship } from "../lib/commercial/classification.ts";
import {
  deriveRenewalLifecycle,
  extractHostingFromContractPackage,
  buildHostingCommercialAuthority,
} from "../lib/commercial/hosting-authority.ts";
import {
  listContractRecurringServices,
  resolveClientRecurringCommercialTruth,
} from "../lib/financial-command/recurring-commercial-truth.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

function check(label: string, fn: () => void) {
  fn();
  console.log(`  ✔ ${label}`);
}

console.log("Mission 003B commercial foundation verify\n");

check("commercial markers round-trip", () => {
  const marker = buildCommercialMarker("planned-mrr-increase", {
    from: 350,
    to: 375,
    delta: 25,
    gate: "payment-processor-deposit-system-launch",
    status: "pending",
  });
  assert.ok(marker.startsWith(COMMERCIAL_MARKER_PREFIX));
  const parsed = parseCommercialMarkers(marker);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]!.kind, "planned-mrr-increase");
  assert.equal(parsed[0]!.fields.delta, "25");
  const notes = upsertMarkerInNotes("hello", "review-required", { reason: "unproven" });
  assert.ok(notes.includes("hello"));
  assert.equal(parseCommercialMarkers(notes).length, 1);
});

check("classification multi-category + review", () => {
  const cats = classifyCommercialRelationship({
    clientStatus: "active",
    activeMrrCents: 30000,
    pendingMrrCents: 0,
    projectOpenCents: 200000,
    hasPerformanceRule: true,
    hasAnnualOnlyAuthority: false,
    hasPipelineEvidence: false,
    commercialNotes: buildCommercialMarker("review-required", { reason: "x" }),
  });
  assert.ok(cats.includes("active_recurring"));
  assert.ok(cats.includes("active_project"));
  assert.ok(cats.includes("performance"));
  assert.ok(cats.includes("review_required"));
});

check("active status alone does not invent commercial activity", () => {
  const cats = classifyCommercialRelationship({
    clientStatus: "active",
    activeMrrCents: 0,
    pendingMrrCents: 0,
    projectOpenCents: 0,
    hasPerformanceRule: false,
    hasAnnualOnlyAuthority: false,
    hasPipelineEvidence: false,
  });
  assert.ok(cats.includes("review_required"));
  assert.ok(!cats.includes("active_recurring"));
});

check("pending-trigger recurring appears in truth services but not MRR", () => {
  const pkg = {
    structuredPaymentTerms: {
      recurring: {
        status: "pending-trigger",
        cadence: "monthly",
        amountCents: 60000,
        serviceTitle: "Website + Digital Management",
        startTrigger: "after-launch-verified",
        startBillingDate: null,
        startBillingDateStatus: "milestone-confirmed",
      },
    },
    operatorRecurringServices: [],
    billingPlan: { obligations: [] },
  };
  const listed = listContractRecurringServices(pkg);
  assert.ok(listed.services.some((s) => s.activationStatus === "pending-trigger"));
  const truth = resolveClientRecurringCommercialTruth({
    clientId: 19,
    retainerDocs: [],
    contractPackages: [pkg],
  });
  assert.equal(truth.portfolioMrrDollars, 0);
  assert.ok(truth.services.some((s) => s.activationStatus === "pending-trigger"));
});

check("hosting authority separates service start vs billing due", () => {
  const pkg = {
    structuredPaymentTerms: {
      ancillaryCharges: [
        {
          title: "KXD Media Vault — 250 GB",
          amountCents: 30000,
          dueDate: "2026-09-15",
          kind: "media-vault",
          status: "pending-trigger",
        },
        {
          title: "KXD Managed Website Hosting",
          amountCents: 29900,
          dueDate: null,
          kind: "managed-hosting",
          status: "pending-trigger",
        },
      ],
    },
    billingPlan: {
      obligations: [
        {
          id: "deb-media-vault-y1",
          label: "KXD Media Vault — 250 GB",
          amountCents: 30000,
          amountPaidCents: 0,
          status: "pending-trigger",
          dueDate: "2026-09-22",
          kind: "addon",
          paymentEvents: [],
        },
      ],
    },
  };
  const rows = extractHostingFromContractPackage(pkg);
  const vault = rows.find((r) => r.kind === "media-vault");
  assert.ok(vault);
  assert.equal(vault!.serviceStartDate, "2026-09-15");
  assert.equal(vault!.billingDueDate, "2026-09-22");
});

check("missing hosting amount stays missing authority", () => {
  const rows = buildHostingCommercialAuthority({
    clientId: 3,
    clientName: "AutoDV8ions",
    contractPackages: [],
    infrastructure: { hostingProvider: "kxd", annualRenewalCost: null },
    requireExplicitAmount: true,
  });
  assert.equal(rows[0]!.amountAuthority, "missing");
  assert.equal(rows[0]!.annualAmountCents, null);
});

check("30-day notice lifecycle derivation", () => {
  const now = new Date("2026-09-16T12:00:00Z");
  assert.equal(
    deriveRenewalLifecycle({
      explicit: "unknown",
      renewalOrDueDate: "2026-10-01",
      noticeSentAt: null,
      paid: false,
      now,
    }),
    "notice_due",
  );
  assert.equal(
    deriveRenewalLifecycle({
      explicit: "unknown",
      renewalOrDueDate: "2026-10-01",
      noticeSentAt: "2026-09-10T00:00:00Z",
      paid: false,
      now,
    }),
    "notice_sent",
  );
});

check("money-moves page + libs wired", () => {
  const page = readFileSync(
    resolve("app/admin/operations/money-moves/page.tsx"),
    "utf8",
  );
  assert.match(page, /loadMoneyMovesSnapshot/);
  assert.match(page, /loadSalesMemory/);
  const nav = readFileSync(
    resolve("components/admin/operations/shared/operations-nav.ts"),
    "utf8",
  );
  assert.match(nav, /money-moves/);
  const mig = readFileSync(
    resolve("migrations/20260916_mission03b_commercial_foundation.ts"),
    "utf8",
  );
  assert.match(mig, /hosting_auto_charge_mode/);
  assert.match(mig, /commercial_categories/);
});

console.log("\nAll Mission 003B verifies passed.");
