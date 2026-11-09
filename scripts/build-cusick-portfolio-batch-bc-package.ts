/**
 * Writes docs/data/cusick-portfolio-batch-bc-client-notes-package.json from reconciliation constants.
 * No database access.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DELIVERABLE_CLIENT_NOTES,
  EVIDENCE_GAPS,
  MONTHS_WITHOUT_VERIFIED_COMPLETIONS,
  PROPOSED_MILESTONES,
  RECONCILIATION_LEDGER,
  SUPPLEMENTARY_EVIDENCE,
} from "./lib/cusick-portfolio-reconciliation-2026";
import { OCTOBER_2026_PERFORMANCE_DRAFTS } from "./lib/cusick-portfolio-october-2026-drafts";
import {
  CLIENT_VALUE_PROFILES,
  NOVEMBER_2026_EXECUTION_PLAN,
  READONLY_INSPECTION_2026_11_09,
} from "./lib/cusick-portfolio-ongoing-value";

const root = process.cwd();
const outPath = join(root, "docs/data/cusick-portfolio-batch-bc-client-notes-package.json");

const payload = {
  meta: {
    packageId: "cusick-portfolio-batch-bc-client-notes",
    generatedAt: "2026-11-09",
    scope: "Clients 5, 9, 10, 14 only",
    purpose:
      "Reviewable clientNotes, work ledger, October performance drafts, and November plan. Does not authorize production writes or report publishing.",
    reconciliationSources: [
      "monthly_deliverables (production Postgres)",
      "work (KXD Work Engine)",
      "monthly_reports",
      "client_infrastructure (read-only context)",
      "social_post_requests (empty Sep–Nov)",
      "website_audits (empty for portfolio)",
      "client_timeline_events (empty Sep–Nov)",
      "client_projects (empty for portfolio)",
    ],
    gaps: EVIDENCE_GAPS,
    monthsWithoutVerifiedCompletions: MONTHS_WITHOUT_VERIFIED_COMPLETIONS,
    evidenceGapReviewAt: "2026-11-09",
    supplementaryEvidence: SUPPLEMENTARY_EVIDENCE,
  },
  ledger: RECONCILIATION_LEDGER,
  records: DELIVERABLE_CLIENT_NOTES.map((row) => ({
    clientId: row.clientId,
    clientName: row.clientName,
    deliverableId: row.deliverableId,
    reportingMonth: row.reportingMonth,
    status: row.status,
    completedDate: row.completedDate,
    title: row.title,
    proposedClientNotes: row.proposedClientNotes,
    evidence: row.evidence,
    internalNotesPreserved: true,
  })),
  proposedMilestones: PROPOSED_MILESTONES,
  accountValueByClient: CLIENT_VALUE_PROFILES,
  october2026PerformanceDrafts: OCTOBER_2026_PERFORMANCE_DRAFTS,
  november2026ExecutionPlan: NOVEMBER_2026_EXECUTION_PLAN,
  readonlyInspection: READONLY_INSPECTION_2026_11_09,
};

writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${outPath}`);
console.log(`  ledger items: ${RECONCILIATION_LEDGER.length}`);
console.log(`  deliverable records: ${DELIVERABLE_CLIENT_NOTES.length}`);
console.log(`  October performance drafts: ${OCTOBER_2026_PERFORMANCE_DRAFTS.length}`);
console.log(`  November plan tasks: ${NOVEMBER_2026_EXECUTION_PLAN.length}`);
