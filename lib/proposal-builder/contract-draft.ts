/**
 * Map an accepted proposal snapshot into an internal contract draft.
 * Legal foundation comes from lib/commercial-legal (not attorney-approved).
 * Optional contract-only commercial amendments never mutate the accepted snapshot.
 */

import { STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS } from "../commercial-legal/standard-cancellation-refunds.ts";
import {
  formatGoverningLawClause,
  readLegalJurisdictionConfig,
} from "../commercial-legal/contract-signature-readiness.ts";
import {
  STANDARD_AMENDMENTS,
  STANDARD_CONFIDENTIALITY,
  STANDARD_COUNTERPARTS,
  STANDARD_DISPUTE_RESOLUTION,
  STANDARD_ELECTRONIC_SIGNATURES,
  STANDARD_ENTIRE_AGREEMENT,
  STANDARD_FORCE_MAJEURE,
  STANDARD_INDEMNITY,
  STANDARD_INDEPENDENT_CONTRACTOR,
  STANDARD_INTELLECTUAL_PROPERTY,
  STANDARD_LIMITATION_OF_LIABILITY,
  STANDARD_PAYMENT_DEFAULT,
  STANDARD_PORTFOLIO_PUBLICITY,
  STANDARD_WARRANTIES_DISCLAIMERS,
} from "../commercial-legal/standard-contract-provisions.ts";
import type { ContractCommercialAmendments } from "../proposal-lifecycle/commercial-amendments.ts";
import { formatCents } from "./money.ts";
import {
  DEFAULT_LEGAL_DRAFT_NOTICE,
  type CanonicalContractDraft,
  type CanonicalProposal,
  type ContractLegalProvisions,
  type PaymentScheduleItem,
} from "./types.ts";

function buildLegalProvisions(): ContractLegalProvisions {
  const jurisdiction = readLegalJurisdictionConfig();
  return {
    draftNotice: DEFAULT_LEGAL_DRAFT_NOTICE,
    termAndTermination: STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS,
    paymentDefault: STANDARD_PAYMENT_DEFAULT,
    intellectualProperty: STANDARD_INTELLECTUAL_PROPERTY,
    portfolioPublicity: STANDARD_PORTFOLIO_PUBLICITY,
    confidentiality: STANDARD_CONFIDENTIALITY,
    warrantiesDisclaimers: STANDARD_WARRANTIES_DISCLAIMERS,
    limitationOfLiability: STANDARD_LIMITATION_OF_LIABILITY,
    indemnity: STANDARD_INDEMNITY,
    independentContractor: STANDARD_INDEPENDENT_CONTRACTOR,
    forceMajeure: STANDARD_FORCE_MAJEURE,
    disputeResolution: STANDARD_DISPUTE_RESOLUTION,
    governingLaw: formatGoverningLawClause(jurisdiction),
    entireAgreement: STANDARD_ENTIRE_AGREEMENT,
    amendments: STANDARD_AMENDMENTS,
    electronicSignatures: STANDARD_ELECTRONIC_SIGNATURES,
    counterparts: STANDARD_COUNTERPARTS,
  };
}

function formatScheduleLine(
  item: PaymentScheduleItem & { notes?: string },
  currency: string,
): string {
  const due = item.due === "on-date" && item.dueDate ? `due ${item.dueDate}` : item.due;
  const note = item.notes ? ` — ${item.notes}` : "";
  return `${item.label}: ${formatCents(item.amountCents, currency)} (${due})${note}`;
}

function formatRecurringSection(
  amendments: ContractCommercialAmendments | null | undefined,
  acceptedMonthlyCents: number,
  currency: string,
): string[] {
  const recurring = amendments?.recurringService;
  if (recurring && recurring.amountCents > 0) {
    let start: string;
    if (recurring.startTrigger === "website-launch") {
      start =
        "Commencement: website launch / production launch of the completed website (no calendar start date until launch occurs).";
    } else if (
      recurring.startBillingDateStatus === "confirmed" &&
      recurring.startBillingDate
    ) {
      start = `Start / billing date: ${recurring.startBillingDate}`;
    } else {
      start = "Start / billing date: pending confirmation before final signature";
    }
    return [
      "",
      "RECURRING SERVICES (SEPARATE FROM PROJECT TOTAL)",
      `${recurring.title}: ${formatCents(recurring.amountCents, currency)}/month`,
      start,
      "This monthly service is not part of the one-time project total.",
      recurring.commencementNotes ?? null,
      "",
      "Included:",
      ...recurring.includes.map((line) => `• ${line}`),
      "",
      "Not included:",
      ...recurring.excludes.map((line) => `• ${line}`),
      "",
      recurring.rankingDisclaimer,
    ].filter((line): line is string => line != null);
  }
  if (acceptedMonthlyCents > 0) {
    return ["", "RECURRING SERVICES", `Monthly: ${formatCents(acceptedMonthlyCents, currency)}`];
  }
  return ["", "RECURRING SERVICES", "None in the accepted proposal snapshot."];
}

function formatAncillaryChargesSection(
  amendments: ContractCommercialAmendments | null | undefined,
  currency: string,
): string[] {
  const charges = amendments?.ancillaryCharges ?? [];
  if (!charges.length) return [];
  const total = charges.reduce((a, c) => a + c.amountCents, 0);
  return [
    "",
    "ADDITIONAL ANNUAL / LAUNCH CHARGES (SEPARATE FROM PROJECT TOTAL)",
    "These charges are not part of the accepted website project price.",
    ...charges.flatMap((c) => {
      const due =
        c.dueTrigger === "website-launch"
          ? "due at website launch / production launch"
          : c.dueDate
            ? `due ${c.dueDate}`
            : `due ${c.dueTrigger}`;
      const cadence =
        c.cadence === "annual" ? `${formatCents(c.amountCents, currency)}/year` : formatCents(c.amountCents, currency);
      return [
        `• ${c.title}: ${cadence} (${due})`,
        `  ${c.termNotes}`,
        c.renewalNotes ? `  ${c.renewalNotes}` : null,
      ].filter((line): line is string => Boolean(line));
    }),
    `First-year / launch additional charges total: ${formatCents(total, currency)}`,
  ];
}

export type MapContractDraftOptions = {
  amendments?: ContractCommercialAmendments | null;
};

export function mapAcceptedProposalToContractDraft(
  accepted: CanonicalProposal,
  options?: MapContractDraftOptions,
): CanonicalContractDraft {
  const amendments = options?.amendments ?? null;
  const orgs = accepted.organizations.map((o) => o.name).filter(Boolean);
  const deliverables = accepted.scopeGroups.flatMap((g) =>
    g.deliverables.map((d) => `${g.title}: ${d.title}`),
  );
  const scopeSummary = accepted.scopeGroups
    .map((g) => `${g.title}${g.organizationName ? ` (${g.organizationName})` : ""}`)
    .join("; ");

  const monthlyForSummary =
    amendments?.recurringService?.amountCents ?? accepted.totals.monthlyTotalCents;

  const pricingSummary = [
    `Website project: ${formatCents(accepted.totals.oneTimeTotalCents, accepted.currency)}`,
    ...(amendments?.ancillaryCharges ?? []).map((c) => {
      const amount =
        c.cadence === "annual"
          ? `${formatCents(c.amountCents, accepted.currency)}/year`
          : formatCents(c.amountCents, accepted.currency);
      return `${c.title}: ${amount} (separate)`;
    }),
    monthlyForSummary > 0
      ? `Monthly care (separate): ${formatCents(monthlyForSummary, accepted.currency)}`
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

  const scheduleItems: Array<PaymentScheduleItem & { notes?: string }> =
    amendments?.paymentScheduleOverride?.length
      ? amendments.paymentScheduleOverride
      : accepted.paymentSchedule;

  const paymentScheduleSummary =
    scheduleItems.length > 0
      ? scheduleItems.map((p) => formatScheduleLine(p, accepted.currency)).join("; ")
      : "Per accepted proposal totals.";

  const primary = accepted.primaryContact;
  const contactName = primary?.name?.trim() || "";
  const contactTitle = primary?.title?.trim() || "";
  const contactEmail = primary?.email?.trim() || "";
  const contactPhone = primary?.phone?.trim() || "";
  const contactLine = [contactName, contactTitle, contactEmail, contactPhone]
    .filter(Boolean)
    .join(" · ");

  const legal = buildLegalProvisions();
  if (amendments?.legalOverrides?.paymentDefault) {
    legal.paymentDefault = amendments.legalOverrides.paymentDefault;
  }
  if (amendments?.legalOverrides?.entireAgreement) {
    legal.entireAgreement = amendments.legalOverrides.entireAgreement;
  }

  const depositLines =
    amendments?.paymentScheduleOverride?.filter((p) => p.group === "initial-deposit") ?? [];
  const remainingLines =
    amendments?.paymentScheduleOverride?.filter((p) => p.group === "remaining") ?? [];

  const paymentDetailBlock = amendments?.paymentScheduleNarrative
    ? ["", amendments.paymentScheduleNarrative]
    : amendments?.paymentScheduleOverride?.length
    ? [
        "",
        "PROJECT PAYMENT SCHEDULE",
        `Accepted one-time project total: ${formatCents(accepted.totals.oneTimeTotalCents, accepted.currency)}`,
        depositLines.length
          ? `Initial 50% project deposit (${formatCents(
              depositLines.reduce((a, p) => a + p.amountCents, 0),
              accepted.currency,
            )} total), payable in installments:`
          : null,
        ...depositLines.map((p) => `• ${formatScheduleLine(p, accepted.currency)}`),
        remainingLines.length ? "Remaining project payments:" : null,
        ...remainingLines.map((p) => `• ${formatScheduleLine(p, accepted.currency)}`),
        amendments.depositAccommodationNotes,
        amendments.workMayBeginAfterFirstInstallment
          ? "KXD may begin project work after receipt of the first deposit installment."
          : null,
      ].filter((line): line is string => Boolean(line))
    : [
        "",
        "PROJECT PAYMENT SCHEDULE",
        `Deposit: ${formatCents(accepted.totals.depositCents, accepted.currency)}`,
        `Payment schedule: ${paymentScheduleSummary}`,
      ];

  const proposalReference =
    amendments?.proposalReferenceNote?.trim() ||
    `Proposal ${accepted.proposalNumber}, version ${accepted.version}, accepted snapshot controls commercial intent for this draft.`;

  const body = [
    DEFAULT_LEGAL_DRAFT_NOTICE,
    "",
    `This draft agreement is prepared from accepted proposal ${accepted.proposalNumber} (version ${accepted.version}).`,
    amendments
      ? "Post-acceptance commercial amendments are recorded on this contract only and do not rewrite the accepted proposal snapshot."
      : null,
    "",
    "PARTIES",
    `Client: ${accepted.primaryOrganization}`,
    orgs.length ? `Organizations/brands: ${orgs.join(", ")}` : null,
    contactLine ? `Primary contact: ${contactLine}` : null,
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
    ...paymentDetailBlock,
    ...formatAncillaryChargesSection(amendments, accepted.currency),
    ...formatRecurringSection(amendments, accepted.totals.monthlyTotalCents, accepted.currency),
    "",
    "RESPONSIBILITIES & EXCLUSIONS",
    accepted.terms.clientResponsibilities || "As stated in the accepted proposal.",
    accepted.terms.exclusions || null,
    amendments?.exclusionsClarification?.trim() || null,
    "",
    "CLIENT DELAYS",
    "The Client is responsible for timely content, access, approvals, accurate factual information, consolidated feedback, and payment. Client-caused delays may affect delivery dates, may require rescheduling, and do not create automatic refunds.",
    "",
    "CHANGE PROCESS",
    accepted.terms.changeRequestLanguage ||
      "Material changes require written agreement and may adjust fees or timeline.",
    "",
    "PROPOSAL REFERENCE",
    proposalReference,
    "",
    "LEGAL PROVISIONS",
    ...Object.entries(legal)
      .filter(([k]) => k !== "draftNotice")
      .map(([k, v]) => `${k}: ${v}`),
  ]
    .filter((line) => line != null)
    .join("\n");

  const depositSummaryCents = amendments?.paymentScheduleOverride?.length
    ? amendments.paymentScheduleOverride
        .filter((p) => p.group === "initial-deposit")
        .reduce((a, p) => a + p.amountCents, 0) || accepted.totals.depositCents
    : accepted.totals.depositCents;

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
      monthlyForSummary > 0
        ? `${formatCents(monthlyForSummary, accepted.currency)}/mo (separate from project total)`
        : "None",
    creditsSummary,
    depositSummary: formatCents(depositSummaryCents, accepted.currency),
    paymentScheduleSummary,
    responsibilities: accepted.terms.clientResponsibilities || "",
    assumptions: accepted.terms.paymentAssumptions || "",
    exclusions: [accepted.terms.exclusions, amendments?.exclusionsClarification]
      .filter((part) => Boolean(part && String(part).trim()))
      .join("\n\n"),
    changeProcess:
      accepted.terms.changeRequestLanguage || "Material changes require written agreement.",
    legal,
    body,
    totals: accepted.totals,
    generatedAt: new Date().toISOString(),
  };
}
