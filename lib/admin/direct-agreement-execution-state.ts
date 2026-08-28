import type { ContractLifecyclePackage } from "../proposal-lifecycle/types.ts";
import { resolveLatestDocumentRef } from "../client-command/commercial/resolve-document-refs.ts";
import { DIRECT_AGREEMENT_STALE_SIGNING_MESSAGE } from "../direct-agreement/signing-integrity.ts";

export type DirectAgreementExecutionUiState =
  | "awaiting-operator-signature"
  | "operator-signed-ready-for-link"
  | "signing-link-prepared"
  | "client-signed"
  | "external-acceptance"
  | "unavailable";

export type DirectAgreementExecutionPresentation = {
  showElectronicExecution: boolean;
  state: DirectAgreementExecutionUiState;
  stateLabel: string;
  unavailableReason: string | null;
  signingLinkActive: boolean;
  operatorSignatureSummary: {
    legalName: string;
    entityName: string;
    signedAt: string;
  } | null;
};

const STATE_LABELS: Record<DirectAgreementExecutionUiState, string> = {
  "awaiting-operator-signature": "Awaiting operator signature",
  "operator-signed-ready-for-link": "Operator signed — ready to prepare client link",
  "signing-link-prepared": "Signing link prepared",
  "client-signed": "Client signed — agreement executed",
  "external-acceptance": "External acceptance recorded",
  unavailable: "Electronic execution unavailable",
};

export function resolveDirectAgreementSigningIntegrityMessage(
  pkg: ContractLifecyclePackage,
): string | null {
  if (!pkg.operatorSignature) return null;
  const latest = resolveLatestDocumentRef(pkg.documentRefs, "direct-agreement");
  const binding = pkg.directAgreementSigningBinding;
  if (!latest?.contentHash) {
    return "No finalized Direct Agreement document is on file.";
  }
  if (binding && binding.documentContentHash !== latest.contentHash) {
    return DIRECT_AGREEMENT_STALE_SIGNING_MESSAGE;
  }
  return null;
}

function isSigningLinkActive(pkg: ContractLifecyclePackage): boolean {
  if (!pkg.signingTokenHash || pkg.signingTokenRevokedAt) return false;
  if (pkg.signingTokenExpiresAt && Date.parse(pkg.signingTokenExpiresAt) < Date.now()) {
    return false;
  }
  return true;
}

export function resolveDirectAgreementExecutionPresentation(input: {
  agreementSource: string | null | undefined;
  commercialStatus: string | null | undefined;
  pkg: ContractLifecyclePackage;
  signingIntegrityMessage?: string | null;
}): DirectAgreementExecutionPresentation | null {
  if (input.agreementSource !== "direct-agreement") return null;

  const hasOperatorSignature = Boolean(input.pkg.operatorSignature);
  const hasClientSignature = Boolean(input.pkg.clientSignature);
  const hasExternalAcceptance = Boolean(input.pkg.externalAcceptance);
  const signingLinkActive = isSigningLinkActive(input.pkg);
  const unavailableReason = input.signingIntegrityMessage?.trim() || null;

  const awaitingDirectExecution =
    !hasClientSignature &&
    !hasExternalAcceptance &&
    (input.commercialStatus === "finalized" || input.commercialStatus === "sent");

  if (!awaitingDirectExecution && !hasClientSignature && !hasExternalAcceptance) {
    return {
      showElectronicExecution: true,
      state: "unavailable",
      stateLabel: STATE_LABELS.unavailable,
      unavailableReason:
        unavailableReason ??
        `Electronic signing is not available while commercial status is "${input.commercialStatus ?? "unknown"}".`,
      signingLinkActive,
      operatorSignatureSummary: input.pkg.operatorSignature
        ? {
            legalName: input.pkg.operatorSignature.legalName,
            entityName: input.pkg.operatorSignature.entityName,
            signedAt: input.pkg.operatorSignature.signedAt,
          }
        : null,
    };
  }

  if (hasExternalAcceptance) {
    return {
      showElectronicExecution: true,
      state: "external-acceptance",
      stateLabel: STATE_LABELS["external-acceptance"],
      unavailableReason: null,
      signingLinkActive: false,
      operatorSignatureSummary: input.pkg.operatorSignature
        ? {
            legalName: input.pkg.operatorSignature.legalName,
            entityName: input.pkg.operatorSignature.entityName,
            signedAt: input.pkg.operatorSignature.signedAt,
          }
        : null,
    };
  }

  if (hasClientSignature) {
    return {
      showElectronicExecution: true,
      state: "client-signed",
      stateLabel: STATE_LABELS["client-signed"],
      unavailableReason: null,
      signingLinkActive: false,
      operatorSignatureSummary: input.pkg.operatorSignature
        ? {
            legalName: input.pkg.operatorSignature.legalName,
            entityName: input.pkg.operatorSignature.entityName,
            signedAt: input.pkg.operatorSignature.signedAt,
          }
        : null,
    };
  }

  if (unavailableReason && hasOperatorSignature) {
    return {
      showElectronicExecution: true,
      state: "unavailable",
      stateLabel: STATE_LABELS.unavailable,
      unavailableReason,
      signingLinkActive: false,
      operatorSignatureSummary: input.pkg.operatorSignature
        ? {
            legalName: input.pkg.operatorSignature.legalName,
            entityName: input.pkg.operatorSignature.entityName,
            signedAt: input.pkg.operatorSignature.signedAt,
          }
        : null,
    };
  }

  if (signingLinkActive) {
    return {
      showElectronicExecution: true,
      state: "signing-link-prepared",
      stateLabel: STATE_LABELS["signing-link-prepared"],
      unavailableReason: null,
      signingLinkActive: true,
      operatorSignatureSummary: input.pkg.operatorSignature
        ? {
            legalName: input.pkg.operatorSignature.legalName,
            entityName: input.pkg.operatorSignature.entityName,
            signedAt: input.pkg.operatorSignature.signedAt,
          }
        : null,
    };
  }

  if (hasOperatorSignature) {
    return {
      showElectronicExecution: true,
      state: "operator-signed-ready-for-link",
      stateLabel: STATE_LABELS["operator-signed-ready-for-link"],
      unavailableReason: null,
      signingLinkActive: false,
      operatorSignatureSummary: {
        legalName: input.pkg.operatorSignature!.legalName,
        entityName: input.pkg.operatorSignature!.entityName,
        signedAt: input.pkg.operatorSignature!.signedAt,
      },
    };
  }

  return {
    showElectronicExecution: true,
    state: "awaiting-operator-signature",
    stateLabel: STATE_LABELS["awaiting-operator-signature"],
    unavailableReason: null,
    signingLinkActive: false,
    operatorSignatureSummary: null,
  };
}
