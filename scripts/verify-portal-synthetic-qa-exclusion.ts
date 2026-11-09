/**
 * Portal synthetic QA deliverable exclusion — unit checks (no DB).
 * Run: npx tsx scripts/verify-portal-synthetic-qa-exclusion.ts
 */
import assert from "node:assert/strict";
import {
  isPortalSyntheticQaDeliverable,
  filterSyntheticQaDeliverablesForPortal,
  PORTAL_SYNTHETIC_QA_INTERNAL_NOTE_MARKER,
} from "../lib/portal/deliverables/synthetic-qa-exclusion";
import { projectPortalDeliverables } from "../lib/portal/deliverables/project";

function main() {
  assert.equal(
    isPortalSyntheticQaDeliverable({
      id: 33,
      notes: `foot ${PORTAL_SYNTHETIC_QA_INTERNAL_NOTE_MARKER}`,
    }),
    true,
    "internal marker in notes",
  );
  assert.equal(
    isPortalSyntheticQaDeliverable({
      id: 33,
      notes: "production deliverable notes",
    }),
    false,
    "known preview id without marker is not excluded in other environments",
  );
  assert.equal(
    isPortalSyntheticQaDeliverable({
      id: 27,
      title: "Accessibility and mobile QA",
      notes: "real history",
    }),
    false,
    "legitimate QA-title work not excluded without marker",
  );

  const filtered = filterSyntheticQaDeliverablesForPortal([
    { id: 33, title: "QA-BATCH-A", notes: PORTAL_SYNTHETIC_QA_INTERNAL_NOTE_MARKER },
    { id: 50, title: "Real work", status: "complete" },
  ]);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 50);

  const projected = projectPortalDeliverables([
    {
      id: 33,
      title: "QA-BATCH-A Client notes projection",
      status: "in-progress",
      notes: PORTAL_SYNTHETIC_QA_INTERNAL_NOTE_MARKER,
      clientNotes: "visible if leaked",
    },
    {
      id: 12,
      title: "September monitoring",
      status: "complete",
      clientNotes: "Real client note",
    },
  ]);
  assert.equal(projected.length, 1);
  assert.equal(projected[0].title, "September monitoring");
  assert.ok(!("notes" in projected[0]), "internal notes stripped from portal");

  console.log("verify-portal-synthetic-qa-exclusion: OK");
}

main();
