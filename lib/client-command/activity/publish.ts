import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import type { ExecutiveTimelineSourceModule } from "@/lib/executive-timeline/types";
import {
  buildActivityDedupeKey,
  categoryForEventType,
  defaultImportanceForEventType,
  timelineStatusForActivity,
} from "./rules";
import type { ClientActivityInput, PublishActivityResult } from "./types";

const COLLECTION = "executive-timeline-events";

function asSourceModule(module: string): ExecutiveTimelineSourceModule {
  return module as ExecutiveTimelineSourceModule;
}

async function findExistingActivity(
  clientId: number,
  eventType: string,
  sourceId: string | number,
  payload: Payload,
): Promise<number | null> {
  const dedupeKey = buildActivityDedupeKey(sourceId, eventType);

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [{ client: { equals: clientId } }, { eventType: { equals: eventType } }],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  for (const doc of result.docs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = doc as Record<string, any>;
    const meta = row.metadata as Record<string, unknown> | undefined;
    if (meta?.dedupeKey === dedupeKey) return row.id as number;
    if (meta?.sourceId != null && String(meta.sourceId) === String(sourceId)) {
      return row.id as number;
    }
  }

  return null;
}

function buildActivityMetadata(input: ClientActivityInput, dedupeKey: string): Record<string, unknown> {
  return {
    activityEngine: true,
    sourceModule: input.sourceModule,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    dedupeKey,
    author: input.author,
    priority: input.priority,
    relatedLinks: input.relatedLinks,
    attachments: input.attachments,
    ...input.metadata,
  };
}

/**
 * Canonical publish path — writes to executive-timeline-events with dedupe by sourceId + eventType.
 */
export async function publishClientActivity(
  input: ClientActivityInput,
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const dedupeKey = buildActivityDedupeKey(input.sourceId, input.eventType);

  const existingId = await findExistingActivity(
    input.clientId,
    input.eventType,
    input.sourceId,
    payload,
  );

  if (existingId) {
    return { created: false, skipped: true, id: existingId, dedupeKey };
  }

  const category = categoryForEventType(input.eventType);
  const importance = defaultImportanceForEventType(input.eventType, input.priority);
  const status = timelineStatusForActivity(input.eventType, input.status);

  const event = await createExecutiveEvent(
    {
      client: input.clientId,
      project: input.projectId,
      infrastructure: input.infrastructureId,
      request: input.requestId,
      deliverable: input.deliverableId,
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      description: input.details ?? input.summary,
      category,
      status,
      importance,
      sourceModule: asSourceModule(input.sourceModule),
      createdBy: input.author,
      occurredAt: input.timestamp ?? new Date().toISOString(),
      metadata: buildActivityMetadata(input, dedupeKey),
      internalOnly: input.internalOnly ?? true,
      pinned: input.pinned ?? false,
    },
    payload,
  );

  return {
    created: true,
    skipped: false,
    id: event.id as number,
    dedupeKey,
  };
}

export async function publishProjectActivity(
  params: {
    clientId: number;
    projectId: number;
    eventType: "project.created" | "project.launched" | "project.completed" | string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    status?: string;
    priority?: ClientActivityInput["priority"];
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Projects",
      sourceType: "client-project",
      sourceId: params.projectId,
      eventType: params.eventType,
      title: params.title,
      summary: params.summary,
      projectId: params.projectId,
      author: params.author,
      timestamp: params.timestamp,
      status: params.status,
      priority: params.priority,
      relatedLinks: [
        {
          label: "Open project",
          href: `/admin/collections/client-projects/${params.projectId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishRequestActivity(
  params: {
    clientId: number;
    requestId: number;
    eventType: "request.opened" | "request.completed" | string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    status?: string;
    priority?: ClientActivityInput["priority"];
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Requests",
      sourceType: "client-request",
      sourceId: params.requestId,
      eventType: params.eventType,
      title: params.title,
      summary: params.summary,
      requestId: params.requestId,
      author: params.author,
      timestamp: params.timestamp,
      status: params.status,
      priority: params.priority,
      relatedLinks: [
        {
          label: "Open request",
          href: `/admin/collections/client-requests/${params.requestId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishInvoiceActivity(
  params: {
    clientId: number;
    proposalId: number;
    eventType: "invoice.created" | "invoice.paid" | "proposal.created" | string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    status?: string;
    amount?: number | null;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Sales",
      sourceType: "proposal",
      sourceId: params.proposalId,
      eventType: params.eventType,
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      status: params.status,
      metadata: params.amount != null ? { amount: params.amount } : undefined,
      relatedLinks: [
        {
          label: "Open proposal",
          href: `/admin/sales/proposals/${params.proposalId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishRetainerActivity(
  params: {
    clientId: number;
    retainerId: number;
    eventType: "retainer.created" | "retainer.renewed" | string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    status?: string;
    monthlyAmount?: number | null;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Retainers",
      sourceType: "retainer",
      sourceId: params.retainerId,
      eventType: params.eventType,
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      status: params.status,
      metadata:
        params.monthlyAmount != null ? { monthlyAmount: params.monthlyAmount } : undefined,
      relatedLinks: [
        {
          label: "Open retainer",
          href: `/admin/collections/retainers/${params.retainerId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishNoteActivity(
  params: {
    clientId: number;
    noteId: number;
    eventType?: string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    pinned?: boolean;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Executive Notes",
      sourceType: "executive-note",
      sourceId: params.noteId,
      eventType: params.eventType ?? "note.created",
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      pinned: params.pinned,
      relatedLinks: [
        {
          label: "Open note",
          href: `/admin/collections/executive-notes/${params.noteId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishMeetingActivity(
  params: {
    clientId: number;
    meetingId: number;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    satisfaction?: string | null;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Client Success",
      sourceType: "success-check-in",
      sourceId: params.meetingId,
      eventType: "meeting.logged",
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      metadata: params.satisfaction ? { satisfaction: params.satisfaction } : undefined,
      relatedLinks: [
        {
          label: "Open check-in",
          href: `/admin/collections/success-check-ins/${params.meetingId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishInfrastructureActivity(
  params: {
    clientId: number;
    infrastructureId: number;
    eventType?: string;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    status?: string;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Infrastructure",
      sourceType: "client-infrastructure",
      sourceId: params.infrastructureId,
      eventType: params.eventType ?? "infrastructure.updated",
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      status: params.status,
      infrastructureId: params.infrastructureId,
      relatedLinks: [
        {
          label: "Infrastructure registry",
          href: `/admin/operations/infrastructure/${params.clientId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishDeploymentActivity(
  params: {
    clientId: number;
    sourceId: string | number;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
    infrastructureId?: number;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Infrastructure",
      sourceType: "deployment",
      sourceId: params.sourceId,
      eventType: "deployment.recorded",
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      infrastructureId: params.infrastructureId,
      relatedLinks: [
        {
          label: "Infrastructure",
          href: `/admin/operations/infrastructure/${params.clientId}`,
        },
      ],
    },
    payloadInstance,
  );
}

export async function publishEmailActivity(
  params: {
    clientId: number;
    sourceId: string | number;
    title: string;
    summary?: string;
    author?: string;
    timestamp?: string;
  },
  payloadInstance?: Payload,
): Promise<PublishActivityResult> {
  return publishClientActivity(
    {
      clientId: params.clientId,
      sourceModule: "Emails",
      sourceType: "email",
      sourceId: params.sourceId,
      eventType: "email.logged",
      title: params.title,
      summary: params.summary,
      author: params.author,
      timestamp: params.timestamp,
      relatedLinks: [
        {
          label: "Client workspace",
          href: `/admin/operations/client-command/${params.clientId}?tab=emails`,
        },
      ],
    },
    payloadInstance,
  );
}
