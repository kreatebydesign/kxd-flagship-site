/**
 * Dry-run validator for docs/data/cusick-portfolio-batch-bc-client-notes-package.json
 * No database writes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PORTFOLIO_CLIENTS } from "./lib/cusick-portfolio-reconciliation-2026";

const PORTFOLIO_CLIENT_IDS = new Set(Object.keys(PORTFOLIO_CLIENTS).map(Number));
const VALID_STATUS = new Set([
  "not-started",
  "in-progress",
  "waiting-on-client",
  "complete",
  "blocked",
  "planned",
  "proposed",
  "published",
  "completed",
]);

type PackageFile = {
  meta?: {
    packageId?: string;
    gaps?: string[];
    monthsWithoutVerifiedCompletions?: Record<string, number[]>;
  };
  ledger?: Array<{
    reportingMonth: string;
    clientId: number;
    kind: string;
    evidenceGap?: boolean;
  }>;
  records?: Array<{
    clientId: number;
    deliverableId: number;
    reportingMonth: string;
    status: string;
    title: string;
    proposedClientNotes?: string;
    evidence?: string;
  }>;
  proposedMilestones?: Array<{ id: string; clientIds: number[] }>;
};

function main() {
  const root = process.cwd();
  const path = join(root, "docs/data/cusick-portfolio-batch-bc-client-notes-package.json");
  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw) as PackageFile;
  const errors: string[] = [];

  if (!data.meta?.packageId) {
    errors.push("meta.packageId missing");
  }

  const records = data.records ?? [];
  if (records.length !== 32) {
    errors.push(`expected 32 deliverable records, got ${records.length}`);
  }

  const ledger = data.ledger ?? [];
  if (ledger.length < 10) {
    errors.push("ledger too small for Sep–Nov reconciliation");
  }

  const octDrafts = (data as { october2026PerformanceDrafts?: unknown[] })
    .october2026PerformanceDrafts;
  if (!octDrafts || octDrafts.length !== 4) {
    errors.push("expected 4 October 2026 performance drafts");
  }

  const novPlan = (data as { november2026ExecutionPlan?: unknown[] })
    .november2026ExecutionPlan;
  if (!novPlan || novPlan.length < 5) {
    errors.push("November execution plan missing or too small");
  }

  const seenIds = new Set<number>();
  for (const row of records) {
    if (!PORTFOLIO_CLIENT_IDS.has(row.clientId)) {
      errors.push(`clientId ${row.clientId} outside portfolio allowlist`);
    }
    if (!/^\d{4}-\d{2}$/.test(row.reportingMonth)) {
      errors.push(`invalid reportingMonth ${row.reportingMonth}`);
    }
    if (!VALID_STATUS.has(row.status)) {
      errors.push(`invalid status ${row.status} on deliverable ${row.deliverableId}`);
    }
    if (seenIds.has(row.deliverableId)) {
      errors.push(`duplicate deliverableId ${row.deliverableId}`);
    }
    seenIds.add(row.deliverableId);
    const notes = row.proposedClientNotes?.trim() ?? "";
    if (!notes) {
      errors.push(`missing proposedClientNotes for #${row.deliverableId}`);
    }
    if (notes.includes("—") || notes.includes("–")) {
      errors.push(`em/en dash in clientNotes for #${row.deliverableId}`);
    }
    if (notes.length > 600) {
      errors.push(`clientNotes too long for #${row.deliverableId}`);
    }
  }

  for (let id = 1; id <= 32; id += 1) {
    if (!seenIds.has(id)) {
      errors.push(`missing deliverableId ${id}`);
    }
  }

  for (const item of ledger) {
    if (!PORTFOLIO_CLIENT_IDS.has(item.clientId)) {
      errors.push(`ledger clientId ${item.clientId} outside allowlist`);
    }
    if (!/^\d{4}-\d{2}$/.test(item.reportingMonth)) {
      errors.push(`ledger invalid month ${item.reportingMonth}`);
    }
  }

  for (const proposal of data.proposedMilestones ?? []) {
    for (const cid of proposal.clientIds) {
      if (!PORTFOLIO_CLIENT_IDS.has(cid)) {
        errors.push(`proposed milestone ${proposal.id} client ${cid} outside allowlist`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("FAIL dry-run-cusick-batch-bc-client-notes");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log("PASS dry-run-cusick-batch-bc-client-notes");
  console.log(`  package: ${data.meta?.packageId}`);
  console.log(`  deliverable records: ${records.length}`);
  console.log(`  ledger items: ${ledger.length}`);
  console.log(`  proposed milestones: ${(data.proposedMilestones ?? []).length}`);
  console.log(`  meta gaps noted: ${(data.meta?.gaps ?? []).length}`);
}

main();
