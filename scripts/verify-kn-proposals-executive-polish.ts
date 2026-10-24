/**
 * Regression: K&N executive polish preserves payment math and avoids internal leakage.
 *   npx tsx scripts/verify-kn-proposals-executive-polish.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { assertNoInternalLeakage, buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { normalizeProposalDocument } from "../lib/proposal-builder/document.ts";
import {
  assertKnPaymentScheduleUnchanged,
  patchKnProposalExecutivePolish,
} from "../lib/proposal-builder/kn-proposals-executive-polish.ts";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

for (const id of [11, 12] as const) {
  const auditPath = resolve(process.cwd(), `.cache/kn-proposal-${id}-audit.json`);
  const raw = JSON.parse(readFileSync(auditPath, "utf8")) as {
    id: number;
    proposalNumber: string;
    title: string;
    builderDocument: unknown;
  };
  const before = normalizeProposalDocument(raw.builderDocument);
  const after = patchKnProposalExecutivePolish(before, id);
  try {
    assertKnPaymentScheduleUnchanged(before, after, id);
    check(`proposal ${id} payment schedule unchanged`, true);
  } catch {
    check(`proposal ${id} payment schedule unchanged`, false);
  }

  const canonical = buildCanonicalProposal({
    id,
    proposalNumber: raw.proposalNumber,
    title: raw.title,
    status: "internal-review",
    proposalDate: "2026-10-23T12:00:00.000Z",
    expiresAt: "2026-11-06T12:00:00.000Z",
    revisionNumber: 1,
    builderDocument: after,
  });
  const leaks = assertNoInternalLeakage(canonical);
  check(`proposal ${id} no canonical leakage`, leaks.length === 0);
  if (leaks.length) console.error(`    ${leaks.join("; ")}`);

  const blob = JSON.stringify(after).toLowerCase();
  check(
    `proposal ${id} Option A IP does not mention Option B reference`,
    id !== 11 || !blob.includes("option b reference"),
  );
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
