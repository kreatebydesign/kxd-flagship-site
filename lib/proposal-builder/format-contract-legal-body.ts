/**
 * Human-readable legal section labels for agreement body text.
 */

import type { ContractLegalProvisions } from "./types.ts";

const LEGAL_SECTION_ORDER: Array<keyof ContractLegalProvisions> = [
  "termAndTermination",
  "paymentDefault",
  "intellectualProperty",
  "portfolioPublicity",
  "confidentiality",
  "warrantiesDisclaimers",
  "limitationOfLiability",
  "indemnity",
  "independentContractor",
  "forceMajeure",
  "disputeResolution",
  "governingLaw",
  "entireAgreement",
  "amendments",
  "electronicSignatures",
  "counterparts",
];

const LEGAL_SECTION_TITLES: Record<keyof ContractLegalProvisions, string> = {
  draftNotice: "Draft notice",
  termAndTermination: "Term and termination",
  paymentDefault: "Payment default",
  intellectualProperty: "Intellectual property",
  portfolioPublicity: "Portfolio and publicity",
  confidentiality: "Confidentiality",
  warrantiesDisclaimers: "Warranties and disclaimers",
  limitationOfLiability: "Limitation of liability",
  indemnity: "Indemnity",
  independentContractor: "Independent contractor",
  forceMajeure: "Force majeure",
  disputeResolution: "Dispute resolution",
  governingLaw: "Governing law and venue",
  entireAgreement: "Entire agreement",
  amendments: "Amendments",
  electronicSignatures: "Electronic signatures",
  counterparts: "Counterparts",
};

export function formatLegalProvisionsForAgreementBody(
  legal: ContractLegalProvisions,
): string[] {
  const lines: string[] = ["", "LEGAL PROVISIONS"];
  for (const key of LEGAL_SECTION_ORDER) {
    const value = legal[key]?.trim();
    if (!value || key === "draftNotice") continue;
    lines.push("", LEGAL_SECTION_TITLES[key].toUpperCase(), value);
  }
  return lines;
}

export const CLIENT_FACING_PROPOSAL_REFERENCE = (proposalNumber: string, version: number) =>
  `This Agreement incorporates the commercial terms of Proposal ${proposalNumber} (version ${version}) as accepted by the Client.`;

export const DEFAULT_PROJECT_TAX_DISCLOSURE =
  "Project fees are stated exclusive of applicable sales, use, or similar taxes. Any tax required by law will be shown on invoices.";
