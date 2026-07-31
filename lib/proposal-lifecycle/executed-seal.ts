import { newLifecycleId, sha256Hex, stableJsonHash } from "./hash.ts";
import type {
  ContractLifecyclePackage,
  ExecutionCertificate,
  TypedSignatureEvidence,
} from "./types.ts";

export function computeDocumentHash(parts: {
  contractId: number;
  contractBody: string;
  acceptedSnapshotHash: string;
  paymentTermsHash: string;
  version: number;
}): string {
  return sha256Hex(
    [
      parts.contractId,
      parts.version,
      parts.acceptedSnapshotHash,
      parts.paymentTermsHash,
      sha256Hex(parts.contractBody),
    ].join("|"),
  );
}

export function sealExecutedAgreement(input: {
  contractId: number;
  proposalId: number;
  proposalNumber: string;
  proposalVersion: number;
  contractVersion: number;
  documentHash: string;
  operator: TypedSignatureEvidence;
  client: TypedSignatureEvidence;
}): ExecutionCertificate {
  if (input.operator.documentHash !== input.documentHash) {
    throw new Error("Operator signature does not match current document hash.");
  }
  if (input.client.documentHash !== input.documentHash) {
    throw new Error("Client signature does not match current document hash.");
  }
  const sealedAt = new Date().toISOString();
  return {
    agreementId: `AGR-${input.contractId}-${input.contractVersion}`,
    proposalId: input.proposalId,
    proposalNumber: input.proposalNumber,
    proposalVersion: input.proposalVersion,
    contractId: input.contractId,
    contractVersion: input.contractVersion,
    documentHash: input.documentHash,
    kxdSignerName: input.operator.legalName,
    kxdSignedAt: input.operator.signedAt,
    clientSignerName: input.client.legalName,
    clientSignedAt: input.client.signedAt,
    consentVersion: input.client.consentDisclosureVersion,
    verificationId: newLifecycleId("verify"),
    sealedAt,
  };
}

export function invalidateSignaturesOnMaterialEdit(
  pkg: ContractLifecyclePackage,
): ContractLifecyclePackage {
  return {
    ...pkg,
    operatorSignature: null,
    clientSignature: null,
    executedCertificate: null,
    signingTokenHash: null,
    signingTokenPrefix: null,
    signingTokenRevokedAt: new Date().toISOString(),
    billingPlan: null,
  };
}

export function hashPaymentTerms(terms: unknown): string {
  return stableJsonHash(terms ?? {});
}
