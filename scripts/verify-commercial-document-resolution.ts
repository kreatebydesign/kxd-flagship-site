/**
 * Offline verification — latest commercial document ref resolution.
 *   npx tsx scripts/verify-commercial-document-resolution.ts
 */
import assert from "node:assert/strict";
import {
  resolveLatestDocumentRef,
  resolvePrimaryAgreementDocumentRef,
  type CommercialDocumentRef,
} from "../lib/client-command/commercial/resolve-document-refs";

function ref(
  partial: Pick<CommercialDocumentRef, "id" | "kind" | "version"> &
    Partial<CommercialDocumentRef>,
): CommercialDocumentRef {
  return {
    contentHash: `hash-${partial.id}`,
    generatedAt: "2026-08-27T00:00:00.000Z",
    ...partial,
  };
}

const contract4Refs: CommercialDocumentRef[] = [
  ref({ id: 16, kind: "direct-agreement", version: 1 }),
  ref({ id: 17, kind: "direct-agreement", version: 2 }),
];

assert.equal(resolveLatestDocumentRef(contract4Refs, "direct-agreement")?.id, 17);
assert.equal(resolveLatestDocumentRef(contract4Refs, "direct-agreement")?.version, 2);
assert.equal(resolvePrimaryAgreementDocumentRef(contract4Refs)?.id, 17);

const reversed = [...contract4Refs].reverse();
assert.equal(resolveLatestDocumentRef(reversed, "direct-agreement")?.id, 17);
assert.equal(resolvePrimaryAgreementDocumentRef(reversed)?.id, 17);

const single = [ref({ id: 99, kind: "direct-agreement", version: 1 })];
assert.equal(resolvePrimaryAgreementDocumentRef(single)?.id, 99);

const executedWins = [
  ref({ id: 16, kind: "direct-agreement", version: 2 }),
  ref({ id: 20, kind: "executed-contract", version: 1 }),
];
assert.equal(resolvePrimaryAgreementDocumentRef(executedWins)?.id, 20);

const proposalOnly = [ref({ id: 7, kind: "accepted-proposal", version: 1 })];
assert.equal(resolvePrimaryAgreementDocumentRef(proposalOnly)?.id, 7);

console.log("verify-commercial-document-resolution: OK");
