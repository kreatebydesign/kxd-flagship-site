/**
 * Reviewed legal-party details for specific contracts only.
 * Does not mutate accepted proposals or global billing identity.
 */

export type ReviewedContractPartiesOverride = {
  clientLegalName: string;
  clientMailingAddress: string;
  authorizedSignerName: string;
  clientEmail: string;
  providerLegalName: string;
  providerMailingAddress: string;
  providerEmail: string;
};

/** Contract-scoped overrides — add entries only after operator verification. */
const REVIEWED_CONTRACT_PARTIES: Readonly<Record<number, ReviewedContractPartiesOverride>> = {
  6: {
    clientLegalName: "Rethwill Chiropractic",
    clientMailingAddress: "1445 SE Pine St, Roseburg, OR 97470",
    authorizedSignerName: "Kurt V. Rethwill",
    clientEmail: "rethwillchiro@hotmail.com",
    providerLegalName: "Kreate by Design LLC",
    providerMailingAddress: "9454 Wilshire Blvd, Suite 313, Beverly Hills, CA 90212",
    providerEmail: "matt@kreatebydesign.com",
  },
};

export function getContractPartiesOverride(
  contractId: number,
): ReviewedContractPartiesOverride | null {
  return REVIEWED_CONTRACT_PARTIES[contractId] ?? null;
}

export function formatReviewedPartiesSectionLines(
  override: ReviewedContractPartiesOverride,
): string[] {
  return [
    "PARTIES",
    `Client: ${override.clientLegalName}`,
    `Client mailing address: ${override.clientMailingAddress}`,
    `Authorized signer: ${override.authorizedSignerName}`,
    `Client email: ${override.clientEmail}`,
    `Provider: ${override.providerLegalName}`,
    `Provider mailing address: ${override.providerMailingAddress}`,
    `Provider email: ${override.providerEmail}`,
  ];
}
