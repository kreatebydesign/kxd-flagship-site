/**
 * Phase 4 — monthly deliverable client vs internal notes separation.
 * Static + pure-unit verification only. No database. No external writes.
 *
 * Run: npm run verify:phase4-deliverable-client-notes
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  resolvePortalDeliverableClientNotes,
} from "../lib/portal/deliverables/client-notes";
import {
  projectPortalDeliverable,
} from "../lib/portal/deliverables/project";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function check(label: string, pass: boolean, detail?: string) {
  console.log(pass ? `  ✔ ${label}` : `  ✘ ${label}${detail ? ` — ${detail}` : ""}`);
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
}

console.log("\nPhase 4 — deliverable client notes separation\n");

check(
  "resolvePortalDeliverableClientNotes returns trimmed clientNotes",
  resolvePortalDeliverableClientNotes({
    clientNotes: "  Visible copy  ",
    notes: "SECRET",
  }) === "Visible copy",
);

check(
  "resolvePortalDeliverableClientNotes ignores internal notes",
  resolvePortalDeliverableClientNotes({
    clientNotes: null,
    notes: "SECRET internal audit",
  }) === null,
);

check(
  "resolvePortalDeliverableClientNotes fails closed on whitespace",
  resolvePortalDeliverableClientNotes({
    clientNotes: "   ",
    notes: "fallback must not be used",
  }) === null,
);

const projected = projectPortalDeliverable({
  id: 1,
  title: "Fixture",
  status: "complete",
  notes: "Internal only",
  clientNotes: "Client detail",
});

check(
  "projectPortalDeliverable exposes clientNotes",
  projected.clientNotes === "Client detail",
);

check(
  "projectPortalDeliverable omits internal notes",
  !("notes" in projected),
);

const projectedEmpty = projectPortalDeliverable({
  id: 2,
  title: "No client copy",
  status: "in-progress",
  notes: "Still internal",
  clientNotes: null,
});

check(
  "projectPortalDeliverable null clientNotes when absent",
  projectedEmpty.clientNotes === null,
);

const deliverablesScreen = read("components/client-hq/DeliverablesScreen.tsx");
check(
  "DeliverablesScreen does not read doc.notes",
  !deliverablesScreen.includes("doc.notes"),
);
check(
  "DeliverablesScreen uses clientNotes for detail",
  deliverablesScreen.includes("doc.clientNotes"),
);

const portalData = read("lib/portal/data.ts");
check(
  "getPortalDeliverables projects portal-safe deliverables",
  portalData.includes("projectPortalDeliverables"),
);
check(
  "getPortalDashboard projects portal-safe deliverables",
  portalData.includes("deliverablesR.status") &&
    portalData.includes("projectPortalDeliverables(deliverablesR.value.docs"),
);

const collection = read("payload/collections/MonthlyDeliverables.ts");
check(
  "MonthlyDeliverables defines clientNotes field",
  collection.includes('name: "clientNotes"'),
);
check(
  "MonthlyDeliverables labels internal notes",
  collection.includes("Internal notes"),
);

const migration = read("migrations/20261110_monthly_deliverables_client_notes.ts");
check(
  "migration adds client_notes column",
  migration.includes('ADD COLUMN IF NOT EXISTS "client_notes"'),
);
check(
  "migration down drops client_notes",
  migration.includes('DROP COLUMN IF EXISTS "client_notes"'),
);

console.log("\nPhase 4 deliverable client notes verification passed.\n");
