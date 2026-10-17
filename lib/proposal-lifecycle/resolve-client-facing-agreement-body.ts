import { parseStoredDirectAgreementTerms } from "../direct-agreement/validate";
import {
  isDirectAgreementSource,
  resolveDirectAgreementClientFacingBody,
} from "../direct-agreement/signing-integrity";
import type { ContractLifecyclePackage } from "./types";
import { toClientFacingContractBody } from "./client-facing-contract";

/**
 * Same client-facing agreement text as public signing and executed PDF generation.
 */
export function resolveClientFacingAgreementBody(
  contract: {
    body?: string | null;
    agreementSource?: string | null;
    directAgreementTerms?: unknown;
  },
  pkg: Pick<ContractLifecyclePackage, "commercialStatus" | "commercialSource">,
): string {
  const agreementSource = contract.agreementSource ? String(contract.agreementSource) : null;
  if (isDirectAgreementSource(agreementSource, pkg)) {
    const daTerms = parseStoredDirectAgreementTerms(contract.directAgreementTerms);
    if (daTerms) {
      return resolveDirectAgreementClientFacingBody({
        body: String(contract.body ?? ""),
        terms: daTerms,
        commercialStatus: pkg.commercialStatus,
      });
    }
  }
  return toClientFacingContractBody(String(contract.body ?? ""));
}
