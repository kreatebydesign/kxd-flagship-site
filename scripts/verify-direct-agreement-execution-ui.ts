/**
 * Offline verification — Direct Agreement electronic execution UI state.
 *   npx tsx scripts/verify-direct-agreement-execution-ui.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { emptyLifecyclePackage } from "../lib/proposal-lifecycle/package.ts";
import {
  resolveDirectAgreementExecutionPresentation,
  resolveDirectAgreementSigningIntegrityMessage,
} from "../lib/admin/direct-agreement-execution-state.ts";

const operatorSignedAt = "2026-08-27T16:23:49.588Z";
const v3Hash = "4f99e7f30bc97f543ef163b5030790670a01772aebf2df7d001e29c991065b3d";

function pkgBase() {
  return {
    ...emptyLifecyclePackage(),
    commercialStatus: "finalized" as const,
    commercialSource: "direct-agreement" as const,
    documentRefs: [
      {
        id: 18,
        kind: "direct-agreement" as const,
        version: 3,
        contentHash: v3Hash,
        generatedAt: "2026-08-27T08:42:57.819Z",
      },
    ],
    operatorSignature: {
      legalName: "Matt Lunger",
      title: "Principal",
      entityName: "Kreate by Design",
      email: "matt@kreatebydesign.com",
      typedAcknowledgment: "Matt Lunger",
      authorityConfirmed: true,
      electronicRecordsConsent: true,
      consentDisclosureVersion: "v1",
      consentText: "consent",
      signedAt: operatorSignedAt,
      actorRole: "kxd-operator" as const,
      documentHash: "9da523355c2902a2345806eb2ce94232008d594bd304ac4965ebe78de5342817",
      signatureHash: "fc67ce2c10b72177eebaf5b03a108fb335573126c98418422d231f4ffb05b43b",
    },
    directAgreementSigningBinding: {
      documentId: 18,
      documentVersion: 3,
      documentContentHash: v3Hash,
      boundAt: operatorSignedAt,
    },
  };
}

const ready = resolveDirectAgreementExecutionPresentation({
  agreementSource: "direct-agreement",
  commercialStatus: "finalized",
  pkg: pkgBase(),
  signingIntegrityMessage: resolveDirectAgreementSigningIntegrityMessage(pkgBase()),
});

assert.equal(ready?.state, "operator-signed-ready-for-link");
assert.equal(ready?.operatorSignatureSummary?.legalName, "Matt Lunger");
assert.equal(resolveDirectAgreementSigningIntegrityMessage(pkgBase()), null);

const stalePkg = {
  ...pkgBase(),
  documentRefs: [
    {
      id: 19,
      kind: "direct-agreement" as const,
      version: 4,
      contentHash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      generatedAt: "2026-08-28T00:00:00.000Z",
    },
  ],
};
const staleMsg = resolveDirectAgreementSigningIntegrityMessage(stalePkg);
assert.match(String(staleMsg), /newer Direct Agreement document/i);
const stalePresentation = resolveDirectAgreementExecutionPresentation({
  agreementSource: "direct-agreement",
  commercialStatus: "finalized",
  pkg: stalePkg,
  signingIntegrityMessage: staleMsg,
});
assert.equal(stalePresentation?.state, "unavailable");

const awaiting = resolveDirectAgreementExecutionPresentation({
  agreementSource: "direct-agreement",
  commercialStatus: "finalized",
  pkg: { ...emptyLifecyclePackage(), commercialStatus: "finalized" },
});
assert.equal(awaiting?.state, "awaiting-operator-signature");

const lifecycleSrc = readFileSync(
  join(process.cwd(), "components/admin/sales/ContractLifecycleActions.tsx"),
  "utf8",
);
assert.match(lifecycleSrc, /useDirectExecutionShell/);
assert.match(lifecycleSrc, /Step 1 — Signed as Kreate by Design/);
assert.match(lifecycleSrc, /Step 2 — Prepare client signing link/);
assert.match(lifecycleSrc, /directExecution!\.stateLabel/);
assert.doesNotMatch(
  lifecycleSrc,
  /awaitingDirectExecution \? \(\s*<section[\s\S]{0,120}<h3[\s\S]{0,80}Electronic execution[\s\S]{0,200}<\/section>\s*\) : null,\s*\{isDirect && !props\.hasClientSignature/s,
);

console.log("verify-direct-agreement-execution-ui: OK");
