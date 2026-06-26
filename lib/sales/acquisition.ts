/**
 * Client acquisition — idempotent proposal → client conversion.
 * Payload-safe for hooks and admin API routes.
 */
import { randomBytes } from "crypto";
import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { publishers } from "@/lib/automation/publishers";
import { prepareProposalConversionWorkflow } from "./automation";
import { isPaymentComplete } from "./public-core";
import { logSalesActivityRecord, publishSalesTimelineEvent } from "./timeline-events";
import type { ProposalConversionDraft } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export interface ConversionExecutionResult {
  success: boolean;
  alreadyExecuted: boolean;
  clientId?: number;
  executiveProfileId?: number;
  retainerId?: number;
  projectId?: number;
  infrastructureId?: number;
  onboardingId?: number;
  portalUserId?: number;
  portalInviteEmail?: string;
  temporaryPassword?: string;
  errors: string[];
}

export interface ConversionWizardDraft {
  client: Record<string, unknown>;
  executiveProfile: Record<string, unknown>;
  retainer: Record<string, unknown> | null;
  project: Record<string, unknown>;
  infrastructure: Record<string, unknown>;
  onboarding: Record<string, unknown>;
}

async function uniqueSlug(payload: Payload, base: string): Promise<string> {
  let slug = base || "new-client";
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await payload.find({
      collection: "clients",
      where: { slug: { equals: candidate } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length === 0) return candidate;
    suffix += 1;
  }
}

function resolveId(rel: AnyDoc | number | null | undefined): number | null {
  if (!rel) return null;
  if (typeof rel === "number") return rel;
  return (rel.id as number) ?? null;
}

export function conversionDraftToWizard(
  draft: ProposalConversionDraft,
): ConversionWizardDraft {
  return {
    client: draft.client,
    executiveProfile: draft.executiveProfile,
    retainer: Number(draft.retainer?.monthlyAmount ?? 0) > 0 ? draft.retainer : null,
    project: draft.project,
    infrastructure: draft.infrastructure,
    onboarding: draft.onboarding,
  };
}

export async function getConversionWizardData(
  proposalId: number,
  payloadInstance?: Payload,
): Promise<{ proposal: AnyDoc; draft: ConversionWizardDraft } | null> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const proposal = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: proposalId,
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  let conversionDraft = proposal.conversionDraft as ProposalConversionDraft | undefined;
  if (!conversionDraft) {
    conversionDraft = await prepareProposalConversionWorkflow(proposalId, payload);
  }

  return {
    proposal,
    draft: conversionDraftToWizard(conversionDraft),
  };
}

export async function executeProposalConversion(
  proposalId: number,
  payloadInstance?: Payload,
  wizardDraft?: ConversionWizardDraft,
): Promise<ConversionExecutionResult> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const errors: string[] = [];

  const proposal = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: proposalId,
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  if (proposal.conversionExecutedAt && proposal.conversionClientId) {
    return {
      success: true,
      alreadyExecuted: true,
      clientId: proposal.conversionClientId as number,
      errors: [],
    };
  }

  if (String(proposal.status) !== "approved") {
    return { success: false, alreadyExecuted: false, errors: ["Proposal must be approved before conversion."] };
  }

  if (!isPaymentComplete(proposal)) {
    return { success: false, alreadyExecuted: false, errors: ["Payment requirements not met."] };
  }

  let prepared = proposal.conversionDraft as ProposalConversionDraft | undefined;
  if (!prepared) {
    prepared = await prepareProposalConversionWorkflow(proposalId, payload);
  }

  const draft = wizardDraft ?? conversionDraftToWizard(prepared);
  const clientDraft = draft.client;
  const slug = await uniqueSlug(payload, String(clientDraft.slug ?? "new-client"));

  const client = await payload.create({
    collection: "clients",
    data: {
      name: String(clientDraft.name ?? "New Client"),
      slug,
      status: "active",
      companyWebsite: clientDraft.companyWebsite as string | undefined,
      primaryContactName: clientDraft.primaryContactName as string | undefined,
      primaryContactEmail: clientDraft.primaryContactEmail as string | undefined,
      monthlyRetainerAmount: clientDraft.monthlyRetainerAmount as number | undefined,
      relationshipStatus: "healthy",
      brandTier: "growth",
      notes: clientDraft.notes as string | undefined,
    },
    overrideAccess: true,
  });

  const clientId = client.id as number;

  const profile = await payload.create({
    collection: "executive-client-profiles",
    data: {
      client: clientId,
      profileTitle: String(draft.executiveProfile.clientName ?? clientDraft.name),
      relationshipStatus: "active",
      strategicNotes: draft.executiveProfile.notes as string | undefined,
    },
    overrideAccess: true,
  });

  let retainerId: number | undefined;
  if (draft.retainer && Number(draft.retainer.monthlyAmount ?? 0) > 0) {
    const retainer = await payload.create({
      collection: "retainers",
      data: {
        client: clientId,
        retainerName: String(draft.retainer.name ?? `${clientDraft.name} · Retainer`),
        monthlyAmount: Number(draft.retainer.monthlyAmount),
        billingStatus: "upcoming",
        scopeSummary: draft.retainer.scope as string | undefined,
        notes: draft.retainer.notes as string | undefined,
      },
      overrideAccess: true,
    });
    retainerId = retainer.id as number;
  }

  const project = await payload.create({
    collection: "client-projects",
    data: {
      client: clientId,
      projectName: String(draft.project.name ?? `${clientDraft.name} · Project`),
      projectType: "website",
      status: "planning",
      priority: "high",
      notes: [
        draft.project.deliverables ? `Deliverables: ${draft.project.deliverables}` : null,
        draft.project.timeline ? `Timeline: ${draft.project.timeline}` : null,
        draft.project.notes ? String(draft.project.notes) : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    overrideAccess: true,
  });

  const infra = await payload.create({
    collection: "client-infrastructure",
    data: {
      client: clientId,
      status: "unknown",
      primaryDomain: extractDomain(String(clientDraft.companyWebsite ?? "")),
      internalNotes: draft.infrastructure.notes as string | undefined,
    },
    overrideAccess: true,
  });

  const onboarding = await payload.create({
    collection: "client-onboarding",
    data: {
      client: clientId,
      businessName: String(draft.onboarding.businessName ?? clientDraft.name),
      primaryContact: draft.onboarding.primaryContact as string | undefined,
      email: draft.onboarding.email as string | undefined,
      phone: draft.onboarding.phone as string | undefined,
      currentWebsite: draft.onboarding.website as string | undefined,
      status: "sent",
      notes: draft.onboarding.projectGoals
        ? String(draft.onboarding.projectGoals)
        : (draft.onboarding.notes as string | undefined),
    },
    overrideAccess: true,
  });

  const leadId = resolveId(proposal.lead);
  if (leadId) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      id: leadId,
      data: { status: "won" },
      overrideAccess: true,
    });
  }

  let portalUserId: number | undefined;
  let portalInviteEmail: string | undefined;
  let temporaryPassword: string | undefined;
  const inviteEmail = String(
    clientDraft.primaryContactEmail ?? draft.onboarding.email ?? "",
  ).trim();

  if (inviteEmail) {
    try {
      temporaryPassword = randomBytes(9).toString("base64url");
      const portalUser = await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        data: {
          email: inviteEmail,
          displayName: String(clientDraft.primaryContactName ?? inviteEmail),
          client: clientId,
          password: temporaryPassword,
        },
        overrideAccess: true,
      });
      portalUserId = portalUser.id as number;
      portalInviteEmail = inviteEmail;
    } catch (err) {
      errors.push(
        `Portal user creation failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }

  await publishSalesTimelineEvent(
    {
      eventType: "sales.client-converted",
      clientId,
      proposalId,
      title: `Client converted · ${clientDraft.name}`,
      summary: `Proposal ${proposal.proposalNumber} converted to active client.`,
      metadata: { projectId: project.id, retainerId, infrastructureId: infra.id },
    },
    payload,
  );

  if (retainerId) {
    await publishSalesTimelineEvent(
      {
        eventType: "sales.retainer-activated",
        clientId,
        proposalId,
        title: "Retainer prepared",
        summary: "Monthly retainer record created from approved proposal.",
        metadata: { retainerId },
      },
      payload,
    );
  }

  await publishSalesTimelineEvent(
    {
      eventType: "sales.project-created",
      clientId,
      proposalId,
      title: `Project created · ${draft.project.name}`,
      summary: "Initial project record created from proposal conversion.",
      metadata: { projectId: project.id },
    },
    payload,
  );

  try {
    await publishers.launch.clientLaunched(
      {
        clientId,
        title: `Client acquired · ${clientDraft.name}`,
        summary: `Converted from proposal ${proposal.proposalNumber}. Portal invitation prepared.`,
        eventType: "client-launch",
        createdBy: "KXD Sales Engine",
        source: "proposal-conversion",
      },
      payload,
    );
  } catch (err) {
    console.error("[KXD Acquisition] Launch automation failed:", err);
  }

  await logSalesActivityRecord(payload, {
    activityType: "note",
    title: `Client converted · ${clientDraft.name}`,
    summary: "Proposal conversion executed — client, project, retainer, infrastructure, and onboarding created.",
    proposalId,
    clientId,
    leadId: leadId ?? undefined,
  });

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: proposalId,
    data: {
      client: clientId,
      conversionExecutedAt: new Date().toISOString(),
      conversionClientId: clientId,
      archivedInPortal: true,
      conversionDraft: prepared,
    },
    overrideAccess: true,
  });

  return {
    success: true,
    alreadyExecuted: false,
    clientId,
    executiveProfileId: profile.id as number,
    retainerId,
    projectId: project.id as number,
    infrastructureId: infra.id as number,
    onboardingId: onboarding.id as number,
    portalUserId,
    portalInviteEmail,
    temporaryPassword,
    errors,
  };
}

function extractDomain(url: string): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return host || undefined;
  } catch {
    return undefined;
  }
}
