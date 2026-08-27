/**
 * Direct Agreement electronic execution — authoritative body + document binding.
 * Reuses the shared Contract Engine; no parallel signing system.
 */

import {
  applyFinalizedDirectAgreementPresentationCopy,
  composeDirectAgreementDocumentBody,
} from "../commercial-legal/compose-direct-agreement-document.ts";
import { resolveLatestDocumentRef } from "../client-command/commercial/resolve-document-refs.ts";
import { toClientFacingContractBody } from "../proposal-lifecycle/client-facing-contract.ts";
import { blockersForSend } from "../proposal-lifecycle/billing-readiness.ts";
import {
  computeDocumentHash,
  hashPaymentTerms,
  invalidateSignaturesOnMaterialEdit,
} from "../proposal-lifecycle/executed-seal.ts";
import { sha256Hex } from "../proposal-lifecycle/hash.ts";
import { appendAudit } from "../proposal-lifecycle/package.ts";
import type {
  ContractLifecyclePackage,
  ReadinessIssue,
  StructuredPaymentTerms,
} from "../proposal-lifecycle/types.ts";
import type { DirectAgreementTerms } from "./types.ts";

export const DIRECT_AGREEMENT_STALE_SIGNING_MESSAGE =
  "A newer Direct Agreement document has been filed since KXD signed. KXD must re-sign and issue a new client signing link.";

export interface DirectAgreementSigningBinding {
  documentId: number;
  documentVersion: number;
  documentContentHash: string;
  boundAt: string;
}

/** Authoritative client-facing agreement text for DA signing, filing, and hash. */
export function resolveDirectAgreementClientFacingBody(input: {
  body: string;
  terms: DirectAgreementTerms;
  commercialStatus: string | null | undefined;
}): string {
  const composed = composeDirectAgreementDocumentBody({
    body: input.body,
    terms: input.terms,
  });
  const presentation = applyFinalizedDirectAgreementPresentationCopy(
    composed,
    input.commercialStatus,
  );
  return toClientFacingContractBody(presentation);
}

export function resolveLatestDirectAgreementDocumentRef(
  pkg: ContractLifecyclePackage,
): NonNullable<ContractLifecyclePackage["documentRefs"]>[number] | undefined {
  return resolveLatestDocumentRef(pkg.documentRefs, "direct-agreement");
}

/** Signing integrity hash — includes latest filed sent-document contentHash. */
export function computeDirectAgreementSigningDocumentHash(input: {
  contractId: number;
  contractBody: string;
  paymentTermsHash: string;
  version: number;
  sentDocumentContentHash: string;
}): string {
  return sha256Hex(
    [
      input.contractId,
      input.version,
      "direct-agreement",
      input.paymentTermsHash,
      sha256Hex(input.contractBody),
      input.sentDocumentContentHash,
    ].join("|"),
  );
}

export function buildDirectAgreementSigningBinding(
  ref: NonNullable<ReturnType<typeof resolveLatestDirectAgreementDocumentRef>>,
): DirectAgreementSigningBinding {
  return {
    documentId: ref.id,
    documentVersion: ref.version,
    documentContentHash: ref.contentHash,
    boundAt: new Date().toISOString(),
  };
}

export function isDirectAgreementSource(
  agreementSource: string | null | undefined,
  pkg?: Pick<ContractLifecyclePackage, "commercialSource"> | null,
): boolean {
  return (
    String(agreementSource ?? "") === "direct-agreement" ||
    pkg?.commercialSource === "direct-agreement"
  );
}

export function resolveSigningDocumentHashForContract(input: {
  agreementSource: string | null | undefined;
  contractId: number;
  rawContractBody: string;
  acceptedSnapshotHash: string;
  paymentTermsHash: string;
  version: number;
  pkg: ContractLifecyclePackage;
  daTerms: DirectAgreementTerms | null;
  commercialStatus: string | null | undefined;
}): { documentHash: string; authoritativeBody: string; binding: DirectAgreementSigningBinding | null } {
  if (!isDirectAgreementSource(input.agreementSource, input.pkg)) {
    const clientFacingBody = toClientFacingContractBody(input.rawContractBody);
    return {
      documentHash: computeDocumentHash({
        contractId: input.contractId,
        contractBody: clientFacingBody,
        acceptedSnapshotHash: input.acceptedSnapshotHash,
        paymentTermsHash: input.paymentTermsHash,
        version: input.version,
      }),
      authoritativeBody: clientFacingBody,
      binding: null,
    };
  }

  if (!input.daTerms) {
    throw new Error("Direct Agreement terms are required before signing.");
  }

  const latest = resolveLatestDirectAgreementDocumentRef(input.pkg);
  if (!latest?.contentHash) {
    throw new Error(
      "A finalized Direct Agreement document must be on file before operator signing.",
    );
  }

  const authoritativeBody = resolveDirectAgreementClientFacingBody({
    body: input.rawContractBody,
    terms: input.daTerms,
    commercialStatus: input.commercialStatus,
  });

  const documentHash = computeDirectAgreementSigningDocumentHash({
    contractId: input.contractId,
    contractBody: authoritativeBody,
    paymentTermsHash: input.paymentTermsHash,
    version: input.version,
    sentDocumentContentHash: latest.contentHash,
  });

  return {
    documentHash,
    authoritativeBody,
    binding: buildDirectAgreementSigningBinding(latest),
  };
}

export function assertDirectAgreementSigningBindingCurrent(input: {
  pkg: ContractLifecyclePackage;
  operatorDocumentHash?: string | null;
  contractId: number;
  rawContractBody: string;
  terms: StructuredPaymentTerms;
  daTerms: DirectAgreementTerms;
  revisionNumber: number;
  commercialStatus: string | null | undefined;
}): void {
  const latest = resolveLatestDirectAgreementDocumentRef(input.pkg);
  if (!latest?.contentHash) {
    throw new Error("No finalized Direct Agreement document is on file.");
  }

  const binding = input.pkg.directAgreementSigningBinding;
  if (binding && binding.documentContentHash !== latest.contentHash) {
    throw new Error(DIRECT_AGREEMENT_STALE_SIGNING_MESSAGE);
  }

  const authoritativeBody = resolveDirectAgreementClientFacingBody({
    body: input.rawContractBody,
    terms: input.daTerms,
    commercialStatus: input.commercialStatus,
  });

  const recomputed = computeDirectAgreementSigningDocumentHash({
    contractId: input.contractId,
    contractBody: authoritativeBody,
    paymentTermsHash: hashPaymentTerms(input.terms),
    version: input.revisionNumber,
    sentDocumentContentHash: latest.contentHash,
  });

  if (input.operatorDocumentHash && input.operatorDocumentHash !== recomputed) {
    throw new Error(DIRECT_AGREEMENT_STALE_SIGNING_MESSAGE);
  }
}

/** Invalidate operator/client signing when a newer sent DA PDF is filed. */
export function invalidateDirectAgreementSigningOnNewSentDocument(
  pkg: ContractLifecyclePackage,
  previousLatestHash: string | null,
  newContentHash: string,
): ContractLifecyclePackage {
  if (!pkg.operatorSignature) {
    return { ...pkg, directAgreementSigningBinding: null };
  }
  if (previousLatestHash && previousLatestHash === newContentHash) {
    return pkg;
  }
  if (pkg.directAgreementSigningBinding?.documentContentHash === newContentHash) {
    return pkg;
  }

  let next = invalidateSignaturesOnMaterialEdit({
    ...pkg,
    directAgreementSigningBinding: null,
  });
  next = appendAudit(next, {
    actor: "system",
    action: "direct-agreement.signing-invalidated-new-document",
    reason: DIRECT_AGREEMENT_STALE_SIGNING_MESSAGE,
  });
  return next;
}

/** Commercial status after successful dual-signature e-sign (payment still outstanding). */
export function resolveDirectAgreementCommercialStatusAfterExecution(
  current: ContractLifecyclePackage["commercialStatus"],
): ContractLifecyclePackage["commercialStatus"] {
  if (current === "paid" || current === "active" || current === "completed") {
    return current;
  }
  return "payment-pending";
}

/** Signing-link send blockers for Direct Agreements — excludes invoice-only fields. */
export function blockersForDirectAgreementSigningSend(
  issues: ReadinessIssue[],
): ReadinessIssue[] {
  return issues.filter((i) =>
    ["missing-payment-terms", "installment-total-mismatch"].includes(i.code),
  );
}

export function blockersForSigningSend(
  issues: ReadinessIssue[],
  options?: {
    agreementSource?: string | null;
    commercialSource?: import("../proposal-lifecycle/types.ts").CommercialTermsSource | null;
  },
): ReadinessIssue[] {
  if (
    isDirectAgreementSource(options?.agreementSource, {
      commercialSource: options?.commercialSource ?? null,
    })
  ) {
    return blockersForDirectAgreementSigningSend(issues);
  }
  return blockersForSend(issues);
}
