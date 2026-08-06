/**
 * Map an accepted proposal snapshot into an internal contract draft.
 * Cancellation/termination/refunds use the canonical KXD standard from
 * lib/commercial-legal. Other legal provisions remain draft until reviewed.
 */

import {
  STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS,
} from "../commercial-legal/standard-cancellation-refunds.ts";
import { formatCents } from "./money.ts";
import {
  DEFAULT_LEGAL_DRAFT_NOTICE,
  type CanonicalContractDraft,
  type CanonicalProposal,
  type ContractLegalProvisions,
} from "./types.ts";

function defaultLegal(): ContractLegalProvisions {
  return {
    draftNotice: DEFAULT_LEGAL_DRAFT_NOTICE,
    termAndTermination: STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS,
    paymentDefault:
      "[DRAFT — review required] Invoices are due as stated in the payment schedule. Late amounts may pause work after written notice.",
    intellectualProperty:
      "[DRAFT — review required] Upon full payment, client receives the agreed license or ownership rights for final deliverables, excluding KXD pre-existing tools, frameworks, and know-how.",
    portfolioPublicity:
      "[DRAFT — review required] KXD may display non-confidential work in portfolios unless the client requests otherwise in writing.",
    confidentiality:
      "[DRAFT — review required] Each party will protect the other party’s confidential information and use it only to perform under the agreement.",
    warrantiesDisclaimers:
      "[DRAFT — review required] Services are provided professionally. Except as expressly stated, warranties are limited to the maximum extent permitted by law.",
    limitationOfLiability:
      "[DRAFT — review required] Aggregate liability is limited as agreed in the final reviewed contract. Consequential damages are excluded to the extent permitted by law.",
    indemnity:
      "[DRAFT — review required] Indemnity language, if any, must be reviewed before use.",
    independentContractor:
      "[DRAFT — review required] Kreate by Design is an independent contractor, not an employee or partner of the client.",
    forceMajeure:
      "[DRAFT — review required] Neither party is liable for delays caused by events beyond reasonable control.",
    disputeResolution:
      "[DRAFT — review required] Disputes should first be addressed in good-faith discussion before formal proceedings.",
    governingLaw:
      "[DRAFT — review required] Governing law and venue to be confirmed before signature.",
    entireAgreement:
      "[DRAFT — review required] The signed agreement, including exhibits, is the entire agreement and supersedes prior discussions, including the proposal.",
    amendments:
      "[DRAFT — review required] Amendments must be in writing and agreed by both parties.",
    electronicSignatures:
      "[DRAFT — review required] Electronic signatures may be used if both parties agree and applicable law permits.",
    counterparts:
      "[DRAFT — review required] The agreement may be executed in counterparts, each of which is deemed an original.",
  };
}

export function mapAcceptedProposalToContractDraft(
  accepted: CanonicalProposal,
): CanonicalContractDraft {
  const orgs = accepted.organizations.map((o) => o.name).filter(Boolean);
  const deliverables = accepted.scopeGroups.flatMap((g) =>
    g.deliverables.map((d) => `${g.title}: ${d.title}`),
  );
  const scopeSummary = accepted.scopeGroups
    .map((g) => `${g.title}${g.organizationName ? ` (${g.organizationName})` : ""}`)
    .join("; ");

  const pricingSummary = [
    `One-time: ${formatCents(accepted.totals.oneTimeTotalCents, accepted.currency)}`,
    accepted.totals.monthlyTotalCents > 0
      ? `Monthly: ${formatCents(accepted.totals.monthlyTotalCents, accepted.currency)}`
      : null,
    accepted.totals.annualTotalCents > 0
      ? `Annual: ${formatCents(accepted.totals.annualTotalCents, accepted.currency)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const creditsSummary =
    accepted.credits.length > 0
      ? accepted.credits
          .map(
            (c) =>
              `${c.label}: ${formatCents(c.amountCents, accepted.currency)} (${c.kind})`,
          )
          .join("; ")
      : "None";

  const paymentScheduleSummary =
    accepted.paymentSchedule.length > 0
      ? accepted.paymentSchedule
          .map(
            (p) =>
              `${p.label}: ${formatCents(p.amountCents, accepted.currency)} (${p.due})`,
          )
          .join("; ")
      : "Per accepted proposal totals.";

  const primary = accepted.primaryContact;
  const contactName = primary?.name?.trim() || "";
  const contactTitle = primary?.title?.trim() || "";
  const contactEmail = primary?.email?.trim() || "";
  const contactPhone = primary?.phone?.trim() || "";
  const contactLine = [contactName, contactTitle, contactEmail, contactPhone]
    .filter(Boolean)
    .join(" · ");

  const legal = defaultLegal();
  const body = [
    DEFAULT_LEGAL_DRAFT_NOTICE,
    "",
    `This draft agreement is prepared from accepted proposal ${accepted.proposalNumber} (version ${accepted.version}).`,
    "",
    "PARTIES",
    `Client: ${accepted.primaryOrganization}`,
    orgs.length ? `Organizations/brands: ${orgs.join(", ")}` : "",
    contactLine ? `Primary contact: ${contactLine}` : "",
    "Provider: Kreate by Design",
    "",
    "SCOPE",
    scopeSummary || "As accepted in the proposal snapshot.",
    "",
    "DELIVERABLES",
    deliverables.length ? deliverables.map((d) => `• ${d}`).join("\n") : "As accepted.",
    "",
    "SCHEDULE",
    accepted.scopeGroups.map((g) => g.estimatedTimeline).filter(Boolean).join(" · ") ||
      "To be confirmed in the final agreement.",
    "",
    "PRICING",
    pricingSummary,
    `Credits: ${creditsSummary}`,
    `Deposit: ${formatCents(accepted.totals.depositCents, accepted.currency)}`,
    `Payment schedule: ${paymentScheduleSummary}`,
    "",
    "RESPONSIBILITIES & EXCLUSIONS",
    accepted.terms.clientResponsibilities || "As stated in the accepted proposal.",
    accepted.terms.exclusions || "",
    "",
    "CHANGE PROCESS",
    accepted.terms.changeRequestLanguage ||
      "Material changes require written agreement and may adjust fees or timeline.",
    "",
    "PROPOSAL REFERENCE",
    `Proposal ${accepted.proposalNumber}, version ${accepted.version}, accepted snapshot controls commercial intent for this draft.`,
    "",
    "LEGAL PROVISIONS (DRAFT)",
    ...Object.entries(legal)
      .filter(([k]) => k !== "draftNotice")
      .map(([k, v]) => `${k}: ${v}`),
  ]
    .filter((line) => line != null)
    .join("\n");

  return {
    schemaVersion: 1,
    proposalId: accepted.proposalId,
    proposalNumber: accepted.proposalNumber,
    proposalVersion: accepted.version,
    title: `Agreement — ${accepted.title}`,
    status: "draft",
    parties: {
      clientName: accepted.primaryOrganization,
      organizations: orgs,
      kxdName: "Kreate by Design",
      ...(contactName ? { primaryContactName: contactName } : {}),
      ...(contactTitle ? { primaryContactTitle: contactTitle } : {}),
      ...(contactEmail ? { primaryContactEmail: contactEmail } : {}),
      ...(contactPhone ? { primaryContactPhone: contactPhone } : {}),
    },
    scopeSummary: scopeSummary || "As accepted in the proposal.",
    deliverables,
    scheduleSummary:
      accepted.scopeGroups.map((g) => g.estimatedTimeline).filter(Boolean).join(" · ") ||
      "To be confirmed",
    pricingSummary,
    recurringSummary:
      accepted.totals.monthlyTotalCents > 0
        ? formatCents(accepted.totals.monthlyTotalCents, accepted.currency) + "/mo"
        : "None",
    creditsSummary,
    depositSummary: formatCents(accepted.totals.depositCents, accepted.currency),
    paymentScheduleSummary,
    responsibilities: accepted.terms.clientResponsibilities || "",
    assumptions: accepted.terms.paymentAssumptions || "",
    exclusions: accepted.terms.exclusions || "",
    changeProcess:
      accepted.terms.changeRequestLanguage ||
      "Material changes require written agreement.",
    legal,
    body,
    totals: accepted.totals,
    generatedAt: new Date().toISOString(),
  };
}
