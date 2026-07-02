/**
 * Proposal conversion engine — idempotent approved proposal → client launch.
 * Payload-safe (no server-only) for hooks, migrate, and admin API routes.
 */
import { randomBytes } from "crypto";
import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { publishers } from "@/lib/automation/publishers";
import {
  applyContractMergeFields,
  buildContractMergeContext,
  formatPricingSummary,
  proposalTypeToContractType,
} from "@/lib/contracts/templates";
import { prepareProposalConversionWorkflow } from "@/lib/sales/automation";
import type { ConversionWizardDraft } from "@/lib/sales/acquisition";
import { conversionDraftToWizard } from "@/lib/sales/acquisition";
import type {
  ConversionEngineResult,
  ConversionMode,
  ConversionResultPayload,
  LaunchStatus,
} from "./types";
import {
  logProposalConversionActivity,
  publishLaunchCompletedEvent,
  publishLaunchStartedEvent,
  publishProposalConvertedEvent,
} from "./timeline-publish";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export interface ConvertApprovedProposalInput {
  proposalId: number;
  conversionMode?: ConversionMode;
  existingClientId?: number;
  wizardDraft?: ConversionWizardDraft;
}

function resolveId(rel: unknown): number | null {
  if (!rel) return null;
  if (typeof rel === "number") return rel;
  if (typeof rel === "object" && rel !== null && "id" in rel) {
    return Number((rel as AnyDoc).id);
  }
  return null;
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

function extractDomain(url: string): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return host || undefined;
  } catch {
    return undefined;
  }
}

function proposalAmounts(doc: AnyDoc): { oneTime: number; recurring: number } {
  const snap = doc.pricingSnapshot as Record<string, unknown> | undefined;
  const oneTime =
    snap?.grandOneTimeTotal != null
      ? Number(snap.grandOneTimeTotal)
      : Number(doc.investment ?? 0);
  const recurring =
    snap?.grandRecurringTotal != null
      ? Number(snap.grandRecurringTotal)
      : Number(doc.recurringAmount ?? 0);
  return { oneTime, recurring };
}

async function findExistingConversion(
  payload: Payload,
  proposalId: number,
): Promise<AnyDoc | null> {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposal-conversions" as any,
    where: { proposal: { equals: proposalId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc) ?? null;
}

async function findContractForProposal(
  payload: Payload,
  proposalId: number,
): Promise<AnyDoc | null> {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "contracts" as any,
    where: { proposal: { equals: proposalId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc) ?? null;
}

async function findActionByMemoryRef(
  payload: Payload,
  clientId: number,
  memoryReference: string,
): Promise<AnyDoc | null> {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-actions" as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { memoryReference: { equals: memoryReference } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc) ?? null;
}

async function findOnboardingForClient(
  payload: Payload,
  clientId: number,
): Promise<AnyDoc | null> {
  const result = await payload.find({
    collection: "client-onboarding",
    where: { client: { equals: clientId } },
    limit: 1,
    sort: "-updatedAt",
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc) ?? null;
}

async function findKickoffForProposal(
  payload: Payload,
  clientId: number,
  proposalId: number,
): Promise<AnyDoc | null> {
  const result = await payload.find({
    collection: "success-check-ins",
    where: {
      and: [
        { client: { equals: clientId } },
        { summary: { contains: `proposal:${proposalId}` } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc) ?? null;
}

async function resolveContractTemplate(
  payload: Payload,
  contractType: string,
): Promise<AnyDoc | null> {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "contract-templates" as any,
    where: {
      and: [{ contractType: { equals: contractType } }, { active: { equals: true } }],
    },
    limit: 1,
    sort: "sortOrder",
    depth: 0,
    overrideAccess: true,
  });
  if (result.docs[0]) return result.docs[0] as AnyDoc;

  const fallback = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "contract-templates" as any,
    where: { active: { equals: true } },
    limit: 1,
    sort: "sortOrder",
    depth: 0,
    overrideAccess: true,
  });
  return (fallback.docs[0] as AnyDoc) ?? null;
}

async function createContractFromProposal(
  payload: Payload,
  input: {
    proposal: AnyDoc;
    clientId: number;
    projectId?: number;
    retainerId?: number;
  },
): Promise<number> {
  const existing = await findContractForProposal(payload, input.proposal.id as number);
  if (existing) return existing.id as number;

  const { oneTime, recurring } = proposalAmounts(input.proposal);
  const contractType = proposalTypeToContractType(
    String(input.proposal.proposalType ?? ""),
  );
  const template = await resolveContractTemplate(payload, contractType);
  const clientDoc = await payload.findByID({
    collection: "clients",
    id: input.clientId,
    depth: 0,
    overrideAccess: true,
  });
  const clientName = String((clientDoc as AnyDoc).name ?? "Client");

  const mergeContext = buildContractMergeContext({
    clientName,
    businessName: clientName,
    services: String(input.proposal.scope ?? input.proposal.deliverables ?? ""),
    pricing: formatPricingSummary({ oneTime, recurring }),
    terms: String(input.proposal.terms ?? template?.terms ?? ""),
    monthlyAmount: recurring || null,
    projectAmount: oneTime || null,
    executiveName: "Kreate by Design",
  });

  const bodyTemplate = String(template?.body ?? defaultContractBody());
  const body = applyContractMergeFields(bodyTemplate, mergeContext);
  const terms = applyContractMergeFields(
    String(template?.terms ?? mergeContext.terms),
    mergeContext,
  );
  const publicToken = randomBytes(24).toString("base64url");

  const contract = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "contracts" as any,
    data: {
      client: input.clientId,
      proposal: input.proposal.id,
      template: template?.id,
      status: "draft",
      contractType,
      title: `${clientName} · ${String(input.proposal.title ?? "Service Agreement")}`,
      publicTitle: String(input.proposal.title ?? "Service Agreement"),
      body,
      terms,
      monthlyAmount: recurring || undefined,
      projectAmount: oneTime || undefined,
      startDate: new Date().toISOString(),
      publicToken,
      signerEmail:
        (clientDoc as AnyDoc).primaryContactEmail ??
        (input.proposal as AnyDoc).signerEmail ??
        undefined,
      signerName: (clientDoc as AnyDoc).primaryContactName ?? undefined,
      relatedProject: input.projectId,
      relatedRetainer: input.retainerId,
    },
    overrideAccess: true,
  });

  return contract.id as number;
}

function defaultContractBody(): string {
  return [
    "SERVICE AGREEMENT",
    "",
    "This Agreement is entered into between {{executiveName}} and {{clientName}} ({{businessName}}).",
    "",
    "Services: {{services}}",
    "Investment: {{pricing}}",
    "Start Date: {{startDate}}",
    "",
    "Terms: {{terms}}",
  ].join("\n");
}

async function runLaunchAutomation(
  payload: Payload,
  input: {
    proposalId: number;
    clientId: number;
    clientName: string;
    contractId?: number;
    projectId?: number;
    onboardingId?: number;
  },
): Promise<{ actionIds: number[]; kickoffId?: number; launchStatus: LaunchStatus }> {
  const actionIds: number[] = [];
  const memoryPrefix = `proposal-conversion:${input.proposalId}`;

  const launchActions: Array<{
    memoryReference: string;
    title: string;
    description: string;
    actionType: string;
    priority: string;
  }> = [
    {
      memoryReference: `${memoryPrefix}:welcome`,
      title: `Send welcome package · ${input.clientName}`,
      description: "Welcome email and onboarding packet for new client launch.",
      actionType: "email",
      priority: "high",
    },
    {
      memoryReference: `${memoryPrefix}:kickoff-schedule`,
      title: `Schedule kickoff call · ${input.clientName}`,
      description: "Book executive kickoff within 5 business days of conversion.",
      actionType: "meeting",
      priority: "high",
    },
    {
      memoryReference: `${memoryPrefix}:onboarding-followup`,
      title: `Confirm onboarding intake · ${input.clientName}`,
      description: "Verify onboarding form completion and chase missing assets.",
      actionType: "follow-up",
      priority: "medium",
    },
  ];

  if (input.contractId) {
    launchActions.push({
      memoryReference: `${memoryPrefix}:contract-send`,
      title: `Send contract for signature · ${input.clientName}`,
      description: "Review draft contract and send to client for signature.",
      actionType: "proposal",
      priority: "high",
    });
  }

  for (const action of launchActions) {
    const existing = await findActionByMemoryRef(
      payload,
      input.clientId,
      action.memoryReference,
    );
    if (existing) {
      actionIds.push(existing.id as number);
      continue;
    }
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-actions" as any,
      data: {
        client: input.clientId,
        title: action.title,
        description: action.description,
        source: "Executive",
        priority: action.priority,
        status: "pending",
        actionType: action.actionType,
        createdBy: "KXD Conversion Engine",
        memoryReference: action.memoryReference,
        relatedProject: input.projectId,
        executiveNotes: `Auto-created from proposal ${input.proposalId} conversion.`,
      },
      overrideAccess: true,
    });
    actionIds.push(created.id as number);
  }

  let kickoffId: number | undefined;
  const existingKickoff = await findKickoffForProposal(
    payload,
    input.clientId,
    input.proposalId,
  );
  if (existingKickoff) {
    kickoffId = existingKickoff.id as number;
  } else {
    const kickoffDate = new Date();
    kickoffDate.setDate(kickoffDate.getDate() + 7);
    const kickoff = await payload.create({
      collection: "success-check-ins",
      data: {
        client: input.clientId,
        meetingDate: kickoffDate.toISOString(),
        summary: `Kickoff placeholder · proposal:${input.proposalId} — schedule and confirm with client.`,
        completed: false,
        followUpDate: kickoffDate.toISOString(),
      },
      overrideAccess: true,
    });
    kickoffId = kickoff.id as number;
  }

  try {
    await publishers.launch.clientLaunched(
      {
        clientId: input.clientId,
        title: `Client launch · ${input.clientName}`,
        summary: `Converted from proposal ${input.proposalId}. Launch actions queued.`,
        eventType: "client-launch",
        createdBy: "KXD Conversion Engine",
        source: "proposal-conversion",
      },
      payload,
    );
  } catch (err) {
    console.error("[KXD Conversion] Launch publisher failed:", err);
  }

  return { actionIds, kickoffId, launchStatus: "completed" };
}

function resultFromConversionDoc(doc: AnyDoc): ConversionEngineResult {
  const result = (doc.result ?? {}) as ConversionResultPayload;
  return {
    success: doc.status === "completed",
    alreadyExecuted: true,
    conversionId: doc.id as number,
    clientId: resolveId(doc.client) ?? result.clientId,
    projectId: result.projectId,
    retainerId: result.retainerId,
    contractId: resolveId(doc.relatedContract) ?? result.contractId,
    onboardingId: result.onboardingId,
    launchStatus: String(doc.launchStatus ?? "completed") as LaunchStatus,
    errors: doc.errorLog ? [String(doc.errorLog)] : [],
    result,
  };
}

export async function convertApprovedProposal(
  input: ConvertApprovedProposalInput,
  payloadInstance?: Payload,
): Promise<ConversionEngineResult> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const errors: string[] = [];
  const proposalId = input.proposalId;
  const mode: ConversionMode = input.conversionMode ?? "hybrid";

  const existingConversion = await findExistingConversion(payload, proposalId);
  if (existingConversion?.status === "completed") {
    return resultFromConversionDoc(existingConversion);
  }

  const proposal = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: proposalId,
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  if (proposal.conversionExecutedAt && proposal.conversionClientId) {
    const legacyClientId = proposal.conversionClientId as number;
    if (!existingConversion) {
      await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "proposal-conversions" as any,
        data: {
          proposal: proposalId,
          client: legacyClientId,
          status: "completed",
          conversionMode: mode,
          title: `Conversion · ${proposal.title ?? proposal.proposalNumber}`,
          convertedAt: proposal.conversionExecutedAt,
          launchStatus: "completed",
          result: { clientId: legacyClientId },
        },
        overrideAccess: true,
      });
    }
    return {
      success: true,
      alreadyExecuted: true,
      clientId: legacyClientId,
      errors: [],
    };
  }

  if (String(proposal.status) !== "approved") {
    return {
      success: false,
      alreadyExecuted: false,
      errors: ["Proposal must be approved before conversion."],
    };
  }

  let conversionId = existingConversion?.id as number | undefined;
  if (!conversionId) {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "proposal-conversions" as any,
      data: {
        proposal: proposalId,
        status: "in-progress",
        conversionMode: mode,
        title: `Conversion · ${proposal.title ?? proposal.proposalNumber}`,
        launchStatus: "queued",
      },
      overrideAccess: true,
    });
    conversionId = created.id as number;
  } else {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "proposal-conversions" as any,
      id: conversionId,
      data: { status: "in-progress", launchStatus: "in-progress" },
      overrideAccess: true,
    });
  }

  let prepared = proposal.conversionDraft as Awaited<
    ReturnType<typeof prepareProposalConversionWorkflow>
  >;
  if (!prepared) {
    prepared = await prepareProposalConversionWorkflow(proposalId, payload);
  }
  const draft = input.wizardDraft ?? conversionDraftToWizard(prepared);
  const { oneTime, recurring } = proposalAmounts(proposal);

  let clientId =
    input.existingClientId ??
    resolveId(proposal.client) ??
    resolveId(proposal.conversionClientId);

  const skipNewClient =
    mode === "existing-client" ||
    mode === "project-expansion" ||
    mode === "retainer-only";

  if (!clientId && !skipNewClient) {
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
    clientId = client.id as number;
  } else if (!clientId) {
    return {
      success: false,
      alreadyExecuted: false,
      conversionId,
      errors: ["Existing client required for this conversion mode."],
    };
  }

  const clientName = String(draft.client.name ?? "Client");
  let executiveProfileId: number | undefined;
  let infrastructureId: number | undefined;
  let projectId = resolveId(proposal.relatedProject);
  let retainerId = resolveId(proposal.relatedRetainer);
  let onboardingId: number | undefined;
  let portalUserId: number | undefined;

  if (mode !== "retainer-only" && mode !== "project-expansion") {
    const profileResult = await payload.find({
      collection: "executive-client-profiles",
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (profileResult.docs[0]) {
      executiveProfileId = profileResult.docs[0].id as number;
    } else {
      const profile = await payload.create({
        collection: "executive-client-profiles",
        data: {
          client: clientId,
          profileTitle: String(draft.executiveProfile.clientName ?? clientName),
          relationshipStatus: "active",
          strategicNotes: draft.executiveProfile.notes as string | undefined,
        },
        overrideAccess: true,
      });
      executiveProfileId = profile.id as number;
    }

    const infraResult = await payload.find({
      collection: "client-infrastructure",
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (infraResult.docs[0]) {
      infrastructureId = infraResult.docs[0].id as number;
    } else if (mode === "hybrid" || mode === "new-client") {
      const infra = await payload.create({
        collection: "client-infrastructure",
        data: {
          client: clientId,
          status: "unknown",
          primaryDomain: extractDomain(String(draft.client.companyWebsite ?? "")),
          internalNotes: draft.infrastructure.notes as string | undefined,
        },
        overrideAccess: true,
      });
      infrastructureId = infra.id as number;
    }
  }

  const createProject =
    mode === "hybrid" ||
    mode === "new-client" ||
    mode === "one-time" ||
    mode === "project-expansion" ||
    mode === "existing-client";

  if (createProject && !projectId) {
    const project = await payload.create({
      collection: "client-projects",
      data: {
        client: clientId,
        projectName: String(draft.project.name ?? `${clientName} · Project`),
        projectType: "website",
        status: "planning",
        priority: "high",
        notes: [
          draft.project.deliverables ? `Deliverables: ${draft.project.deliverables}` : null,
          draft.project.timeline ? `Timeline: ${draft.project.timeline}` : null,
          `Source proposal: ${proposal.proposalNumber ?? proposalId}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
      overrideAccess: true,
    });
    projectId = project.id as number;
  }

  const createRetainer =
    (mode === "hybrid" ||
      mode === "new-client" ||
      mode === "retainer-only" ||
      mode === "existing-client") &&
    (recurring > 0 || Number(draft.retainer?.monthlyAmount ?? 0) > 0);

  if (createRetainer && !retainerId) {
    const retainer = await payload.create({
      collection: "retainers",
      data: {
        client: clientId,
        retainerName: String(draft.retainer?.name ?? `${clientName} · Retainer`),
        monthlyAmount: Number(draft.retainer?.monthlyAmount ?? recurring),
        billingStatus: "upcoming",
        scopeSummary: draft.retainer?.scope as string | undefined,
        notes: `Created from proposal ${proposal.proposalNumber ?? proposalId}.`,
      },
      overrideAccess: true,
    });
    retainerId = retainer.id as number;
  }

  if (mode !== "retainer-only" && mode !== "project-expansion") {
    const existingOnboarding = await findOnboardingForClient(payload, clientId);
    if (existingOnboarding) {
      onboardingId = existingOnboarding.id as number;
    } else {
      const onboarding = await payload.create({
        collection: "client-onboarding",
        data: {
          client: clientId,
          businessName: String(draft.onboarding.businessName ?? clientName),
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
      onboardingId = onboarding.id as number;
    }
  }

  const contractId = await createContractFromProposal(payload, {
    proposal,
    clientId,
    projectId: projectId ?? undefined,
    retainerId: retainerId ?? undefined,
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

  const inviteEmail = String(
    draft.client.primaryContactEmail ?? draft.onboarding.email ?? "",
  ).trim();
  if (inviteEmail && (mode === "hybrid" || mode === "new-client")) {
    const existingPortal = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      where: { email: { equals: inviteEmail } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existingPortal.docs[0]) {
      portalUserId = existingPortal.docs[0].id as number;
    } else {
      try {
        const temporaryPassword = randomBytes(9).toString("base64url");
        const portalUser = await payload.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection: "portal-users" as any,
          data: {
            email: inviteEmail,
            displayName: String(draft.client.primaryContactName ?? inviteEmail),
            client: clientId,
            password: temporaryPassword,
          },
          overrideAccess: true,
        });
        portalUserId = portalUser.id as number;
      } catch (err) {
        errors.push(
          `Portal user creation failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }
  }

  await publishLaunchStartedEvent(
    {
      clientId,
      proposalId,
      title: `Launch started · ${clientName}`,
      metadata: { conversionId, contractId, projectId, retainerId },
    },
    payload,
  );

  const launch = await runLaunchAutomation(payload, {
    proposalId,
    clientId,
    clientName,
    contractId,
    projectId: projectId ?? undefined,
    onboardingId,
  });

  await publishProposalConvertedEvent(
    {
      proposalId,
      clientId,
      title: `Proposal converted · ${clientName}`,
      summary: `Proposal ${proposal.proposalNumber ?? proposalId} converted to active client.`,
      metadata: { projectId, retainerId, contractId, conversionId },
    },
    payload,
  );

  await publishLaunchCompletedEvent(
    {
      clientId,
      proposalId,
      title: `Launch completed · ${clientName}`,
      metadata: { actionIds: launch.actionIds, kickoffId: launch.kickoffId },
    },
    payload,
  );

  await logProposalConversionActivity(payload, {
    proposalId,
    clientId,
    eventType: "proposal.converted",
    title: `Proposal converted · ${clientName}`,
    summary: "Conversion engine completed — client, contract, and launch records linked.",
    metadata: { conversionId, contractId },
  });

  const resultPayload: ConversionResultPayload = {
    clientId,
    projectId: projectId ?? undefined,
    retainerId: retainerId ?? undefined,
    contractId,
    onboardingId,
    kickoffId: launch.kickoffId,
    infrastructureId,
    executiveProfileId,
    portalUserId,
    actionIds: launch.actionIds,
    conversionMode: mode,
  };

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposal-conversions" as any,
    id: conversionId,
    data: {
      client: clientId,
      status: "completed",
      convertedAt: new Date().toISOString(),
      relatedProject: projectId,
      relatedRetainer: retainerId,
      relatedContract: contractId,
      relatedOnboarding: onboardingId,
      launchStatus: launch.launchStatus,
      result: resultPayload,
      errorLog: errors.length > 0 ? errors.join("\n") : undefined,
    },
    overrideAccess: true,
  });

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: proposalId,
    data: {
      client: clientId,
      relatedProject: projectId,
      relatedRetainer: retainerId,
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
    conversionId,
    clientId,
    projectId: projectId ?? undefined,
    retainerId: retainerId ?? undefined,
    contractId,
    onboardingId,
    launchStatus: launch.launchStatus,
    errors,
    result: resultPayload,
  };
}
