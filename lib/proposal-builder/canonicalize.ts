/**
 * Canonical external proposal snapshots — strips all internal fields.
 */

import { normalizeProposalDocument } from "./document.ts";
import { calculateProposalTotals } from "./pricing.ts";
import {
  DEFAULT_ACCEPTANCE_DISCLOSURE,
  DEFAULT_CONTRACT_REQUIRED_DISCLOSURE,
  DEFAULT_OPERATIONAL_DRAFT_NOTICE,
  type AcceptanceMode,
  type CanonicalProposal,
  type ProposalBuilderStatus,
  type ProposalContact,
  type ProposalDocument,
} from "./types.ts";

export interface ProposalSource {
  id: number;
  proposalNumber?: string | null;
  title?: string | null;
  status?: string | null;
  acceptanceMode?: string | null;
  proposalDate?: string | null;
  expiresAt?: string | null;
  revisionNumber?: number | null;
  builderDocument?: unknown;
  shareSnapshot?: unknown;
  acceptedSnapshot?: unknown;
}

const INTERNAL_LEAK_PATTERN =
  /\b(internal notes?|margin|cost basis|admin\/|localhost|referral label|environment|payload|neon|stripe secret)\b/i;

function cleanText(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (INTERNAL_LEAK_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

function primaryContact(doc: ProposalDocument): ProposalContact | null {
  return doc.contacts.find((c) => c.isPrimary) ?? doc.contacts[0] ?? null;
}

export function buildCanonicalProposal(
  source: ProposalSource,
  selection?: { selectedLineIds?: string[]; selectedPackageKeys?: string[] },
): CanonicalProposal {
  const doc = normalizeProposalDocument(source.builderDocument);
  const totals = calculateProposalTotals(doc, selection);
  const primary = primaryContact(doc);
  const primaryOrg =
    doc.organizations[0]?.name?.trim() ||
    primary?.organizationId &&
      doc.organizations.find((o) => o.id === primary.organizationId)?.name ||
    "Client";

  const scopeGroups = doc.scopeGroups
    .filter((g) => g.inclusion !== "excluded")
    .map((g) => ({
      ...g,
      overview: cleanText(g.overview),
      milestones: cleanText(g.milestones),
      dependencies: cleanText(g.dependencies),
      clientResponsibilities: cleanText(g.clientResponsibilities),
      kxdResponsibilities: cleanText(g.kxdResponsibilities),
      assumptions: cleanText(g.assumptions),
      exclusions: cleanText(g.exclusions),
      estimatedTimeline: cleanText(g.estimatedTimeline),
      deliverables: g.deliverables
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((d) => ({
          ...d,
          description: cleanText(d.description),
        })),
    }));

  return {
    schemaVersion: 1,
    proposalId: source.id,
    proposalNumber: String(source.proposalNumber ?? ""),
    title: String(source.title ?? "Proposal"),
    version: Number(source.revisionNumber ?? 1) || 1,
    status: (source.status as ProposalBuilderStatus) || "draft",
    acceptanceMode:
      (source.acceptanceMode as AcceptanceMode) || "accept-and-proceed-to-contract",
    proposalDate: source.proposalDate ?? null,
    expirationDate: source.expiresAt ?? null,
    preparedBy: "Kreate by Design",
    primaryOrganization: String(primaryOrg),
    organizations: doc.organizations.map((o) => ({
      id: o.id,
      name: o.name,
      brand: o.brand,
      role: o.role,
    })),
    primaryContact: primary
      ? {
          id: primary.id,
          name: primary.name,
          email: cleanText(primary.email),
          phone: cleanText(primary.phone),
          title: cleanText(primary.title),
          organizationId: primary.organizationId,
          isPrimary: true,
        }
      : null,
    additionalContacts: doc.contacts
      .filter((c) => !c.isPrimary && c.id !== primary?.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        email: cleanText(c.email),
        phone: cleanText(c.phone),
        title: cleanText(c.title),
        organizationId: c.organizationId,
        isPrimary: false,
      })),
    executive: {
      executiveSummary: cleanText(doc.executive.executiveSummary),
      currentSituation: cleanText(doc.executive.currentSituation),
      objectives: cleanText(doc.executive.objectives),
      recommendedDirection: cleanText(doc.executive.recommendedDirection),
      desiredOutcomes: cleanText(doc.executive.desiredOutcomes),
      clientContext: cleanText(doc.executive.clientContext),
      clientFacingIntro: cleanText(doc.executive.clientFacingIntro),
    },
    scopeGroups,
    pricingLines: doc.pricingLines.filter((l) => l.inclusion !== "excluded"),
    credits: doc.credits,
    paymentSchedule: doc.paymentSchedule
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder),
    options: doc.options,
    terms: {
      proposalTerms: cleanText(doc.terms.proposalTerms),
      paymentAssumptions: cleanText(doc.terms.paymentAssumptions),
      timelineAssumptions: cleanText(doc.terms.timelineAssumptions),
      expirationLanguage: cleanText(doc.terms.expirationLanguage),
      changeRequestLanguage: cleanText(doc.terms.changeRequestLanguage),
      intellectualPropertySummary: cleanText(doc.terms.intellectualPropertySummary),
      cancellationSummary: cleanText(doc.terms.cancellationSummary),
      clientResponsibilities: cleanText(doc.terms.clientResponsibilities),
      exclusions: cleanText(doc.terms.exclusions),
      nextSteps: cleanText(doc.terms.nextSteps),
      closingNote: cleanText(doc.terms.closingNote),
      acceptanceDisclosure:
        cleanText(doc.terms.acceptanceDisclosure) || DEFAULT_ACCEPTANCE_DISCLOSURE,
      contractRequiredDisclosure:
        cleanText(doc.terms.contractRequiredDisclosure) ||
        DEFAULT_CONTRACT_REQUIRED_DISCLOSURE,
      operationalDraftNotice: DEFAULT_OPERATIONAL_DRAFT_NOTICE,
    },
    totals,
    selectedLineIds: totals.selectedLineIds,
    selectedPackageKeys: totals.selectedPackageKeys,
    currency: doc.currency || "USD",
    disclosures: {
      acceptance:
        cleanText(doc.terms.acceptanceDisclosure) || DEFAULT_ACCEPTANCE_DISCLOSURE,
      contractRequired:
        cleanText(doc.terms.contractRequiredDisclosure) ||
        DEFAULT_CONTRACT_REQUIRED_DISCLOSURE,
      operationalDraft: DEFAULT_OPERATIONAL_DRAFT_NOTICE,
    },
  };
}

/** Prefer accepted snapshot, then share snapshot, else live draft (operator only). */
export function resolveClientFacingProposal(
  source: ProposalSource,
  opts?: { allowLiveDraft?: boolean },
): CanonicalProposal | null {
  if (source.acceptedSnapshot && typeof source.acceptedSnapshot === "object") {
    return source.acceptedSnapshot as CanonicalProposal;
  }
  if (source.shareSnapshot && typeof source.shareSnapshot === "object") {
    return source.shareSnapshot as CanonicalProposal;
  }
  if (opts?.allowLiveDraft) {
    return buildCanonicalProposal(source);
  }
  return null;
}

export function assertNoInternalLeakage(canonical: CanonicalProposal): string[] {
  const blob = JSON.stringify(canonical);
  const issues: string[] = [];
  if (/"internalNotes"|internal cost|marginNotes|conversionDraft/i.test(blob)) {
    issues.push("Internal fields present in canonical snapshot");
  }
  if (/\/admin\//i.test(blob)) {
    issues.push("Admin URL leaked into canonical snapshot");
  }
  if (INTERNAL_LEAK_PATTERN.test(blob)) {
    issues.push("Internal terminology leaked into canonical snapshot");
  }
  return issues;
}
