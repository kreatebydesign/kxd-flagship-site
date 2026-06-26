/**
 * Proposal win workflow — prepares records without executing.
 * Safe for Payload CLI hooks (no server-only).
 */
import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import type { ProposalConversionDraft } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function resolveId(rel: AnyDoc | number | null | undefined): number | null {
  if (!rel) return null;
  if (typeof rel === "number") return rel;
  return (rel.id as number) ?? null;
}

function resolveLead(doc: AnyDoc, payload: Payload): Promise<AnyDoc | null> {
  const leadId = resolveId(doc.lead);
  if (!leadId) return Promise.resolve(null);
  return payload
    .findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      id: leadId,
      depth: 0,
      overrideAccess: true,
    })
    .then((lead) => lead as AnyDoc)
    .catch(() => null);
}

/**
 * When a proposal is approved, prepare draft payloads for downstream KXD OS modules.
 * Does NOT create any records — execution is manual via Launch / Import workflows.
 */
export async function prepareProposalConversionWorkflow(
  proposalId: number,
  payloadInstance?: Payload,
): Promise<ProposalConversionDraft> {
  const payload = payloadInstance ?? (await getPayload({ config }));

  const proposal = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: proposalId,
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  const lead = await resolveLead(proposal, payload);
  const companyName =
    (lead?.companyName as string) ||
    (typeof proposal.client === "object" && proposal.client !== null
      ? String((proposal.client as AnyDoc).name ?? "New Client")
      : "New Client");
  const slug = slugify(companyName) || `client-${proposalId}`;
  const contactName = (lead?.contactName as string) || "";
  const email = (lead?.email as string) || "";
  const website = (lead?.website as string) || "";
  const investment = Number(proposal.investment ?? lead?.estimatedValue ?? 0);
  const recurring = Number(proposal.recurringAmount ?? lead?.estimatedMRR ?? 0);

  const clientDraft = {
    name: companyName,
    slug,
    companyWebsite: website,
    primaryContactName: contactName,
    primaryContactEmail: email,
    monthlyRetainerAmount: recurring || undefined,
    status: "active",
    relationshipStatus: "new",
    notes: `Prepared from proposal ${proposal.proposalNumber ?? proposalId}. Awaiting manual creation.`,
  };

  const executiveProfileDraft = {
    clientName: companyName,
    industry: lead?.industry ?? undefined,
    website,
    primaryContact: contactName,
    email,
    relationshipStage: "onboarding",
    notes: `Executive profile draft from approved proposal ${proposal.proposalNumber ?? proposalId}.`,
  };

  const infrastructureDraft = {
    label: `${companyName} · Infrastructure`,
    status: "planned",
    notes: "Infrastructure record draft — configure domains, hosting, and stack after client creation.",
    metadata: { preparedFromProposal: proposalId },
  };

  const timelineEventDraft = {
    eventType: "sales.proposal-approved",
    title: `Proposal approved · ${proposal.title ?? proposal.proposalNumber}`,
    summary: proposal.executiveSummary
      ? String(proposal.executiveSummary).slice(0, 280)
      : `Investment ${investment} · MRR ${recurring}`,
    category: "relationship",
    importance: "high",
    sourceModule: "Growth",
    metadata: { proposalId, proposalNumber: proposal.proposalNumber },
  };

  const retainerDraft = {
    name: `${companyName} · Retainer`,
    status: "draft",
    monthlyAmount: recurring || undefined,
    scope: proposal.scope ?? undefined,
    notes: "Retainer draft from approved proposal — review before activating.",
  };

  const projectDraft = {
    name: proposal.title ?? `${companyName} · Initial Project`,
    status: "planning",
    budget: investment || undefined,
    deliverables: proposal.deliverables ?? undefined,
    timeline: proposal.timeline ?? undefined,
    notes: "Project draft from approved proposal — assign team after client creation.",
  };

  const onboardingDraft = {
    businessName: companyName,
    primaryContact: contactName,
    email,
    phone: lead?.phone ?? undefined,
    website,
    status: "intake",
    projectGoals: proposal.scope ?? undefined,
    notes: "Onboarding intake draft — send to client after HQ setup.",
  };

  return {
    preparedAt: new Date().toISOString(),
    proposalId,
    proposalNumber: String(proposal.proposalNumber ?? `P-${proposalId}`),
    status: "prepared",
    client: clientDraft,
    executiveProfile: executiveProfileDraft,
    infrastructure: infrastructureDraft,
    timelineEvent: timelineEventDraft,
    retainer: retainerDraft,
    project: projectDraft,
    onboarding: onboardingDraft,
    notes: [
      "Workflow prepared — no records created automatically.",
      "Execute via Client Launch or manual Payload creation when ready.",
      "Client HQ is not modified by this workflow.",
    ],
  };
}
