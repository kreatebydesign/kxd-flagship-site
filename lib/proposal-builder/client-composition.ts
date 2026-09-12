/**
 * Client-facing proposal composition — display only.
 *
 * Shared across PDF, HTML preview, and public proposal surfaces so hierarchy,
 * pacing, and commercial framing stay consistent without mutating stored
 * commercial authority.
 */

import { formatProposalCalendarDate } from "./calendar-date.ts";
import {
  formatClientFacingCreditAmount,
  formatClientFacingLineAmount,
  formatClientFacingPaymentTiming,
} from "./client-facing-labels.ts";
import { formatCents } from "./money.ts";
import type {
  CanonicalProposal,
  ProposalPricingLine,
  ProposalScopeGroup,
} from "./types.ts";

function initialPaymentDisplayLabel(
  initialPaymentCents: number,
  oneTimeTotalCents: number,
): "Upfront payment" | "Deposit" {
  return oneTimeTotalCents > 0 && initialPaymentCents >= oneTimeTotalCents
    ? "Upfront payment"
    : "Deposit";
}

export type CoverComposition = {
  docType: string;
  organizationLines: string[];
  organizationJoiner: "+" | null;
  engagementTitle: string;
  preparedForName: string | null;
  preparedForDetail: string | null;
  metaLines: string[];
  studioLine: string;
};

export type OpeningSection = {
  id: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  emphasis?: "lead" | "supporting";
};

export type ScopeWorkstreamPresentation = {
  indexLabel: string;
  organizationName: string | null;
  title: string;
  subtitle: string | null;
  overview: string | null;
  deliverables: Array<{ id: string; title: string; description?: string | null }>;
};

export type InvestmentLinePresentation = {
  id: string;
  title: string;
  amountLabel: string;
  cadenceLabel: string;
  description?: string | null;
  optional: boolean;
};

export type InvestmentComposition = {
  eyebrow: string;
  title: string;
  heroEyebrow: string;
  heroAmount: string;
  heroCaption: string | null;
  paymentSummary: string | null;
  oneTimeLines: InvestmentLinePresentation[];
  annualLines: InvestmentLinePresentation[];
  annualTotalLabel: string | null;
  monthlyLines: InvestmentLinePresentation[];
  monthlyNoneLabel: string | null;
  quarterlyLines: InvestmentLinePresentation[];
  creditLines: InvestmentLinePresentation[];
  showDetailedSchedule: boolean;
  scheduleRows: Array<{ id: string; label: string; timing: string; amount: string }>;
  isFullUpfront: boolean;
};

export type TermsSectionPlan = {
  key: string;
  eyebrow: string;
  title: string;
  text: string;
  layout?: "stack" | "editorial";
};

function cleanText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function comparable(value: string | null | undefined): string {
  return cleanText(value).toLowerCase();
}

function substantiallyOverlaps(candidate: string, against: string): boolean {
  const a = comparable(candidate);
  const b = comparable(against);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 48 && b.includes(a.slice(0, Math.min(96, a.length)))) return true;
  if (b.length >= 48 && a.includes(b.slice(0, Math.min(96, b.length)))) return true;
  return false;
}

export function isFullUpfrontProposal(proposal: CanonicalProposal): boolean {
  const oneTime = Number(proposal.totals.oneTimeTotalCents) || 0;
  const deposit = Number(proposal.totals.depositCents) || 0;
  if (oneTime > 0 && deposit >= oneTime) return true;
  if (proposal.paymentSchedule.length !== 1) return false;
  const only = proposal.paymentSchedule[0];
  return Boolean(
    only &&
      only.amountCents === oneTime &&
      (only.due === "at-acceptance" || only.due === "at-contract"),
  );
}

/**
 * Soften stale "deposit" wording when the commercial structure is full upfront.
 * Display-only — does not mutate stored proposal documents.
 */
export function softenClientFacingDepositLanguage(
  text: string | null | undefined,
  isFullUpfront: boolean,
): string {
  if (!text?.trim()) return "";
  if (!isFullUpfront) return text;
  return text
    .replace(/\bafter the deposit is received\b/gi, "after the upfront project payment is received")
    .replace(/\bthe deposit is received\b/gi, "the upfront project payment is received")
    .replace(/\bdeposit is received\b/gi, "upfront project payment is received")
    .replace(/\bthe deposit\b/gi, "the upfront project payment")
    .replace(/\ba deposit\b/gi, "an upfront project payment")
    .replace(/\bproject deposit\b/gi, "upfront project payment");
}

function stripOrganizationNamesFromTitle(title: string, organizationNames: string[]): string {
  let next = cleanText(title);
  const sorted = [...organizationNames]
    .map(cleanText)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    next = next.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), " ");
  }
  next = next
    .replace(/\s*[+&]\s*/g, " ")
    .replace(/\s+[—–-]\s+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return next;
}

export function composeCoverPresentation(proposal: CanonicalProposal): CoverComposition {
  const organizationLines = (proposal.organizations ?? [])
    .map((org) => cleanText(org.name))
    .filter(Boolean);
  const uniqueOrgs = organizationLines.filter(
    (name, index, all) =>
      all.findIndex((candidate) => comparable(candidate) === comparable(name)) === index,
  );

  const engagementFromTitle = stripOrganizationNamesFromTitle(
    proposal.title,
    uniqueOrgs.length ? uniqueOrgs : [proposal.primaryOrganization],
  );
  const engagementTitle =
    engagementFromTitle ||
    cleanText(proposal.title) ||
    "Engagement";

  const contactName = cleanText(proposal.primaryContact?.name);
  const rawTitle = cleanText(proposal.primaryContact?.title);
  const contactTitle =
    rawTitle && !/^(primary\s+contact|contact|main\s+contact)$/i.test(rawTitle)
      ? rawTitle
      : "";
  const contactBits = [
    contactTitle,
    cleanText(proposal.primaryContact?.email),
    cleanText(proposal.primaryContact?.phone),
  ].filter(Boolean);

  const metaLines = [
    `${proposal.proposalNumber} · Version ${proposal.version}`,
    `${formatProposalCalendarDate(proposal.proposalDate)} · Valid through ${formatProposalCalendarDate(proposal.expirationDate)}`,
  ];

  return {
    docType: "Proposal",
    organizationLines: uniqueOrgs.length
      ? uniqueOrgs
      : [cleanText(proposal.primaryOrganization)].filter(Boolean),
    organizationJoiner: uniqueOrgs.length > 1 ? "+" : null,
    engagementTitle,
    preparedForName: contactName || null,
    preparedForDetail: contactBits.length ? contactBits.join(" · ") : null,
    metaLines,
    studioLine: proposal.preparedBy || "Kreate by Design",
  };
}

export function composeOpeningSections(proposal: CanonicalProposal): OpeningSection[] {
  const exec = proposal.executive;
  const sections: OpeningSection[] = [];

  const lead = cleanText(exec.clientFacingIntro) || cleanText(exec.executiveSummary);
  if (lead) {
    sections.push({
      id: "opportunity",
      eyebrow: "Opportunity",
      title: "What this engagement is for",
      paragraphs: [lead],
      emphasis: "lead",
    });
  }

  const situation = cleanText(exec.currentSituation);
  if (situation && !substantiallyOverlaps(situation, lead)) {
    sections.push({
      id: "situation",
      eyebrow: "Situation",
      title: "Where things stand",
      paragraphs: [situation],
      emphasis: "supporting",
    });
  }

  const projectParagraphs = [
    cleanText(exec.recommendedDirection),
    cleanText(exec.objectives),
  ].filter((paragraph) => paragraph && !substantiallyOverlaps(paragraph, lead)) as string[];

  // Prefer direction/objectives over clientContext for the project frame;
  // clientContext often restates commercial terms that belong in Investment.
  if (projectParagraphs.length) {
    sections.push({
      id: "project",
      eyebrow: "Engagement",
      title: "How the work is organized",
      paragraphs: projectParagraphs,
      emphasis: "lead",
    });
  } else {
    const context = cleanText(exec.clientContext);
    if (context && !substantiallyOverlaps(context, lead)) {
      sections.push({
        id: "project",
        eyebrow: "Engagement",
        title: "How the work is organized",
        paragraphs: [context],
        emphasis: "lead",
      });
    }
  }

  const outcomes = cleanText(exec.desiredOutcomes);
  if (outcomes && !substantiallyOverlaps(outcomes, lead)) {
    sections.push({
      id: "outcomes",
      eyebrow: "Outcome",
      title: "What you receive",
      paragraphs: [outcomes],
      emphasis: "lead",
    });
  }

  // If opening collapsed to nothing (sparse proposals), fall back to raw fields.
  if (!sections.length) {
    const fallback = [
      ["Introduction", "A clear path forward", exec.clientFacingIntro],
      ["Executive summary", "Where this begins", exec.executiveSummary],
      ["Situation", "Current situation", exec.currentSituation],
      ["Objectives", "What success requires", exec.objectives],
      ["Direction", "Recommended path", exec.recommendedDirection],
      ["Outcomes", "Desired outcomes", exec.desiredOutcomes],
      ["Context", "Project context", exec.clientContext],
    ] as const;
    for (const [eyebrow, title, body] of fallback) {
      const text = cleanText(body);
      if (!text) continue;
      sections.push({ id: eyebrow.toLowerCase(), eyebrow, title, paragraphs: [text] });
    }
  }

  return sections;
}

export function composeScopeWorkstream(
  group: ProposalScopeGroup,
  index: number,
  total: number,
): ScopeWorkstreamPresentation {
  const rawTitle = cleanText(group.title);
  const orgName = cleanText(group.organizationName) || null;
  let title = rawTitle;
  let subtitle: string | null = null;

  const emDashSplit = rawTitle.split(/\s+[—–-]\s+/);
  if (emDashSplit.length >= 2) {
    title = cleanText(emDashSplit[0]);
    subtitle = cleanText(emDashSplit.slice(1).join(" — "));
  } else if (orgName && comparable(rawTitle).startsWith(comparable(orgName))) {
    title = orgName;
    const remainder = cleanText(rawTitle.slice(orgName.length).replace(/^[:\-—–\s]+/, ""));
    subtitle = remainder || null;
  }

  return {
    indexLabel: total > 1 ? String(index + 1).padStart(2, "0") : "01",
    organizationName: orgName,
    title: title || rawTitle || "Included work",
    subtitle,
    overview: group.overview?.trim() || null,
    deliverables: group.deliverables.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
    })),
  };
}

function toInvestmentLine(line: ProposalPricingLine, currency: string): InvestmentLinePresentation {
  return {
    id: line.id,
    title: line.title,
    amountLabel: formatClientFacingLineAmount(
      line.unitPriceCents * (line.quantity || 1),
      line.cadence,
      currency,
    ),
    cadenceLabel:
      line.inclusion === "optional" || line.isAddon
        ? "Optional"
        : line.cadence === "one-time"
          ? "One-time"
          : line.cadence === "annual"
            ? "Annual"
            : line.cadence === "monthly"
              ? "Monthly"
              : line.cadence === "quarterly"
                ? "Quarterly"
                : "One-time",
    description: line.description,
    optional: line.inclusion === "optional" || Boolean(line.isAddon),
  };
}

export function composeInvestmentPresentation(proposal: CanonicalProposal): InvestmentComposition {
  const currency = proposal.currency || "USD";
  const included = proposal.pricingLines.filter((line) => line.inclusion !== "excluded");
  const oneTimeLines = included
    .filter((line) => line.cadence === "one-time")
    .map((line) => toInvestmentLine(line, currency));
  const annualLines = included
    .filter((line) => line.cadence === "annual")
    .map((line) => toInvestmentLine(line, currency));
  const monthlyLines = included
    .filter((line) => line.cadence === "monthly")
    .map((line) => toInvestmentLine(line, currency));
  const quarterlyLines = included
    .filter((line) => line.cadence === "quarterly")
    .map((line) => toInvestmentLine(line, currency));

  const isFullUpfront = isFullUpfrontProposal(proposal);
  const heroAmount = formatCents(proposal.totals.oneTimeTotalCents, currency);

  let heroEyebrow = "Project investment";
  if (oneTimeLines.length === 1) {
    heroEyebrow = oneTimeLines[0]!.title;
  } else if (oneTimeLines.length > 1) {
    heroEyebrow = "One-time project investment";
  }

  let paymentSummary: string | null = null;
  if (isFullUpfront && proposal.totals.oneTimeTotalCents > 0) {
    paymentSummary = "Paid in full upfront";
  } else if (proposal.paymentSchedule.length === 1) {
    const only = proposal.paymentSchedule[0]!;
    paymentSummary = `${formatCents(only.amountCents, currency)} · ${formatClientFacingPaymentTiming(only.due)}`;
  } else if (proposal.totals.depositCents > 0) {
    paymentSummary = `${initialPaymentDisplayLabel(
      proposal.totals.depositCents,
      proposal.totals.oneTimeTotalCents,
    )}: ${formatCents(proposal.totals.depositCents, currency)}`;
  }

  const showDetailedSchedule =
    proposal.paymentSchedule.length > 1 ||
    (proposal.paymentSchedule.length === 1 &&
      !isFullUpfront &&
      proposal.paymentSchedule[0]!.amountCents !== proposal.totals.oneTimeTotalCents);

  return {
    eyebrow: "Investment",
    title: "Commercial structure",
    heroEyebrow,
    heroAmount,
    heroCaption:
      oneTimeLines.length > 1
        ? `${oneTimeLines.length} one-time line items`
        : oneTimeLines[0]?.description?.trim() || null,
    paymentSummary,
    oneTimeLines,
    annualLines,
    annualTotalLabel:
      annualLines.length > 1
        ? `${formatCents(proposal.totals.annualTotalCents, currency)}/year total`
        : null,
    monthlyLines,
    monthlyNoneLabel:
      monthlyLines.length === 0 && proposal.totals.monthlyTotalCents === 0
        ? "None required"
        : null,
    quarterlyLines,
    creditLines: proposal.credits.map((credit) => ({
      id: credit.id,
      title: credit.label,
      amountLabel: formatClientFacingCreditAmount(credit, currency),
      cadenceLabel: credit.kind,
      description: credit.notes,
      optional: false,
    })),
    showDetailedSchedule,
    scheduleRows: proposal.paymentSchedule.map((item) => ({
      id: item.id,
      label: item.label,
      timing: formatClientFacingPaymentTiming(item.due),
      amount: formatCents(item.amountCents, currency),
    })),
    isFullUpfront,
  };
}

export function composeTermsSectionPlan(proposal: CanonicalProposal): TermsSectionPlan[] {
  const fullUpfront = isFullUpfrontProposal(proposal);
  const investment = composeInvestmentPresentation(proposal);

  const catalog: Array<{
    key: keyof CanonicalProposal["terms"];
    eyebrow: string;
    title: string;
    layout?: "stack" | "editorial";
  }> = [
    { key: "proposalTerms", eyebrow: "Terms", title: "Engagement terms", layout: "stack" },
    {
      key: "paymentAssumptions",
      eyebrow: "Payment",
      title: "Payment conditions",
      layout: "stack",
    },
    {
      key: "timelineAssumptions",
      eyebrow: "Timeline",
      title: "Project timeline",
      layout: "stack",
    },
    {
      key: "expirationLanguage",
      eyebrow: "Validity",
      title: "Proposal validity",
      layout: "stack",
    },
    {
      key: "changeRequestLanguage",
      eyebrow: "Changes",
      title: "Scope changes",
      layout: "stack",
    },
    {
      key: "intellectualPropertySummary",
      eyebrow: "Intellectual property",
      title: "Intellectual property",
      layout: "editorial",
    },
    {
      key: "cancellationSummary",
      eyebrow: "Cancellation",
      title: "Cancellation",
      layout: "editorial",
    },
    {
      key: "clientResponsibilities",
      eyebrow: "Responsibilities",
      title: "What we need from you",
      layout: "editorial",
    },
    {
      key: "exclusions",
      eyebrow: "Exclusions",
      title: "What's not included",
      layout: "editorial",
    },
  ];

  const sections: TermsSectionPlan[] = [];
  for (const entry of catalog) {
    const raw = proposal.terms[entry.key];
    if (!raw?.trim()) continue;

    // When investment already states payment timing clearly, skip the duplicate
    // paymentAssumptions block for full-upfront single-payment proposals.
    if (
      entry.key === "paymentAssumptions" &&
      fullUpfront &&
      !investment.showDetailedSchedule &&
      investment.paymentSummary
    ) {
      continue;
    }

    sections.push({
      key: entry.key,
      eyebrow: entry.eyebrow,
      title: entry.title,
      text: softenClientFacingDepositLanguage(raw, fullUpfront),
      layout: entry.layout,
    });
  }
  return sections;
}

export function composeClosingPresentation(proposal: CanonicalProposal): {
  eyebrow: string;
  title: string;
  nextSteps: string;
  closingNote: string | null;
  acceptance: string | null;
} {
  const fullUpfront = isFullUpfrontProposal(proposal);
  return {
    eyebrow: "Next step",
    title: "Ready to begin",
    nextSteps: softenClientFacingDepositLanguage(proposal.terms.nextSteps, fullUpfront),
    closingNote: proposal.terms.closingNote?.trim() || null,
    acceptance: proposal.disclosures.acceptance?.trim() || null,
  };
}
